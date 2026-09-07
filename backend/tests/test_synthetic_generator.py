"""Unit tests for synthetic Bitcoin transaction generator functions.
Asserts statistical properties and constraints on samples of n=1000.
"""

import math
import random
import re
from datetime import datetime, timezone
from pathlib import Path
import pytest
import sys

# Ensure backend root is on sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from scripts.generate_synthetic_data import (
    sample_wallet_power_law,
    sample_script_types,
    sample_fee_rates,
    generate_timezone_timestamps,
    generate_network_events,
    embed_peeling_chains,
    embed_coinjoin_clusters,
    inject_illicit_transactions,
    generate_synthetic_dataset,
)


@pytest.fixture
def rng():
    return random.Random(1337)


def test_sample_wallet_power_law(rng):
    """(a) Test power-law wallet degree distribution."""
    n_wallets = 1000
    wallets, weights = sample_wallet_power_law(n_wallets, alpha=2.2, rng=rng)

    assert len(wallets) == n_wallets
    assert len(weights) == n_wallets
    assert math.isclose(sum(weights), 1.0, rel_tol=1e-5)

    # Sort weights descending
    sorted_weights = sorted(weights, reverse=True)
    top_10_pct_count = int(0.10 * n_wallets)
    top_10_pct_weight = sum(sorted_weights[:top_10_pct_count])
    bottom_50_pct_weight = sum(sorted_weights[int(0.50 * n_wallets):])

    # In a Pareto/power-law distribution, top 10% of wallets carry significantly more weight than bottom 50%
    assert top_10_pct_weight > bottom_50_pct_weight * 2
    assert top_10_pct_weight > 0.35  # top 10% accounts for >35% of activity


def test_sample_script_types(rng):
    """(f) Test SegWit/Taproot script type sampler."""
    n = 1000
    types = sample_script_types(n, rng=rng)
    assert len(types) == n

    allowed = {"P2PK", "P2PKH", "P2SH", "P2WPKH", "P2TR"}
    for t in types:
        assert t in allowed

    # SegWit + Taproot should be the modern dominant standard (>50%)
    modern_count = sum(1 for t in types if t in ("P2WPKH", "P2TR"))
    assert modern_count / n >= 0.55


def test_sample_fee_rates(rng):
    """(e) Test fee rate sampler (sat/vbyte)."""
    n = 1000
    rates = sample_fee_rates(n, rng=rng)
    assert len(rates) == n
    for r in rates:
        assert r >= 1.0
        assert r <= 1000.0

    # Median fee rate should be realistic (typically 10-35 sat/vB)
    sorted_rates = sorted(rates)
    median_rate = sorted_rates[n // 2]
    assert 5.0 <= median_rate <= 40.0


def test_generate_timezone_timestamps(rng):
    """(g) Test time-zone diurnal timestamp generator."""
    n = 1000
    start = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
    ts_list = generate_timezone_timestamps(start, n, rng=rng)

    assert len(ts_list) == n
    # Verify ISO 8601 formatting and monotonicity
    parsed = [datetime.fromisoformat(ts.replace("Z", "+00:00")) for ts in ts_list]
    for i in range(1, len(parsed)):
        assert parsed[i] >= parsed[i - 1]


def test_generate_network_events(rng):
    """(h) Test correlated network-layer event generator."""
    n = 1000
    events = generate_network_events(n, rng=rng)
    assert len(events) == n

    ip_regex = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$")
    for ev in events:
        assert ip_regex.match(ev["src_ip"])
        assert ip_regex.match(ev["dst_ip"])
        assert 1025 <= ev["src_port"] <= 65535
        assert ev["dst_port"] == 8333
        assert len(ev["geo_country"]) == 2
        assert ev["geo_country"].isupper()
        assert isinstance(ev["asn"], int)
        assert ev["asn"] > 0


def test_embed_peeling_chains(rng):
    """(c) Test peeling-chain embedder."""
    wallets = [f"bc1qtest{i:032x}" for i in range(50)]
    chains = embed_peeling_chains(wallets, n_chains=5, min_hops=5, max_hops=15, rng=rng)

    assert len(chains) >= 25  # At least 5 * 5 hops
    for tx in chains:
        assert tx.get("is_peeling") is True
        assert len(tx["input_addresses"]) == 1
        assert len(tx["output_addresses"]) == 2
        assert len(tx["input_amounts"]) == 1
        assert len(tx["output_amounts"]) == 2

        tot_in = tx["input_amounts"][0]
        small_amt = tx["output_amounts"][0]
        peel_amt = tx["output_amounts"][1]
        fee = tx["fee"]
        assert fee >= 0

        # Change output <= 5% of available input (0.001 BTC float rounding tolerance)
        assert small_amt <= tot_in * 0.051
        # Peel output >= 80% of available input
        assert peel_amt >= tot_in * 0.80


def test_embed_coinjoin_clusters(rng):
    """(d) Test CoinJoin embedder."""
    wallets = [f"bc1qtest{i:032x}" for i in range(50)]
    cj_txs = embed_coinjoin_clusters(wallets, n_clusters=10, rng=rng)

    assert len(cj_txs) == 10
    for tx in cj_txs:
        assert tx.get("is_coinjoin") is True
        assert len(tx["input_addresses"]) >= 3
        assert len(tx["output_addresses"]) >= 3
        tot_in = sum(tx["input_amounts"])
        assert tot_in >= 0.05  # minimum input BTC threshold

        # Check for equal-denomination outputs
        out_amts = tx["output_amounts"]
        # Find frequency of identical outputs
        from collections import Counter
        counts = Counter(out_amts)
        max_equal = max(counts.values())
        assert max_equal >= 3  # at least 3 participants received equal denomination


def test_inject_illicit_transactions(rng):
    """(b) Test 2-5% illicit transaction injector."""
    n = 1000
    # Create 1000 dummy transactions
    dummy_txs = [
        {
            "txid": f"{i:064x}",
            "input_addresses": ["bc1qnormalin"],
            "output_addresses": ["bc1qnormalout"],
        }
        for i in range(n)
    ]
    seed_addrs = [f"1RansomSeed{i}" for i in range(10)]

    # Target 3.5%
    injected_count = inject_illicit_transactions(
        dummy_txs, seed_addrs, target_pct=0.035, rng=rng
    )

    injected_pct = (injected_count / n) * 100
    assert 2.0 <= injected_pct <= 5.0

    # Verify injected transactions contain seed addresses
    flagged = [tx for tx in dummy_txs if tx.get("is_seed_illicit")]
    assert len(flagged) == injected_count
    for tx in flagged:
        has_seed = any(a in seed_addrs for a in tx["input_addresses"] + tx["output_addresses"])
        assert has_seed


def test_full_synthetic_dataset_sample():
    """Verify statistical integrity of full generator on n=1000 sample."""
    dataset = generate_synthetic_dataset(count=1000, seed=42)
    assert len(dataset) == 1000

    illicit_count = sum(1 for tx in dataset if tx.get("is_seed_illicit"))
    illicit_pct = (illicit_count / len(dataset)) * 100
    # Must fall within the 2-5% band
    assert 2.0 <= illicit_pct <= 5.0, f"Illicit percentage was {illicit_pct:.2f}%, expected 2-5%"

    peeling_count = sum(1 for tx in dataset if tx.get("is_peeling"))
    coinjoin_count = sum(1 for tx in dataset if tx.get("is_coinjoin"))
    assert peeling_count > 0, "Peeling chains must be present in dataset"
    assert coinjoin_count > 0, "CoinJoin transactions must be present in dataset"

    # Verify required schema fields
    required_keys = [
        "txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
        "input_addresses", "output_addresses", "input_amounts", "output_amounts",
        "fee", "script_type", "geo_country", "asn"
    ]
    for tx in dataset:
        for k in required_keys:
            assert k in tx, f"Missing key '{k}' in transaction {tx.get('txid')}"
            assert tx[k] is not None, f"Value for '{k}' is None"
        assert len(tx["txid"]) == 64
        assert tx["fee"] >= 0
        assert tx["script_type"] in ("P2PK", "P2PKH", "P2SH", "P2WPKH", "P2TR")
        assert len(tx["geo_country"]) == 2
