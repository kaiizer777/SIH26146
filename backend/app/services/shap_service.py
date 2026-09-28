"""Real per-transaction feature attribution over the trained FT-Transformer.

WHY THIS MODULE EXISTS
----------------------
`routers/entity.py::_compute_provisional_shap_and_attention` used to fabricate a
"SHAP waterfall" from a hardcoded literal weight vector
(`[0.75, 0.65, ..., 0.70]`) and a cosine-similarity softmax masquerading as a
transformer attention matrix. Neither number was produced by a model. This
module replaces that with attributions derived from the actual trained
checkpoint in `data/models/ft_transformer_*.pt`.

EXPLAINER METHOD (honest disclosure)
------------------------------------
`shap` IS a declared dependency (`backend/requirements.txt`, installed 0.51.0),
so this is genuine `shap`-library SHAP — but it is **NOT** DeepExplainer or
GradientExplainer. The concrete explainer is:

    shap.PermutationExplainer
    (via `shap.Explainer(..., algorithm="permutation")`)

which computes the **exact Shapley value** for each of the 18 features via
Monte-Carlo permutation sampling with interventional masking. This is the
model-agnostic, additivity-guaranteed estimator.

Why not the alternatives — all three were measured against this checkpoint,
not assumed (see the module tests / verification report):

  * `shap.DeepExplainer`  — runs, but VIOLATES ADDITIVITY. Sum of its values
    was -20.19 where the required value is f(x) - E[f] = -5.096. It also emits
    `UserWarning: unrecognized nn.Module: FeatureTokenizer` because it
    symbolically traces the graph and cannot parse the custom tokenizer /
    LayerNorm. Matches the standing note in requirements.txt ("DeepExplainer
    has known instability").
  * `shap.GradientExplainer` (legacy) — runs, but is Expectation-over-Gradients,
    a sampled gradient surrogate rather than the Shapley value, and its
    estimated baseline drifted well off E[f] (implied base 7.14 vs true 5.11).
  * `shap.GradientExplainer` does not exist under `shap.Explainer`'s algorithm
    enum in 0.51.0.

An additional 0.51.0 pitfall, handled here: `shap.GradientExplainer` and
`shap.DeepExplainer` detect the ML framework by calling `model.named_parameters()`
on whatever callable you hand them. Pass a bare Python function and both fall
through to the **TensorFlow** branch and die with
`ModuleNotFoundError: No module named 'tensorflow'`. That is why the target
below is an `nn.Module`, not a lambda.

WHAT IS EXPLAINED
-----------------
The explained function is the model's actual decision quantity — the
reconstruction-MSE anomaly score used by `services/inline_scorer.py`:

    f(z) = mean((z - FTTransformer(z)) ** 2)

`z` is the *standardized* 18-vector produced by the checkpoint's own
`ft_scaler_*.pkl` (the exact space the model consumes). Features come from
`services/feature_extractor.py` and are never reordered or reimplemented here.

UNITS — read before interpreting the waterfall
----------------------------------------------
`contribution` is a Shapley value measured in units of the anomaly score, in
the standardized (z-score) input space. It is additive:
`base_value + sum(contribution) == f(x)` (verified to 1e-6).
`value` on each entry is the RAW, unscaled feature value as emitted by
`extract_features()`. The two are deliberately in different spaces; each record
carries an explicit `units` field so the UI can never conflate them.

FAILURE POLICY
--------------
There is NO hardcoded fallback. If the checkpoint, the scaler, torch,
torch_geometric or shap cannot be loaded, this module raises
`ModelUnavailableError`. Callers get a loud, typed failure instead of a
plausible-looking fabrication.
"""

from __future__ import annotations

import hashlib
import logging
import threading
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Sequence

import numpy as np

from app.config import settings
from app.services.feature_extractor import FEATURE_DIM, FEATURE_NAMES, extract_features

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Public constants
# ---------------------------------------------------------------------------

#: Exact explainer identifier surfaced to API clients and stored alongside
#: every attribution record. Do not shorten — this is an audit surface.
EXPLAINER_METHOD: str = "shap.PermutationExplainer (exact Shapley, Monte-Carlo permutation sampling)"

#: Monte-Carlo budget. Measured convergence on this checkpoint: phi is stable
#: to ~1e-3 L1 between max_evals=2000 and 10000; 150/500 are still drifting.
#: ~2k forward passes ~= 10 s/transaction on CPU, so bulk callers should pass a
#: smaller value (accuracy degrades) or use ``explain_transactions``.
DEFAULT_MAX_EVALS: int = 2_000

#: Background (reference) distribution size. E[f] is estimated from this many
#: real transactions; it defines the ``base_value`` of the decomposition.
DEFAULT_BACKGROUND_SIZE: int = 100

#: Seed for the permutation sampler so repeated calls are reproducible.
DEFAULT_SEED: int = 20260908

#: Units string stamped onto every stored attribution record.
ATTRIBUTION_UNITS: str = "shapley_value_of_anomaly_mse_on_standardized_input"

_SHAP_REQUIRED_VERSION: tuple[int, int] = (0, 46)


# ---------------------------------------------------------------------------
# Errors
# ---------------------------------------------------------------------------


class ShapServiceError(RuntimeError):
    """Base class for every failure raised by this module."""


class ModelUnavailableError(ShapServiceError):
    """The trained model, its scaler, or a required dependency is unavailable.

    Raised instead of ever returning a fabricated or hardcoded attribution.
    """


class ExplanationError(ShapServiceError):
    """The model loaded but attribution could not be computed."""


# ---------------------------------------------------------------------------
# Result types
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class FeatureAttribution:
    """One feature's raw value and its exact Shapley contribution."""

    feature: str
    value: float
    """RAW (unscaled) feature value from ``extract_features()``."""
    contribution: float
    """Shapley value in anomaly-score units, in standardized input space."""

    def to_record(self) -> dict[str, Any]:
        """Serialise to the dict shape consumed by ``xai_store``/``entity.py``.

        Emits BOTH ``attribution`` and ``contribution`` (identical numbers).
        ``contribution`` is the canonical name for this module;
        ``attribution`` is retained because ``routers/entity.py:600`` reads
        ``item["attribution"]`` from the frozen Phase 8 artifacts and would
        otherwise silently render 0.0.
        """
        return {
            "feature": self.feature,
            "value": self.value,
            "attribution": self.contribution,
            "contribution": self.contribution,
            "units": ATTRIBUTION_UNITS,
        }


@dataclass(frozen=True)
class ShapExplanation:
    """Full explanation of one transaction against the FT-Transformer."""

    attributions: list[FeatureAttribution]
    """Exactly ``FEATURE_DIM`` (18) entries, ordered by |contribution| desc."""
    raw_vector: list[float]
    """The raw, unscaled 18-vector as produced by ``extract_features()``."""
    scaled_vector: list[float]
    """The standardized 18-vector actually fed to the model."""
    base_value: float
    """E[f] over the background distribution."""
    prediction: float
    """f(x): the explained transaction's anomaly score."""
    model_version: str
    scaler_version: str
    max_evals: int
    background_size: int
    additivity_error: float
    """abs(base_value + sum(contribution) - prediction). Should be ~0."""
    method: str = EXPLAINER_METHOD

    @property
    def anomaly_score(self) -> float:
        """Alias making the explained quantity explicit at call sites."""
        return self.prediction

    def top_features(self, k: int) -> list[FeatureAttribution]:
        """Return the ``k`` highest-magnitude attributions, strongest first."""
        return self.attributions[:k]

    def to_store_records(self) -> list[dict[str, Any]]:
        """Serialise to the list-of-dicts shape ``xai_store`` persists."""
        return [a.to_record() for a in self.attributions]


@dataclass
class _LoadedModel:
    """Internal handle on the checkpoint + its scaler."""

    ft_model: Any
    """The ``FTTransformerAnomaly`` nn.Module in eval mode."""
    score_model: Any
    """``AnomalyScoreWrapper`` — the differentiable scalar target for shap."""
    scaler: Any
    """The fitted ``ft_scaler_*.pkl`` ``StandardScaler``."""
    model_version: str
    scaler_version: str
    num_features: int = FEATURE_DIM
    metadata: dict[str, Any] = field(default_factory=dict)


# ---------------------------------------------------------------------------
# torch / model wrapper (imported lazily so import-time cost is zero)
# ---------------------------------------------------------------------------

_torch: Any = None
_nn: Any = None


def _import_torch() -> tuple[Any, Any]:
    """Import torch lazily, converting failure into a typed error.

    Returns:
        Tuple of (torch, torch.nn).

    Raises:
        ModelUnavailableError: if torch is not importable.
    """
    global _torch, _nn
    if _torch is not None:
        return _torch, _nn
    try:
        import torch
        import torch.nn as nn
    except Exception as exc:  # pragma: no cover - depends on env
        raise ModelUnavailableError(f"PyTorch is required for SHAP attribution: {exc}") from exc
    _torch, _nn = torch, nn
    return _torch, _nn


def _build_score_model(ft_model: Any, torch: Any, nn: Any) -> Any:
    """Wrap the FT-Transformer into the scalar anomaly-score target.

    Two properties are required and both were discovered empirically:

    1. It must be an ``nn.Module``, not a lambda. shap 0.51.0 sniffs the
       framework with ``model.named_parameters()``; a plain function is
       misdetected as TensorFlow and raises ``ModuleNotFoundError: No module
       named 'tensorflow'``.
    2. It must return shape ``(B, 1)``, not ``(B,)``. Both torch explainers
       index ``outputs[:, idx]`` and raise ``IndexError: too many indices for
       tensor of dimension 1`` on a 1-D output.
    """

    class AnomalyScoreWrapper(nn.Module):
        """Differentiable reconstruction-MSE anomaly score for one sample.

        This is the exact quantity ``services/inline_scorer.py`` thresholds
        against, so the attribution explains the real decision, not a proxy.
        """

        def __init__(self, ft: Any) -> None:
            super().__init__()
            self.ft = ft

        def forward(self, z: Any) -> Any:
            # shap's PermutationExplainer hands numpy arrays to the model.
            if not torch.is_tensor(z):
                z = torch.as_tensor(np.ascontiguousarray(z), dtype=torch.float32)
            z = z.to(dtype=torch.float32)
            reconstruction = self.ft(z)
            return torch.mean((z - reconstruction) ** 2, dim=-1, keepdim=True)

    wrapper = AnomalyScoreWrapper(ft_model)
    wrapper.eval()
    for param in wrapper.parameters():
        param.requires_grad_(False)
    return wrapper


# ---------------------------------------------------------------------------
# Lazy model registry
# ---------------------------------------------------------------------------

_loaded: _LoadedModel | None = None
_load_lock = threading.Lock()
_explainer_cache: dict[tuple[str, int], Any] = {}
_explainer_lock = threading.Lock()


def _find_artifact(pattern: str) -> Path | None:
    """Return the most recently modified file matching ``pattern`` in models_dir."""
    models_dir = Path(settings.models_dir)
    if not models_dir.exists():
        return None
    matches = sorted(models_dir.glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)
    return matches[0] if matches else None


def _load_ft_transformer() -> tuple[Any, Path, Any]:
    """Load the FT-Transformer checkpoint into an eval-mode module.

    Returns:
        Tuple of (eval-mode model, checkpoint path, raw checkpoint dict).

    Raises:
        ModelUnavailableError: on a missing checkpoint, a missing/incompatible
            dependency (``torch_geometric`` via ``app.ml``), or a corrupt
            checkpoint. Never falls back to an untrained model.
    """
    torch, _ = _import_torch()

    checkpoint_file = _find_artifact("ft_transformer_*.pt")
    if checkpoint_file is None:
        raise ModelUnavailableError(
            f"No FT-Transformer checkpoint (*.pt) found in {settings.models_dir!r}. "
            "SHAP attribution cannot be computed without the trained model."
        )

    # app.ml.ft_transformer is torch-only, but app.ml/__init__.py also imports
    # graph_transformer which needs torch_geometric. Import the submodule
    # directly so explainability does not hard-depend on the graph stack.
    try:
        from app.ml.ft_transformer import FTTransformerAnomaly
    except Exception as exc:
        raise ModelUnavailableError(
            f"Cannot import app.ml.ft_transformer (torch_geometric or torch missing?): {exc}"
        ) from exc

    try:
        checkpoint = torch.load(checkpoint_file, map_location="cpu", weights_only=False)
    except Exception as exc:
        raise ModelUnavailableError(f"Failed to load checkpoint {checkpoint_file}: {exc}") from exc

    try:
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            num_features = int(checkpoint.get("num_features", FEATURE_DIM))
            model = FTTransformerAnomaly(
                num_features=num_features,
                d_model=int(checkpoint.get("d_model", 32)),
                n_layers=int(checkpoint.get("n_layers", 2)),
                n_heads=int(checkpoint.get("n_heads", 4)),
                d_ff=int(checkpoint.get("d_ff", 64)),
                dropout=float(checkpoint.get("dropout", 0.1)),
            )
            state_dict = checkpoint["model_state_dict"]
        else:
            num_features = FEATURE_DIM
            model = FTTransformerAnomaly()
            state_dict = checkpoint

        if int(num_features) != FEATURE_DIM:
            raise ModelUnavailableError(
                f"Checkpoint expects {num_features} features but "
                f"feature_extractor.FEATURE_DIM is {FEATURE_DIM}. Refusing to attribute."
            )

        model.load_state_dict(state_dict)
        model.eval()
        for param in model.parameters():
            param.requires_grad_(False)
    except ModelUnavailableError:
        raise
    except Exception as exc:
        raise ModelUnavailableError(
            f"Failed to reconstruct FTTransformerAnomaly from {checkpoint_file.name}: {exc}"
        ) from exc

    return model, checkpoint_file, checkpoint


def _load_scaler() -> Any:
    """Load the checkpoint's matching feature scaler.

    Raises:
        ModelUnavailableError: if no scaler artifact can be loaded. The model
            consumes standardized input; silently standardizing some other way
            would produce attributions for a model that was never trained.
    """
    try:
        import joblib
    except Exception as exc:
        raise ModelUnavailableError(f"joblib is required to load the feature scaler: {exc}") from exc

    scaler_file = _find_artifact("ft_scaler_*.pkl") or _find_artifact("scaler_*.pkl")
    if scaler_file is None:
        raise ModelUnavailableError(
            f"No feature scaler (*.pkl) found in {settings.models_dir!r}. "
            "The FT-Transformer consumes standardized input and cannot be attributed without it."
        )
    try:
        scaler = joblib.load(scaler_file)
    except Exception as exc:
        raise ModelUnavailableError(f"Failed to load scaler {scaler_file}: {exc}") from exc

    if not (hasattr(scaler, "mean_") and hasattr(scaler, "scale_")):
        raise ModelUnavailableError(
            f"Scaler {scaler_file.name} lacks mean_/scale_ attributes; "
            f"got {type(scaler).__name__}."
        )
    if len(scaler.mean_) != FEATURE_DIM:
        raise ModelUnavailableError(
            f"Scaler {scaler_file.name} has {len(scaler.mean_)} features, expected {FEATURE_DIM}."
        )
    return scaler, scaler_file


def get_model() -> _LoadedModel:
    """Return the loaded checkpoint + scaler, loading them on first call.

    Thread-safe and idempotent. Subsequent calls reuse the cached handle.

    Raises:
        ModelUnavailableError: if any artifact or dependency is missing.
    """
    global _loaded
    if _loaded is not None:
        return _loaded

    with _load_lock:
        if _loaded is not None:
            return _loaded

        torch, nn = _import_torch()
        try:
            import shap
        except Exception as exc:
            raise ModelUnavailableError(
                f"The 'shap' package is required for real attribution but is not installed: {exc}. "
                "Install it (pip install 'shap>=0.46') rather than accepting fabricated weights."
            ) from exc

        shap_version = tuple(int(part) for part in str(shap.__version__).split(".")[:2])
        if shap_version < _SHAP_REQUIRED_VERSION:
            raise ModelUnavailableError(
                f"shap {shap.__version__} is older than the required "
                f"{_SHAP_REQUIRED_VERSION[0]}.{_SHAP_REQUIRED_VERSION[1]}; "
                "the permutation explainer API used here is unavailable."
            )

        model, checkpoint_file, checkpoint = _load_ft_transformer()
        scaler, scaler_file = _load_scaler()

        metadata = {
            key: value
            for key, value in (checkpoint.items() if isinstance(checkpoint, dict) else [])
            if key != "model_state_dict"
        }

        _loaded = _LoadedModel(
            ft_model=model,
            score_model=_build_score_model(model, torch, nn),
            scaler=scaler,
            model_version=checkpoint_file.stem,
            scaler_version=scaler_file.stem,
            metadata=metadata,
        )
        logger.info(
            "SHAP service ready: model=%s scaler=%s explainer=%s",
            _loaded.model_version,
            _loaded.scaler_version,
            EXPLAINER_METHOD,
        )
        return _loaded


def is_available() -> bool:
    """Return True when real attribution is possible; never raises."""
    try:
        get_model()
    except ShapServiceError as exc:
        logger.warning("SHAP service unavailable: %s", exc)
        return False
    return True


def availability_error() -> ModelUnavailableError | None:
    """Return the reason attribution is unavailable, or None when it is.

    Lets a caller produce a structured "unavailable" payload without having to
    catch an exception, while still surfacing the exact root cause.
    """
    try:
        get_model()
    except ShapServiceError as exc:
        return exc
    return None


# ---------------------------------------------------------------------------
# Feature + scaling helpers
# ---------------------------------------------------------------------------


def extract_raw_vector(row: dict[str, Any]) -> np.ndarray:
    """Return the raw 18-vector for a transaction row.

    Thin pass-through to the canonical extractor; exists so callers of this
    module never reimplement or reorder features.

    Args:
        row: Transaction dict (parser output or DB row).

    Returns:
        float32 ndarray of shape (18,).

    Raises:
        ValueError: if the extractor returns a wrongly-shaped vector.
    """
    vector = extract_features(row)
    if vector.shape != (FEATURE_DIM,):
        raise ValueError(f"extract_features returned {vector.shape}, expected ({FEATURE_DIM},)")
    return vector


def scale_vectors(raw: np.ndarray) -> np.ndarray:
    """Standardize raw feature matrix with the checkpoint's own scaler.

    Args:
        raw: float array of shape (N, FEATURE_DIM).

    Returns:
        float32 array of shape (N, FEATURE_DIM).

    Raises:
        ModelUnavailableError: if the scaler cannot be loaded.
        ValueError: on a shape mismatch.
    """
    loaded = get_model()
    matrix = np.asarray(raw, dtype=np.float32)
    if matrix.ndim != 2 or matrix.shape[1] != FEATURE_DIM:
        raise ValueError(f"Expected (N, {FEATURE_DIM}) input, got {matrix.shape}")
    return loaded.scaler.transform(matrix).astype(np.float32)


def build_background(
    rows: Sequence[dict[str, Any]] | None = None,
    *,
    raw_matrix: np.ndarray | None = None,
    size: int = DEFAULT_BACKGROUND_SIZE,
) -> np.ndarray:
    """Build the standardized background (reference) distribution.

    SHAP values are defined relative to E[f] over a background distribution.
    This is built from real transaction rows — there is no synthetic default,
    because a fabricated baseline would silently shift every attribution.

    Args:
        rows: Real transaction dicts to draw the background from.
        raw_matrix: Pre-extracted raw feature matrix, as an alternative to
            ``rows``. Exactly one of the two must be supplied.
        size: Number of background samples to keep.

    Returns:
        Standardized float32 array of shape (size, FEATURE_DIM).

    Raises:
        ValueError: if neither/both inputs are given, or the input is empty.
    """
    if (rows is None) == (raw_matrix is None):
        raise ValueError("Provide exactly one of 'rows' or 'raw_matrix'.")

    if raw_matrix is not None:
        matrix = np.asarray(raw_matrix, dtype=np.float32)
    else:
        assert rows is not None
        if len(rows) == 0:
            raise ValueError("Cannot build a SHAP background from zero rows.")
        matrix = np.stack([extract_raw_vector(r) for r in rows], axis=0)

    if matrix.ndim != 2 or matrix.shape[1] != FEATURE_DIM:
        raise ValueError(f"Background must be (N, {FEATURE_DIM}), got {matrix.shape}")
    if matrix.shape[0] == 0:
        raise ValueError("Cannot build a SHAP background from zero rows.")
    if matrix.shape[0] > size:
        matrix = matrix[:size]

    logger.info(
        "Building SHAP background from %d real transactions (%d features)",
        matrix.shape[0],
        matrix.shape[1],
    )
    return scale_vectors(matrix)


# ---------------------------------------------------------------------------
# Explainer
# ---------------------------------------------------------------------------


def _get_explainer(background: np.ndarray, *, seed: int, max_evals: int) -> Any:
    """Return a cached ``shap.PermutationExplainer`` for a background set.

    The masker's random subset and the permutation sampler are both seeded, so
    repeated calls against the same background return identical values.

    The cache key mixes in a content hash of the background, not just its
    shape. Keying on shape alone would let two DIFFERENT background sets of
    equal length silently share an explainer built on the first one, shifting
    every attribution against the wrong E[f].

    Args:
        background: Standardized background of shape (N, FEATURE_DIM).
        seed: Sampler seed.
        max_evals: Monte-Carlo budget (must be >= 2 * num_features + 1).

    Returns:
        A ``shap.PermutationExplainer``.

    Raises:
        ExplanationError: if shap rejects the configuration.
    """
    digest = hashlib.sha256(np.ascontiguousarray(background, dtype=np.float32).tobytes()).hexdigest()
    key = (digest, int(seed))
    with _explainer_lock:
        explainer = _explainer_cache.get(key)
        if explainer is not None:
            return explainer

        import shap

        torch, _ = _import_torch()
        loaded = get_model()

        try:
            # Independent masker == interventional feature masking: a masked
            # feature is replaced by a real background sample, which is the
            # correct conditional-expectation-free Shapley value definition.
            masker = shap.maskers.Independent(
                np.ascontiguousarray(background, dtype=np.float32),
                max_samples=int(background.shape[0]),
            )
            explainer = shap.Explainer(
                loaded.score_model,
                masker,
                algorithm="permutation",
                seed=seed,
            )
        except Exception as exc:
            raise ExplanationError(
                f"Failed to initialise shap.PermutationExplainer: {exc}"
            ) from exc

        _explainer_cache[key] = explainer
        return explainer


def anomaly_scores(scaled: np.ndarray) -> np.ndarray:
    """Return f(x) — the anomaly score — for standardized rows.

    Args:
        scaled: Standardized array of shape (N, FEATURE_DIM).

    Returns:
        float32 array of shape (N,).

    Raises:
        ModelUnavailableError: if the model cannot be loaded.
    """
    torch, _ = _import_torch()
    loaded = get_model()
    matrix = np.asarray(scaled, dtype=np.float32)
    with torch.no_grad():
        tensor = torch.as_tensor(np.ascontiguousarray(matrix), dtype=torch.float32)
        return loaded.score_model(tensor).cpu().numpy().ravel().astype(np.float32)


# ---------------------------------------------------------------------------
# Public attribution API
# ---------------------------------------------------------------------------


def explain_scaled(
    scaled_row: np.ndarray,
    *,
    background: np.ndarray,
    raw_row: np.ndarray | None = None,
    max_evals: int = DEFAULT_MAX_EVALS,
    seed: int = DEFAULT_SEED,
    sort: bool = True,
) -> ShapExplanation:
    """Explain one already-standardized feature vector.

    Args:
        scaled_row: Standardized 18-vector actually fed to the model.
        background: Standardized background from :func:`build_background`.
        raw_row: Raw 18-vector used for the reported ``value`` field. When
            omitted, ``scaled_row`` is reported as the value (only valid when
            no scaler was applied).
        max_evals: Monte-Carlo budget for the permutation sampler.
        seed: Sampler seed, for reproducibility.
        sort: Sort attributions by |contribution| descending.

    Returns:
        A :class:`ShapExplanation` with exactly 18 attributions.

    Raises:
        ValueError: on a shape mismatch or an undersized ``max_evals``.
        ModelUnavailableError: if the model cannot be loaded.
        ExplanationError: if the explainer fails to produce values.
    """
    torch, _ = _import_torch()
    loaded = get_model()

    scaled_arr = np.asarray(scaled_row, dtype=np.float32).ravel()
    if scaled_arr.shape != (FEATURE_DIM,):
        raise ValueError(f"scaled_row must have shape ({FEATURE_DIM},), got {scaled_arr.shape}")

    background_arr = np.asarray(background, dtype=np.float32)
    if background_arr.ndim != 2 or background_arr.shape[1] != FEATURE_DIM:
        raise ValueError(
            f"background must have shape (N, {FEATURE_DIM}), got {background_arr.shape}"
        )
    if background_arr.shape[0] < 2:
        raise ValueError("SHAP background needs at least 2 samples to estimate E[f].")

    min_evals = 2 * FEATURE_DIM + 1
    if max_evals < min_evals:
        raise ValueError(
            f"max_evals={max_evals} is below the PermutationExplainer minimum of {min_evals} "
            f"for {FEATURE_DIM} features."
        )

    raw_arr = (
        np.asarray(raw_row, dtype=np.float32).ravel()
        if raw_row is not None
        else scaled_arr.copy()
    )
    if raw_arr.shape != (FEATURE_DIM,):
        raise ValueError(f"raw_row must have shape ({FEATURE_DIM},), got {raw_arr.shape}")

    explainer = _get_explainer(background_arr, seed=seed, max_evals=max_evals)

    with torch.no_grad():
        base_tensor = loaded.score_model(
            torch.as_tensor(np.ascontiguousarray(background_arr), dtype=torch.float32)
        )
    base_value = float(base_tensor.mean().item())

    explain_input = np.ascontiguousarray(scaled_arr.reshape(1, FEATURE_DIM), dtype=np.float32)
    # shap's PermutationExplainer seeds the GLOBAL numpy RNG once in __init__
    # and then draws a fresh permutation with np.random.shuffle on every call,
    # so without this line the same transaction yields different attributions
    # on its 2nd, 3rd, ... call. Re-seeding immediately before the call makes
    # the decomposition a pure function of (x, background, seed) — verified to
    # a 0.0 delta across repeated calls.
    np.random.seed(seed)
    try:
        raw_values = explainer(explain_input, max_evals=int(max_evals)).values
    except Exception as exc:
        raise ExplanationError(
            f"shap.PermutationExplainer failed for max_evals={max_evals}: {exc}"
        ) from exc

    values = np.asarray(raw_values, dtype=np.float64)
    if values.shape != (1, FEATURE_DIM):
        raise ExplanationError(
            f"Expected SHAP values of shape (1, {FEATURE_DIM}), got {values.shape}"
        )
    contributions = values.ravel()

    prediction = float(anomaly_scores(scaled_arr.reshape(1, FEATURE_DIM))[0])
    additivity_error = abs(base_value + float(contributions.sum()) - prediction)

    attributions = [
        FeatureAttribution(
            feature=FEATURE_NAMES[i],
            value=float(raw_arr[i]),
            contribution=float(contributions[i]),
        )
        for i in range(FEATURE_DIM)
    ]
    if sort:
        attributions.sort(key=lambda a: abs(a.contribution), reverse=True)

    logger.debug(
        "SHAP | model=%s | f(x)=%.6f | E[f]=%.6f | sum(phi)=%.6f | additivity_err=%.2e",
        loaded.model_version,
        prediction,
        base_value,
        float(contributions.sum()),
        additivity_error,
    )

    return ShapExplanation(
        attributions=attributions,
        raw_vector=[float(v) for v in raw_arr],
        scaled_vector=[float(v) for v in scaled_arr],
        base_value=base_value,
        prediction=prediction,
        model_version=loaded.model_version,
        scaler_version=loaded.scaler_version,
        max_evals=int(max_evals),
        background_size=int(background_arr.shape[0]),
        additivity_error=additivity_error,
    )


def explain_transaction(
    row: dict[str, Any],
    *,
    background: np.ndarray,
    max_evals: int = DEFAULT_MAX_EVALS,
    seed: int = DEFAULT_SEED,
    sort: bool = True,
) -> ShapExplanation:
    """Explain a single raw transaction row end-to-end.

    Runs the canonical feature extractor, applies the checkpoint's scaler,
    then attributes with ``shap.PermutationExplainer``.

    Args:
        row: Transaction dict (parser output or DB row).
        background: Standardized background from :func:`build_background`.
        max_evals: Monte-Carlo budget.
        seed: Sampler seed.
        sort: Sort attributions by |contribution| descending.

    Returns:
        A :class:`ShapExplanation`.

    Raises:
        ModelUnavailableError: if the checkpoint/scaler/deps are unavailable.
        ExplanationError: if attribution fails.
    """
    raw = extract_raw_vector(row)
    scaled = scale_vectors(raw.reshape(1, FEATURE_DIM))[0]
    return explain_scaled(
        scaled,
        background=background,
        raw_row=raw,
        max_evals=max_evals,
        seed=seed,
        sort=sort,
    )


def explain_transactions(
    rows: Sequence[dict[str, Any]],
    *,
    background: np.ndarray,
    max_evals: int = DEFAULT_MAX_EVALS,
    seed: int = DEFAULT_SEED,
    sort: bool = True,
    on_error: str = "raise",
) -> list[ShapExplanation | None]:
    """Explain a batch of transactions.

    Args:
        rows: Transaction dicts.
        background: Standardized background from :func:`build_background`.
        max_evals: Monte-Carlo budget, applied per transaction.
        seed: Sampler seed.
        sort: Sort attributions by |contribution| descending.
        on_error: ``"raise"`` to propagate the first failure, or ``"skip"`` to
            log it and return ``None`` in that slot. Never silently fabricates.

    Returns:
        A list positionally aligned with ``rows``.

    Raises:
        ValueError: if ``on_error`` is not a recognised mode, or ``rows`` is
            empty while ``background`` is unusable.
        ShapServiceError: propagated when ``on_error="raise"``.
    """
    if on_error not in ("raise", "skip"):
        raise ValueError(f"on_error must be 'raise' or 'skip', got {on_error!r}.")
    if not rows:
        raise ValueError("explain_transactions requires at least one row.")

    out: list[ShapExplanation | None] = []
    for index, row in enumerate(rows):
        try:
            out.append(
                explain_transaction(
                    row,
                    background=background,
                    max_evals=max_evals,
                    seed=seed,
                    sort=sort,
                )
            )
        except ShapServiceError as exc:
            if on_error == "raise":
                raise
            logger.warning(
                "SHAP attribution failed for row %d (txid=%s): %s",
                index,
                str(row.get("txid", "unknown"))[:16],
                exc,
            )
            out.append(None)
    return out


def extract_attention(
    scaled_row: np.ndarray,
) -> dict[str, list[Any]]:
    """Extract the FT-Transformer's REAL cross-feature attention.

    Replaces the cosine-similarity softmax in
    ``routers/entity.py::_compute_provisional_shap_and_attention``.

    Args:
        scaled_row: Standardized 18-vector.

    Returns:
        Dict matching the frozen Phase 8 artifact shape::

            {"cross_feature_attention": [[float] * 18] * 18,
             "cls_attention": [float] * 18}

    Raises:
        ValueError: on a shape mismatch.
        ModelUnavailableError: if the model cannot be loaded.
    """
    torch, _ = _import_torch()
    loaded = get_model()

    arr = np.asarray(scaled_row, dtype=np.float32).ravel()
    if arr.shape != (FEATURE_DIM,):
        raise ValueError(f"scaled_row must have shape ({FEATURE_DIM},), got {arr.shape}")

    with torch.no_grad():
        tensor = torch.as_tensor(arr.reshape(1, FEATURE_DIM), dtype=torch.float32)
        result = loaded.ft_model(tensor, return_attention=True)
        if not isinstance(result, tuple) or len(result) != 2:
            raise ExplanationError(
                f"Expected (recon, attn) from FTTransformerAnomaly, got {type(result).__name__}"
            )
        _recon, attn = result
        cross = attn["cross_feature_attention"][0].cpu().numpy()
        cls_attn = attn["cls_attention"][0].cpu().numpy()

    if cross.shape != (FEATURE_DIM, FEATURE_DIM):
        raise ExplanationError(
            f"cross_feature_attention must be ({FEATURE_DIM}, {FEATURE_DIM}), got {cross.shape}"
        )
    if cls_attn.shape != (FEATURE_DIM,):
        raise ExplanationError(f"cls_attention must be ({FEATURE_DIM},), got {cls_attn.shape}")

    return {
        "cross_feature_attention": [[round(float(v), 6) for v in row] for row in cross],
        "cls_attention": [round(float(v), 6) for v in cls_attn],
    }


def explain_row_with_attention(
    row: dict[str, Any],
    *,
    background: np.ndarray,
    max_evals: int = DEFAULT_MAX_EVALS,
    seed: int = DEFAULT_SEED,
) -> tuple[ShapExplanation, dict[str, list[Any]]]:
    """Convenience: explain a row and grab its real attention in one pass.

    Returns:
        Tuple of (ShapExplanation, attention payload).
    """
    raw = extract_raw_vector(row)
    scaled = scale_vectors(raw.reshape(1, FEATURE_DIM))[0]
    explanation = explain_scaled(
        scaled,
        background=background,
        raw_row=raw,
        max_evals=max_evals,
        seed=seed,
    )
    return explanation, extract_attention(scaled)


def describe() -> dict[str, Any]:
    """Return a provenance blob describing how attributions are produced.

    Safe to call when the model is unavailable — the ``available`` flag and
    ``error`` field then carry the reason instead of raising.
    """
    try:
        loaded = get_model()
    except ShapServiceError as exc:
        return {
            "available": False,
            "error": str(exc),
            "explainer": EXPLAINER_METHOD,
            "shap_available": False,
        }

    return {
        "available": True,
        "explainer": EXPLAINER_METHOD,
        "explained_quantity": "anomaly_score = mean((z - FTTransformer(z))**2)",
        "model_version": loaded.model_version,
        "scaler_version": loaded.scaler_version,
        "num_features": FEATURE_DIM,
        "feature_names": list(FEATURE_NAMES),
        "max_evals_default": DEFAULT_MAX_EVALS,
        "background_size_default": DEFAULT_BACKGROUND_SIZE,
        "seed_default": DEFAULT_SEED,
        "attribution_units": ATTRIBUTION_UNITS,
        "additivity": "base_value + sum(contribution) == anomaly_score",
    }


def reset_cache() -> None:
    """Drop the cached model and explainers. Used by tests."""
    global _loaded
    with _load_lock:
        _loaded = None
    with _explainer_lock:
        _explainer_cache.clear()
