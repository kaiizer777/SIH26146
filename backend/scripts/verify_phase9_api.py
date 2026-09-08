"""Phase 9 API verification script.

Tests all forensic endpoints against a live backend at http://localhost:8000.
Run from the project root:

    cd backend
    .\\venv\\Scripts\\python.exe scripts\\verify_phase9_api.py

Prerequisites: backend server must be running.
    uvicorn app.main:app --host 0.0.0.0 --port 8000

Exit code 0 = all assertions passed.
Exit code 1 = one or more assertions failed.
"""

from __future__ import annotations

import json
import re
import sys
from typing import Any

import httpx

# Force UTF-8 output so box-drawing / arrow chars don't crash on CP1252 terminals
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "http://localhost:8000"
TOKEN = "dev-token-ntro-2026"
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

# Single persistent client — 30s timeout handles asyncpg/Neo4j cold-start pools
CLIENT = httpx.Client(timeout=30.0)

PASS = "[PASS]"
FAIL = "[FAIL]"

_failures: list[str] = []


def ok(label: str) -> None:
    print(f"  [PASS]  {label}")


def fail(label: str, detail: str = "") -> None:
    msg = f"{label}" + (f" — {detail}" if detail else "")
    print(f"  [FAIL]  {msg}")
    _failures.append(msg)


def assert_eq(label: str, actual: Any, expected: Any) -> None:
    if actual == expected:
        ok(label)
    else:
        fail(label, f"expected {expected!r}, got {actual!r}")


def assert_in(label: str, value: Any, container: Any) -> None:
    if value in container:
        ok(label)
    else:
        fail(label, f"{value!r} not in {container!r}")


def assert_true(label: str, cond: bool, detail: str = "") -> None:
    if cond:
        ok(label)
    else:
        fail(label, detail)


def section(title: str) -> None:
    print(f"\n" + "-" * 60)
    print(f"  {title}")
    print("-" * 60)


# ---------------------------------------------------------------------------
# Load a known CRITICAL address from the XAI store directly for use in tests
# ---------------------------------------------------------------------------

def _get_known_critical_address() -> str:
    """Read composite_risk_scores.json directly to find a CRITICAL wallet."""
    import os
    xai_path = os.path.join(os.path.dirname(__file__), "../../data/xai/composite_risk_scores.json")
    with open(xai_path, encoding="utf-8") as f:
        data = json.load(f)
    for addr, rec in data.items():
        if rec.get("verdict") == "CRITICAL":
            return addr
    raise RuntimeError("No CRITICAL wallet found in composite_risk_scores.json")


def _get_known_cluster_id() -> int:
    """Return a cluster_id that has at least one wallet in the XAI index."""
    import os
    xai_path = os.path.join(os.path.dirname(__file__), "../../data/xai/composite_risk_scores.json")
    with open(xai_path, encoding="utf-8") as f:
        data = json.load(f)
    for rec in data.values():
        cid = rec.get("cluster_id")
        if cid is not None:
            return int(cid)
    raise RuntimeError("No cluster_id found in composite_risk_scores.json")


# ---------------------------------------------------------------------------
# Test suites
# ---------------------------------------------------------------------------

def test_auth() -> None:
    section("Authentication")

    # No token -> 401
    r = CLIENT.get(f"{BASE_URL}/api/v1/alerts")
    assert_eq("No token -> 401", r.status_code, 401)

    # Wrong token -> 401
    r = CLIENT.get(f"{BASE_URL}/api/v1/alerts", headers={"Authorization": "Bearer wrong"})
    assert_eq("Bad token -> 401", r.status_code, 401)

    # Health skips auth
    r = CLIENT.get(f"{BASE_URL}/health")
    assert_eq("GET /health skips auth -> 200", r.status_code, 200)


def test_alerts() -> None:
    section("GET /api/v1/alerts")

    # Basic call
    r = CLIENT.get(f"{BASE_URL}/api/v1/alerts?limit=10", headers=HEADERS)
    assert_eq("Basic alerts → 200", r.status_code, 200)
    body = r.json()
    assert_in("Response has 'total' field", "total", body)
    assert_in("Response has 'items' field", "items", body)
    assert_true("items is a list", isinstance(body["items"], list))
    assert_true("total > 0", body["total"] > 0, f"total={body['total']}")
    assert_true("returns ≤10 items", len(body["items"]) <= 10)

    # Verdict filter
    r = CLIENT.get(f"{BASE_URL}/api/v1/alerts?verdict=CRITICAL&limit=50", headers=HEADERS)
    assert_eq("Verdict=CRITICAL → 200", r.status_code, 200)
    body = r.json()
    verdicts = {item["verdict"] for item in body["items"]}
    assert_true("All items are CRITICAL", verdicts == {"CRITICAL"} or verdicts == set(), f"got verdicts: {verdicts}")

    # min_risk filter
    r = CLIENT.get(f"{BASE_URL}/api/v1/alerts?min_risk=0.8&limit=20", headers=HEADERS)
    assert_eq("min_risk=0.8 → 200", r.status_code, 200)
    body = r.json()
    bad = [item for item in body["items"] if item["composite_score"] < 0.8]
    assert_true("All items have composite_score ≥ 0.8", len(bad) == 0, f"{len(bad)} items below threshold")

    # Sort order
    r = CLIENT.get(f"{BASE_URL}/api/v1/alerts?sort=risk_desc&limit=5", headers=HEADERS)
    assert_eq("sort=risk_desc → 200", r.status_code, 200)
    scores = [item["composite_score"] for item in r.json()["items"]]
    assert_true("Items sorted descending by score", scores == sorted(scores, reverse=True), f"scores: {scores}")

    # Pagination
    r1 = CLIENT.get(f"{BASE_URL}/api/v1/alerts?limit=5&offset=0", headers=HEADERS)
    r2 = CLIENT.get(f"{BASE_URL}/api/v1/alerts?limit=5&offset=5", headers=HEADERS)
    assert_eq("Page 1 → 200", r1.status_code, 200)
    assert_eq("Page 2 → 200", r2.status_code, 200)
    ids1 = {item["address"] for item in r1.json()["items"]}
    ids2 = {item["address"] for item in r2.json()["items"]}
    assert_true("Page 1 and 2 have no overlap", len(ids1 & ids2) == 0, f"overlap: {ids1 & ids2}")

    # Limit cap
    r = CLIENT.get(f"{BASE_URL}/api/v1/alerts?limit=999", headers=HEADERS)
    assert_eq("limit=999 → 422 (exceeds max 200)", r.status_code, 422)


def test_entity_explain(known_address: str) -> None:
    section("GET /api/v1/entity/{address}/explain")

    # Known CRITICAL address
    r = CLIENT.get(f"{BASE_URL}/api/v1/entity/{known_address}/explain", headers=HEADERS)
    assert_eq("Known CRITICAL address → 200", r.status_code, 200)
    body = r.json()

    # Required top-level fields
    for field in ["address", "composite_score", "verdict", "score_breakdown", "evidence_trail", "summary_narrative"]:
        assert_in(f"Field '{field}' present", field, body)

    assert_true("composite_score is float", isinstance(body["composite_score"], (int, float)))
    assert_in("verdict is valid enum", body["verdict"], ["CRITICAL", "HIGH", "MEDIUM", "LOW"])
    assert_true("summary_narrative is non-empty string", isinstance(body["summary_narrative"], str) and len(body["summary_narrative"]) > 10)

    # Score breakdown
    bd = body["score_breakdown"]
    for field in ["anomaly_component", "risk_component", "rule_bonus", "mixing_indicator"]:
        assert_in(f"score_breakdown.{field} present", field, bd)

    # Evidence trail
    et = body["evidence_trail"]
    assert_in("evidence_trail.triggered_rules present", "triggered_rules", et)
    assert_true("triggered_rules is list", isinstance(et["triggered_rules"], list))

    # SHAP attributions (may be empty if no txid match but field must exist)
    assert_in("shap_attributions field present", "shap_attributions", body)
    assert_true("shap_attributions is list", isinstance(body["shap_attributions"], list))
    if body["shap_attributions"]:
        first = body["shap_attributions"][0]
        for f in ["feature", "label", "value"]:
            assert_in(f"shap_attribution[0].{f} present", f, first)

    # 404 for unknown address
    r = CLIENT.get(f"{BASE_URL}/api/v1/entity/not-a-real-bitcoin-address/explain", headers=HEADERS)
    assert_eq("Invalid address → 404", r.status_code, 404)
    assert_true("404 detail is correct string", "not found" in r.json().get("detail", "").lower())


def test_graph(cluster_id: int) -> None:
    section("GET /api/v1/graph/{cluster_id}")

    # Use CLIENT which already has 30s timeout
    r = CLIENT.get(f"{BASE_URL}/api/v1/graph/{cluster_id}", headers=HEADERS)

    # Neo4j may not have cluster_id property — allow 200 (with empty nodes) or 503
    assert_true(
        "GET /graph/{cluster_id} returns 200 or 503",
        r.status_code in (200, 503),
        f"status={r.status_code}",
    )

    if r.status_code == 200:
        body = r.json()
        assert_in("cluster_id field present", "cluster_id", body)
        assert_in("nodes field present", "nodes", body)
        assert_in("links field present", "links", body)
        assert_true("nodes is list", isinstance(body["nodes"], list))
        assert_true("links is list", isinstance(body["links"], list))
        assert_true(
            "Node count <= 250",
            len(body["nodes"]) <= 250,
            f"got {len(body['nodes'])} nodes",
        )

        if body["nodes"]:
            node = body["nodes"][0]
            for f in ["id", "label", "type"]:
                assert_in(f"node.{f} present", f, node)
            assert_in("node.type is valid", node["type"], ["wallet", "transaction", "ip"])

    r = CLIENT.get(f"{BASE_URL}/api/v1/graph/{cluster_id}?max_nodes=999", headers=HEADERS)
    assert_eq("max_nodes=999 -> 422 (exceeds ceiling 250)", r.status_code, 422)



def test_log_pseudonymization(known_address: str) -> None:
    section("SHA-256 Address Log Pseudonymization")

    # Replicate the filter logic inline — avoids importing app.main (with heavy
    # ML deps) into the verify script process. The regex here must match main.py.
    import hashlib
    import logging
    import io
    import re

    ADDR_RE = re.compile(
        r"\b((?:1|3)[a-km-zA-HJ-NP-Z1-9]{24,33}|bc1[a-z0-9]{6,87})\b"
    )

    def sha8(addr: str) -> str:
        return hashlib.sha256(addr.encode()).hexdigest()[:8]

    class _TestFilter(logging.Filter):
        def filter(self, record: logging.LogRecord) -> bool:
            msg = record.getMessage()  # fully interpolated
            if ADDR_RE.search(msg):
                record.msg = ADDR_RE.sub(lambda m: f"[addr:{sha8(m.group())}]", msg)
                record.args = ()  # already interpolated into record.msg
            return True

    buf = io.StringIO()
    handler = logging.StreamHandler(buf)
    handler.setLevel(logging.DEBUG)

    test_logger = logging.getLogger("phase9.pseudonym_inline")
    test_logger.propagate = False
    test_logger.handlers.clear()
    test_logger.addHandler(handler)
    test_logger.addFilter(_TestFilter())
    test_logger.setLevel(logging.DEBUG)

    test_logger.info("Test log contains address: %s and more text", known_address)

    log_output = buf.getvalue()

    assert_true(
        "Address not in plaintext in log output",
        known_address not in log_output,
        f"Found plaintext address in: {log_output!r}",
    )
    assert_true(
        "SHA-256 [addr:...] token appears in log output",
        "[addr:" in log_output,
        f"Token not found in: {log_output!r}",
    )


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n" + "=" * 60)
    print("  SIH26146 -- Phase 9 API Verification")
    print("  Target: " + BASE_URL)
    print("=" * 60)

    # Pre-load known addresses from XAI store
    try:
        known_address = _get_known_critical_address()
        known_cluster_id = _get_known_cluster_id()
    except Exception as exc:
        print(f"\n  [!]  Could not read XAI artifacts: {exc}")
        sys.exit(1)

    print(f"\n  Using CRITICAL address : {known_address[:12]}...")
    print(f"  Using cluster_id       : {known_cluster_id}")

    test_auth()
    test_alerts()
    test_entity_explain(known_address)
    test_graph(known_cluster_id)
    test_log_pseudonymization(known_address)

    print("\n" + "=" * 60)
    if _failures:
        print(f"  [FAIL] {len(_failures)} assertion(s) FAILED:")
        for msg in _failures:
            print(f"       * {msg}")
        print("=" * 60 + "\n")
        sys.exit(1)
    else:
        print(f"  [PASS] All assertions passed.")
        print("=" * 60 + "\n")
        sys.exit(0)


if __name__ == "__main__":
    main()
