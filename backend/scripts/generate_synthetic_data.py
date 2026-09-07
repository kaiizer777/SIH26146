"""Synthetic Bitcoin Transaction Dataset Generator.
Implements the 8 realism constraints defined in SIH26146 Phase 1:
(a) Power-law wallet degree distribution
(b) 2–5% illicit-transaction injection seeded from Ransomwhere addresses
(c) Peeling-chain embedder (linear 1->2 output chains, 5-40 hops)
(d) CoinJoin-like embedder (>=3 in/out, equal outputs, min 0.05 BTC)
(e) Fee-rate (sat/vbyte) sampler (log-normal distribution)
(f) SegWit/Taproot script-type mix sampler
(g) Time-zone-clustered timestamp generator (diurnal cycles)
(h) Correlated network-layer event generator (IP, ASN, country)

Supports streaming export to CSV, JSON, and XML.
"""

import argparse
import csv
import hashlib
import itertools
import json
import math
import os
import random
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import xml.dom.minidom

# Predefined realistic ASN / Country / IP clusters
NETWORK_POOLS = [
    {"country": "US", "asn": 15169, "ip_prefix": "8.8.8.", "org": "Google LLC"},
    {"country": "US", "asn": 13335, "ip_prefix": "1.1.1.", "org": "Cloudflare Inc"},
    {"country": "US", "asn": 16509, "ip_prefix": "54.240.196.", "org": "Amazon.com"},
    {"country": "DE", "asn": 24940, "ip_prefix": "88.198.45.", "org": "Hetzner Online GmbH"},
    {"country": "FR", "asn": 12876, "ip_prefix": "62.210.100.", "org": "ONLINE S.A.S."},
    {"country": "NL", "asn": 49544, "ip_prefix": "185.107.56.", "org": "i3D.net"},
    {"country": "GB", "asn": 2856, "ip_prefix": "81.100.12.", "org": "BT Group"},
    {"country": "SG", "asn": 4657, "ip_prefix": "203.116.1.", "org": "StarHub Ltd"},
    {"country": "JP", "asn": 2516, "ip_prefix": "210.140.10.", "org": "KDDI Corp"},
    {"country": "CH", "asn": 3303, "ip_prefix": "194.230.79.", "org": "Swisscom"},
]

SCRIPT_TYPE_DISTRIBUTION = [
    ("P2WPKH", 0.45),
    ("P2TR", 0.20),
    ("P2SH", 0.20),
    ("P2PKH", 0.15),
]


def generate_btc_address(prefix_type: str = "bc1q") -> str:
    """Generate a syntactically valid-looking Bitcoin address."""
    rand_bytes = os.urandom(20)
    rand_hex = rand_bytes.hex()
    if prefix_type == "bc1q":
        return "bc1q" + rand_hex[:38]
    elif prefix_type == "bc1p":
        return "bc1p" + rand_hex[:58]
    elif prefix_type == "3":
        return "3" + rand_hex[:33]
    else:
        return "1" + rand_hex[:33]


# ==============================================================================
# 8 Realism Constraint Functions
# ==============================================================================

def sample_wallet_power_law(n_wallets: int, alpha: float = 2.2, rng: Optional[random.Random] = None) -> Tuple[List[str], List[float]]:
    """(a) Power-law wallet degree distribution using Pareto-distributed weights.
    Returns: (wallets_list, normalized_probabilities)
    """
    if rng is None:
        rng = random.Random()
    wallets = []
    for _ in range(n_wallets):
        r = rng.random()
        if r < 0.45:
            wallets.append(generate_btc_address("bc1q"))
        elif r < 0.65:
            wallets.append(generate_btc_address("bc1p"))
        elif r < 0.85:
            wallets.append(generate_btc_address("3"))
        else:
            wallets.append(generate_btc_address("1"))

    # Pareto distribution: X = (1 - U)^(-1 / (alpha - 1))
    xm = 1.0
    gamma = alpha - 1.0
    raw_weights = [xm * ((1.0 - rng.random()) ** (-1.0 / gamma)) for _ in range(n_wallets)]
    total = sum(raw_weights)
    weights = [w / total for w in raw_weights]
    return wallets, weights


def sample_script_types(count: int, rng: Optional[random.Random] = None) -> List[str]:
    """(f) SegWit/Taproot script-type mix sampler."""
    if rng is None:
        rng = random.Random()
    types, probs = zip(*SCRIPT_TYPE_DISTRIBUTION)
    # Cumulative distribution for fast sampling
    cum_probs = []
    c = 0.0
    for p in probs:
        c += p
        cum_probs.append(c)

    results = []
    for _ in range(count):
        r = rng.random()
        for idx, cp in enumerate(cum_probs):
            if r <= cp:
                results.append(types[idx])
                break
        else:
            results.append(types[-1])
    return results


def sample_fee_rates(count: int, rng: Optional[random.Random] = None) -> List[float]:
    """(e) Fee-rate (sat/vbyte) sampler using log-normal distribution.
    Typical Bitcoin fee rates: median ~10-25 sat/vbyte, spikes up to 100-200.
    """
    if rng is None:
        rng = random.Random()
    # Log-normal with mu=2.7 (~15 sat/vB), sigma=0.65
    rates = []
    for _ in range(count):
        # Box-Muller transform for normal distribution
        u1 = max(rng.random(), 1e-10)
        u2 = max(rng.random(), 1e-10)
        z = math.sqrt(-2.0 * math.log(u1)) * math.cos(2.0 * math.pi * u2)
        rate = math.exp(2.7 + 0.65 * z)
        rates.append(max(1.0, round(rate, 2)))
    return rates


def generate_timezone_timestamps(
    start_time: datetime, count: int, rng: Optional[random.Random] = None
) -> List[str]:
    """(g) Time-zone-clustered timestamp generator with diurnal traffic peaks.
    Simulates diurnal activity curve (higher volume during UTC 12:00 - 22:00).
    """
    if rng is None:
        rng = random.Random()
    timestamps = []
    current = start_time
    for _ in range(count):
        # Diurnal probability factor based on hour of current timestamp
        hour = current.hour
        # Diurnal multiplier: peak at 16:00 UTC (1.8x), trough at 04:00 UTC (0.4x)
        diurnal = 1.0 + 0.7 * math.sin((hour - 10) * 2 * math.pi / 24)
        # Average inter-arrival time: ~5 seconds / diurnal factor
        interval = max(0.2, rng.expovariate(diurnal / 4.0))
        current = current + timedelta(seconds=interval)
        timestamps.append(current.strftime("%Y-%m-%dT%H:%M:%SZ"))
    return timestamps


def generate_network_events(count: int, rng: Optional[random.Random] = None) -> List[Dict[str, Any]]:
    """(h) Correlated network-layer event generator (src_ip, dst_ip, src_port, dst_port=8333, ASN, country)."""
    if rng is None:
        rng = random.Random()
    events = []
    n_pools = len(NETWORK_POOLS)
    for _ in range(count):
        pool = NETWORK_POOLS[rng.randint(0, n_pools - 1)]
        host = rng.randint(1, 254)
        src_ip = pool["ip_prefix"] + str(host)
        dst_pool = NETWORK_POOLS[rng.randint(0, n_pools - 1)]
        dst_ip = dst_pool["ip_prefix"] + str(rng.randint(1, 254))
        src_port = rng.randint(1025, 65535)
        dst_port = 8333  # standard Bitcoin P2P mainnet port
        events.append({
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": src_port,
            "dst_port": dst_port,
            "geo_country": pool["country"],
            "asn": pool["asn"],
        })
    return events


def embed_peeling_chains(
    base_wallets: List[str],
    n_chains: int = 5,
    min_hops: int = 5,
    max_hops: int = 40,
    start_ts: Optional[datetime] = None,
    rng: Optional[random.Random] = None,
) -> List[Dict[str, Any]]:
    """(c) Peeling-chain embedder:
    Linear 1-input -> 2-output chains with 5-40 hops.
    One output <= 5% of input (peeled change), one output >= 80% (main peel).
    """
    if rng is None:
        rng = random.Random()
    if start_ts is None:
        start_ts = datetime(2026, 3, 1, 10, 0, 0, tzinfo=timezone.utc)

    chain_txs = []
    current_time = start_ts

    for chain_idx in range(n_chains):
        hops = rng.randint(min_hops, max_hops)
        input_wallet = rng.choice(base_wallets)
        current_amount = round(rng.uniform(2.0, 25.0), 8)

        for hop in range(hops):
            current_time += timedelta(seconds=rng.randint(30, 300))
            tx_hash = hashlib.sha256(f"peel-{chain_idx}-{hop}-{rng.random()}".encode()).hexdigest()
            fee = round(rng.uniform(0.00005, 0.0003), 8)
            available = current_amount - fee
            if available <= 0.01:
                break

            # Peeling criteria: small output <= 5%, peel output >= 80%
            small_pct = rng.uniform(0.01, 0.05)
            small_amt = round(available * small_pct, 8)
            peel_amt = round(available - small_amt, 8)

            small_dest = generate_btc_address("bc1q")
            peel_dest = generate_btc_address("bc1q")

            net_event = generate_network_events(1, rng)[0]
            tx = {
                "txid": tx_hash,
                "ts": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "src_ip": net_event["src_ip"],
                "dst_ip": net_event["dst_ip"],
                "src_port": net_event["src_port"],
                "dst_port": net_event["dst_port"],
                "geo_country": net_event["geo_country"],
                "asn": net_event["asn"],
                "input_addresses": [input_wallet],
                "output_addresses": [small_dest, peel_dest],
                "input_amounts": [current_amount],
                "output_amounts": [small_amt, peel_amt],
                "fee": fee,
                "script_type": "P2WPKH",
                "is_peeling": True,
                "chain_id": chain_idx,
                "hop_index": hop,
                "total_hops": hops,
            }
            chain_txs.append(tx)
            # Next hop spends the large peeled output
            input_wallet = peel_dest
            current_amount = peel_amt

    return chain_txs


def embed_coinjoin_clusters(
    base_wallets: List[str],
    n_clusters: int = 10,
    start_ts: Optional[datetime] = None,
    rng: Optional[random.Random] = None,
) -> List[Dict[str, Any]]:
    """(d) CoinJoin-like embedder:
    >= 3 inputs, >= 3 outputs, equal output amounts (within +/-1%), total input >= 0.05 BTC.
    """
    if rng is None:
        rng = random.Random()
    if start_ts is None:
        start_ts = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)

    coinjoin_txs = []
    current_time = start_ts

    for c_idx in range(n_clusters):
        current_time += timedelta(seconds=rng.randint(60, 600))
        n_participants = rng.randint(3, 8)
        denom_btc = rng.choice([0.05, 0.1, 0.25, 0.5])
        fee_per_user = 0.0001
        total_fee = round(fee_per_user * n_participants, 8)

        inputs = [rng.choice(base_wallets) for _ in range(n_participants)]
        outputs = [generate_btc_address("bc1q") for _ in range(n_participants)]

        # Inputs provide equal denom + small change/fee
        input_amounts = [round(denom_btc + fee_per_user + rng.uniform(0.001, 0.01), 8) for _ in range(n_participants)]
        # Output amounts: exactly equal denominations
        output_amounts = [denom_btc for _ in range(n_participants)]
        # Add change outputs for participants
        change_outputs = [generate_btc_address("bc1q") for _ in range(n_participants)]
        for i in range(n_participants):
            chg = round(input_amounts[i] - denom_btc - fee_per_user, 8)
            if chg > 0:
                outputs.append(change_outputs[i])
                output_amounts.append(chg)

        actual_fee = round(sum(input_amounts) - sum(output_amounts), 8)
        tx_hash = hashlib.sha256(f"coinjoin-{c_idx}-{rng.random()}".encode()).hexdigest()
        net_event = generate_network_events(1, rng)[0]

        tx = {
            "txid": tx_hash,
            "ts": current_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "src_ip": net_event["src_ip"],
            "dst_ip": net_event["dst_ip"],
            "src_port": net_event["src_port"],
            "dst_port": net_event["dst_port"],
            "geo_country": net_event["geo_country"],
            "asn": net_event["asn"],
            "input_addresses": inputs,
            "output_addresses": outputs,
            "input_amounts": input_amounts,
            "output_amounts": output_amounts,
            "fee": actual_fee,
            "script_type": "P2WPKH",
            "is_coinjoin": True,
        }
        coinjoin_txs.append(tx)

    return coinjoin_txs


def inject_illicit_transactions(
    transactions: List[Dict[str, Any]],
    seed_addresses: List[str],
    target_pct: float = 0.035,
    rng: Optional[random.Random] = None,
) -> int:
    """(b) 2–5% illicit-transaction injector seeded from Ransomwhere addresses.
    Mutates transactions in-place by injecting Ransomwhere seed addresses.
    Returns count of injected transactions.
    """
    if rng is None:
        rng = random.Random()
    if not seed_addresses:
        # Fallback seeds if file not loaded
        seed_addresses = [
            "17TMc2UkVRSga2yYvuxSD9Q1XyB2EPRjTF",
            "1DTE5x3Rjn2q75HjX6hiu8CQwEGqe6wQ4s",
            "14ED1gQ15yMWx4qF9eQZ1aN5fAov9pTq3j",
            "1BoatSLRHtKNngkdXEeobR76b53LETtpyT",
        ]

    n_total = len(transactions)
    n_target = max(1, int(n_total * target_pct))
    indices = rng.sample(range(n_total), min(n_target, n_total))

    for idx in indices:
        tx = transactions[idx]
        seed_addr = rng.choice(seed_addresses)
        # Randomly choose whether seed is sender, receiver, or co-spender
        mode = rng.choice(["in", "out", "both"])
        if mode in ("in", "both"):
            tx["input_addresses"][0] = seed_addr
        if mode in ("out", "both"):
            tx["output_addresses"][0] = seed_addr
        tx["is_seed_illicit"] = True

    return len(indices)


# ==============================================================================
# Full Pipeline Generator
# ==============================================================================

def generate_synthetic_dataset(
    count: int = 100000,
    seed_file: Optional[Path] = None,
    seed: int = 42,
) -> List[Dict[str, Any]]:
    """Generate full realistic synthetic dataset containing ordinary transactions,
    peeling chains, CoinJoin mixes, and Ransomwhere-seeded illicit transactions.
    """
    rng = random.Random(seed)
    print(f"Initializing synthetic generator for {count:,} transactions (seed={seed})...")

    # 1. Generate base wallet pool with power law
    n_base_wallets = max(1000, count // 5)
    print(f"  (a) Generating {n_base_wallets:,} wallets with power-law degree distribution...", flush=True)
    wallets, wallet_weights = sample_wallet_power_law(n_base_wallets, alpha=2.2, rng=rng)
    wallet_cum_weights = list(itertools.accumulate(wallet_weights))

    # Load Ransomwhere seeds if available
    seed_addresses = []
    if seed_file and seed_file.exists():
        try:
            with open(seed_file, "r", encoding="utf-8") as f:
                raw_seeds = json.load(f)
            records = raw_seeds.get("result", raw_seeds)
            seed_addresses = [r["address"] for r in records if "address" in r]
            print(f"  Loaded {len(seed_addresses):,} Ransomwhere seed addresses from {seed_file}", flush=True)
        except Exception as e:
            print(f"  Warning: could not load seed file {seed_file}: {e}", flush=True)

    # 2. Embed peeling chains (~1.5% of dataset)
    n_peeling_chains = max(10, count // 4000)
    print(f"  (c) Embedding {n_peeling_chains} peeling chains...", flush=True)
    peeling_txs = embed_peeling_chains(wallets, n_chains=n_peeling_chains, min_hops=5, max_hops=40, rng=rng)

    # 3. Embed CoinJoin clusters (~1% of dataset)
    n_coinjoin_clusters = max(10, count // 2000)
    print(f"  (d) Embedding {n_coinjoin_clusters} CoinJoin clusters...", flush=True)
    coinjoin_txs = embed_coinjoin_clusters(wallets, n_clusters=n_coinjoin_clusters, rng=rng)

    # 4. Generate remaining normal transactions
    n_special = len(peeling_txs) + len(coinjoin_txs)
    n_normal = max(0, count - n_special)
    print(f"  Generating {n_normal:,} standard Bitcoin transactions...", flush=True)

    # Pre-sample script types, fee rates, timestamps, network events
    script_types = sample_script_types(n_normal, rng=rng)
    fee_rates = sample_fee_rates(n_normal, rng=rng)
    start_ts = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
    timestamps = generate_timezone_timestamps(start_ts, n_normal, rng=rng)
    net_events = generate_network_events(n_normal, rng=rng)

    normal_txs = []
    for i in range(n_normal):
        tx_hash = hashlib.sha256(f"tx-{i}-{seed}-{rng.random()}".encode()).hexdigest()
        net = net_events[i]
        st = script_types[i]
        sat_per_vb = fee_rates[i]

        # 1-3 inputs, 1-3 outputs
        n_in = rng.choices([1, 2, 3], weights=[0.7, 0.22, 0.08])[0]
        n_out = rng.choices([1, 2, 3], weights=[0.2, 0.72, 0.08])[0]

        # Sample wallets using precomputed cumulative power-law weights
        in_addrs = rng.choices(wallets, cum_weights=wallet_cum_weights, k=n_in)
        out_addrs = rng.choices(wallets, cum_weights=wallet_cum_weights, k=n_out)

        # Realistic amounts (0.001 BTC to 5 BTC)
        in_amts = [round(math.exp(rng.gauss(-2.5, 1.2)), 8) for _ in range(n_in)]
        in_amts = [max(0.0005, round(a, 8)) for a in in_amts]
        tot_in = sum(in_amts)

        # Compute fee based on virtual bytes
        vbytes = 10 + n_in * 68 + n_out * 31
        fee_sats = max(150, int(vbytes * sat_per_vb))
        fee_btc = round(fee_sats / 1e8, 8)
        if fee_btc >= tot_in * 0.2:
            fee_btc = round(tot_in * 0.01, 8)

        available_out = tot_in - fee_btc
        if n_out == 1:
            out_amts = [round(available_out, 8)]
        else:
            splits = [rng.random() for _ in range(n_out)]
            s_sum = sum(splits)
            out_amts = [round(available_out * (s / s_sum), 8) for s in splits]
            # Fix rounding discrepancy to guarantee fee = in - out
            diff = round(available_out - sum(out_amts), 8)
            out_amts[0] = round(out_amts[0] + diff, 8)

        normal_txs.append({
            "txid": tx_hash,
            "ts": timestamps[i],
            "src_ip": net["src_ip"],
            "dst_ip": net["dst_ip"],
            "src_port": net["src_port"],
            "dst_port": net["dst_port"],
            "geo_country": net["geo_country"],
            "asn": net["asn"],
            "input_addresses": in_addrs,
            "output_addresses": out_addrs,
            "input_amounts": in_amts,
            "output_amounts": out_amts,
            "fee": fee_btc,
            "script_type": st,
        })

    # Combine all transactions
    all_transactions = normal_txs + peeling_txs + coinjoin_txs
    rng.shuffle(all_transactions)

    # 5. Inject 2-5% illicit transactions seeded from Ransomwhere
    target_illicit_pct = rng.uniform(0.025, 0.045)  # securely inside [0.02, 0.05]
    print(f"  (b) Injecting {target_illicit_pct*100:.2f}% illicit transactions from Ransomwhere seeds...")
    injected_count = inject_illicit_transactions(
        all_transactions, seed_addresses, target_pct=target_illicit_pct, rng=rng
    )
    actual_illicit_pct = (injected_count / len(all_transactions)) * 100
    print(f"  Total injected illicit transactions: {injected_count:,} ({actual_illicit_pct:.2f}%)")

    return all_transactions


# ==============================================================================
# Exporters: CSV, JSON, XML
# ==============================================================================

def export_to_csv(transactions: List[Dict[str, Any]], filepath: Path):
    """Export transactions to CSV matching Master Doc / Postgres transactions schema."""
    print(f"Exporting {len(transactions):,} rows to CSV: {filepath.resolve()}...")
    fieldnames = [
        "txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
        "input_addresses", "output_addresses", "input_amounts", "output_amounts",
        "fee", "script_type", "geo_country", "asn"
    ]
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for tx in transactions:
            row = {
                "txid": tx["txid"],
                "ts": tx["ts"],
                "src_ip": tx["src_ip"],
                "dst_ip": tx["dst_ip"],
                "src_port": tx["src_port"],
                "dst_port": tx["dst_port"],
                "input_addresses": "{" + ",".join(tx["input_addresses"]) + "}",
                "output_addresses": "{" + ",".join(tx["output_addresses"]) + "}",
                "input_amounts": "{" + ",".join(str(a) for a in tx["input_amounts"]) + "}",
                "output_amounts": "{" + ",".join(str(a) for a in tx["output_amounts"]) + "}",
                "fee": tx["fee"],
                "script_type": tx["script_type"],
                "geo_country": tx["geo_country"],
                "asn": tx["asn"],
            }
            writer.writerow(row)
    print(f"CSV export complete: {filepath.stat().st_size / (1024*1024):.2f} MB")


def export_to_json(transactions: List[Dict[str, Any]], filepath: Path):
    """Export transactions to JSON format."""
    print(f"Exporting {len(transactions):,} rows to JSON: {filepath.resolve()}...")
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(transactions, f)
    print(f"JSON export complete: {filepath.stat().st_size / (1024*1024):.2f} MB")


def export_to_xml(transactions: List[Dict[str, Any]], filepath: Path):
    """Export transactions to XML format using streaming write for performance."""
    print(f"Exporting {len(transactions):,} rows to XML: {filepath.resolve()}...", flush=True)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<transactions>\n')
        for tx in transactions:
            f.write("  <transaction>\n")
            f.write(f"    <txid>{tx['txid']}</txid>\n")
            f.write(f"    <ts>{tx['ts']}</ts>\n")
            f.write(f"    <src_ip>{tx['src_ip']}</src_ip>\n")
            f.write(f"    <dst_ip>{tx['dst_ip']}</dst_ip>\n")
            f.write(f"    <src_port>{tx['src_port']}</src_port>\n")
            f.write(f"    <dst_port>{tx['dst_port']}</dst_port>\n")
            f.write(f"    <fee>{tx['fee']}</fee>\n")
            f.write(f"    <script_type>{tx['script_type']}</script_type>\n")
            f.write(f"    <geo_country>{tx['geo_country']}</geo_country>\n")
            f.write(f"    <asn>{tx['asn']}</asn>\n")
            f.write("    <input_addresses>\n")
            for addr in tx["input_addresses"]:
                f.write(f"      <address>{addr}</address>\n")
            f.write("    </input_addresses>\n")
            f.write("    <output_addresses>\n")
            for addr in tx["output_addresses"]:
                f.write(f"      <address>{addr}</address>\n")
            f.write("    </output_addresses>\n")
            f.write("    <input_amounts>\n")
            for amt in tx["input_amounts"]:
                f.write(f"      <amount>{amt}</amount>\n")
            f.write("    </input_amounts>\n")
            f.write("    <output_amounts>\n")
            for amt in tx["output_amounts"]:
                f.write(f"      <amount>{amt}</amount>\n")
            f.write("    </output_amounts>\n")
            f.write("  </transaction>\n")
        f.write("</transactions>\n")
    print(f"XML export complete: {filepath.stat().st_size / (1024*1024):.2f} MB", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic Bitcoin transaction dataset.")
    parser.add_argument("--count", type=int, default=100000, help="Number of transactions to generate")
    parser.add_argument("--output-dir", type=str, default="data", help="Output directory")
    parser.add_argument("--seed-file", type=str, default="data/ransomwhere_seeds.json", help="Ransomwhere seeds file")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    seed_file = Path(args.seed_file)

    transactions = generate_synthetic_dataset(
        count=args.count, seed_file=seed_file, seed=args.seed
    )

    export_to_csv(transactions, out_dir / "synthetic_transactions.csv")
    export_to_json(transactions, out_dir / "synthetic_transactions.json")
    export_to_xml(transactions, out_dir / "synthetic_transactions.xml")
    print(f"\nAll 3 format exports saved to {out_dir.resolve()}/")


if __name__ == "__main__":
    main()
