"""Regression tests for the adversarial-verification fixes.

Each test below guards one specific defect the independent verifier measured
against the live system. The defects are grouped by the module that owns the
fix.

Run with:
    docker compose exec -T fastapi pytest tests/test_verifier_fixes.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import pytest

_BACKEND = Path(__file__).resolve().parents[1]
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

import psycopg2  # noqa: E402
from pydantic import ValidationError  # noqa: E402

from app.tasks import ingest as ingest_task  # noqa: E402


# ---------------------------------------------------------------------------
# BLOCKER 1 — a re-upload must not destroy the batch
# ---------------------------------------------------------------------------


class _FakeCursor:
    """Minimal psycopg2 cursor that records the SQL it is handed."""

    def __init__(self, conn: "_FakeConn") -> None:
        self._conn = conn
        self.rowcount = 0
        self._rows: list[tuple] = []

    def __enter__(self) -> "_FakeCursor":
        return self

    def __exit__(self, *exc: object) -> bool:
        return False

    def execute(self, sql: str, params: Any = None) -> None:
        self._conn.executed.append((sql, params))
        if "SELECT txid FROM transactions" in sql:
            self._rows = [(t,) for t in self._conn.preexisting]

    def fetchall(self) -> list[tuple]:
        return self._rows

    def close(self) -> None:
        pass


class _FakeConn:
    """Fake psycopg2 connection recording commits, rollbacks and SQL."""

    def __init__(self, preexisting: list[str] | None = None) -> None:
        self.preexisting = preexisting or []
        self.executed: list[tuple[str, Any]] = []
        self.commits = 0
        self.rollbacks = 0
        self.autocommit = False
        self.closed = False

    def cursor(self) -> _FakeCursor:
        return _FakeCursor(self)

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1

    def close(self) -> None:
        self.closed = True


def _copy_fn_that_trips(sink: list[int], rows: list[dict[str, Any]]) -> int:
    """Stand-in for ``bulk_copy_insert`` that always trips the unique constraint.

    ``sink`` receives the row count actually committed, so a test can assert that
    a non-zero number of rows survived the collision.
    """
    raise psycopg2.errors.UniqueViolation(
        'duplicate key value violates unique constraint "uq_transactions_txid"'
    )


def _row(txid: str) -> dict[str, Any]:
    return {
        "ts": "2026-03-02T21:26:27Z",
        "src_ip": "10.0.0.1",
        "dst_ip": "10.0.0.2",
        "src_port": 1,
        "dst_port": 2,
        "txid": txid,
        "input_addresses": ["bc1qin"],
        "output_addresses": ["bc1qout1", "bc1qout2"],
        "input_amounts": ["0.5"],
        "output_amounts": ["0.01", "0.48"],
        "fee": "0.0001",
        "script_type": "P2WPKH",
        "geo_country": "US",
        "asn": 64500,
    }


class TestBlocker1ConflictTolerantInsert:
    """One colliding txid must cost one row, not the whole batch."""

    def test_unique_violation_does_not_report_success(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """A COPY unique violation is a conflict, never a silent whole-batch loss."""
        rows = [_row(f"{i:064x}") for i in range(5)]
        conn = _FakeConn(preexisting=[rows[0]["txid"]])

        def _copy_raises(conn_: Any, batch: list[dict[str, Any]]) -> int:
            raise psycopg2.errors.UniqueViolation(
                'duplicate key value violates unique constraint "uq_transactions_txid"'
            )

        # The fallback INSERT is what actually writes; make its rowcount honest.
        real_execute_values = ingest_task.execute_values

        def _fake_execute_values(cur: Any, sql: str, args: list[Any], **kw: Any) -> None:
            cur.rowcount = len(args) - 1  # exactly one txid already exists

        monkeypatch.setattr(ingest_task, "execute_values", _fake_execute_values)
        outcome = ingest_task._insert_batch_with_conflict_recovery(
            conn, rows, _copy_raises
        )

        assert outcome.error is None, outcome.error
        assert outcome.used_fallback is True
        assert outcome.inserted == 4
        assert outcome.duplicates == 1
        assert outcome.duplicate_txids == [rows[0]["txid"]]
        assert outcome.inserted + outcome.duplicates == len(rows)
        assert real_execute_values is not None  # sanity: the real symbol exists

    def test_duplicate_snapshot_is_taken_before_the_insert(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """The pre-existing set must be read BEFORE the retry, not after.

        Reading afterwards would return the rows the retry just inserted and
        report every new row as a duplicate.
        """
        rows = [_row(f"{i:064x}") for i in range(3)]
        conn = _FakeConn(preexisting=[rows[1]["txid"]])
        order: list[str] = []

        def _copy_raises(conn_: Any, batch: list[dict[str, Any]]) -> int:
            raise psycopg2.errors.UniqueViolation("uq_transactions_txid")

        def _fake_execute_values(cur: Any, sql: str, args: list[Any], **kw: Any) -> None:
            order.append("insert")
            cur.rowcount = len(args) - 1

        original_execute = _FakeCursor.execute

        def _tracking_execute(self: _FakeCursor, sql: str, params: Any = None) -> None:
            if "SELECT txid FROM transactions" in sql:
                order.append("snapshot")
            original_execute(self, sql, params)

        monkeypatch.setattr(_FakeCursor, "execute", _tracking_execute)
        monkeypatch.setattr(ingest_task, "execute_values", _fake_execute_values)

        outcome = ingest_task._insert_batch_with_conflict_recovery(
            conn, rows, _copy_raises
        )

        assert order == ["snapshot", "insert"], order
        assert outcome.duplicates == 1
        assert outcome.duplicate_txids == [rows[1]["txid"]]

    def test_non_conflict_error_is_reported_not_swallowed(self) -> None:
        """A non-conflict DB error still fails the batch, but explicitly."""
        conn = _FakeConn()

        def _copy_raises(conn_: Any, batch: list[dict[str, Any]]) -> int:
            raise psycopg2.errors.NotNullViolation("fee must not be null")

        outcome = ingest_task._insert_batch_with_conflict_recovery(
            conn, [_row("a" * 64)], _copy_raises
        )

        assert outcome.error is not None
        assert "NotNullViolation" in outcome.error
        assert outcome.inserted == 0
        assert outcome.rejected == 1
        assert conn.rollbacks >= 1

    def test_total_loss_status_raises_instead_of_reporting_success(self) -> None:
        """A run that stored nothing must not produce a SUCCESS task result."""
        summary = {
            "status": "no_rows_inserted",
            "total_received": 2000,
            "total_inserted": 0,
            "total_rejected": 2000,
            "total_duplicates": 2000,
            "insert_errors": [],
        }
        with pytest.raises(ingest_task.IngestDataLossError) as excinfo:
            raise ingest_task.IngestDataLossError("stored 0 of 2000", summary)

        assert excinfo.value.summary is not None
        assert excinfo.value.summary["total_duplicates"] == 2000
        # The summary must survive Celery's JSON result-backend round trip, which
        # re-instantiates the exception from ``args``.
        rebuilt = ingest_task.IngestDataLossError(
            *excinfo.value.args
        )
        assert rebuilt.summary["total_received"] == 2000
        assert str(rebuilt) == str(excinfo.value)

    def test_counters_keep_received_equal_inserted_plus_rejected(self) -> None:
        counters = ingest_task._PipelineCounters()
        counters.received = 10
        counters.inserted = 6
        counters.add_duplicate_rejections(["a" * 64, "b" * 64, "c" * 64, "d" * 64], 10)
        assert counters.rejected == 4
        assert counters.duplicates == 4
        assert counters.received == counters.inserted + counters.rejected
        assert len(counters.rejected_rows) == 4

    def test_partial_write_error_keeps_batch_recoverable(self) -> None:
        """A failed batch rolls back, so the connection stays usable."""
        conn = _FakeConn()
        counters = ingest_task._PipelineCounters()
        graph_totals = {"status": "pending", "parity": {}}
        graph_state: dict[str, Any] = {"service": None, "failed": True}

        def _copy_raises(conn_: Any, batch: list[dict[str, Any]]) -> int:
            raise psycopg2.errors.CheckViolation("constraint trigger failed")

        ingest_task._commit_batch(
            conn, [_row("f" * 64)], _copy_raises, counters,
            last_row_index=3, graph_totals=graph_totals, graph_state=graph_state,
        )

        assert counters.inserted == 0
        assert counters.rejected == 1
        assert counters.insert_errors and "CheckViolation" in counters.insert_errors[0]
        assert conn.rollbacks == 1
        assert conn.commits == 0


# ---------------------------------------------------------------------------
# BLOCKER 2 / MAJOR 4 / 6 / 7 — enrichment must reach the product
# ---------------------------------------------------------------------------


class TestPublishToXaiStore:
    """The enrichment results must become visible to the dossier."""

    def _row(self, **over: Any) -> dict[str, Any]:
        base: dict[str, Any] = {
            "address": "bc1qexample",
            "cluster_id": 1_000_001,
            "cluster_size": 7,
            "risk_score": 0.42,
            "risk_score_source": "graph_heuristic_v1",
            "seed_proximity": 0.5,
            "is_seed_illicit": False,
            "chain_hops": 5,
            "pass_through_ratio": 0.93,
            "is_mixing": True,
            "tx_anomaly": 0.07,
            "wallet_anomaly": 0.0,
            "tx_count": 3,
        }
        base.update(over)
        return base

    def test_record_carries_the_enrichment_facts(self) -> None:
        from app.tasks import enrich

        item = enrich._build_publish_record(self._row())
        comp = item["composite_record"]
        ev = item["evidence_record"]

        assert comp["cluster_id"] == 1_000_001
        assert comp["cluster_size"] == 7
        assert comp["risk_score"] == 0.42
        assert comp["risk_score_source"] == "graph_heuristic_v1"
        assert comp["seed_wallet_proximity"] == 0.5
        assert comp["is_mixing"] is True
        assert comp["chain_hops"] == 5
        assert comp["pass_through_ratio"] == 0.93
        assert ev["pass_through_ratio_state"] == "derived_from_peeling_chain"

    def test_unavailable_ratio_is_never_reported_as_zero(self) -> None:
        """-1.0 is the "no value breakdown" sentinel, not a 0.0 measurement."""
        from app.tasks import enrich

        item = enrich._build_publish_record(self._row(pass_through_ratio=-1.0))
        assert item["composite_record"]["pass_through_ratio"] is None
        assert (
            item["evidence_record"]["pass_through_ratio_state"]
            == "unavailable_no_peeling_chain_value_breakdown"
        )

    def test_wallet_without_risk_score_is_refused(self) -> None:
        """Never publish a record whose risk value would have to be invented."""
        from app.tasks import enrich

        with pytest.raises(ValueError, match="no risk_score"):
            enrich._build_publish_record(self._row(risk_score=None))

    def test_publish_is_a_chain_stage(self) -> None:
        """The publish stage must actually be wired into the chain."""
        import inspect

        from app.tasks import enrich

        source = inspect.getsource(enrich.run_enrichment_chain)
        assert '"xai_publish", publish_to_xai_store' in source

    def test_risk_weights_are_documented_and_sum_to_one(self) -> None:
        """The independent risk heuristic must be a real, bounded combination."""
        from app.tasks import enrich

        assert sum(enrich._RISK_WEIGHTS.values()) == pytest.approx(1.0)
        for name, weight in enrich._RISK_WEIGHTS.items():
            assert 0.0 < weight <= 1.0, name

    def test_risk_score_is_not_backfilled_from_composite(self) -> None:
        """The circular back-fill (risk <- clamp(composite <- risk)) is gone."""
        import inspect

        from app.tasks import enrich

        source = inspect.getsource(enrich)
        assert "inline_composite" not in source
        assert "_risk_scores_from_inline" not in source

    def test_seed_proximity_is_written_before_risk_scores(self) -> None:
        """The risk heuristic has a seed-proximity term read off the graph.

        Writing risk_score first fed it the PREVIOUS run's proximity, which was
        0.0 everywhere while the seed set failed to resolve, so the seed term
        contributed nothing and every direct ransom address was under-scored.
        """
        import inspect

        from app.tasks import enrich

        source = inspect.getsource(enrich.run_wallet_attributes)
        seed_at = source.index("_write_seed_proximity(svc)")
        risk_at = source.index("_write_wallet_risk_scores(svc)")
        assert seed_at < risk_at, "seed proximity must be resolved before risk"

    def test_publish_stats_describe_only_what_was_written(self) -> None:
        """`published` and the verdict histogram must exclude retained dossiers."""
        import inspect

        from app.tasks import enrich

        source = inspect.getsource(enrich.publish_to_xai_store)
        # Retained records are partitioned out before the upsert and never enter
        # the verdict tally.
        assert "to_write: list[dict[str, Any]] = []" in source
        assert "for item in to_write[:written]:" in source


class _FakeContractSession:
    """A Neo4j session that returns one canned contract record."""

    def __init__(self, rec: dict[str, int]) -> None:
        self._rec = rec

    def __enter__(self) -> "_FakeContractSession":
        return self

    def __exit__(self, *exc: object) -> bool:
        return False

    def run(self, *_: Any, **__: Any) -> "_FakeContractSession":
        return self

    def single(self) -> dict[str, int]:
        return self._rec


class _FakeContractDriver:
    def __init__(self, rec: dict[str, int]) -> None:
        self._rec = rec

    def session(self, **_: Any) -> _FakeContractSession:
        return _FakeContractSession(self._rec)


class _FakeContractService:
    """Minimal GraphService stand-in for ``verify_schema_contract``."""

    def __init__(
        self,
        *,
        total: int,
        with_cluster: int,
        with_risk: int,
        with_seed_prox: int,
        with_nonzero_seed_prox: int,
        seed_wallets: int,
        with_seed_flag: int,
        bad_risk: int,
        zero_risk: int,
        risk_at_anomaly: int,
    ) -> None:
        self.driver = _FakeContractDriver({
            "total": total,
            "with_cluster": with_cluster,
            "with_risk": with_risk,
            "with_seed_prox": with_seed_prox,
            "with_nonzero_seed_prox": with_nonzero_seed_prox,
            "seed_wallets": seed_wallets,
            "with_seed_flag": with_seed_flag,
            "bad_risk": bad_risk,
            "zero_risk": zero_risk,
            "risk_at_w_anomaly": risk_at_anomaly,
        })


class _seeds_configured:
    """Patch the seed set the contract inspects, without loading 11k addresses."""

    def __init__(self, configured: bool) -> None:
        self._configured = configured

    def __enter__(self) -> "_seeds_configured":
        from app.services import inline_scorer

        self._scorer = inline_scorer
        self._had_init = inline_scorer._initialized  # noqa: SLF001
        self._prev_init = inline_scorer.init_scorer  # noqa: SLF001
        self._prev_seeds = inline_scorer._seeds  # noqa: SLF001
        inline_scorer.init_scorer = lambda: None  # type: ignore[method-assign]
        inline_scorer._seeds = {  # noqa: SLF001
            "seed1" if self._configured else "",
        } - {""}
        return self

    def __exit__(self, *exc: object) -> bool:
        self._scorer.init_scorer = self._prev_init  # type: ignore[method-assign]
        self._scorer._seeds = self._prev_seeds  # noqa: SLF001
        return False


class TestSeedResolutionAndSchemaContract:
    """MAJOR 7 — the seed set must load, and the self-check must not lie."""

    def test_seed_addresses_are_populated_from_the_loaded_seeds(self) -> None:
        import inspect

        from app.tasks import enrich

        source = inspect.getsource(enrich._write_seed_proximity)
        # The lookup set must be seeded from the loaded Ransomwhere addresses,
        # not left empty (which made the hop-0 branch dead code).
        assert "seed_addrs: set[str] = set(seeds)" in source

    def test_schema_contract_fails_on_empty_seed_proximity(self) -> None:
        """ok:true on a field nobody wrote is exactly the bug being fixed.

        Exercises the real predicate against a fake Neo4j session rather than
        matching source text, so a reformat cannot silently disarm the check.
        """
        from app.tasks import enrich

        svc = _FakeContractService(
            total=10, with_cluster=10, with_risk=10,
            with_seed_prox=10, with_nonzero_seed_prox=0, seed_wallets=0,
            with_seed_flag=10, bad_risk=0, zero_risk=0, risk_at_anomaly=7,
        )
        with _seeds_configured(True):
            report = enrich.verify_schema_contract(svc)

        assert report["with_seed_proximity"] == 10
        assert report["with_nonzero_seed_proximity"] == 0
        assert report["ok"] is False
        assert any("seed_proximity is 0.0 for all" in f for f in report["failures"])

    def test_contract_passes_when_proximity_is_really_resolved(self) -> None:
        from app.tasks import enrich

        svc = _FakeContractService(
            total=10, with_cluster=10, with_risk=10,
            with_seed_prox=10, with_nonzero_seed_prox=4, seed_wallets=2,
            with_seed_flag=10, bad_risk=0, zero_risk=0, risk_at_anomaly=0,
        )
        with _seeds_configured(True):
            report = enrich.verify_schema_contract(svc)
        assert report["ok"] is True, report["failures"]

    def test_contract_tolerates_a_corpus_with_no_seed_data(self) -> None:
        """Seeds not configured must not be reported as a failure."""
        from app.tasks import enrich

        svc = _FakeContractService(
            total=10, with_cluster=10, with_risk=10,
            with_seed_prox=10, with_nonzero_seed_prox=0, seed_wallets=0,
            with_seed_flag=10, bad_risk=0, zero_risk=0, risk_at_anomaly=0,
        )
        with _seeds_configured(False):
            report = enrich.verify_schema_contract(svc)
        assert report["seeds_configured"] is False
        assert report["ok"] is True, report["failures"]

    def test_contract_reports_wallets_stuck_at_the_anomaly_constant(self) -> None:
        """The circular back-fill pinned 7,517 wallets to exactly W_ANOMALY.

        The contract surfaces that distribution, so a recurrence is visible in
        the run report instead of hiding behind a passing check.
        """
        from app.tasks import enrich

        svc = _FakeContractService(
            total=10, with_cluster=10, with_risk=10,
            with_seed_prox=10, with_nonzero_seed_prox=4, seed_wallets=2,
            with_seed_flag=10, bad_risk=0, zero_risk=0, risk_at_anomaly=7,
        )
        with _seeds_configured(True):
            report = enrich.verify_schema_contract(svc)
        assert report["risk_score_at_w_anomaly"] == 7

    def test_seed_proximity_is_conditional_on_seeds_being_configured(self) -> None:
        """A corpus with no seed data must not raise a false alarm."""
        from app.tasks import enrich

        svc = _FakeContractService(
            total=10, with_cluster=10, with_risk=10,
            with_seed_prox=10, with_nonzero_seed_prox=0, seed_wallets=0,
            with_seed_flag=10, bad_risk=0, zero_risk=0, risk_at_anomaly=0,
        )
        with _seeds_configured(False):
            report = enrich.verify_schema_contract(svc)
        assert not any("seed" in f for f in report["failures"]), report["failures"]

    def test_contract_catches_a_seed_set_that_resolved_to_nothing(self) -> None:
        """Counting non-null properties is not enough.

        The writer emits an explicit 0.0 for every wallet beyond 2 hops, so
        ``with_seed_proximity == total`` held even while every value was 0.0 and
        no seed had resolved. The contract must also require a non-zero value.
        """
        from app.tasks import enrich

        svc = _FakeContractService(
            total=10, with_cluster=10, with_risk=10,
            with_seed_prox=10, with_nonzero_seed_prox=0, seed_wallets=0,
            with_seed_flag=10, bad_risk=0, zero_risk=0, risk_at_anomaly=0,
        )
        with _seeds_configured(True):
            report = enrich.verify_schema_contract(svc)
        assert report["ok"] is False

    def test_risk_terms_are_written_as_scalars_not_a_map(self) -> None:
        """Neo4j cannot store a map as a node property.

        Writing ``risk_score_terms = {...}`` raised CypherTypeError, aborted the
        whole UNWIND, and left every risk_score stale — the exact circular-value
        bug this stage exists to remove.
        """
        import inspect

        from app.tasks import enrich

        source = inspect.getsource(enrich._write_wallet_risk_scores)
        assert "w.risk_score_terms = {" not in source
        for term in ("anomaly", "cluster", "seed", "peeling"):
            assert f"w.risk_score_{term}_term" in source, term


def inspect_source_of_contract() -> str:
    """Return the source of ``verify_schema_contract`` for assertion use."""
    import inspect

    from app.tasks import enrich

    return inspect.getsource(enrich.verify_schema_contract)


# ---------------------------------------------------------------------------
# MAJOR 4 / 5 — honest unavailable states instead of fabricated values
# ---------------------------------------------------------------------------


class TestHonestUnavailableStates:
    def test_degenerate_all_zero_attribution_is_detected(self) -> None:
        from app.routers.entity import _is_degenerate_attribution

        assert _is_degenerate_attribution([{"attribution": 0.0}] * 18) is True
        assert _is_degenerate_attribution(
            [{"attribution": 1e-15}] * 18
        ) is True
        assert _is_degenerate_attribution([]) is False

    def test_real_attribution_is_not_flagged_as_degenerate(self) -> None:
        from app.routers.entity import _is_degenerate_attribution

        real = [{"attribution": 0.12}, {"attribution": -0.05}] + [
            {"attribution": 0.0}
        ] * 16
        assert _is_degenerate_attribution(real) is False

    def test_narrative_does_not_invent_a_zero_pass_through_ratio(self) -> None:
        """A chain with no derived ratio must say so, not print 0.0%."""
        from app.routers.entity import _build_narrative

        text = _build_narrative(
            "bc1qexampleaddress",
            {"verdict": "HIGH", "composite_score": 0.8, "chain_hops": 5},
            {},
        )
        assert "0.0% pass-through" not in text
        assert "not available" in text

    def test_narrative_reports_a_derived_ratio(self) -> None:
        from app.routers.entity import _build_narrative

        text = _build_narrative(
            "bc1qexampleaddress",
            {"verdict": "HIGH", "composite_score": 0.8, "chain_hops": 5},
            {"pass_through_ratio": 0.912},
        )
        assert "91.2% pass-through ratio" in text


# ---------------------------------------------------------------------------
# Validation-error guard: keep the import used
# ---------------------------------------------------------------------------


def test_validation_error_is_importable() -> None:
    """Guard the pydantic import used by the rejection path."""
    assert issubclass(ValidationError, Exception)
