"""Phase 8 XAI-D — Composite Risk Score & Final Verdict Assembly.

Merges outputs from XAI-A/B/C into a single per-wallet record with:
  - composite_score   : weighted combination of anomaly_score + risk_score + rule_bonus
  - verdict           : "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  - top_shap_features : top-3 SHAP feature names driving anomaly score
  - top_subgraph_peers: top-3 high-risk neighbours from GNN subgraph
  - triggered_rules   : human-readable AML rule strings (from evidence trail)
  - evidence_summary  : single-sentence natural-language summary

Inputs  (all in data/xai/):
    shap_attributions.json   (XAI-A)
    gnn_subgraphs.json       (XAI-B)  -- optional; skipped gracefully if missing
    evidence_trails.json     (XAI-C)

Output:
    data/xai/composite_risk_scores.json   keyed by wallet address

Scoring formula
---------------
composite_score =
    w_anomaly * normalize_anomaly(anomaly_score)
  + w_risk    * risk_score
  + w_rules   * min(len(triggered_rules), 5) / 5
  + w_mixing  * mixing_indicator

Weights, anomaly normalization, and verdict tiers are NOT defined here. They
live in app/services/risk_thresholds.py, the single source of truth shared with
the live scoring path (app/services/inline_scorer.py). Do not re-declare them
in this script: two divergent tables is the bug this module was created to fix.

Canonical values (see risk_thresholds.py for full justification):
    w_anomaly = 0.35, w_risk = 0.45, w_rules = 0.15, w_mixing = 0.05
    normalize_anomaly: x / 0.10906335711479187 clamped to [0, 1], where the
        denominator is 3x the FT-Transformer calibrated threshold of
        0.03635445237159729 (data/models/ft_threshold_20260909.json).
    Verdict tiers: CRITICAL >= 0.80, HIGH >= 0.60, MEDIUM >= 0.40, else LOW.

Usage:
    backend/venv/Scripts/python backend/scripts/compute_composite_risk.py
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional

# ---------------------------------------------------------------------------
# Path bootstrap
# ---------------------------------------------------------------------------
_BACKEND = Path(__file__).resolve().parents[1]
_PROJECT_ROOT = _BACKEND.parent
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

from app.config import settings
from app.services.risk_thresholds import (
    ANOMALY_FULL_SCALE,
    ANOMALY_SATURATION_FACTOR,
    FT_TRANSFORMER_CALIBRATED_THRESHOLD,
    MAX_RULE_BONUS,
    VERDICT_TIERS,
    W_ANOMALY,
    W_MIXING,
    W_RISK,
    W_RULES,
    compute_composite,
    map_verdict,
    normalize_anomaly,
)

# Absolute tolerance when comparing a CLI-supplied weight against the
# canonical one, so 0.4500000001 is not treated as a conflict.
WEIGHT_TOLERANCE: float = 1e-9

# ---------------------------------------------------------------------------
# Re-exported for backward compatibility
# ---------------------------------------------------------------------------
# External callers (and any test) historically imported these names from this
# script. They are now aliases of the canonical values in risk_thresholds.py
# rather than independent definitions.
__all__ = [
    "W_ANOMALY",
    "W_RISK",
    "W_RULES",
    "W_MIXING",
    "MAX_RULE_BONUS",
    "VERDICT_TIERS",
    "assemble",
    "main",
]


def _verdict(score: float) -> str:
    """Backward-compatible alias for risk_thresholds.map_verdict."""
    return map_verdict(score)


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_json(path: Path, label: str) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"{label} not found at {path}. Run earlier XAI steps first.")
    print(f"  Loading {label} ({path.stat().st_size / 1024 / 1024:.2f} MB) ...", flush=True)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_json_optional(path: Path, label: str) -> Optional[dict]:
    if not path.exists():
        print(f"  WARNING: {label} not found at {path} -- skipping.", flush=True)
        return None
    return load_json(path, label)


# ---------------------------------------------------------------------------
# Top-N helpers
# ---------------------------------------------------------------------------

def top_shap_features(shap_record: Optional[dict], n: int = 3) -> List[str]:
    if not shap_record:
        return []
    attributions: List[dict] = shap_record.get("shap_attributions", [])
    sorted_attrs = sorted(attributions, key=lambda d: abs(d.get("shap_value", 0.0)), reverse=True)
    return [d["feature"] for d in sorted_attrs[:n]]


def top_subgraph_peers(gnn_record: Optional[dict], self_addr: str, n: int = 3) -> List[dict]:
    if not gnn_record:
        return []
    nodes: List[dict] = gnn_record.get("nodes", [])
    peers = [nd for nd in nodes if nd.get("address") != self_addr]
    peers.sort(key=lambda d: d.get("risk_score", 0.0), reverse=True)
    return [{"address": p["address"], "risk_score": p["risk_score"]} for p in peers[:n]]


# ---------------------------------------------------------------------------
# Evidence summary builder
# ---------------------------------------------------------------------------

def _build_summary(
    addr: str,
    verdict: str,
    composite_score: float,
    triggered_rules: List[str],
    top_features: List[str],
    top_peers: List[dict],
) -> str:
    rule_str = (
        f"triggered rules: {', '.join(triggered_rules[:3])}"
        if triggered_rules
        else "no explicit rule hits"
    )
    feat_str = (
        f"top anomaly drivers: {', '.join(top_features)}"
        if top_features
        else "no SHAP data"
    )
    peer_str = (
        f"high-risk peers: {top_peers[0]['address'][:12]}... (score {top_peers[0]['risk_score']:.3f})"
        if top_peers
        else "no high-risk neighbours"
    )
    return (
        f"Wallet {addr[:16]}... scored {composite_score:.3f} ({verdict}): "
        f"{rule_str}; {feat_str}; {peer_str}."
    )


# ---------------------------------------------------------------------------
# Core assembly
# ---------------------------------------------------------------------------

def assemble(
    evidence_trails: Dict[str, dict],
    shap_attributions: Dict[str, dict],
    gnn_subgraphs: Optional[Dict[str, dict]],
    w_anomaly: Optional[float] = None,
    w_risk: Optional[float] = None,
    w_rules: Optional[float] = None,
    w_mixing: Optional[float] = None,
) -> Dict[str, dict]:
    """Assemble one composite record per evidence trail.

    The ``w_*`` arguments are retained for backward compatibility with the
    previous CLI signature but are no longer authoritative. The composite is
    computed by :func:`app.services.risk_thresholds.compute_composite`, which
    uses the canonical weights. Passing values that disagree with the canonical
    set raises ``ValueError`` rather than silently scoring with weights that do
    not match the ones displayed on the CLI and persisted downstream.
    """
    overrides = {
        "w_anomaly": (w_anomaly, W_ANOMALY),
        "w_risk": (w_risk, W_RISK),
        "w_rules": (w_rules, W_RULES),
        "w_mixing": (w_mixing, W_MIXING),
    }
    for name, (supplied, canonical) in overrides.items():
        if supplied is not None and abs(supplied - canonical) > WEIGHT_TOLERANCE:
            raise ValueError(
                f"{name}={supplied} conflicts with the canonical weight "
                f"{canonical} in app/services/risk_thresholds.py. The canonical "
                "module is the single source of truth for composite weights; "
                "edit it there instead of overriding on the CLI."
            )

    results: Dict[str, dict] = {}
    t0 = time.time()
    total = len(evidence_trails)

    for i, (addr, trail) in enumerate(evidence_trails.items()):
        anomaly_score: float = float(trail.get("anomaly_score", 0.0))
        risk_score: float = float(trail.get("risk_score", 0.0))
        triggered_rules: List[str] = trail.get("triggered_rules", [])
        mixing_patterns: List[str] = trail.get("mixing_patterns", [])

        # anomaly_score is a raw FT-Transformer reconstruction MSE (unbounded,
        # observed 0.0 - 99.9999), NOT a [0, 1] probability. It is normalized
        # inside compute_composite before being weighted -- that was the
        # calibration bug: the raw value was weighted directly and then the
        # whole sum was clamped to 1.0, manufacturing CRITICAL verdicts.
        composite = compute_composite(
            anomaly_score=anomaly_score,
            risk_score=risk_score,
            triggered_rules=triggered_rules,
            mixing_patterns=mixing_patterns,
        )
        composite_score: float = composite.score
        verdict = _verdict(composite_score)
        # Persisted schema fields keep their original meaning:
        #   rule_bonus       -> saturating rule-count fraction in [0, 1]
        #   mixing_indicator -> 1.0 if any mixing pattern detected, else 0.0
        # Both are unchanged from the pre-fix behaviour; only the anomaly term
        # feeding composite_score is different.
        rule_bonus = round(
            min(len(triggered_rules), MAX_RULE_BONUS) / MAX_RULE_BONUS, 4
        )
        mixing_indicator: float = 1.0 if mixing_patterns else 0.0
        anomaly_normalized: float = normalize_anomaly(anomaly_score)

        shap_rec = shap_attributions.get(addr)
        top_features = top_shap_features(shap_rec, n=3)

        gnn_rec = gnn_subgraphs.get(addr) if gnn_subgraphs else None
        top_peers = top_subgraph_peers(gnn_rec, addr, n=3)

        summary = _build_summary(
            addr=addr,
            verdict=verdict,
            composite_score=composite_score,
            triggered_rules=triggered_rules,
            top_features=top_features,
            top_peers=top_peers,
        )

        results[addr] = {
            "address": addr,
            "composite_score": composite_score,
            "verdict": verdict,
            # anomaly_score keeps its ORIGINAL meaning: the raw FT-Transformer
            # reconstruction MSE in MSE units (unbounded, up to ~100 on this
            # dataset). routers/alerts.py (min_anomaly filter) and the entity
            # dossier read it directly. Do not repurpose it as a [0, 1] value.
            "anomaly_score": anomaly_score,
            # NEW additive field: the [0, 1] value actually weighted into
            # composite_score. Additive only -- existing consumers ignore it.
            "anomaly_normalized": round(anomaly_normalized, 6),
            "risk_score": risk_score,
            "rule_bonus": rule_bonus,
            "mixing_indicator": mixing_indicator,
            "triggered_rules": triggered_rules,
            "mixing_patterns": mixing_patterns,
            "top_shap_features": top_features,
            "top_subgraph_peers": top_peers,
            "cluster_id": trail.get("cluster_id"),
            "cluster_size": trail.get("cluster_size"),
            "chain_hops": trail.get("chain_hops"),
            "seed_wallet_proximity": trail.get("seed_wallet_proximity"),
            "evidence_summary": summary,
        }

        if (i + 1) % 1000 == 0 or i == 0:
            print(
                f"    [{i+1}/{total}] wallets assembled ({time.time()-t0:.1f}s elapsed)",
                flush=True,
            )

    print(f"  Assembly done: {len(results):,} wallets in {time.time()-t0:.1f}s.", flush=True)
    return results


# ---------------------------------------------------------------------------
# Stats helper
# ---------------------------------------------------------------------------

def print_verdict_distribution(results: Dict[str, dict]) -> None:
    counts: Dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    for rec in results.values():
        counts[rec["verdict"]] = counts.get(rec["verdict"], 0) + 1
    total = len(results)
    print("\n  Verdict distribution:", flush=True)
    for label in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
        n = counts[label]
        pct = 100 * n / total if total else 0.0
        print(f"    {label:8s}: {n:>6,}  ({pct:.1f}%)", flush=True)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Phase 8 XAI-D: Composite Risk Score Assembly.")
    parser.add_argument("--w-anomaly", type=float, default=W_ANOMALY,
                        help="Deprecated. Must match the canonical weight in app/services/risk_thresholds.py.")
    parser.add_argument("--w-risk",    type=float, default=W_RISK,
                        help="Deprecated. Must match the canonical weight in app/services/risk_thresholds.py.")
    parser.add_argument("--w-rules",   type=float, default=W_RULES,
                        help="Deprecated. Must match the canonical weight in app/services/risk_thresholds.py.")
    parser.add_argument("--w-mixing",  type=float, default=W_MIXING,
                        help="Deprecated. Must match the canonical weight in app/services/risk_thresholds.py.")
    args = parser.parse_args()

    xai_dir = Path(settings.xai_dir)
    out_path = Path(settings.composite_risk_scores_path)

    print("=" * 60, flush=True)
    print("Phase 8 XAI-D -- Composite Risk Score Assembly", flush=True)
    print("=" * 60, flush=True)
    print(
        f"  Weights (canonical, from app/services/risk_thresholds.py): "
        f"anomaly={W_ANOMALY} risk={W_RISK} rules={W_RULES} mixing={W_MIXING}",
        flush=True,
    )
    print(
        f"  Anomaly full-scale: {ANOMALY_FULL_SCALE:.12f} "
        f"(= {ANOMALY_SATURATION_FACTOR} x FT-Transformer calibrated threshold "
        f"{FT_TRANSFORMER_CALIBRATED_THRESHOLD})",
        flush=True,
    )
    print(
        "  Verdict tiers: "
        + ", ".join(f"{label}>={thr:.2f}" for thr, label in VERDICT_TIERS if thr > 0.0)
        + ", else LOW",
        flush=True,
    )
    print()

    print("[1/4] Loading XAI-C evidence trails ...", flush=True)
    evidence_trails = load_json(Path(settings.evidence_trails_path), "evidence_trails.json")
    print(f"  {len(evidence_trails):,} wallets in evidence trails.", flush=True)

    print("\n[2/4] Loading XAI-A SHAP attributions ...", flush=True)
    shap_attributions = load_json(Path(settings.shap_attributions_path), "shap_attributions.json")
    print(f"  {len(shap_attributions):,} wallets with SHAP data.", flush=True)

    print("\n[3/4] Loading XAI-B GNN subgraphs (optional) ...", flush=True)
    gnn_subgraphs = load_json_optional(Path(settings.gnn_subgraphs_path), "gnn_subgraphs.json")
    if gnn_subgraphs is not None:
        print(f"  {len(gnn_subgraphs):,} wallets with GNN subgraph data.", flush=True)

    print("\n[4/4] Assembling composite risk records ...", flush=True)
    results = assemble(
        evidence_trails=evidence_trails,
        shap_attributions=shap_attributions,
        gnn_subgraphs=gnn_subgraphs,
        w_anomaly=args.w_anomaly,
        w_risk=args.w_risk,
        w_rules=args.w_rules,
        w_mixing=args.w_mixing,
    )

    print_verdict_distribution(results)

    print(f"\n  Writing {len(results):,} records -> {out_path} ...", flush=True)
    xai_dir.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=None, separators=(",", ":"))
    size_mb = out_path.stat().st_size / 1024 / 1024
    print(f"  Written: {out_path} ({size_mb:.2f} MB)", flush=True)

    print("\n" + "=" * 60, flush=True)
    print("XAI-D COMPLETE.", flush=True)
    print(f"  Output: {out_path}", flush=True)
    print(f"  Wallets scored: {len(results):,}", flush=True)
    print("=" * 60, flush=True)


if __name__ == "__main__":
    main()
