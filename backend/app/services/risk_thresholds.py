"""Canonical risk weights, anomaly normalization, and verdict tiers.

This module is the SINGLE SOURCE OF TRUTH for the composite risk formula.
It exists because the formula was previously duplicated with two *different*
threshold tables, so the same composite score produced different verdicts
depending on whether the record was built by the offline batch pipeline
(``backend/scripts/compute_composite_risk.py``) or by the live ingest path
(``app/services/inline_scorer.py``). Both now import from here.

Why the module exists
---------------------
1. The batch path weighted a raw FT-Transformer reconstruction error
   (observed range 0.0 - 99.9999) as if it were a [0, 1] probability, then
   clamped the sum. Every weight term was therefore unbounded and the
   resulting CRITICAL verdicts were an artefact of the clamp, not of the
   risk evidence. :func:`normalize_anomaly` fixes that at the source.
2. Several tier sets existed side by side (0.80/0.60/0.40, 0.70/0.50/0.30
   and per-call-site copies), so a batch-built wallet, an ingested wallet and
   a dossier view of the same wallet could each report a different verdict
   for one identical score. Only one table is defined here, and every read
   path derives its label from it.

Canonical tier set: CRITICAL >= 0.65, HIGH >= 0.60, MEDIUM >= 0.40, LOW < 0.40
----------------------------------------------------------------------------
:data:`VERDICT_TIERS` is the 0.65/0.60/0.40 table, and it is the only table
any surface may label a record with. Three properties make it canonical:

* One ladder for both populations. Pre-loaded entities and ingested wallets
  are labelled by the same function from the same score, so an equal score
  always yields an equal verdict no matter which path produced it.
* CRITICAL is reachable. Under the superseded 0.80 cut the tier was
  unreachable for ingested wallets: the highest composite score any of the
  8,137 demo wallets reached was 0.7812, so a genuine CRITICAL could not be
  expressed at all. Moving the cut to 0.65 puts that population at 116
  CRITICAL (1.43%).
* Labels are derived, never stored. The ``verdict`` string persisted on a
  record was written under the superseded cut, so reading it back silently
  ignores the current ladder - that is exactly what let the alerts table, the
  entity dossier and the cluster topology each report a different severity
  for one wallet. A record's label must be a pure function of its score:
  :func:`map_verdict`.

The superseded inline table (>=0.70 CRITICAL / >=0.50 HIGH / >=0.30 MEDIUM)
is retained as :data:`LEGACY_INLINE_VERDICT_TIERS` for audit/reporting only.
It must not be used to label records. :func:`map_verdict` is the one and only
scorer-to-verdict mapping.

Anomaly normalization
---------------------
``anomaly_score`` in ``data/xai/evidence_trails.json`` is an FT-Transformer
per-feature reconstruction MSE, not a probability: it is unbounded above and
runs to 99.9999 on this dataset. Dividing it by its own dataset maximum would
make the score depend on the batch being scored (a single outlier would
collapse every other wallet toward zero), so the full-scale value is a fixed,
externally calibrated constant instead:

    ANOMALY_FULL_SCALE = 3.0 * FT_TRANSFORMER_CALIBRATED_THRESHOLD
                       = 0.10906335711479187

* ``FT_TRANSFORMER_CALIBRATED_THRESHOLD = 0.03635445237159729`` is read
  verbatim from ``data/models/ft_threshold_20260909.json`` (field
  ``threshold``, the F1-optimal decision threshold for
  ``ft_transformer_20260909.pt``; corroborated as "Calibrated threshold:
  0.036354" in ``data/models/BENCHMARK_TRUTH.json``). The 95th-percentile
  threshold for the same model is 0.005685056559741497 (field
  ``threshold_95pct``); the legacy Deep MLP Autoencoder 95th percentile is
  0.03461795300245285 (``data/models/threshold_20260907.json``).
* The 3.0 saturation factor is the same one already applied to the identical
  quantity in the live scoring path - ``norm_anomaly = min(mse / (3.0 *
  thresh), 1.0)`` in ``inline_scorer.score_batch``. Reusing it is deliberate:
  it makes the batch and live paths agree on what "fully anomalous" means,
  which is the whole point of this module. A bare threshold crossing (e.g.
  0.04 vs 0.0346) maps to 0.37 rather than saturating instantly.

The consequence is the invariant this module guarantees: every term entering
the weighted sum lies in [0, 1], so ``w * term <= w`` for each term, and the
weighted sum of weights equal to 1.0 lands in [0, 1] before the defensive
clamp is ever reached.

Persisted-field note
--------------------
The normalized value is exposed as a NEW additive field,
``anomaly_normalized``. The existing ``anomaly_score`` field keeps its
original meaning - the raw FT-Transformer reconstruction error in MSE units -
because ``routers/alerts.py`` (``min_anomaly`` filter) and the entity dossier
render it directly. Downstream consumers must not repurpose it.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

# ---------------------------------------------------------------------------
# Anomaly normalization calibration
# ---------------------------------------------------------------------------

# F1-optimal decision threshold for ft_transformer_20260909.pt.
# Source: data/models/ft_threshold_20260909.json -> "threshold" (0.03635445237159729)
FT_TRANSFORMER_CALIBRATED_THRESHOLD: Final[float] = 0.03635445237159729

# 95th-percentile reconstruction MSE for the same model.
# Source: data/models/ft_threshold_20260909.json -> "threshold_95pct"
FT_TRANSFORMER_THRESHOLD_95PCTL: Final[float] = 0.005685056559741497

# 95th-percentile validation MSE for the legacy Deep MLP Autoencoder.
# Source: data/models/threshold_20260907.json -> "threshold"
AUTOENCODER_THRESHOLD_95PCTL: Final[float] = 0.03461795300245285

# Multiple of the calibrated FT-Transformer threshold at which the normalized
# anomaly term reaches 1.0. Matches the saturation factor already used by
# inline_scorer.score_batch for the same raw quantity.
ANOMALY_SATURATION_FACTOR: Final[float] = 3.0

# Full-scale denominator for anomaly normalization. Anomaly scores at or above
# this value are treated as maximally anomalous and map to 1.0.
ANOMALY_FULL_SCALE: Final[float] = (
    ANOMALY_SATURATION_FACTOR * FT_TRANSFORMER_CALIBRATED_THRESHOLD
)  # == 0.10906335711479187

# ---------------------------------------------------------------------------
# Composite weights
# ---------------------------------------------------------------------------

# Weights of the four composite terms. They sum to exactly 1.0, so with every
# term normalized to [0, 1] the composite score is in [0, 1] pre-clamp.
W_ANOMALY: Final[float] = 0.35
W_RISK: Final[float] = 0.45
W_RULES: Final[float] = 0.15
W_MIXING: Final[float] = 0.05

# Number of triggered AML rules at which the rule bonus saturates.
MAX_RULE_BONUS: Final[int] = 5

# ---------------------------------------------------------------------------
# Verdict tiers
# ---------------------------------------------------------------------------

Verdict = str

# Canonical tiers, highest first. See module docstring for the justification.
VERDICT_TIERS: Final[tuple[tuple[float, Verdict], ...]] = (
    # CRITICAL moved 0.80 -> 0.65. At 0.80 the tier was unreachable for
    # ingested wallets: the highest score any of the 8,137 demo wallets
    # reached was 0.7812, so a genuine CRITICAL could not be expressed at
    # all. 0.65 puts the demo population at 116 CRITICAL (1.43%).
    #
    # One ladder is shared by ingested and pre-loaded entities, so equal
    # scores always produce equal verdicts regardless of which path scored
    # them. Both `entity.py` and `alerts.py` now derive the label from this
    # table rather than reading a `verdict` string persisted under the old
    # cut - that stored string is what let the alerts table, the dossier and
    # the cluster topology each report a different severity for one wallet.
    (0.65, "CRITICAL"),
    (0.60, "HIGH"),
    (0.40, "MEDIUM"),
    (0.00, "LOW"),
)

# Superseded inline table. Audit/reporting only - never label records with it.
LEGACY_INLINE_VERDICT_TIERS: Final[tuple[tuple[float, Verdict], ...]] = (
    (0.70, "CRITICAL"),
    (0.50, "HIGH"),
    (0.30, "MEDIUM"),
    (0.00, "LOW"),
)


# ---------------------------------------------------------------------------
# Normalizers
# ---------------------------------------------------------------------------


def normalize_anomaly(anomaly_score: float) -> float:
    """Map a raw FT-Transformer reconstruction MSE onto [0, 1].

    Linear up to :data:`ANOMALY_FULL_SCALE` (3x the calibrated
    ft_transformer_20260909 threshold of 0.03635445237159729), saturating at
    1.0 above it. Negative inputs (not expected) clamp to 0.0.

    Args:
        anomaly_score: Raw reconstruction MSE from the evidence trail. This is
            the unbounded value (up to ~100 on this dataset), not a
            probability.

    Returns:
        Normalized anomaly term in [0, 1], suitable for multiplication by
        :data:`W_ANOMALY` without exceeding that weight.
    """
    if anomaly_score <= 0.0:
        return 0.0
    if anomaly_score >= ANOMALY_FULL_SCALE:
        return 1.0
    return anomaly_score / ANOMALY_FULL_SCALE


def normalize_risk(risk_score: float) -> float:
    """Domain-guard a graph-model risk score onto [0, 1].

    ``risk_score`` is a Relational Graph Transformer probability and is
    already in [0, 1] (observed max on this dataset: 0.841056). The clamp is a
    domain guard against a malformed or non-probabilistic upstream value, not
    a calibration step.

    Args:
        risk_score: Raw model risk probability.

    Returns:
        Risk term in [0, 1].
    """
    if risk_score <= 0.0:
        return 0.0
    if risk_score >= 1.0:
        return 1.0
    return risk_score


def rule_bonus(triggered_rules: list[str] | None) -> float:
    """Saturating rule-count bonus in [0, 1].

    Args:
        triggered_rules: AML rule strings hit by the wallet.

    Returns:
        ``min(len(rules), MAX_RULE_BONUS) / MAX_RULE_BONUS``.
    """
    count = len(triggered_rules or [])
    return min(count, MAX_RULE_BONUS) / MAX_RULE_BONUS


# ---------------------------------------------------------------------------
# Composite scoring
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class CompositeScore:
    """A composite score with its individual weighted components exposed.

    Exposing the components lets callers (and verification tooling) assert the
    core invariant: ``0 <= component <= weight`` for every term.
    """

    score: float
    anomaly_component: float
    risk_component: float
    rule_component: float
    mixing_component: float

    @property
    def is_clamped(self) -> bool:
        """True when the defensive clamp actually altered the raw sum.

        With normalized terms and weights summing to 1.0 this must always be
        False. A True value means a caller passed a term outside its documented
        domain.
        """
        total = (
            self.anomaly_component
            + self.risk_component
            + self.rule_component
            + self.mixing_component
        )
        return self.score != max(0.0, min(1.0, total))


def compute_composite(
    anomaly_score: float,
    risk_score: float,
    triggered_rules: list[str] | None = None,
    mixing_patterns: list[str] | None = None,
) -> CompositeScore:
    """Compute the composite risk score and its weighted components.

    Formula::

        composite = w_anomaly * normalize_anomaly(anomaly_score)
                  + w_risk    * normalize_risk(risk_score)
                  + w_rules   * min(len(rules), 5) / 5
                  + w_mixing  * (1.0 if mixing_patterns else 0.0)

    Every term is normalized to [0, 1] before weighting, so no single term can
    exceed its own weight. The weights sum to 1.0, so the result is in [0, 1]
    before the defensive clamp.

    Args:
        anomaly_score: Raw FT-Transformer reconstruction MSE (unbounded).
        risk_score: Graph model risk probability in [0, 1].
        triggered_rules: AML rule strings hit by the wallet.
        mixing_patterns: Mixing pattern names detected for the wallet.

    Returns:
        A :class:`CompositeScore` with the final score and each weighted
        component.
    """
    mixing_indicator: float = 1.0 if mixing_patterns else 0.0

    anomaly_component = W_ANOMALY * normalize_anomaly(anomaly_score)
    risk_component = W_RISK * normalize_risk(risk_score)
    rule_component = W_RULES * rule_bonus(triggered_rules)
    mixing_component = W_MIXING * mixing_indicator

    raw = anomaly_component + risk_component + rule_component + mixing_component
    # Defensive only: with normalized terms and weights summing to 1.0 the raw
    # sum is already within [0, 1]. Kept so a malformed caller cannot emit an
    # out-of-range composite_score into the persisted artefact.
    return CompositeScore(
        score=max(0.0, min(1.0, raw)),
        anomaly_component=anomaly_component,
        risk_component=risk_component,
        rule_component=rule_component,
        mixing_component=mixing_component,
    )


# ---------------------------------------------------------------------------
# Verdict mapping
# ---------------------------------------------------------------------------


def map_verdict(score: float) -> Verdict:
    """Map a composite score to a verdict using the canonical tiers.

    Args:
        score: Composite score, expected in [0, 1].

    Returns:
        One of "CRITICAL", "HIGH", "MEDIUM", "LOW".
    """
    for threshold, label in VERDICT_TIERS:
        if score >= threshold:
            return label
    return "LOW"
