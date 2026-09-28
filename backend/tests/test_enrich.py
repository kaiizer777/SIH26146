"""Tests for the ingest-scoped Louvain clustering stage.

The regression these guard against: ``run_clustering`` used to project the WHOLE
``:Wallet`` + ``:CO_SPEND`` graph and call ``gds.louvain.write``. Louvain renumbers
community ids globally, so every pre-loaded wallet silently lost its original
``cluster_id`` â€” emptying the pre-loaded Cluster Topology views and breaking the
seeded cluster tests.

Two layers:
  * unit â€” a fake session that records every query, proving the projection and
    the write are both restricted to the supplied scope. No database needed.
  * integration â€” a real, isolated subgraph in live Neo4j, proving a genuine
    scoped Louvain leaves pre-loaded wallets untouched. Skips if Neo4j is down.

Run with:
    docker compose exec -T fastapi pytest tests/test_enrich.py -v
"""

from __future__ import annotations

import json
import os
import sys
import uuid
from pathlib import Path
from typing import Any

import pytest

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from app.config import settings  # noqa: E402
from app.tasks import enrich  # noqa: E402
from app.tasks.enrich import (  # noqa: E402
    INGEST_CLUSTER_ID_OFFSET,
    resolve_ingested_wallet_scope,
    run_clustering,
)


# ---------------------------------------------------------------------------
# Fake Neo4j plumbing
# ---------------------------------------------------------------------------


class _Result(list):
    """A list that also answers ``.single()`` and ``.consume()``."""

    def single(self):
        return self[0] if self else None

    def consume(self) -> None:
        return None


class _FakeSession:
    """Records every query and answers from a routing table.

    Routes are matched on a substring of the query text so the fake stays
    independent of the exact Cypher constants.
    """

    def __init__(self, routes: dict[str, list[dict[str, Any]]], log: list[tuple[str, dict]]):
        self._routes = routes
        self._log = log

    def __enter__(self) -> _FakeSession:
        return self

    def __exit__(self, *exc: object) -> bool:
        return False

    def run(self, query: str, **params: Any) -> _Result:
        self._log.append((query, params))
        # The scoped write reports one count row per matched wallet.
        if "SET w.cluster_id" in query:
            batch = params.get("batch") or []
            return _Result([_rec(cnt=1) for _ in batch])
        for marker, rows in self._routes.items():
            if marker in query:
                return _Result(rows)
        return _Result()

    def execute_write(self, fn: Any, *a: Any, **kw: Any) -> Any:
        self._log.append(("<execute_write>", {}))
        return fn(self)


class _FakeDriver:
    def __init__(self, svc: _FakeSession) -> None:
        self._svc = svc

    def session(self, **_: Any) -> _FakeSession:
        return self._svc


class _FakeService:
    def __init__(self, svc: _FakeSession) -> None:
        self.driver = _FakeDriver(svc)


def _rec(**kw: Any) -> dict[str, Any]:
    return kw


# ---------------------------------------------------------------------------
# Unit â€” projection and write are scoped
# ---------------------------------------------------------------------------


def test_empty_scope_is_refused_and_never_projects_globally():
    """An ingest that resolved to no wallets must not fall back to a global run."""
    log: list[tuple[str, dict]] = []
    svc = _FakeService(_FakeSession({}, log))

    stats = run_clustering(svc, [])

    assert stats["status"] == "skipped"
    assert stats["reason"] == "no_ingested_wallets_in_scope"
    assert stats["wallets_written"] == 0
    # Nothing may be projected, streamed or written.
    assert log == [], f"unscoped fallback issued queries: {log}"


def test_none_scope_is_refused_too():
    log: list[tuple[str, dict]] = []
    stats = run_clustering(_FakeService(_FakeSession({}, log)), None)
    assert stats["status"] == "skipped"
    assert log == []


def test_projection_is_restricted_to_scope_on_both_ends():
    """Node filter is the scope; the relationship filter is BOTH ends in scope."""
    log: list[tuple[str, dict]] = []
    routes = {
        "gds.graph.project.cypher": [_rec(nodeCount=2, relationshipCount=4, projectMillis=7)],
        "gds.louvain.stream": [
            _rec(address="w_in", communityId=0),
            _rec(address="w_in2", communityId=1),
        ],
    }
    svc = _FakeService(_FakeSession(routes, log))

    run_clustering(svc, ["w_in", "w_in2", "w_missing"])

    proj = next(p for q, p in log if "gds.graph.project.cypher" in q)
    assert proj["scope"] == ["w_in", "w_in2", "w_missing"], "scope must be forwarded verbatim"
    assert proj["parameters"] if "parameters" in proj else True

    node_q = proj["nodeQuery"]
    rel_q = proj["relationshipQuery"]
    assert "w.address IN $scope" in node_q
    assert "a.address IN $scope AND b.address IN $scope" in rel_q, (
        "a relationship whose far end is out of scope would pull a pre-loaded "
        "wallet into the projection and get it renumbered"
    )
    # No native whole-label projection may remain in play.
    assert "'Wallet',\n    {\n        CO_SPEND: { orientation: 'UNDIRECTED' }" not in node_q


def test_cluster_ids_are_written_into_the_reserved_namespace():
    """Louvain's 0-based ids must not collide with pre-loaded cluster ids."""
    log: list[tuple[str, dict]] = []
    routes = {
        "gds.graph.project.cypher": [_rec(nodeCount=3, relationshipCount=1, projectMillis=1)],
        "gds.louvain.stream": [
            _rec(address="a1", communityId=0),
            _rec(address="a2", communityId=0),
            _rec(address="b1", communityId=1),
        ],
    }
    stats = run_clustering(_FakeService(_FakeSession(routes, log)), ["a1", "a2", "b1"])

    assert stats["cluster_id_offset"] == INGEST_CLUSTER_ID_OFFSET
    assert stats["community_count"] == 2
    assert stats["wallets_written"] == 3

    written = [p["batch"] for q, p in log if q == enrich._LOUVAIN_WRITE_QUERY]
    flat = [row for chunk in written for row in chunk]
    assert {r["address"] for r in flat} == {"a1", "a2", "b1"}
    assert all(r["cluster_id"] >= INGEST_CLUSTER_ID_OFFSET for r in flat)
    by_addr = {r["address"]: r["cluster_id"] for r in flat}
    # Community structure is preserved, just renumbered.
    assert by_addr["a1"] == by_addr["a2"]
    assert by_addr["b1"] != by_addr["a1"]
    assert by_addr["b1"] - by_addr["a1"] == 1


def test_projection_is_dropped_after_louvain():
    log: list[tuple[str, dict]] = []
    routes = {
        "gds.graph.project.cypher": [_rec(nodeCount=1, relationshipCount=0, projectMillis=1)],
        "gds.louvain.stream": [_rec(address="a1", communityId=0)],
    }
    run_clustering(_FakeService(_FakeSession(routes, log)), ["a1"])

    queries = [q for q, _ in log]
    drop_positions = [i for i, q in enumerate(queries) if "gds.graph.drop" in q]
    stream_positions = [i for i, q in enumerate(queries) if "gds.louvain.stream" in q]
    assert drop_positions, "stale projection must be dropped before rebuilding"
    assert drop_positions[0] < stream_positions[0], "drop must precede the projection"
    assert drop_positions[-1] > stream_positions[0], "projection must be dropped after Louvain"


def test_scope_resolution_is_empty_without_txids():
    log: list[tuple[str, dict]] = []
    assert resolve_ingested_wallet_scope(_FakeService(_FakeSession({}, log)), None) == []
    assert resolve_ingested_wallet_scope(_FakeService(_FakeSession({}, log)), []) == []
    assert log == [], "no txids means no database round-trip"


def test_scope_resolution_maps_txids_to_distinct_wallets():
    log: list[tuple[str, dict]] = []
    routes = {
        # "found" route first: the txid-existence query also contains the
        # "MATCH (tx:Transaction {txid: txid})" marker below.
        "RETURN collect(DISTINCT txid) AS found": [_rec(found=["t1", "t2"])],
        "MATCH (tx:Transaction {txid: txid})": [
            _rec(address="w_b"),
            _rec(address="w_a"),
            _rec(address="w_b"),
        ],
    }
    scope = resolve_ingested_wallet_scope(
        _FakeService(_FakeSession(routes, log)), ["t1", "t2", "t3"]
    )
    assert scope == ["w_a", "w_b"], "scope must be sorted and de-duplicated"
    # One scope query + one existence query per batch â€” never per txid.
    txid_queries = [p["txids"] for q, p in log if "UNWIND $txids AS txid" in q]
    assert txid_queries == [["t1", "t2", "t3"], ["t1", "t2", "t3"]]
    assert len(txid_queries) == 2, (
        f"scope resolution must not re-query per txid (N+1); got {len(txid_queries)} queries"
    )


def test_scope_holds_out_wallets_carrying_a_preloaded_cluster_id():
    """A seeded wallet that merely transacted must keep its original cluster."""
    log: list[tuple[str, dict]] = []
    routes = {
        "RETURN collect(DISTINCT txid) AS found": [_rec(found=["t1"])],
        "MATCH (tx:Transaction {txid: txid})": [
            _rec(address="brand_new"),
            _rec(address="seeded_wallet"),
            _rec(address="already_ingested"),
        ],
        # seeded_wallet holds a pre-loaded id -> protected.
        # already_ingested holds a reserved-namespace id from a prior run -> keep.
        # brand_new has no cluster_id yet -> keep.
        "RETURN w.address AS address, w.cluster_id AS cluster_id": [
            _rec(address="seeded_wallet", cluster_id=18419),
            _rec(address="already_ingested", cluster_id=INGEST_CLUSTER_ID_OFFSET + 7),
            _rec(address="brand_new", cluster_id=None),
        ],
    }
    scope = resolve_ingested_wallet_scope(
        _FakeService(_FakeSession(routes, log)), ["t1"]
    )
    assert scope == ["already_ingested", "brand_new"], (
        "a wallet holding a pre-loaded cluster_id must never enter the scope"
    )
    assert "seeded_wallet" not in scope


def test_scope_keeps_wallets_at_or_above_the_reserved_offset():
    """Reserved-namespace ids are ingest-owned and must stay clusterable."""
    log: list[tuple[str, dict]] = []
    routes = {
        "RETURN collect(DISTINCT txid) AS found": [_rec(found=["t1"])],
        "MATCH (tx:Transaction {txid: txid})": [_rec(address="w1")],
        "RETURN w.address AS address, w.cluster_id AS cluster_id": [
            _rec(address="w1", cluster_id=INGEST_CLUSTER_ID_OFFSET)
        ],
    }
    assert resolve_ingested_wallet_scope(
        _FakeService(_FakeSession(routes, log)), ["t1"]
    ) == ["w1"]


# ---------------------------------------------------------------------------
# Integration â€” real scoped Louvain in live Neo4j
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def neo4j_svc():
    try:
        from app.services.graph_service import GraphService

        svc = GraphService()
        svc.connect()
        yield svc
        svc.close()
    except Exception as exc:  # noqa: BLE001
        pytest.skip(f"live Neo4j unavailable: {exc}")


@pytest.fixture
def isolated_cluster(neo4j_svc):
    """A throwaway co-spend cluster with a unique address prefix.

    Teardown deletes exactly the nodes it created, so it cannot disturb the
    pre-loaded corpus.
    """
    tag = uuid.uuid4().hex[:12]
    addresses = [f"bc1q_enrichtest_{tag}_{i}" for i in range(4)]
    with neo4j_svc.driver.session(database=settings.neo4j_database) as s:
        s.run(
            """
            UNWIND $addrs AS a
            CREATE (w:Wallet {address: a, _enrich_test_tag: $tag})
            WITH collect(w) AS ws
            UNWIND range(0, size(ws) - 2) AS i
            MATCH (p:Wallet), (q:Wallet)
            WHERE p.address = ws[i].address AND q.address = ws[i + 1].address
            MERGE (p)-[:CO_SPEND]-(q)
            """,
            addrs=addresses,
            tag=tag,
        ).consume()
    try:
        yield addresses
    finally:
        with neo4j_svc.driver.session(database=settings.neo4j_database) as s:
            s.run(
                "MATCH (w:Wallet {_enrich_test_tag: $tag}) DETACH DELETE w", tag=tag
            ).consume()


def _preloaded_snapshot(neo4j_svc, limit: int = 300) -> dict[str, Any]:
    """cluster_id of the first ``limit`` pre-loaded wallets, by address."""
    with neo4j_svc.driver.session(database=settings.neo4j_database) as s:
        rows = s.run(
            """
            MATCH (w:Wallet)
            WHERE w.cluster_id IS NOT NULL AND NOT w.address STARTS WITH 'bc1q_enrichtest_'
            RETURN w.address AS a, w.cluster_id AS c
            LIMIT $limit
            """,
            limit=limit,
        ).data()
    return {r["a"]: r["c"] for r in rows}


def test_real_scoped_louvain_leaves_preloaded_wallets_untouched(
    neo4j_svc, isolated_cluster
):
    """The core regression guard, against real Neo4j + real GDS Louvain."""
    before = _preloaded_snapshot(neo4j_svc, limit=300)
    assert len(before) >= 200, "need >= 200 pre-loaded wallets for a meaningful comparison"

    stats = run_clustering(neo4j_svc, isolated_cluster)

    assert stats.get("status") != "skipped"
    assert stats["scope_wallets"] == len(isolated_cluster)
    assert stats["community_count"] >= 1
    assert stats["wallets_written"] == len(isolated_cluster)

    after = _preloaded_snapshot(neo4j_svc, limit=300)
    assert after == before, "pre-loaded cluster_id must be untouched by a scoped run"


def test_scoped_wallets_receive_real_cluster_ids(neo4j_svc, isolated_cluster):
    run_clustering(neo4j_svc, isolated_cluster)
    with neo4j_svc.driver.session(database=settings.neo4j_database) as s:
        rows = s.run(
            "MATCH (w:Wallet) WHERE w.address IN $a RETURN w.cluster_id AS c",
            a=isolated_cluster,
        ).data()
    assert len(rows) == len(isolated_cluster)
    assert all(r["c"] is not None for r in rows)
    assert all(r["c"] >= INGEST_CLUSTER_ID_OFFSET for r in rows), (
        "scoped ids must land in the reserved namespace, never colliding with "
        "pre-loaded cluster ids"
    )


def test_scoped_reclustering_is_stable_for_a_small_scope(neo4j_svc, isolated_cluster):
    """Re-running over the same scope must not move wallets.

    Scope note: this holds for small projections. GDS Louvain 2.13 exposes no
    `seed` key and is non-deterministic above a few thousand projected nodes, so
    at production scope a re-run may renumber ingest-owned communities among
    themselves. What must hold at EVERY scale â€” and what
    `test_real_scoped_louvain_leaves_preloaded_wallets_untouched` covers â€” is
    that the pre-loaded corpus never moves.
    """
    first = run_clustering(neo4j_svc, isolated_cluster)
    with neo4j_svc.driver.session(database=settings.neo4j_database) as s:
        snap1 = {
            r["a"]: r["c"]
            for r in s.run(
                "MATCH (w:Wallet) WHERE w.address IN $a RETURN w.address AS a, w.cluster_id AS c",
                a=isolated_cluster,
            )
        }
    second = run_clustering(neo4j_svc, isolated_cluster)
    with neo4j_svc.driver.session(database=settings.neo4j_database) as s:
        snap2 = {
            r["a"]: r["c"]
            for r in s.run(
                "MATCH (w:Wallet) WHERE w.address IN $a RETURN w.address AS a, w.cluster_id AS c",
                a=isolated_cluster,
            )
        }
    assert snap1 == snap2, "re-running over the same scope must not move wallets"
    assert first["wallets_written"] == second["wallets_written"]


def test_offset_cannot_collide_with_seeded_cluster_ids():
    """The reserved namespace must sit above every seeded cluster id."""
    data_root = Path(os.environ.get("DATA_ROOT", "/app/data"))
    artifact = data_root / "xai" / "composite_risk_scores.json"
    if not artifact.exists():
        pytest.skip("frozen cluster artifact not available")
    records = json.load(open(artifact, encoding="utf-8"))
    seeded = [r["cluster_id"] for r in records.values() if (r.get("cluster_id") or 0) > 0]
    assert seeded, "artifact should carry concrete seeded cluster ids"
    assert max(seeded) < INGEST_CLUSTER_ID_OFFSET, (
        f"offset {INGEST_CLUSTER_ID_OFFSET} collides with seeded cluster id {max(seeded)}"
    )
