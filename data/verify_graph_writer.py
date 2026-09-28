"""Throwaway verification harness for backend/app/services/graph_writer.py.

Runs the REAL ingest path (parser.parse_csv + schemas.ingest.TransactionRecord)
against the LIVE Neo4j container, prints the resulting graph shape, proves
idempotency, then removes everything it created and proves the pre-existing
seeded graph is byte-for-byte back at its baseline counts.

    backend/venv/Scripts/python.exe data/verify_graph_writer.py

Not part of the test suite; delete after use.
"""

from __future__ import annotations

import sys
import time
from decimal import Decimal
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from neo4j import GraphDatabase  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from app.config import settings  # noqa: E402
from app.schemas.ingest import TransactionRecord  # noqa: E402
from app.services.graph_writer import (  # noqa: E402
    SKIP_AMOUNT_MISMATCH,
    SKIP_EMPTY_ADDRESS,
    SKIP_MISSING_TXID,
    GraphWriteSummary,
    prepare_row,
    write_transactions_to_graph,
)
from app.services.parser import parse_csv  # noqa: E402

CSV_PATH = ROOT / "data" / "test_2000.csv"

NODE_LABELS = ("Wallet", "Transaction", "IP")
REL_TYPES = ("SENDS", "RECEIVES", "OBSERVED", "CO_SPEND")

_failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}" + (f" — {detail}" if detail else ""))
    if not condition:
        _failures.append(label)


# ---------------------------------------------------------------------------
# Part 1 — pure logic, no database
# ---------------------------------------------------------------------------


def part1_unit_logic() -> None:
    print("\n=== PART 1: sanitisation / parity / canonicalisation (no DB) ===")

    def row(**kw: Any) -> dict[str, Any]:
        base: dict[str, Any] = {
            "txid": "a" * 64, "ts": "2026-09-02T05:38:08Z",
            "src_ip": "1.1.1.36", "src_port": 13784, "dst_port": 8333,
            "input_addresses": [], "output_addresses": [],
            "input_amounts": [], "output_amounts": [],
            "fee": "0.00000637", "script_type": "P2WPKH",
            "geo_country": "US", "asn": 13335,
        }
        base.update(kw)
        return base

    p, r = prepare_row(row())
    check("empty input is accepted (no tx-level rejection)", p is not None and not r)

    p, r = prepare_row(row(txid=""))
    check("blank txid rejects the row", p is None and r == {SKIP_MISSING_TXID: 1})

    p, r = prepare_row(row(txid=None, input_addresses=["A"], input_amounts=["1"]))
    check("None txid rejects the row", p is None and r[SKIP_MISSING_TXID] == 1)

    # Parity mismatch: the reference builder would zip() and silently truncate.
    p, r = prepare_row(row(
        input_addresses=["A", "B", "C"], input_amounts=["1.0", "2.0"],
        output_addresses=["X"], output_amounts=["3.0"],
    ))
    check(
        "input parity mismatch skips SENDS entirely (no silent truncation)",
        p is not None and p.sends == () and r[SKIP_AMOUNT_MISMATCH] == 1,
        f"sends={p.sends} reasons={r}",
    )
    check(
        "output side of the same row is still written",
        p is not None and p.receives == (("X", 3.0),),
    )
    check(
        "mismatched input addresses still get Wallet nodes + CO_SPEND",
        p is not None and set(p.wallet_addresses) == {"A", "B", "C", "X"}
        and sorted(p.cospend_pairs) == [("A", "B"), ("A", "C"), ("B", "C")],
        f"wallets={p.wallet_addresses} cospend={p.cospend_pairs}",
    )

    # Blank / duplicate addresses. Note: "A" appears twice with *different*
    # amounts, and the reference MERGE keys SENDS on (amount, script_type), so
    # those are legitimately two distinct edges.
    p, r = prepare_row(row(
        input_addresses=[" A ", "", None, "A", "B"],
        input_amounts=["1.0", "2.0", "3.0", "4.0", "5.0"],
        output_addresses=["X"], output_amounts=["9.0"],
    ))
    check(
        "blank addresses are dropped and counted exactly once",
        p is not None and r[SKIP_EMPTY_ADDRESS] == 2,
        f"reasons={r}",
    )
    check(
        "same address with different amounts stays 2 SENDS edges (reference MERGE key)",
        p is not None and p.sends == (("A", 1.0), ("A", 4.0), ("B", 5.0)),
        f"sends={p.sends}",
    )
    check(
        "Wallet node list is de-duplicated and stripped",
        p is not None and p.wallet_addresses == ("A", "B", "X"),
        f"wallets={p.wallet_addresses}",
    )
    check(
        "exact duplicate (addr, amount) pair collapses to one edge",
        prepare_row(row(
            input_addresses=["A", "A"], input_amounts=["1.0", "1.0"],
            output_addresses=[], output_amounts=[],
        ))[0].sends == (("A", 1.0),),
    )
    check(
        "duplicate address does not create a CO_SPEND self-loop",
        p is not None and p.cospend_pairs == (("A", "B"),),
        f"cospend={p.cospend_pairs}",
    )

    # Canonical ordering.
    p, _ = prepare_row(row(
        input_addresses=["zzz", "aaa", "mmm"],
        input_amounts=["1", "2", "3"],
        output_addresses=[], output_amounts=[],
    ))
    check(
        "CO_SPEND is canonically ordered addr1 < addr2",
        p is not None
        and all(a < b for a, b in p.cospend_pairs)
        and sorted(p.cospend_pairs) == [("aaa", "mmm"), ("aaa", "zzz"), ("mmm", "zzz")],
        f"cospend={p.cospend_pairs}",
    )

    # Non-numeric amount.
    p, r = prepare_row(row(
        input_addresses=["A", "B"], input_amounts=["1.0", "not-a-number"],
        output_addresses=["X"], output_amounts=["3.0"],
    ))
    check(
        "unparseable amount drops only that edge and is counted",
        p is not None and p.sends == (("A", 1.0),) and r["invalid_amount"] == 1,
        f"sends={p.sends} reasons={r}",
    )

    # Totals equal the sum of the written edges.
    p, _ = prepare_row(row(
        input_addresses=["A", "B"], input_amounts=["0.1", "0.2"],
        output_addresses=["X", "Y"], output_amounts=["0.25", "0.05"],
    ))
    check(
        "total_in / total_out equal the sum of the written SENDS / RECEIVES",
        p is not None
        and abs(p.total_in - sum(a for _, a in p.sends)) < 1e-9
        and abs(p.total_out - sum(a for _, a in p.receives)) < 1e-9
        and abs(p.total_in - 0.3) < 1e-9 and abs(p.total_out - 0.3) < 1e-9,
        f"in={p.total_in} out={p.total_out}",
    )

    check(
        "non-finite amount is rejected",
        prepare_row(row(
            input_addresses=["A"], input_amounts=["NaN"],
            output_addresses=[], output_amounts=[],
        ))[1].get("invalid_amount") == 1,
    )


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------


def snapshot(driver) -> dict[str, int]:
    counts: dict[str, int] = {}
    with driver.session(database=settings.neo4j_database) as s:
        for label in NODE_LABELS:
            counts[label] = s.run(f"MATCH (n:{label}) RETURN count(n) AS c").single()["c"]
        for rel in REL_TYPES:
            counts[rel] = s.run(f"MATCH ()-[r:{rel}]->() RETURN count(r) AS c").single()["c"]
    return counts


def print_graph_report(driver, txids: list[str], addrs: list[str], title: str) -> dict[str, Any]:
    print(f"\n--- {title} ---")
    with driver.session(database=settings.neo4j_database) as s:
        totals = {
            label: s.run(f"MATCH (n:{label}) RETURN count(n) AS c").single()["c"]
            for label in NODE_LABELS
        }
        rels = {
            rel: s.run(f"MATCH ()-[r:{rel}]->() RETURN count(r) AS c").single()["c"]
            for rel in REL_TYPES
        }
        print("  whole database:")
        for label in NODE_LABELS:
            print(f"    :{label:<12} {totals[label]:>8,}")
        for rel in REL_TYPES:
            print(f"    :{rel:<12} {rels[rel]:>8,}")

        scoped = s.run(
            """
            UNWIND $t AS txid
            MATCH (t:Transaction {txid: txid})
            OPTIONAL MATCH (a:Wallet)-[:SENDS]->(t)
            OPTIONAL MATCH (t)-[:RECEIVES]->(b:Wallet)
            OPTIONAL MATCH (i:IP)-[:OBSERVED]->(t)
            RETURN count(DISTINCT t) AS tx,
                   count(DISTINCT a) AS wallets,
                   count(DISTINCT i) AS ips
            """,
            t=txids,
        ).single()
        print("  scoped to the 2,000 test txids:")
        print(f"    :Transaction   {scoped['tx']:>8,}")
        print(f"    :Wallet        {scoped['wallets']:>8,}")
        print(f"    :IP            {scoped['ips']:>8,}")

        print("  edge counts touching the test nodes:")
        for rel, pattern in (
            ("SENDS", "UNWIND $a AS x MATCH (:Wallet {address:x})-[r:SENDS]->(:Transaction) RETURN count(r) AS c"),
            ("RECEIVES", "UNWIND $a AS x MATCH (:Transaction)-[r:RECEIVES]->(:Wallet {address:x}) RETURN count(r) AS c"),
            ("OBSERVED", "UNWIND $t AS x MATCH (:IP)-[r:OBSERVED]->(:Transaction {txid:x}) RETURN count(r) AS c"),
            ("CO_SPEND", "UNWIND $a AS x MATCH (:Wallet {address:x})-[r:CO_SPEND]->() RETURN count(r) AS c"),
        ):
            params = {"a": addrs} if rel in ("SENDS", "RECEIVES", "CO_SPEND") else {"t": txids}
            n = s.run(pattern, **params).single()["c"]
            print(f"    {rel:<12} {n:>8,}")

        # --- CO_SPEND topology over the test wallets ---
        stats = s.run(
            """
            UNWIND $a AS x
            WITH collect(x) AS addrs
            UNWIND addrs AS a
            MATCH (w:Wallet {address: a})
            WITH w, size([(w)-[r:CO_SPEND]->(:Wallet) | r]) +
                 size([(:Wallet)-[r:CO_SPEND]->(w) | r]) AS deg
            RETURN count(w) AS wallets,
                   sum(CASE WHEN deg = 0 THEN 1 ELSE 0 END) AS isolated,
                   max(deg) AS max_deg,
                   round(avg(deg), 4) AS mean_deg,
                   sum(deg) AS total_deg
            """,
            a=addrs,
        ).single()
        print("  CO_SPEND topology over the 8,137 test wallets:")
        print(f"    wallets                 {stats['wallets']:>8,}")
        print(f"    wallets with >=1 edge   {stats['wallets'] - stats['isolated']:>8,}")
        print(f"    wallets with  0 edges   {stats['isolated']:>8,}")
        print(f"    max degree              {stats['max_deg']:>8,}")
        print(f"    mean degree             {stats['mean_deg']:>8,}")
        print(f"    total degree (2*edges)  {stats['total_deg']:>8,}")
        return {"totals": totals, "rels": rels}


def load_records() -> tuple[list[TransactionRecord], list[str], list[str], list[str], int]:
    """Parse through the REAL parser + Pydantic schema."""
    records: list[TransactionRecord] = []
    rejected = 0
    for raw in parse_csv(CSV_PATH):
        try:
            records.append(TransactionRecord.model_validate(raw))
        except ValidationError as exc:
            rejected += 1
            if rejected <= 3:
                print(f"  rejected row: {exc.errors(include_url=False)}")
    txids = [r.txid for r in records]
    addrs = sorted({a for r in records for a in (*r.input_addresses, *r.output_addresses)})
    ips = sorted({r.src_ip for r in records})
    return records, txids, addrs, ips, rejected


def show_summary(label: str, s: GraphWriteSummary) -> None:
    print(f"\n{label}")
    for k, v in s.as_dict().items():
        print(f"    {k:<24} {v}")


def main() -> int:
    part1_unit_logic()
    if "--unit-only" in sys.argv:
        print("\n" + "=" * 60)
        if _failures:
            print(f"FAILED ({len(_failures)}): {_failures}")
            return 1
        print("ALL UNIT CHECKS PASSED")
        return 0

    print("\n=== PART 2: real ingest path -> live Neo4j ===")
    records, txids, addrs, ips, rejected = load_records()
    print(f"  parsed {CSV_PATH.name}: {len(records)} valid TransactionRecord, {rejected} rejected")
    print(f"  distinct txids={len(set(txids))}  distinct wallets={len(addrs)}  distinct src_ips={len(ips)}")
    check("all 2,000 CSV rows validated", len(records) == 2000, f"got {len(records)}")

    driver = GraphDatabase.driver(
        settings.neo4j_uri, auth=(settings.neo4j_user, settings.neo4j_password)
    )
    try:
        before = snapshot(driver)
        print(f"\n  baseline: {before}")

        with driver.session(database=settings.neo4j_database) as s:
            pre_wallets = s.run(
                "UNWIND $a AS x MATCH (n:Wallet {address:x}) RETURN count(n) AS c", a=addrs
            ).single()["c"]
            pre_ips = s.run(
                "UNWIND $i AS x MATCH (n:IP {address:x}) RETURN count(n) AS c", i=ips
            ).single()["c"]
            # Pre-existing CO_SPEND edges touching the test wallets. Captured now
            # so cleanup can delete ONLY the edges this run created — some test
            # addresses already existed in the seeded graph.
            pre_cospend = {
                (r["a1"], r["a2"])
                for r in s.run(
                    """
                    MATCH (a:Wallet)-[r:CO_SPEND]->(b:Wallet)
                    WHERE a.address IN $a AND b.address IN $a
                    RETURN a.address AS a1, b.address AS a2
                    """,
                    a=addrs,
                )
            }
        print(f"  already present in the seeded graph: {pre_wallets} wallets, {pre_ips} ips, "
              f"{len(pre_cospend)} pre-existing CO_SPEND edges between test wallets")

        t0 = time.perf_counter()
        run1 = write_transactions_to_graph(records, edge_batch_size=1000)
        show_summary("RUN 1 (cold):", run1)
        print(f"    wall (client)             {time.perf_counter() - t0:.2f}s")

        after1 = snapshot(driver)
        print(f"\n  after run 1: {after1}")
        report1 = print_graph_report(driver, txids, addrs, "GRAPH AFTER RUN 1")

        check(
            "created == 2,000 :Transaction nodes",
            run1.transactions_created == 2000, f"got {run1.transactions_created}",
        )
        check(
            f"created == {len(addrs) - pre_wallets} new :Wallet nodes "
            f"({pre_wallets} already existed in the seeded graph)",
            run1.wallets_created == len(addrs) - pre_wallets,
            f"got {run1.wallets_created}",
        )
        check(
            f"created == {len(ips) - pre_ips} new :IP nodes ({pre_ips} already existed)",
            run1.ips_created == len(ips) - pre_ips,
            f"got {run1.ips_created}",
        )
        check(
            "created == 7,167 SENDS (one per input address) and 11,757 RECEIVES",
            run1.sends_created == 7167 and run1.receives_created == 11757,
            f"sends={run1.sends_created} receives={run1.receives_created}",
        )
        check(
            "created == 2,000 OBSERVED (one per transaction src_ip)",
            run1.observed_created == 2000, f"got {run1.observed_created}",
        )
        check(
            "created 16,537 CO_SPEND (well over the 100 connected-wallet target)",
            run1.cospend_created == 16537, f"got {run1.cospend_created}",
        )
        check(
            "no rows rejected, no field skips",
            run1.rows_rejected == 0 and not run1.skip_reasons,
            f"rejected={run1.rows_rejected} skips={dict(run1.skip_reasons)}",
        )
        check(
            "database gained exactly 2,000 transactions",
            after1["Transaction"] - before["Transaction"] == 2000,
            f"{before['Transaction']} -> {after1['Transaction']}",
        )
        check(
            f"database gained exactly the {len(addrs) - pre_wallets} previously-absent wallets",
            after1["Wallet"] - before["Wallet"] == len(addrs) - pre_wallets,
            f"{before['Wallet']} -> {after1['Wallet']} (delta {after1['Wallet'] - before['Wallet']})",
        )

        print("\n=== PART 3: idempotency (second identical run) ===")
        run2 = write_transactions_to_graph(records, edge_batch_size=1000)
        show_summary("RUN 2 (warm):", run2)
        after2 = snapshot(driver)
        print(f"\n  after run 2: {after2}")

        check(
            "run 2 created ZERO nodes",
            run2.transactions_created == 0
            and run2.wallets_created == 0
            and run2.ips_created == 0,
            f"tx={run2.transactions_created} wallet={run2.wallets_created} ip={run2.ips_created}",
        )
        check(
            "run 2 created ZERO relationships",
            run2.sends_created == 0
            and run2.receives_created == 0
            and run2.observed_created == 0
            and run2.cospend_created == 0,
            f"sends={run2.sends_created} recv={run2.receives_created} "
            f"obs={run2.observed_created} cospend={run2.cospend_created}",
        )
        check("run 2 submitted the same payload size", run2.transactions_submitted == run1.transactions_submitted)
        check("global counts identical after run 2", after1 == after2,
              f"run1={after1} run2={after2}")
        print_graph_report(driver, txids, addrs, "GRAPH AFTER RUN 2 (must equal run 1)")

        print("\n=== PART 4: cleanup ===")
        print("  1. CO_SPEND edges this run created (pre-existing ones are spared),")
        print("  2. the 2,000 :Transaction nodes, 3. now-orphaned :Wallet, 4. orphaned :IP.")
        with driver.session(database=settings.neo4j_database) as s:
            candidates = [
                (r["a1"], r["a2"])
                for r in s.run(
                    """
                    MATCH (a:Wallet)-[r:CO_SPEND]->(b:Wallet)
                    WHERE a.address IN $a AND b.address IN $a
                    RETURN a.address AS a1, b.address AS a2
                    """,
                    a=addrs,
                )
            ]
            mine = [p for p in candidates if p not in pre_cospend]
            del_cospend = 0
            for i in range(0, len(mine), 1000):
                sub = mine[i : i + 1000]
                del_cospend += s.run(
                    """
                    UNWIND $p AS pair
                    MATCH (:Wallet {address: pair[0]})-[r:CO_SPEND]->(:Wallet {address: pair[1]})
                    DELETE r
                    RETURN count(r) AS removed
                    """,
                    p=[list(x) for x in sub],
                ).single()["removed"]
            del_tx = s.run(
                """
                UNWIND $t AS txid
                MATCH (n:Transaction {txid: txid})
                WITH collect(n) AS nodes
                FOREACH (n IN nodes | DETACH DELETE n)
                RETURN size(nodes) AS removed
                """,
                t=txids,
            ).single()["removed"]
            del_wallets = s.run(
                """
                UNWIND $a AS x
                MATCH (w:Wallet {address: x})
                WHERE NOT (w)--()
                WITH collect(w) AS nodes
                FOREACH (n IN nodes | DETACH DELETE n)
                RETURN size(nodes) AS removed
                """,
                a=addrs,
            ).single()["removed"]
            del_ips = s.run(
                """
                UNWIND $i AS x
                MATCH (n:IP {address: x})
                WHERE NOT (n)--()
                WITH collect(n) AS nodes
                FOREACH (n IN nodes | DETACH DELETE n)
                RETURN size(nodes) AS removed
                """,
                i=ips,
            ).single()["removed"]
        print(f"  deleted: {del_cospend:,} CO_SPEND, {del_tx:,} :Transaction, "
              f"{del_wallets:,} :Wallet, {del_ips:,} :IP")
        print(f"  spared : {len(pre_cospend)} pre-existing seeded CO_SPEND edges, "
              f"{pre_wallets} pre-existing wallets, {pre_ips} pre-existing ips")

        after_cleanup = snapshot(driver)
        print(f"\n  after cleanup: {after_cleanup}")
        check("cleanup restored the exact baseline", after_cleanup == before,
              f"{after_cleanup} != {before}")
    finally:
        driver.close()

    print("\n" + "=" * 60)
    if _failures:
        print(f"FAILED ({len(_failures)}): {_failures}")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
