"""
Synthetic Bitcoin transaction dataset generator for ML-based money laundering detection.

Generates test_1000.csv and test_2000.csv with:
- Genuine cross-transaction address reuse and graph topology: a power-law wallet
  degree pool, heavy src_ip/dst_ip reuse, thousands of wallets that are both input
  and output (so CO_SPEND edges form) and a small number of connected components
  instead of thousands of isolated stars.
- Multi-hop laundering chains: every "peeling" row belongs to a threaded chain
  (5-8 hops) where hop N+1 spends the large peel output of hop N, so a chain
  detector can actually walk them.
- Zero duplicate txids (unique per-file salts, namespaced away from the 100K rows)
- Zero duplicate Bitcoin addresses across both files
- 3.0% of rows inject a ransomwhere seed address (drives CRITICAL verdicts)
- Archetype mix: ransomwhere ~3%, peeling chains ~21%, coinjoin ~9%, anomaly ~3%,
  normal ~64%

Column schema (14 cols): txid, ts, src_ip, dst_ip, src_port, dst_port,
  input_addresses, output_addresses, input_amounts, output_amounts,
  fee, script_type, geo_country, asn
Array columns use Postgres literal format: {addr1,addr2}

Topology budget note
--------------------
Two requirements pull against each other: a high distinct-wallet count (~4 per
row) and a high share of wallets that appear in more than one transaction.  With
every multi-tx wallet costing at least 2 address slots, hitting both requires
~9-10 address slots per transaction.  NORMAL_IN_WEIGHTS/NORMAL_OUT_WEIGHTS below
are therefore deliberately skewed (most rows stay small, a long tail carries the
fanout) rather than flat.  Measured on the current output: ~9.5 addresses/row,
~8,100 distinct wallets, ~73% of them in more than one transaction.

Fees moved from a flat uniform draw to a log-normal sat/vbyte rate (median ~15
sat/vB) scaled by the transaction's virtual size, which is what the backend
reference generator does; the high-fee anomaly archetype keeps a 300-500 sat/vB
rate so the fee-anomaly signal still exists.

Seeds (fixed, reproducible):
  test_1000.csv -> random.seed(SEED_1000)  (73819)
  test_2000.csv -> random.seed(SEED_2000)  (94561)
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import os
import random
import shutil
from collections import deque
from datetime import datetime, timedelta, timezone
from typing import Any

# ── Constants ──────────────────────────────────────────────────────────────────

# Per-file SEED constants — different seeds = different RNG state = non-overlapping addresses/txids
SEED_1000 = 73819  # Never used before; namespaced away from SEED=42 (main 100K dataset)
SEED_2000 = 94561  # Distinct from SEED_1000 — ensures zero cross-file address collision

BASE58_CHARS = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

# P2WSH excluded — not in backend VALID_SCRIPT_TYPES
SCRIPT_TYPES = ["P2PKH", "P2SH", "P2WPKH", "P2TR"]

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

# Distinct ransomwhere seeds drawn from ransomwhere_seeds.json.  Re-using a small
# pool (instead of sampling 11k unique seeds) gives the seed wallets real topology.
SEED_POOL_SIZE = 48

# ── Archetype mix ──────────────────────────────────────────────────────────────

COINJOIN_FRAC = 0.09
ANOMALY_FRAC = 0.03

# Every "peeling" row is a hop inside a threaded multi-hop chain.
PEEL_TXN_FRAC = 0.208
CHAIN_MIN_HOPS = 5
CHAIN_MAX_HOPS = 8
CHAIN_MEAN_HOPS = (CHAIN_MIN_HOPS + CHAIN_MAX_HOPS) / 2

# ── Topology budget ────────────────────────────────────────────────────────────

# Distinct wallets targeted per transaction row (x2000 rows ~= 8,100 wallets).
WALLETS_PER_TX = 4.05
# Share of distinct wallets that must appear in more than one transaction.
MULTI_TX_TARGET_FRAC = 0.72

# Degree tiers.  Tier 1/2 give the max-tx-count-per-wallet the hundreds range,
# tier 3 is the recurrent body, tier 4 is the one-shot leaf population.  The
# hub/heavy tiers are what collapse the src_ip space onto a few endpoints, so
# their counts are kept small and scale with the row count.
HUB_COUNT_PER_2K = 4
HUB_DEGREE_RANGE = (120, 260)
HUB_DEGREE_ALPHA = 1.6
HEAVY_COUNT_PER_2K = 40
HEAVY_DEGREE_RANGE = (15, 60)
HEAVY_DEGREE_ALPHA = 1.8
CORE_DEGREE_RANGE = (2, 14)
CORE_DEGREE_ALPHA = 1.9

# ── Network layer ──────────────────────────────────────────────────────────────

# Predefined realistic ASN / country / IP clusters (ported from
# backend/scripts/generate_synthetic_data.py).  host_octets bounds the per-pool
# address space so IPs are heavily reused across transactions.
NETWORK_POOLS = [
    {"country": "US", "asn": 15169, "ip_prefix": "8.8.8.", "host_octets": 200},
    {"country": "US", "asn": 13335, "ip_prefix": "1.1.1.", "host_octets": 200},
    {"country": "US", "asn": 16509, "ip_prefix": "54.240.196.", "host_octets": 200},
    {"country": "DE", "asn": 24940, "ip_prefix": "88.198.45.", "host_octets": 200},
    {"country": "FR", "asn": 12876, "ip_prefix": "62.210.100.", "host_octets": 200},
    {"country": "NL", "asn": 49544, "ip_prefix": "185.107.56.", "host_octets": 200},
    {"country": "GB", "asn": 2856, "ip_prefix": "81.100.12.", "host_octets": 200},
    {"country": "SG", "asn": 4657, "ip_prefix": "203.116.1.", "host_octets": 200},
    {"country": "JP", "asn": 2516, "ip_prefix": "210.140.10.", "host_octets": 200},
    {"country": "CH", "asn": 3303, "ip_prefix": "194.230.79.", "host_octets": 200},
    {"country": "IN", "asn": 24560, "ip_prefix": "49.36.0.", "host_octets": 200},
    {"country": "BR", "asn": 28573, "ip_prefix": "177.71.128.", "host_octets": 200},
]

GEO_ANOMALY = ["IR", "KZ", "UA"]

# Bitcoin P2P ports.  8333 mainnet, 18333 testnet (used by Tor-native nodes).
P2P_PORT = 8333
P2P_PORT_ALT = 18333
TOR_P2P_PORT_FRAC = 0.05

# ── Fee model ──────────────────────────────────────────────────────────────────

# Log-normal sat/vbyte: median ~15 sat/vB, long right tail (ported from the
# backend reference generator).  Clamped so the fee can never eat the input.
FEE_RATE_LOG_MU = 2.7
FEE_RATE_LOG_SIGMA = 0.65
FEE_RATE_MIN_SAT_VB = 1.0
FEE_RATE_MAX_SAT_VB = 400.0
FEE_RATE_ANOMALY_SAT_VB = (300.0, 500.0)

MIN_TX_VBYTES = 10
VBYTES_PER_INPUT = 68
VBYTES_PER_OUTPUT = 31
MIN_FEE_SATS = 150

# Keeps the largest fanout split above dust.
MIN_TX_TOTAL_INPUT = 0.02

# CoinJoin: each participant contributes denomination + a fixed share of the fee.
COINJOIN_DENOMS = [0.05, 0.1, 0.25, 0.5, 1.0]
COINJOIN_PARTICIPANTS_RANGE = (4, 12)
COINJOIN_CHANGE_PROB = 0.75
COINJOIN_FEE_PER_USER = 0.0001

# Anomaly — high fanout transaction.
ANOMALY_FANOUT_RANGE = (10, 30)

# Peeling chain economics.
CHAIN_START_AMOUNT_RANGE = (2.0, 25.0)
CHAIN_PEEL_PCT_RANGE = (0.01, 0.05)
CHAIN_MIN_RELAY_AMOUNT = 0.005

# Fanout distributions for "normal" rows.  Skewed so the median row stays small
# while the mean carries the address-slot budget the topology needs.
NORMAL_IN_WEIGHTS: tuple[list[int], list[float]] = (
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
    [0.16, 0.18, 0.16, 0.13, 0.11, 0.09, 0.08, 0.05, 0.04],
)
NORMAL_OUT_WEIGHTS: tuple[list[int], list[float]] = (
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    [0.09, 0.12, 0.11, 0.105, 0.10, 0.09, 0.08, 0.075, 0.065, 0.055, 0.045, 0.03, 0.02, 0.01],
)


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


def _network_event(pool_idx: int, host: int | None = None) -> dict[str, Any]:
    """Correlated network-layer event for one transaction (IP, ASN, country)."""
    pool = NETWORK_POOLS[pool_idx]
    octet = random.randint(1, pool["host_octets"]) if host is None else host
    return {
        "src_ip": f"{pool['ip_prefix']}{octet}",
        "dst_ip": None,  # filled by _attach_dst
        "src_port": random.randint(1025, 65535),
        "dst_port": P2P_PORT_ALT if random.random() < TOR_P2P_PORT_FRAC else P2P_PORT,
        "geo_country": pool["country"],
        "asn": pool["asn"],
    }


def _attach_dst(event: dict[str, Any]) -> dict[str, Any]:
    """Pick the destination peer from a (possibly different) network pool."""
    pool = NETWORK_POOLS[random.randrange(len(NETWORK_POOLS))]
    event["dst_ip"] = f"{pool['ip_prefix']}{random.randint(1, pool['host_octets'])}"
    return event


def _random_asn(unusual: bool = False) -> int:
    if unusual:
        return random.randint(900000, 999999)
    return random.randint(1000, 65535)


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


def _split_outputs(total_out: float, n_out: int) -> list[float]:
    """Split total_out into n_out parts summing back to total_out exactly."""
    if n_out == 1:
        return [_round8(total_out)]
    cuts = sorted(random.random() for _ in range(n_out - 1))
    bounds = [0.0] + cuts + [1.0]
    outputs = [
        _round8(total_out * (bounds[i + 1] - bounds[i])) for i in range(n_out)
    ]
    outputs[-1] = _round8(total_out - sum(outputs[:-1]))
    return outputs


def _sample_fee_rate() -> float:
    """Log-normal sat/vbyte fee rate (Box-Muller), clamped to a sane band."""
    u1 = max(random.random(), 1e-10)
    u2 = max(random.random(), 1e-10)
    z = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
    rate = math.exp(FEE_RATE_LOG_MU + FEE_RATE_LOG_SIGMA * z)
    return min(FEE_RATE_MAX_SAT_VB, max(FEE_RATE_MIN_SAT_VB, rate))


def _fee_for(n_in: int, n_out: int, rate: float | None = None) -> float:
    """Fee in BTC from a fee rate and the tx's virtual size."""
    sat_per_vb = _sample_fee_rate() if rate is None else rate
    vbytes = MIN_TX_VBYTES + n_in * VBYTES_PER_INPUT + n_out * VBYTES_PER_OUTPUT
    return _round8(max(MIN_FEE_SATS, int(vbytes * sat_per_vb)) / 1e8)


def _weighted_count(weights: tuple[list[int], list[float]]) -> int:
    values, probs = weights
    return random.choices(values, weights=probs, k=1)[0]


def _pareto_unit(alpha: float) -> float:
    """Pareto(alpha) draw normalised to (0, 1]; heavier tail for lower alpha."""
    u = max(random.random(), 1e-12)
    return (1.0 - u) ** (-1.0 / (alpha - 1.0))


def _fit_degrees(
    n: int, lo: int, hi: int, target_sum: int, alpha: float
) -> list[int]:
    """
    n integer degrees in [lo, hi] whose sum is exactly target_sum, distributed
    with a power-law (Pareto) shape.  Deterministic for a seeded global RNG.
    """
    if n <= 0:
        return []
    target_sum = max(lo * n, min(hi * n, target_sum))

    shape = [_pareto_unit(alpha) for _ in range(n)]
    peak = max(shape)
    unit = [s / peak for s in shape]  # in (0, 1], 1.0 = highest degree

    head_room = target_sum - lo * n
    span = hi - lo
    degrees = [lo + (head_room * u) / span for u in unit]
    degrees = [max(lo, min(hi, int(math.floor(d)))) for d in degrees]

    # Reconcile the integer rounding residue without breaking the [lo, hi] band.
    # The residue is spread over a shuffled index order so it does not flatten the
    # power-law shape the sampled degrees just produced.
    residue = target_sum - sum(degrees)
    order = list(range(n))
    random.shuffle(order)
    guard = 0
    while residue > 0 and guard < 64 * n:
        for i in order:
            if residue <= 0:
                break
            if degrees[i] < hi:
                degrees[i] += 1
                residue -= 1
        guard += 1
    guard = 0
    while residue < 0 and guard < 64 * n:
        for i in order:
            if residue >= 0:
                break
            if degrees[i] > lo:
                degrees[i] -= 1
                residue += 1
        guard += 1

    return degrees


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


# ── Wallet pool ────────────────────────────────────────────────────────────────


class WalletPool:
    """
    Degree-constrained wallet population.

    ``slots`` is a FIFO multiset holding every wallet repeated by its degree.
    Drawing from it consumes exactly one address slot per draw, so a wallet's
    degree is honoured exactly and no wallet can be pulled out of existence.
    """

    def __init__(
        self,
        addresses: list[str],
        degrees: list[int],
        egress: dict[int, tuple[int, int | None]],
        index_of: dict[str, int],
    ) -> None:
        self.addresses = addresses
        self.slots: deque[str] = deque()
        for addr, deg in zip(addresses, degrees):
            self.slots.extend([addr] * deg)
        # Address -> position in the pool; hub/heavy positions carry a fixed egress.
        self.egress = egress
        self.index_of = index_of

    def draw(self, n: int, used: set[str]) -> list[str]:
        """Draw n distinct addresses, deferring collisions within the same row."""
        chosen: list[str] = []
        deferred: list[str] = []
        while len(chosen) < n and self.slots:
            addr = self.slots.popleft()
            if addr in used:
                deferred.append(addr)
            else:
                chosen.append(addr)
                used.add(addr)
        self.slots.extendleft(reversed(deferred))
        return chosen

    def egress_endpoint_for(self, addresses: list[str]) -> tuple[int, int | None] | None:
        """Egress endpoint of the first hub/heavy wallet in the row, if any."""
        for addr in addresses:
            pos = self.index_of.get(addr)
            if pos is not None and pos in self.egress:
                return self.egress[pos]
        return None


def _build_wallet_pool(pool_slots: int, target_distinct: int, n: int) -> WalletPool:
    """
    Build the wallet population that will be threaded through every row.

    pool_slots        number of address slots the rows consume from the pool
    target_distinct   distinct wallets wanted across the whole file
    n                 row count, used to scale the hub/heavy tiers
    """
    n_hubs = max(2, round(n * HUB_COUNT_PER_2K / 2000))
    n_heavy = max(10, round(n * HEAVY_COUNT_PER_2K / 2000))
    n_ordinary = max(1, target_distinct - n_hubs - n_heavy)

    hub_degree = _fit_degrees(
        n_hubs, HUB_DEGREE_RANGE[0], HUB_DEGREE_RANGE[1],
        int(sum(HUB_DEGREE_RANGE) / 2 * n_hubs), HUB_DEGREE_ALPHA,
    )
    heavy_degree = _fit_degrees(
        n_heavy, HEAVY_DEGREE_RANGE[0], HEAVY_DEGREE_RANGE[1],
        int(sum(HEAVY_DEGREE_RANGE) / 2 * n_heavy), HEAVY_DEGREE_ALPHA,
    )
    reserved = sum(hub_degree) + sum(heavy_degree)
    budget = pool_slots - reserved

    # Tier 3: recurrent body.  Tier 4: one-shot leaves.  The pool's degree sum
    # must be exactly pool_slots, otherwise the queue either runs dry (every draw
    # degrades into a fresh leaf) or leaves wallets that never appear.  Trading
    # core wallets for leaves is what buys the remaining core its minimum degree.
    n_leaves = min(n_ordinary, round((1.0 - MULTI_TX_TARGET_FRAC) * n_ordinary))
    n_core = n_ordinary - n_leaves
    while n_core and budget - n_leaves < CORE_DEGREE_RANGE[0] * n_core and n_leaves < n_ordinary:
        n_leaves += 1
        n_core -= 1
    core_budget = budget - n_leaves
    if core_budget > CORE_DEGREE_RANGE[1] * n_core:
        # Core cannot absorb the whole budget; the surplus becomes extra leaves.
        n_leaves += core_budget - CORE_DEGREE_RANGE[1] * n_core
        core_budget = CORE_DEGREE_RANGE[1] * n_core
    core_degree = _fit_degrees(
        n_core, CORE_DEGREE_RANGE[0], CORE_DEGREE_RANGE[1], core_budget, CORE_DEGREE_ALPHA
    )
    leaf_degree = [1] * n_leaves

    addresses = [_random_btc_address() for _ in range(n_hubs + n_heavy + n_ordinary)]
    degrees = hub_degree + heavy_degree + core_degree + leaf_degree

    # Hub wallets keep a fully fixed egress endpoint (one IP for hundreds of rows).
    # Heavy wallets only pin the network pool and let the host octet vary, which
    # correlates country/ASN with the wallet without collapsing the IP space.
    egress: dict[int, tuple[int, int | None]] = {}
    for j in range(n_hubs):
        egress[j] = (random.randrange(len(NETWORK_POOLS)), random.randint(1, 8))
    for j in range(n_heavy):
        egress[n_hubs + j] = (random.randrange(len(NETWORK_POOLS)), None)

    index_of = {addr: pos for pos, addr in enumerate(addresses[: n_hubs + n_heavy])}
    return WalletPool(addresses, degrees, egress, index_of)


# ── Row skeletons ──────────────────────────────────────────────────────────────


def _skeleton(
    archetype: str,
    n_in: int,
    n_out: int,
    fee: float,
    input_amounts: list[float],
    output_amounts: list[float],
    event: dict[str, Any],
    script_type: str,
    chain_id: int | None = None,
    hop_index: int = 0,
    seed_slot: tuple[str, int] | None = None,
) -> dict[str, Any]:
    # "idx" and "file_salt" are attached by generate_dataset() once the row's
    # final position is known, so the txid namespace is the post-shuffle one.
    return {
        "archetype": archetype,
        "idx": -1,
        "file_salt": "",
        "n_in": n_in,
        "n_out": n_out,
        "fee": fee,
        "input_amounts": input_amounts,
        "output_amounts": output_amounts,
        "event": event,
        "script_type": script_type,
        "chain_id": chain_id,
        "hop_index": hop_index,
        "seed_slot": seed_slot,
    }


def _skeleton_normal() -> dict[str, Any]:
    """Power-law wallet activity: 1-8 inputs, 1-12 outputs, correlated network event."""
    n_in = _weighted_count(NORMAL_IN_WEIGHTS)
    n_out = _weighted_count(NORMAL_OUT_WEIGHTS)
    fee = _fee_for(n_in, n_out)

    raw = [_round8(max(0.0005, math.exp(random.gauss(-2.5, 1.2)))) for _ in range(n_in)]
    total_in = _round8(sum(raw))
    if total_in < MIN_TX_TOTAL_INPUT:
        scale = MIN_TX_TOTAL_INPUT / total_in
        raw = [_round8(a * scale) for a in raw]
        total_in = _round8(sum(raw))

    input_amounts = raw
    output_amounts = _split_outputs(_round8(total_in - fee), n_out)
    return _skeleton(
        "normal", n_in, n_out, fee,
        input_amounts, output_amounts,
        _attach_dst(_network_event(random.randrange(len(NETWORK_POOLS)))),
        random.choice(SCRIPT_TYPES),
    )


def _skeleton_chain_hop(
    chain_id: int,
    hop_index: int,
    relay_amount: float,
    event: dict[str, Any],
) -> tuple[dict[str, Any], float]:
    """
    One hop of a peeling chain: 1 input -> 2 outputs (small peeled change + the
    large peel that the next hop spends).  Returns the skeleton and the next hop's
    relay amount.
    """
    fee = _fee_for(1, 2)
    total_in = _round8(relay_amount)
    available = _round8(total_in - fee)
    small = _round8(available * random.uniform(*CHAIN_PEEL_PCT_RANGE))
    peel = _round8(available - small)

    sk = _skeleton(
        "peeling", 1, 2, fee,
        [total_in], [small, peel], event, "P2WPKH",
        chain_id=chain_id, hop_index=hop_index,
    )
    return sk, peel


def _skeleton_coinjoin() -> dict[str, Any]:
    """
    CoinJoin-like: n participants each contribute denom + fee share; outputs are
    exactly equal denominations plus an optional change output per participant.
    """
    lo, hi = COINJOIN_PARTICIPANTS_RANGE
    n_part = random.randint(lo, hi)
    denom = _round8(random.choice(COINJOIN_DENOMS))
    n_in = n_part
    n_change = sum(1 for _ in range(n_part) if random.random() < COINJOIN_CHANGE_PROB)
    n_out = n_part + n_change

    input_amounts = [
        _round8(denom + COINJOIN_FEE_PER_USER + random.uniform(0.001, 0.01))
        for _ in range(n_part)
    ]
    output_amounts = [denom] * n_part
    total_in = _round8(sum(input_amounts))
    for amt in input_amounts:
        change = _round8(amt - denom - COINJOIN_FEE_PER_USER)
        if change > 0:
            output_amounts.append(change)

    fee = _round8(COINJOIN_FEE_PER_USER * n_part)
    # Keep the n_in / n_out pair consistent with what we actually emitted.
    n_out = len(output_amounts)
    return _skeleton(
        "coinjoin", n_in, n_out, fee,
        input_amounts, output_amounts,
        _attach_dst(_network_event(random.randrange(len(NETWORK_POOLS)))),
        "P2WPKH",
    )


def _skeleton_anomaly() -> dict[str, Any]:
    """High fanout OR high fee OR geo/ASN anomaly."""
    variant = random.choice(["fanout", "high_fee", "geo_asn"])

    if variant == "fanout":
        n_in = random.randint(1, 3)
        n_out = random.randint(*ANOMALY_FANOUT_RANGE)
        fee = _fee_for(n_in, n_out)
        total_in = _round8(max(MIN_TX_TOTAL_INPUT, math.exp(random.gauss(0.5, 1.0))))
        input_amounts = [total_in] + [_round8(total_in * 0.3) for _ in range(n_in - 1)]
        total_in = _round8(sum(input_amounts))
        output_amounts = _split_outputs(_round8(total_in - fee), n_out)
        return _skeleton(
            "anomaly", n_in, n_out, fee,
            input_amounts, output_amounts,
            _attach_dst(_network_event(random.randrange(len(NETWORK_POOLS)))),
            random.choice(SCRIPT_TYPES),
        )

    if variant == "high_fee":
        n_in = _weighted_count(NORMAL_IN_WEIGHTS)
        n_out = _weighted_count(NORMAL_OUT_WEIGHTS)
        fee = _fee_for(n_in, n_out, rate=random.uniform(*FEE_RATE_ANOMALY_SAT_VB))
        input_amounts, output_amounts = _simple_amounts(n_in, n_out, fee)
        return _skeleton(
            "anomaly", n_in, n_out, fee,
            input_amounts, output_amounts,
            _attach_dst(_network_event(random.randrange(len(NETWORK_POOLS)))),
            random.choice(SCRIPT_TYPES),
        )

    # geo_asn — sanctioned-looking address, odd geography, odd ASN.
    n_in = _weighted_count(NORMAL_IN_WEIGHTS)
    n_out = _weighted_count(NORMAL_OUT_WEIGHTS)
    fee = _fee_for(n_in, n_out)
    input_amounts, output_amounts = _simple_amounts(n_in, n_out, fee)
    event = {
        "src_ip": _random_ipv4_public(),
        "dst_ip": _random_ipv4_public(),
        "src_port": random.randint(1025, 65535),
        "dst_port": P2P_PORT,
        "geo_country": random.choice(GEO_ANOMALY),
        "asn": _random_asn(unusual=True),
    }
    return _skeleton(
        "anomaly", n_in, n_out, fee,
        input_amounts, output_amounts, event, random.choice(SCRIPT_TYPES),
    )


def _simple_amounts(n_in: int, n_out: int, fee: float) -> tuple[list[float], list[float]]:
    """Log-normal inputs, exact-conserving outputs."""
    raw = [_round8(max(0.0005, math.exp(random.gauss(-2.5, 1.2)))) for _ in range(n_in)]
    total_in = _round8(sum(raw))
    if total_in < MIN_TX_TOTAL_INPUT:
        scale = MIN_TX_TOTAL_INPUT / total_in
        raw = [_round8(a * scale) for a in raw]
        total_in = _round8(sum(raw))
    return raw, _split_outputs(_round8(total_in - fee), n_out)


def _skeleton_ransomwhere(seeds: list[str]) -> dict[str, Any]:
    """
    Injects exactly one confirmed ransomwhere seed address as either an input or
    an output, driving that address to CRITICAL in the scorer.

    80% of ransomwhere rows use peeling-chain (40%) or CoinJoin (40%) topology so
    the laundering-pattern badge shows Peeling Chain / CoinJoin for the majority
    of CRITICAL wallets.  The remaining 20% use a generic layout.
    """
    seed_addr = random.choice(seeds)
    topo = random.random()

    if topo < 0.40 or topo >= 0.80:
        # Peeling-chain topology: 1 input (seed), 2 outputs, ~80/20 split.
        fee = _fee_for(1, 2)
        total_in = _round8(max(MIN_TX_TOTAL_INPUT, math.exp(random.gauss(0.5, 1.0))))
        available = _round8(total_in - fee)
        large = _round8(available * 0.80)
        small = _round8(available - large)
        return _skeleton(
            "ransomwhere", 1, 2, fee,
            [total_in], [large, small],
            _attach_dst(_network_event(random.randrange(len(NETWORK_POOLS)))),
            random.choice(SCRIPT_TYPES),
            seed_slot=("in", 0),
        )

    # CoinJoin topology: 3-6 inputs (seed among them), equal denomination outputs.
    n_in = random.randint(3, 6)
    denom = _round8(random.choice(COINJOIN_DENOMS))
    n_change = sum(1 for _ in range(n_in) if random.random() < COINJOIN_CHANGE_PROB)
    n_out = n_in + n_change
    input_amounts = [
        _round8(denom + COINJOIN_FEE_PER_USER + random.uniform(0.001, 0.01))
        for _ in range(n_in)
    ]
    output_amounts = [denom] * n_in
    for amt in input_amounts:
        change = _round8(amt - denom - COINJOIN_FEE_PER_USER)
        if change > 0:
            output_amounts.append(change)

    fee = _round8(COINJOIN_FEE_PER_USER * n_in)
    seed_index = random.randint(0, n_in - 1)
    return _skeleton(
        "ransomwhere", n_in, len(output_amounts), fee,
        input_amounts, output_amounts,
        _attach_dst(_network_event(random.randrange(len(NETWORK_POOLS)))),
        "P2WPKH",
        seed_slot=("in", seed_index),
    )


# ── Archetype plan ─────────────────────────────────────────────────────────────


def _plan_chain_hops(n_peel_txs: int) -> list[int]:
    """
    Split the peeling budget into chain hop counts, each >= CHAIN_MIN_HOPS, with
    the totals summing to exactly n_peel_txs.
    """
    if n_peel_txs <= 0:
        return []
    n_chains = max(1, min(round(n_peel_txs / CHAIN_MEAN_HOPS), n_peel_txs // CHAIN_MIN_HOPS))
    hops = [random.randint(CHAIN_MIN_HOPS, CHAIN_MAX_HOPS) for _ in range(n_chains)]
    residue = sum(hops) - n_peel_txs
    guard = 0
    while residue > 0 and guard < 32 * n_chains:
        i = hops.index(max(hops))
        if hops[i] <= CHAIN_MIN_HOPS:
            break
        hops[i] -= 1
        residue -= 1
        guard += 1
    guard = 0
    while residue < 0 and guard < 32 * n_chains:
        i = hops.index(min(hops))
        hops[i] += 1
        residue += 1
        guard += 1
    return hops


def _build_archetype_plan(n: int) -> list[dict[str, Any]]:
    """
    Build the shuffled archetype plan for n rows.

    Distribution:
      ransomwhere : RANSOMWHERE_FRAC (~3.0%) — seed-injected, drives CRITICAL wallets
      peeling     : PEEL_TXN_FRAC (~20.8%) — every row is a hop of a threaded chain
      coinjoin    : COINJOIN_FRAC (~9%)   — equal-denomination mix transactions
      anomaly     : ANOMALY_FRAC (~3%)    — fanout / high-fee / geo-ASN outliers
      normal      : remainder (~64%)

    Peeling/coinjoin dominate suspicious patterns; the low anomaly fraction keeps
    neighbour-address MSE bleed minimal so LOW stays the majority verdict.
    """
    n_peel = round(n * PEEL_TXN_FRAC)
    n_ransom = round(n * RANSOMWHERE_FRAC)
    n_coinjoin = round(n * COINJOIN_FRAC)
    n_anomaly = round(n * ANOMALY_FRAC)
    n_normal = n - n_peel - n_ransom - n_coinjoin - n_anomaly
    if n_normal < 0:
        raise ValueError("archetype fractions exceed 1.0")

    plan: list[dict[str, Any]] = []
    for chain_id, hops in enumerate(_plan_chain_hops(n_peel)):
        for hop in range(hops):
            plan.append({"archetype": "peeling", "chain_id": chain_id, "hop": hop, "hops": hops})
    for _ in range(n_ransom):
        plan.append({"archetype": "ransomwhere"})
    for _ in range(n_coinjoin):
        plan.append({"archetype": "coinjoin"})
    for _ in range(n_anomaly):
        plan.append({"archetype": "anomaly"})
    for _ in range(n_normal):
        plan.append({"archetype": "normal"})

    random.shuffle(plan)
    return plan


# ── Dataset builder ────────────────────────────────────────────────────────────

FIELDNAMES = [
    "txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
    "input_addresses", "output_addresses",
    "input_amounts", "output_amounts", "fee",
    "script_type", "geo_country", "asn",
]


def _build_skeletons(
    n: int, file_salt: str, seed_pool: list[str]
) -> list[dict[str, Any]]:
    """
    Pass 1 — every row's shape, economics and network event, without addresses.

    Peeling rows are laid out in hop order (the plan is shuffled, so hops of one
    chain are not adjacent) and the finished rows are shuffled again at the end.
    """
    plan = _build_archetype_plan(n)
    chain_plan: dict[int, list[dict[str, Any]]] = {}
    plain_plan: list[dict[str, Any]] = []

    for entry in plan:
        if entry["archetype"] == "peeling":
            chain_plan.setdefault(entry["chain_id"], []).append(entry)
        else:
            plain_plan.append(entry)

    skeletons: list[dict[str, Any]] = []

    for entries in chain_plan.values():
        entries.sort(key=lambda e: e["hop"])
        # The chain relays its own terminal peel amount into the next hop.
        relay = _round8(random.uniform(*CHAIN_START_AMOUNT_RANGE))
        event = _attach_dst(_network_event(random.randrange(len(NETWORK_POOLS))))
        for entry in entries:
            sk, relay = _skeleton_chain_hop(
                entry["chain_id"], entry["hop"], relay, event,
            )
            if relay < CHAIN_MIN_RELAY_AMOUNT:
                break  # the chain is drained; the rest of its hops are dropped
            sk["file_salt"] = file_salt
            skeletons.append(sk)

    for entry in plain_plan:
        archetype = entry["archetype"]
        if archetype == "ransomwhere":
            sk = _skeleton_ransomwhere(seed_pool)
            sk["seed_address"] = random.choice(seed_pool)
        elif archetype == "coinjoin":
            sk = _skeleton_coinjoin()
        elif archetype == "anomaly":
            sk = _skeleton_anomaly()
        else:
            sk = _skeleton_normal()
        sk["file_salt"] = file_salt
        skeletons.append(sk)

    # Rows stay in chain order here.  generate_dataset() shuffles them once the
    # addresses are threaded, so hop N+1 can still spend hop N's peel output.
    return skeletons


def _assign_addresses(
    skeletons: list[dict[str, Any]], pool: WalletPool, allocated: set[str]
) -> list[dict[str, Any]]:
    """
    Pass 2 — thread pool addresses through the rows.

    Peeling chains stitch explicitly: hop N+1's single input is hop N's large
    peel output, so the chain is a real multi-hop path in the graph.
    """
    rows: list[dict[str, Any]] = []
    chain_tail: dict[int, str] = {}

    def draw(n: int, used: set[str]) -> list[str]:
        """Draw n distinct addresses, falling back to fresh leaves if needed."""
        got = pool.draw(n, used)
        while len(got) < n:
            got.append(_fresh_address(allocated))
        return got

    for sk in skeletons:
        used: set[str] = set()  # addresses already placed in this row
        chain_id = sk["chain_id"]
        if chain_id is not None and sk["hop_index"] == 0:
            # Chain head: input wallet + peeled change come from the pool, the
            # terminal peel address is created fresh for the next hop to spend.
            drawn = draw(2, used)
            input_addresses = [drawn[0]]
            output_addresses = [drawn[1]]
        elif chain_id is not None:
            # Chain hop: spend the previous hop's peel output.
            input_addresses = [chain_tail[chain_id]]
            output_addresses = draw(1, used)
        elif sk["seed_slot"] is not None:
            side, seed_index = sk["seed_slot"]
            drawn = draw(sk["n_in"] + sk["n_out"] - 1, used)
            if side == "in":
                input_addresses = drawn[: sk["n_in"] - 1]
                input_addresses.insert(seed_index, sk["seed_address"])
                output_addresses = drawn[sk["n_in"] - 1 :]
            else:
                input_addresses = drawn[: sk["n_in"]]
                output_addresses = drawn[sk["n_in"]:]
                output_addresses.insert(seed_index, sk["seed_address"])
        else:
            drawn = draw(sk["n_in"] + sk["n_out"], used)
            input_addresses = drawn[: sk["n_in"]]
            output_addresses = drawn[sk["n_in"] :]

        if chain_id is not None:
            peel_addr = _fresh_address(allocated)
            output_addresses.append(peel_addr)
            chain_tail[chain_id] = peel_addr

        rows.append(_skeleton_to_row(sk, input_addresses, output_addresses, pool))

    return rows


def _fresh_address(used: set[str]) -> str:
    """A brand-new one-shot address (peel-chain intermediates)."""
    while True:
        addr = _random_btc_address()
        if addr not in used:
            used.add(addr)
            return addr


def _skeleton_to_row(
    sk: dict[str, Any],
    input_addresses: list[str],
    output_addresses: list[str],
    pool: WalletPool,
) -> dict[str, Any]:
    event = sk["event"]
    src_ip, dst_ip = event["src_ip"], event["dst_ip"]
    geo_country, asn = event["geo_country"], event["asn"]

    # Hub / heavy wallets pin their egress network pool, which correlates the
    # wallet with its country/ASN.  Hub wallets additionally pin the host octet,
    # which is what produces the heavy src_ip reuse.
    endpoint = pool.egress_endpoint_for(input_addresses)
    if endpoint is not None:
        pool_idx, host = endpoint
        pool_def = NETWORK_POOLS[pool_idx]
        src_ip = f"{pool_def['ip_prefix']}{host if host is not None else random.randint(1, pool_def['host_octets'])}"
        geo_country = pool_def["country"]
        asn = pool_def["asn"]

    return {
        # txid is assigned after the post-thread shuffle, in generate_dataset().
        "txid": "",
        "ts": _random_ts(),
        "src_ip": src_ip,
        "dst_ip": dst_ip,
        "src_port": event["src_port"],
        "dst_port": event["dst_port"],
        "input_addresses": _pg_arr(input_addresses),
        "output_addresses": _pg_arr(output_addresses),
        "input_amounts": _pg_arr(sk["input_amounts"]),
        "output_amounts": _pg_arr(sk["output_amounts"]),
        "fee": sk["fee"],
        "script_type": sk["script_type"],
        "geo_country": geo_country,
        "asn": asn,
    }


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

    seed_pool = random.sample(seeds, min(SEED_POOL_SIZE, len(seeds)))
    skeletons = _build_skeletons(n, file_salt, seed_pool)

    # How many addresses will be pulled from the pool?  Chain rows consume fewer
    # slots than they carry addresses (hop N+1's input is hop N's peel output,
    # which is created fresh) so the two counts are computed separately.
    pool_slots = 0
    fresh_slots = 0
    for sk in skeletons:
        if sk["chain_id"] is not None:
            pool_slots += 2 if sk["hop_index"] == 0 else 1
            fresh_slots += 1
        else:
            pool_slots += sk["n_in"] + sk["n_out"] - (1 if sk["seed_slot"] else 0)

    target_distinct = round(n * WALLETS_PER_TX)
    pool = _build_wallet_pool(pool_slots, max(1, target_distinct - fresh_slots), n)
    allocated: set[str] = set(pool.addresses)
    random.shuffle(pool.slots)

    rows = _assign_addresses(skeletons, pool, allocated)

    # Addresses are threaded in chain order; the txid is derived from the
    # post-shuffle row position so each file's txid namespace is intact and
    # contiguous.
    order = list(range(len(skeletons)))
    random.shuffle(order)
    pairs = [(skeletons[i], rows[i]) for i in order]
    for idx, (sk, row) in enumerate(pairs):
        sk["idx"] = idx
        row["txid"] = _txid(idx, sk["file_salt"])

    archetype_counts: dict[str, int] = {
        "normal": 0, "ransomwhere": 0, "peeling": 0, "coinjoin": 0, "anomaly": 0,
    }

    with open(output_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()

        for sk, row in pairs:
            # Ledger balance guard: correct rounding drift on the last output.
            in_amt = sum(_parse_pg(row["input_amounts"]))
            out_amt = sum(_parse_pg(row["output_amounts"]))
            fee_val = float(row["fee"])
            diff = abs(round(in_amt - out_amt - fee_val, 6))
            if diff > 0.000001:
                out_list = _parse_pg(row["output_amounts"])
                out_list[-1] = _round8(in_amt - fee_val - sum(out_list[:-1]))
                row["output_amounts"] = _pg_arr(out_list)

            writer.writerow(row)
            archetype_counts[sk["archetype"]] += 1

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
            "file_salt": "t1k_v3",  # namespaced away from original 'sih26146' salt
        },
        {
            "n": 2000,
            "path": os.path.join(base_dir, "test_2000.csv"),
            "rng_seed": SEED_2000,
            "file_salt": "t2k_v3",  # distinct namespace
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

        size_kb = os.path.getsize(cfg["path"]) / 1024
        print(f"\n{'-' * 55}")
        print(f"  Saved : {cfg['path']}  ({size_kb:.0f} KB)")
        print(f"  Rows  : {cfg['n']}")
        print(f"  Archetypes:")
        for label, cnt in counts.items():
            pct = cnt / cfg["n"] * 100
            print(f"    {label:<15} {cnt:>5}  ({pct:5.1f}%)")
        print(
            f"  Ransomwhere seed pool : {SEED_POOL_SIZE} distinct seeds"
            f"  ({counts['ransomwhere']} seed-injected rows)"
        )

        # Copy to frontend public directory
        os.makedirs(frontend_sample_dir, exist_ok=True)
        dest = os.path.join(frontend_sample_dir, os.path.basename(cfg["path"]))
        shutil.copy2(cfg["path"], dest)
        print(f"  Mirrored: {dest}")

    print(f"\n{'-' * 55}")
    print("  Done. Run verify_demo_dataset.py to confirm schema, accounting and topology.")


if __name__ == "__main__":
    main()
