"""
Verification script for the demo datasets (test_1000.csv / test_2000.csv).

No DB, no network, stdlib only.  Asserts and prints:
  1. exact row count
  2. txid uniqueness (intra-file + cross-file), 64 lowercase hex chars
  3. the 14-column schema and its order
  4. sum(input_amounts) - sum(output_amounts) == fee for every row
  5. address-list / amount-list length parity for every row
  6. graph topology: cross-tx wallet reuse, degree distribution, IP reuse,
     wallets that are both input and output, connected components, detected
     multi-hop peeling chains
  7. ransomwhere seed-address injection and archetype/label distribution

Exits non-zero if any hard assertion fails.

Run from repo root:
  python data/verify_demo_dataset.py
"""

from __future__ import annotations

import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict
from typing import Any

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

EXPECTED_FIELDNAMES = [
    "txid", "ts", "src_ip", "dst_ip", "src_port", "dst_port",
    "input_addresses", "output_addresses", "input_amounts", "output_amounts",
    "fee", "script_type", "geo_country", "asn",
]

EXPECTED_ROWS = {
    "test_1000.csv": 1000,
    "test_2000.csv": 2000,
}

# Hard topology floors.  The pre-fix dataset scored 0 on every one of these.
MIN_MULTI_TX_WALLET_PCT = 70.0
MIN_MAX_TX_PER_WALLET = 100
MAX_DISTINCT_SRC_IPS = 2500
MIN_DISTINCT_SRC_IPS = 500
MIN_WALLETS_BOTH_IN_AND_OUT = 100
MIN_MULTIHOP_CHAINS = 24
MIN_SEED_ROWS = 30

PEEL_SMALL_OUTPUT_MAX_PCT = 0.05   # peeled change
PEEL_LARGE_OUTPUT_MIN_PCT = 0.80   # the amount that funds the next hop
MIN_CHAIN_HOPS = 5

TXID_RE = re.compile(r"^[0-9a-f]{64}$")

PASS = "  [PASS]"
FAIL = "  [FAIL]"

failures: list[str] = []


def check(ok: bool, label: str, detail: str = "") -> bool:
    if not ok:
        failures.append(f"{label} {detail}".strip())
    print(f"{PASS if ok else FAIL}  {label}{('  ' + detail) if detail else ''}")
    return ok


# -- Helpers --------------------------------------------------------------------


def _pg_array(value: str) -> list[str]:
    """Parse a PostgreSQL '{a,b,c}' literal the way backend/app/services/parser.py does."""
    value = value.strip()
    if value.startswith("{") and value.endswith("}"):
        value = value[1:-1]
    if not value:
        return []
    return [item.strip().strip('"') for item in value.split(",") if item.strip()]


def _load_csv(path: str) -> tuple[list[str], list[dict[str, Any]]]:
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader.fieldnames or []), list(reader)


class UnionFind:
    def __init__(self) -> None:
        self.parent: dict[str, str] = {}
        self.rank: dict[str, int] = {}

    def add(self, item: str) -> None:
        if item not in self.parent:
            self.parent[item] = item
            self.rank[item] = 0

    def find(self, item: str) -> str:
        root = item
        while self.parent[root] != root:
            root = self.parent[root]
        while self.parent[item] != root:  # path compression
            self.parent[item], item = root, self.parent[item]
        return root

    def union(self, a: str, b: str) -> None:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return
        if self.rank[ra] < self.rank[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        if self.rank[ra] == self.rank[rb]:
            self.rank[ra] += 1

    def component_count(self) -> int:
        return len({self.find(item) for item in self.parent})


def _detect_peeling_chains(rows: list[dict[str, Any]]) -> list[int]:
    """
    Independent multi-hop peeling-chain detector.

    A hop is 1 input -> 2 outputs where one output is <= 5% of the input (peeled
    change) and the other is >= 80% (the relay).  Following the relay address from
    one hop's output to the next hop's input yields a chain.  Returns the hop count
    of every maximal chain of length >= MIN_CHAIN_HOPS.

    Chains are measured from their head (a hop whose relay is not spent by any
    other hop) and depth-memoised, so walking greedily from an arbitrary row in
    the middle of a chain cannot fragment it.
    """
    by_input: dict[str, list[int]] = defaultdict(list)
    hop_rows: set[int] = set()
    relay_of: dict[int, str] = {}

    # Index every row by the addresses it spends, so a hop's relay address can be
    # resolved to the row that consumes it.
    for i, row in enumerate(rows):
        for addr in _pg_array(row["input_addresses"]):
            by_input[addr].append(i)

    for i, row in enumerate(rows):
        ins = _pg_array(row["input_addresses"])
        outs = _pg_array(row["output_addresses"])
        out_amts = [float(a) for a in _pg_array(row["output_amounts"])]
        if len(ins) != 1 or len(outs) != 2 or len(out_amts) != 2:
            continue
        total_in = sum(float(a) for a in _pg_array(row["input_amounts"]))
        if total_in <= 0:
            continue
        if min(out_amts) / total_in > PEEL_SMALL_OUTPUT_MAX_PCT:
            continue
        if max(out_amts) / total_in < PEEL_LARGE_OUTPUT_MIN_PCT:
            continue
        hop_rows.add(i)
        relay_of[i] = outs[out_amts.index(max(out_amts))]

    successor: dict[int, int] = {}
    has_predecessor: set[int] = set()
    for i, relay in relay_of.items():
        spenders = by_input.get(relay, [])
        if spenders:
            successor[i] = spenders[0]
            has_predecessor.add(spenders[0])

    depth_cache: dict[int, int] = {}

    def depth(node: int, seen: frozenset[int] = frozenset()) -> int:
        if node in depth_cache:
            return depth_cache[node]
        if node in seen:  # defensive: relay cycles cannot happen with fresh addrs
            return 1
        nxt = successor.get(node)
        value = 1 + depth(nxt, seen | {node}) if nxt is not None else 1
        depth_cache[node] = value
        return value

    return sorted(
        (depth(head) for head in hop_rows if head not in has_predecessor),
        reverse=True,
    )


def _seed_addresses() -> set[str]:
    path = os.path.join(DATA_DIR, "ransomwhere_seeds.json")
    if not os.path.exists(path):
        return set()
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        records = data.get("result", data) if isinstance(data, dict) else data
        return {r["address"] for r in records if isinstance(r, dict) and "address" in r}
    except Exception:
        return set()


# -- Verification ---------------------------------------------------------------


def verify_file(filename: str, all_txids: set[str], seeds: set[str]) -> set[str]:
    path = os.path.join(DATA_DIR, filename)
    expected_rows = EXPECTED_ROWS[filename]
    print(f"\n{'-' * 78}")
    print(f"  {filename}")
    print(f"{'-' * 78}")

    if not check(os.path.exists(path), "file exists", path):
        return set()

    fieldnames, rows = _load_csv(path)

    # 1. row count ------------------------------------------------------------
    check(len(rows) == expected_rows, "row count", f"{len(rows)} (expected {expected_rows})")

    # 2. schema ---------------------------------------------------------------
    check(
        fieldnames == EXPECTED_FIELDNAMES,
        "14-column schema + order",
        "ok" if fieldnames == EXPECTED_FIELDNAMES else f"got {fieldnames}",
    )

    # 3. txids ----------------------------------------------------------------
    txids = [r["txid"] for r in rows]
    unique_txids = set(txids)
    check(len(unique_txids) == len(txids), "txid uniqueness (intra-file)",
          f"{len(unique_txids)}/{len(txids)}")
    bad_format = sum(1 for t in txids if not TXID_RE.match(t))
    check(bad_format == 0, "txid format (64 lowercase hex)", f"{bad_format} malformed")
    overlap = unique_txids & all_txids
    check(not overlap, "txid overlap with previously verified file", f"{len(overlap)}")
    all_txids |= unique_txids

    # 4. value conservation ---------------------------------------------------
    max_err = 0.0
    bad_value_rows = 0
    for row in rows:
        in_amt = sum(float(a) for a in _pg_array(row["input_amounts"]))
        out_amt = sum(float(a) for a in _pg_array(row["output_amounts"]))
        err = abs((in_amt - out_amt) - float(row["fee"]))
        max_err = max(max_err, err)
        if err > 1e-6:
            bad_value_rows += 1
    check(bad_value_rows == 0, "sum(in) - sum(out) == fee for every row",
          f"max abs error {max_err:.2e}, {bad_value_rows} bad rows")

    # 5. list parity ----------------------------------------------------------
    parity_errors = 0
    for row in rows:
        n_in = len(_pg_array(row["input_addresses"]))
        n_out = len(_pg_array(row["output_addresses"]))
        n_in_amt = len(_pg_array(row["input_amounts"]))
        n_out_amt = len(_pg_array(row["output_amounts"]))
        if n_in != n_in_amt or n_out != n_out_amt or n_in < 1 or n_out < 1:
            parity_errors += 1
    check(parity_errors == 0, "address/amount list length parity", f"{parity_errors} bad rows")

    # 6. topology -------------------------------------------------------------
    tx_count: Counter[str] = Counter()
    input_wallets: set[str] = set()
    output_wallets: set[str] = set()
    union = UnionFind()

    for row in rows:
        ins = _pg_array(row["input_addresses"])
        outs = _pg_array(row["output_addresses"])
        for a in ins:
            tx_count[a] += 1
            input_wallets.add(a)
            union.add(a)
        for a in outs:
            tx_count[a] += 1
            output_wallets.add(a)
            union.add(a)
        for a in ins[1:]:
            union.union(ins[0], a)
        for a in outs[1:]:
            union.union(outs[0], a)
        for a in ins:
            union.union(ins[0], a)
        for a in outs:
            union.union(ins[0], a)

    wallets = set(tx_count)
    multi = [a for a in wallets if tx_count[a] > 1]
    multi_pct = len(multi) / len(wallets) * 100 if wallets else 0.0
    degrees = sorted((tx_count[a] for a in wallets), reverse=True)
    both = input_wallets & output_wallets

    src_ips = Counter(r["src_ip"] for r in rows)
    dst_ips = Counter(r["dst_ip"] for r in rows)
    all_chains = _detect_peeling_chains(rows)
    chains = [c for c in all_chains if c >= MIN_CHAIN_HOPS]

    print("  -- topology --")
    print(f"     distinct wallets            : {len(wallets)}")
    print(f"     wallets in > 1 transaction  : {len(multi)}  ({multi_pct:.1f}%)")
    print(f"     max transactions per wallet : {degrees[0] if degrees else 0}")
    print(f"     top-10 degrees              : {degrees[:10]}")
    print(f"     wallets both input+output   : {len(both)}")
    print(f"     connected components        : {union.component_count()}")
    print(f"     distinct src_ip / max reuse : {len(src_ips)} / {max(src_ips.values())}")
    print(f"     distinct dst_ip / max reuse : {len(dst_ips)} / {max(dst_ips.values())}")
    print(f"     IPs reused across txs       : {sum(1 for c in src_ips.values() if c > 1)}")
    print(f"     peeling chains (all / >= {MIN_CHAIN_HOPS} hops): "
          f"{len(all_chains)} / {len(chains)}")
    print(f"     longest chains (hops)   : {chains[:10]}")

    check(multi_pct >= MIN_MULTI_TX_WALLET_PCT, "wallets in >1 tx",
          f"{multi_pct:.1f}% (floor {MIN_MULTI_TX_WALLET_PCT}%)")
    check(degrees and degrees[0] >= MIN_MAX_TX_PER_WALLET, "max tx per wallet",
          f"{degrees[0] if degrees else 0} (floor {MIN_MAX_TX_PER_WALLET})")
    check(MIN_DISTINCT_SRC_IPS <= len(src_ips) <= MAX_DISTINCT_SRC_IPS,
          "src_ip reuse band", f"{len(src_ips)} distinct across {len(rows)} txs")
    check(len(both) >= MIN_WALLETS_BOTH_IN_AND_OUT, "wallets both input and output",
          f"{len(both)} (floor {MIN_WALLETS_BOTH_IN_AND_OUT})")
    check(len(chains) >= MIN_MULTIHOP_CHAINS, "multi-hop peeling chains",
          f"{len(chains)} (floor {MIN_MULTIHOP_CHAINS})")

    # 7. seed injection + label mix -------------------------------------------
    if seeds:
        seed_rows = sum(
            1 for r in rows
            if seeds & (set(_pg_array(r["input_addresses"])) | set(_pg_array(r["output_addresses"])))
        )
        print(f"     ransomwhere seed rows       : {seed_rows}")
        check(seed_rows >= MIN_SEED_ROWS, "ransomwhere seed-address injection",
              f"{seed_rows} rows (floor {MIN_SEED_ROWS})")
    else:
        print("     ransomwhere seed rows       : SKIPPED (seeds file missing)")

    print("  -- labels --")
    for field in ("script_type", "geo_country"):
        dist = Counter(r[field] for r in rows)
        print(f"     {field:<12}: {dict(dist.most_common())}")
    asn_dist = Counter(r["asn"] for r in rows)
    print(f"     {'asn':<12}: {len(asn_dist)} distinct, top {asn_dist.most_common(5)}")
    fanout = Counter(len(_pg_array(r["output_addresses"])) for r in rows)
    print(f"     output fanout: {dict(sorted(fanout.items()))}")
    print(f"     mean addresses/row: "
          f"{sum(len(_pg_array(r['input_addresses'])) + len(_pg_array(r['output_addresses'])) for r in rows) / len(rows):.2f}")

    return unique_txids


def main() -> int:
    print("=" * 78)
    print("  Demo Dataset Verification — schema, accounting, topology")
    print("=" * 78)

    seeds = _seed_addresses()
    all_txids: set[str] = set()
    for filename in ("test_1000.csv", "test_2000.csv"):
        verify_file(filename, all_txids, seeds)

    print(f"\n{'=' * 78}")
    if failures:
        print(f"  [FAIL]  {len(failures)} check(s) failed:")
        for item in failures:
            print(f"          - {item}")
    else:
        print("  [PASS]  ALL CHECKS PASSED")
    print(f"{'=' * 78}\n")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
