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
composite_score = clip(
    w_anomaly * anomaly_score
    + w_risk   * risk_score
    + w_rules  * min(len(triggered_rules), 5) / 5
    + w_mixing * mixing_indicator
    , 0.0, 1.0
)

Weights (tunable via CLI):
    w_anomaly = 0.35
    w_risk    = 0.45
    w_rules   = 0.15
    w_mixing  = 0.05

Verdict tiers:
    CRITICAL  composite_score >= 0.80
    HIGH      composite_score >= 0.60
    MEDIUM    composite_score >= 0.40
    LOW       composite_score <  0.40

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

# ---------------------------------------------------------------------------
# Scoring weights & thresholds
# ---------------------------------------------------------------------------
W_ANOMALY: float = 0.35
W_RISK: float = 0.45
W_RULES: float = 0.15
W_MIXING: float = 0.05
MAX_RULE_BONUS: int = 5

VERDICT_TIERS = [
    (0.80, "CRITICAL"),
    (0.60, "HIGH"),
    (0.40, "MEDIUM"),
    (0.00, "LOW"),
]


def _verdict(score: float) -> str:
    for threshold, label in VERDICT_TIERS:
        if score >= threshold:
            return label
    return "LOW"


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
    w_anomaly: float,
    w_risk: float,
    w_rules: float,
    w_mixing: float,
) -> Dict[str, dict]:
    results: Dict[str, dict] = {}
    t0 = time.time()
    total = len(evidence_trails)

    for i, (addr, trail) in enumerate(evidence_trails.items()):
        anomaly_score: float = float(trail.get("anomaly_score", 0.0))
        risk_score: float = float(trail.get("risk_score", 0.0))
        triggered_rules: List[str] = trail.get("triggered_rules", [])
        mixing_patterns: List[str] = trail.get("mixing_patterns", [])
        mixing_indicator: float = 1.0 if mixing_patterns else 0.0

        rule_bonus = min(len(triggered_rules), MAX_RULE_BONUS) / MAX_RULE_BONUS
        raw_score = (
            w_anomaly * anomaly_score
            + w_risk * risk_score
            + w_rules * rule_bonus
            + w_mixing * mixing_indicator
        )
        composite_score = float(max(0.0, min(1.0, raw_score)))
        verdict = _verdict(composite_score)

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
            "anomaly_score": anomaly_score,
            "risk_score": risk_score,
            "rule_bonus": round(rule_bonus, 4),
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
    parser.add_argument("--w-anomaly", type=float, default=W_ANOMALY)
    parser.add_argument("--w-risk",    type=float, default=W_RISK)
    parser.add_argument("--w-rules",   type=float, default=W_RULES)
    parser.add_argument("--w-mixing",  type=float, default=W_MIXING)
    args = parser.parse_args()

    total_w = args.w_anomaly + args.w_risk + args.w_rules + args.w_mixing
    if abs(total_w - 1.0) > 0.001:
        print(
            f"WARNING: weights sum to {total_w:.3f} (expected ~1.0). "
            "composite_score will be clipped to [0,1].",
            flush=True,
        )

    xai_dir = Path(settings.xai_dir)
    out_path = Path(settings.composite_risk_scores_path)

    print("=" * 60, flush=True)
    print("Phase 8 XAI-D -- Composite Risk Score Assembly", flush=True)
    print("=" * 60, flush=True)
    print(
        f"  Weights: anomaly={args.w_anomaly} risk={args.w_risk} "
        f"rules={args.w_rules} mixing={args.w_mixing}",
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
