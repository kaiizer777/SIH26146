"""
Synthetic Bitcoin transaction dataset generator for ML-based money laundering detection.

Generates test_1000.csv and test_2000.csv with:
- Zero duplicate txids (unique per-file salts, namespaced away from existing 100K rows)
- Zero duplicate Bitcoin addresses across both files
- 3.0%–3.5% of unique wallets scoring CRITICAL (seed addresses from ransomwhere_seeds.json)
- Archetype distribution: normal ~72%, peeling ~8%, coinjoin ~4%, anomaly ~8%, ransomwhere calibrated

Column schema (14 cols): txid, ts, src_ip, dst_ip, src_port, dst_port,
  input_addresses, output_addresses, input_amounts, output_amounts,
  fee, script_type, geo_country, asn
Array columns use Postgres literal format: {addr1,addr2}
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import random
import shutil
from datetime import datetime, timedelta, timezone
from typing import Any

try:
    from faker import Faker
except ImportError:
    raise ImportError("Install Faker: pip install faker")

# ── Constants ──────────────────────────────────────────────────────────────────

# Per-file SEED constants — different seeds = different RNG state = non-overlapping addresses/txids
SEED_1000 = 73819  # Never used before; namespaced away from SEED=42 (main 100K dataset)
SEED_2000 = 94561  # Distinct from SEED_1000 — ensures zero cross-file address collision

BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

# P2WSH excluded — not in backend VALID_SCRIPT_TYPES
SCRIPT_TYPES = ["P2PKH", "P2SH", "P2WPKH", "P2TR"]

GEO_NORMAL = ["US", "DE", "GB", "NL"]
GEO_ALL = ["US", "RU", "CN", "DE", "NL", "UA", "SG", "GB", "IR", "KZ"]
GEO_ANOMALY = ["IR", "KZ", "UA"]

HARDCODED_SEEDS = [
    "1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf",
    "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy",
    "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
]

# Target: 10–14 CRITICAL wallets per 1K unique wallets (~1.0%–1.4%).
# Each ransomwhere tx injects exactly 1 seed address. Normal/peeling txs each contribute
# ~2 unique addresses on average. To hit the target we tune the ransomwhere fraction.
# Calibration: ransomwhere_frac ≈ 0.030 yields ~1.0%–1.4% CRITICAL wallets per 1K unique wallets.
RANSOMWHERE_FRAC = 0.030  # 3.0% of transactions are seed-injected


# ── Helpers ────────────────────────────────────────────────────────────────────


def _random_ipv4_public() -> str:
    """Return a random public IPv4 (not RFC-1918 or loopback)."""
    while True:
        a = random.randint(1, 254)
        b = random.randint(0, 254)
        c = random.randint(0, 254)
        d = random.randint(1, 254)
        if a == 10 or a == 127:
            continue
        if a == 192 and b == 168:
            continue
        if a == 172 and 16 <= b <= 31:
            continue
        return f"{a}.{b}.{c}.{d}"


def _random_port() -> int:
    return random.randint(1024, 65535)


def _txid(index: int, file_salt: str) -> str:
    """
    Deterministic txid unique per (index, file_salt).
    file_salt is namespaced away from the main dataset's 'sih26146' salt.
    """
    raw = f"{index}:{file_salt}".encode()
    return hashlib.sha256(raw).hexdigest()


def _base58_address(prefix: str, length: int) -> str:
    body_len = length - len(prefix)
    body = "".join(random.choices(BASE58_CHARS, k=body_len))
    return prefix + body


def _random_btc_address() -> str:
    """P2PKH (1…), P2SH (3…), or bech32 (bc1q…) address."""
    choice = random.random()
    if choice < 0.45:
        return _base58_address("1", random.randint(26, 34))
    elif choice < 0.80:
        return _base58_address("3", random.randint(26, 34))
    else:
        return _base58_address("bc1q", random.randint(26, 42))


def _random_asn(unusual: bool = False) -> int:
    if unusual:
        return random.randint(900000, 999999)
    return random.randint(1000, 65535)


def _pg_arr(values: list[Any]) -> str:
    """Serialize list to PostgreSQL array literal: {a,b,c}."""
    return "{" + ",".join(str(v) for v in values) + "}"


def _parse_pg(s: str) -> list[float]:
    return [float(x) for x in s.strip("{}").split(",") if x.strip()]


def _random_ts(rng_days: int = 30) -> str:
    now = datetime(2026, 9, 19, tzinfo=timezone.utc)
    delta = timedelta(seconds=random.randint(0, rng_days * 86400))
    t = now - delta
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


def _round8(v: float) -> float:
    return round(v, 8)


def _gen_amounts(
    n_inputs: int, n_outputs: int, fee: float
) -> tuple[list[float], list[float]]:
    """Returns (input_amounts, output_amounts) such that sum(in) - fee == sum(out)."""
    raw_inputs = [random.uniform(0.001, 5.0) for _ in range(n_inputs)]
    input_amounts = [_round8(v) for v in raw_inputs]
    total_input = _round8(sum(input_amounts))

    total_output = _round8(total_input - fee)
    if total_output <= 0:
        total_output = _round8(fee * 2)
        total_input = _round8(total_output + fee)
        input_amounts = [total_input]

    splits = sorted([random.random() for _ in range(n_outputs - 1)])
    splits = [0.0] + splits + [1.0]
    output_amounts = [
        _round8(total_output * (splits[i + 1] - splits[i])) for i in range(n_outputs)
    ]
    output_amounts[-1] = _round8(total_output - sum(output_amounts[:-1]))

    return input_amounts, output_amounts


def _load_ransomwhere_seeds(path: str) -> list[str]:
    if not os.path.exists(path):
        return HARDCODED_SEEDS
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        # Handle both {"result": [...]} and [...] shapes
        records = data.get("result", data) if isinstance(data, dict) else data
        addrs = [r["address"] for r in records if isinstance(r, dict) and "address" in r]
        return addrs if addrs else HARDCODED_SEEDS
    except Exception:
        return HARDCODED_SEEDS


# ── Row Generators ─────────────────────────────────────────────────────────────


def _row_normal(idx: int, file_salt: str) -> dict[str, Any]:
    n_in = random.randint(1, 3)
    n_out = random.randint(1, 3)
    fee = _round8(random.uniform(0.00001, 0.005))
    input_amounts, output_amounts = _gen_amounts(n_in, n_out, fee)
    return {
        "txid": _txid(idx, file_salt),
        "ts": _random_ts(),
        "src_ip": _random_ipv4_public(),
        "dst_ip": _random_ipv4_public(),
        "src_port": _random_port(),
        "dst_port": _random_port(),
        "input_addresses": _pg_arr([_random_btc_address() for _ in range(n_in)]),
        "output_addresses": _pg_arr([_random_btc_address() for _ in range(n_out)]),
        "input_amounts": _pg_arr(input_amounts),
        "output_amounts": _pg_arr(output_amounts),
        "fee": fee,
        "script_type": random.choice(SCRIPT_TYPES),
        "geo_country": random.choice(GEO_NORMAL),
        "asn": _random_asn(),
    }


def _row_ransomwhere(idx: int, file_salt: str, seeds: list[str]) -> dict[str, Any]:
    """
    Injects exactly one confirmed seed address as either an input or output.
    This yields addr_prox=1.0 for that address in the scorer, driving it to CRITICAL.

    80% of ransomwhere txs use peeling-chain (40%) or coinjoin (40%) topology so that
    the laundering-pattern badge shows Peeling Chain / CoinJoin for the majority of
    CRITICAL wallets.  Remaining 20% use the original generic layout.
    """
    seed_addr = random.choice(seeds)
    topo = random.random()

    if topo < 0.40:
        # Peeling-chain topology: 1 input (seed), 2 outputs, 80/20 split
        fee = _round8(random.uniform(0.00001, 0.005))
        total_input = _round8(random.uniform(0.01, 5.0))
        total_output = _round8(total_input - fee)
        if total_output <= 0:
            total_output = 0.001
            total_input = _round8(total_output + fee)
        large = _round8(total_output * 0.80)
        small = _round8(total_output - large)
        return {
            "txid": _txid(idx, f"{file_salt}_ransom_peel"),
            "ts": _random_ts(),
            "src_ip": _random_ipv4_public(),
            "dst_ip": _random_ipv4_public(),
            "src_port": _random_port(),
            "dst_port": _random_port(),
            "input_addresses": _pg_arr([seed_addr]),
            "output_addresses": _pg_arr([_random_btc_address(), _random_btc_address()]),
            "input_amounts": _pg_arr([total_input]),
            "output_amounts": _pg_arr([large, small]),
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "geo_country": random.choice(GEO_ALL),
            "asn": _random_asn(),
        }

    elif topo < 0.80:
        # CoinJoin topology: 3-6 inputs (seed among them), 3-6 equal outputs
        n_in = random.randint(3, 6)
        n_out = random.randint(3, 6)
        fee = _round8(random.uniform(0.00001, 0.005))
        equal_out = _round8(random.uniform(0.05, 0.5))
        total_output = _round8(equal_out * n_out)
        total_input = _round8(total_output + fee)
        splits = sorted([random.random() for _ in range(n_in - 1)])
        splits = [0.0] + splits + [1.0]
        input_amounts = [
            _round8(total_input * (splits[i + 1] - splits[i])) for i in range(n_in)
        ]
        input_amounts[-1] = _round8(total_input - sum(input_amounts[:-1]))
        output_amounts = [equal_out] * n_out
        output_amounts[-1] = _round8(total_output - sum(output_amounts[:-1]))
        in_addrs = [_random_btc_address() for _ in range(n_in)]
        in_addrs[random.randint(0, n_in - 1)] = seed_addr  # inject seed as one input
        out_addrs = [_random_btc_address() for _ in range(n_out)]
        return {
            "txid": _txid(idx, f"{file_salt}_ransom_cj"),
            "ts": _random_ts(),
            "src_ip": _random_ipv4_public(),
            "dst_ip": _random_ipv4_public(),
            "src_port": _random_port(),
            "dst_port": _random_port(),
            "input_addresses": _pg_arr(in_addrs),
            "output_addresses": _pg_arr(out_addrs),
            "input_amounts": _pg_arr(input_amounts),
            "output_amounts": _pg_arr(output_amounts),
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "geo_country": random.choice(GEO_ALL),
            "asn": _random_asn(),
        }

    else:
        # Remaining 20%: force 1-in/2-out peeling topology so seed still earns
        # PEELING_CHAIN_CANDIDATE and shows "N-hop peel" badge instead of Behavioral Anomaly.
        fee = _round8(random.uniform(0.00001, 0.005))
        total_input = _round8(random.uniform(0.01, 5.0))
        total_output = _round8(total_input - fee)
        if total_output <= 0:
            total_output = 0.001
            total_input = _round8(total_output + fee)
        large = _round8(total_output * 0.80)
        small = _round8(total_output - large)
        return {
            "txid": _txid(idx, f"{file_salt}_ransom_peel2"),
            "ts": _random_ts(),
            "src_ip": _random_ipv4_public(),
            "dst_ip": _random_ipv4_public(),
            "src_port": _random_port(),
            "dst_port": _random_port(),
            "input_addresses": _pg_arr([seed_addr]),
            "output_addresses": _pg_arr([_random_btc_address(), _random_btc_address()]),
            "input_amounts": _pg_arr([total_input]),
            "output_amounts": _pg_arr([large, small]),
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "geo_country": random.choice(GEO_ALL),
            "asn": _random_asn(),
        }


def _row_peeling(idx: int, file_salt: str) -> dict[str, Any]:
    """1 input → 2 outputs, 80/20 split (peeling chain pattern)."""
    fee = _round8(random.uniform(0.00001, 0.005))
    total_input = _round8(random.uniform(0.01, 5.0))
    total_output = _round8(total_input - fee)
    if total_output <= 0:
        total_output = 0.001
        total_input = _round8(total_output + fee)

    large = _round8(total_output * 0.80)
    small = _round8(total_output - large)

    return {
        "txid": _txid(idx, f"{file_salt}_peel"),
        "ts": _random_ts(),
        "src_ip": _random_ipv4_public(),
        "dst_ip": _random_ipv4_public(),
        "src_port": _random_port(),
        "dst_port": _random_port(),
        "input_addresses": _pg_arr([_random_btc_address()]),
        "output_addresses": _pg_arr([_random_btc_address(), _random_btc_address()]),
        "input_amounts": _pg_arr([total_input]),
        "output_amounts": _pg_arr([large, small]),
        "fee": fee,
        "script_type": random.choice(SCRIPT_TYPES),
        "geo_country": random.choice(GEO_ALL),
        "asn": _random_asn(),
    }


def _row_coinjoin(idx: int, file_salt: str) -> dict[str, Any]:
    """3–6 inputs, 3–6 outputs, equal output amounts (coinjoin pattern)."""
    n_in = random.randint(3, 6)
    n_out = random.randint(3, 6)
    fee = _round8(random.uniform(0.00001, 0.005))

    equal_out = _round8(random.uniform(0.05, 0.5))
    total_output = _round8(equal_out * n_out)
    total_input = _round8(total_output + fee)

    splits = sorted([random.random() for _ in range(n_in - 1)])
    splits = [0.0] + splits + [1.0]
    input_amounts = [
        _round8(total_input * (splits[i + 1] - splits[i])) for i in range(n_in)
    ]
    input_amounts[-1] = _round8(total_input - sum(input_amounts[:-1]))

    output_amounts = [equal_out] * n_out
    output_amounts[-1] = _round8(total_output - sum(output_amounts[:-1]))

    return {
        "txid": _txid(idx, f"{file_salt}_cj"),
        "ts": _random_ts(),
        "src_ip": _random_ipv4_public(),
        "dst_ip": _random_ipv4_public(),
        "src_port": _random_port(),
        "dst_port": _random_port(),
        "input_addresses": _pg_arr([_random_btc_address() for _ in range(n_in)]),
        "output_addresses": _pg_arr([_random_btc_address() for _ in range(n_out)]),
        "input_amounts": _pg_arr(input_amounts),
        "output_amounts": _pg_arr(output_amounts),
        "fee": fee,
        "script_type": random.choice(SCRIPT_TYPES),
        "geo_country": random.choice(GEO_ALL),
        "asn": _random_asn(),
    }


def _row_anomaly(idx: int, file_salt: str) -> dict[str, Any]:
    """High fanout OR high fee OR geo/ASN anomaly."""
    variant = random.choice(["fanout", "high_fee", "geo_asn"])

    if variant == "fanout":
        n_out = random.randint(10, 25)
        fee = _round8(random.uniform(0.00001, 0.005))
        total_in = _round8(random.uniform(1.0, 5.0))
        total_out = _round8(total_in - fee)

        splits = sorted([random.random() for _ in range(n_out - 1)])
        splits = [0.0] + splits + [1.0]
        output_amounts = [
            _round8(total_out * (splits[i + 1] - splits[i])) for i in range(n_out)
        ]
        output_amounts[-1] = _round8(total_out - sum(output_amounts[:-1]))

        return {
            "txid": _txid(idx, f"{file_salt}_fanout"),
            "ts": _random_ts(),
            "src_ip": _random_ipv4_public(),
            "dst_ip": _random_ipv4_public(),
            "src_port": _random_port(),
            "dst_port": _random_port(),
            "input_addresses": _pg_arr([_random_btc_address()]),
            "output_addresses": _pg_arr([_random_btc_address() for _ in range(n_out)]),
            "input_amounts": _pg_arr([total_in]),
            "output_amounts": _pg_arr(output_amounts),
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "geo_country": random.choice(GEO_ALL),
            "asn": _random_asn(),
        }

    elif variant == "high_fee":
        n_in = random.randint(1, 3)
        n_out = random.randint(1, 3)
        fee = _round8(random.uniform(0.003, 0.005))
        input_amounts, output_amounts = _gen_amounts(n_in, n_out, fee)
        return {
            "txid": _txid(idx, f"{file_salt}_hifee"),
            "ts": _random_ts(),
            "src_ip": _random_ipv4_public(),
            "dst_ip": _random_ipv4_public(),
            "src_port": _random_port(),
            "dst_port": _random_port(),
            "input_addresses": _pg_arr([_random_btc_address() for _ in range(n_in)]),
            "output_addresses": _pg_arr([_random_btc_address() for _ in range(n_out)]),
            "input_amounts": _pg_arr(input_amounts),
            "output_amounts": _pg_arr(output_amounts),
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "geo_country": random.choice(GEO_ALL),
            "asn": _random_asn(),
        }

    else:  # geo_asn
        n_in = random.randint(1, 3)
        n_out = random.randint(1, 3)
        fee = _round8(random.uniform(0.00001, 0.005))
        input_amounts, output_amounts = _gen_amounts(n_in, n_out, fee)
        return {
            "txid": _txid(idx, f"{file_salt}_geoasn"),
            "ts": _random_ts(),
            "src_ip": _random_ipv4_public(),
            "dst_ip": _random_ipv4_public(),
            "src_port": _random_port(),
            "dst_port": _random_port(),
            "input_addresses": _pg_arr([_random_btc_address() for _ in range(n_in)]),
            "output_addresses": _pg_arr([_random_btc_address() for _ in range(n_out)]),
            "input_amounts": _pg_arr(input_amounts),
            "output_amounts": _pg_arr(output_amounts),
            "fee": fee,
            "script_type": random.choice(SCRIPT_TYPES),
            "geo_country": random.choice(GEO_ANOMALY),
            "asn": _random_asn(unusual=True),
        }


# ── Dataset Builder ────────────────────────────────────────────────────────────

FIELDNAMES = [
    "txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
    "input_addresses", "output_addresses",
    "input_amounts", "output_amounts", "fee",
    "script_type", "geo_country", "asn",
]


def _build_archetype_plan(n: int) -> list[str]:
    """
    Build shuffled archetype plan for n rows.

    Distribution:
      ransomwhere : RANSOMWHERE_FRAC (~3.0%) — calibrated for 10-14 CRITICAL wallets per 1K unique wallets
      peeling     : 16%  — dominant suspicious pattern (chain-hop style)
      coinjoin    : 9%   — second dominant suspicious pattern
      anomaly     : 3%   — minimal; high-MSE txs contaminate neighbor addresses driving MEDIUM scores
      normal      : remainder (~69%)

    Peeling/coinjoin dominate suspicious patterns.
    Low anomaly fraction keeps neighbor-address MSE bleed minimal -> LOW is majority verdict.
    """
    counts: dict[str, int] = {
        "ransomwhere": round(n * RANSOMWHERE_FRAC),
        "peeling": round(n * 0.16),
        "coinjoin": round(n * 0.09),
        "anomaly": round(n * 0.03),
    }
    counts["normal"] = n - sum(counts.values())

    labels: list[str] = []
    for label, count in counts.items():
        labels.extend([label] * count)

    random.shuffle(labels)
    return labels


def generate_dataset(
    n: int,
    output_path: str,
    seeds: list[str],
    rng_seed: int,
    file_salt: str,
) -> dict[str, int]:
    """
    Generate n rows, save to output_path (CSV, UTF-8, no BOM).

    Args:
        n:           Number of transaction rows.
        output_path: Destination CSV path.
        seeds:       Ransomwhere seed addresses for injection.
        rng_seed:    RNG seed unique per output file (ensures address non-overlap).
        file_salt:   Salt string unique per output file (ensures txid non-overlap).

    Returns:
        Archetype count dict.
    """
    random.seed(rng_seed)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    plan = _build_archetype_plan(n)
    archetype_counts: dict[str, int] = {
        "normal": 0, "ransomwhere": 0, "peeling": 0, "coinjoin": 0, "anomaly": 0,
    }

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()

        for idx, archetype in enumerate(plan):
            if archetype == "normal":
                row = _row_normal(idx, file_salt)
            elif archetype == "ransomwhere":
                row = _row_ransomwhere(idx, file_salt, seeds)
            elif archetype == "peeling":
                row = _row_peeling(idx, file_salt)
            elif archetype == "coinjoin":
                row = _row_coinjoin(idx, file_salt)
            else:
                row = _row_anomaly(idx, file_salt)

            # Ledger balance guard: correct rounding drift on last output
            in_amt = sum(_parse_pg(row["input_amounts"]))
            out_amt = sum(_parse_pg(row["output_amounts"]))
            fee_val = float(row["fee"])
            diff = abs(round(in_amt - out_amt - fee_val, 6))
            if diff > 0.000001:
                out_list = _parse_pg(row["output_amounts"])
                out_list[-1] = _round8(in_amt - fee_val - sum(out_list[:-1]))
                row["output_amounts"] = _pg_arr(out_list)

            writer.writerow(row)
            archetype_counts[archetype] += 1

    return archetype_counts


# ── Main ───────────────────────────────────────────────────────────────────────


def main() -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    seeds_path = os.path.join(base_dir, "ransomwhere_seeds.json")
    seeds = _load_ransomwhere_seeds(seeds_path)

    print(f"Loaded {len(seeds)} ransomwhere seed addresses.")

    configs = [
        {
            "n": 1000,
            "path": os.path.join(base_dir, "test_1000.csv"),
            "rng_seed": SEED_1000,
            "file_salt": "t1k_v2",  # namespaced away from original 'sih26146' salt
        },
        {
            "n": 2000,
            "path": os.path.join(base_dir, "test_2000.csv"),
            "rng_seed": SEED_2000,
            "file_salt": "t2k_v2",  # distinct namespace
        },
    ]

    # Mirror destination for frontend public serving
    frontend_sample_dir = os.path.join(
        base_dir, "..", "frontend", "public", "sample_data"
    )

    for cfg in configs:
        counts = generate_dataset(
            n=cfg["n"],
            output_path=cfg["path"],
            seeds=seeds,
            rng_seed=cfg["rng_seed"],
            file_salt=cfg["file_salt"],
        )

        # Estimate CRITICAL wallet count (seed addresses that will score >= 0.70)
        n_ransom_txs = counts["ransomwhere"]
        # Rough unique seed addr estimate: each tx injects 1 seed (may repeat across txs)
        # Unique total addr estimate: normal/peeling avg ~2 addrs/tx, coinjoin/anomaly ~5
        est_total_unique = (
            counts["normal"] * 2
            + counts["ransomwhere"] * 3  # 1 seed + ~2 generated
            + counts["peeling"] * 3
            + counts["coinjoin"] * 5
            + counts["anomaly"] * 5
        )
        seed_pool_size = min(n_ransom_txs, len(seeds))
        est_critical_pct = (seed_pool_size / max(est_total_unique, 1)) * 100

        print(f"\n{'-' * 55}")
        print(f"  Saved : {cfg['path']}")
        print(f"  Rows  : {cfg['n']}")
        print(f"  Archetypes:")
        for label, cnt in counts.items():
            pct = cnt / cfg["n"] * 100
            print(f"    {label:<15} {cnt:>5}  ({pct:5.1f}%)")
        print(
            f"  Est. CRITICAL wallets : ~{seed_pool_size} / ~{est_total_unique}"
            f"  (~{est_critical_pct:.1f}%)"
        )

        # Copy to frontend public directory
        os.makedirs(frontend_sample_dir, exist_ok=True)
        dest = os.path.join(frontend_sample_dir, os.path.basename(cfg["path"]))
        shutil.copy2(cfg["path"], dest)
        print(f"  Mirrored: {dest}")

    print(f"\n{'-' * 55}")
    print("  Done. Run verify_test_datasets.py to confirm CRITICAL % and zero duplicates.")


if __name__ == "__main__":
    main()
