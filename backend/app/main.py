"""FastAPI application entrypoint — Phase 9.

Routers:
  GET  /health                          → health.router
  POST /ingest                          → ingest.router
  GET  /ingest/status/{task_id}         → ingest.router
  GET  /api/v1/alerts                   → alerts.router
  GET  /api/v1/entity/{address}/explain → entity.router
  GET  /api/v1/graph/{cluster_id}       → graph.router

Middleware (execution order, outermost first):
  1. AddressHashMiddleware — SHA-256 pseudonymizes Base58/Bech32 addresses
     in application log output before they hit stdout/stderr.
  2. BearerAuthMiddleware — validates static bearer token; skips
     /health, /docs, /redoc, /openapi.json.
  3. CORSMiddleware — allow-list from CORS_ORIGINS (comma-separated), falling
     back to localhost:3000 / 127.0.0.1:3000 when it is unset or empty.
"""

from __future__ import annotations

import hashlib
import logging
import re
import secrets
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

from app.config import settings
from app.routers import health, ingest
from app.routers import alerts as alerts_router
from app.routers import entity as entity_router
from app.routers import graph as graph_router
import app.services.xai_store as xai_store

# ---------------------------------------------------------------------------
# SHA-256 pseudonymization log filter
# ---------------------------------------------------------------------------

# Matches Base58 Bitcoin addresses (P2PKH / P2SH, 25-34 chars starting 1 or 3)
# and Bech32/Bech32m addresses (bc1..., up to 62 chars).
_ADDR_RE = re.compile(
    r"\b((?:1|3)[a-km-zA-HJ-NP-Z1-9]{24,33}|bc1[a-z0-9]{6,87})\b"
)


def _sha8(addr: str) -> str:
    """Return first 8 hex chars of SHA-256 of the address."""
    return hashlib.sha256(addr.encode()).hexdigest()[:8]


class _AddressPseudonymFilter(logging.Filter):
    """Replaces wallet address patterns in log records with sha256[:8] tokens."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        msg = record.getMessage()  # fully interpolated
        if _ADDR_RE.search(msg):
            record.msg = _ADDR_RE.sub(lambda m: f"[addr:{_sha8(m.group())}]", msg)
            record.args = ()  # already baked into record.msg
        return True


# Install filter on root logger so it covers all loggers in the process.
_root_logger = logging.getLogger()
_root_logger.addFilter(_AddressPseudonymFilter())

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Bearer token auth middleware
# ---------------------------------------------------------------------------

_AUTH_SKIP_PREFIXES = ("/health", "/docs", "/redoc", "/openapi.json")


class BearerAuthMiddleware(BaseHTTPMiddleware):
    """Validates 'Authorization: Bearer <token>' for all non-exempt paths."""

    async def dispatch(self, request: Request, call_next) -> Response:
        path = request.url.path
        # Skip auth for exempt paths and all CORS preflights
        if request.method == "OPTIONS" or any(path.startswith(p) for p in _AUTH_SKIP_PREFIXES):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or malformed Authorization header"},
            )
        token = auth_header[len("Bearer "):]
        expected_token = settings.api_dev_token or ""
        # Constant-time comparison on the utf-8 bytes: compare_digest() rejects
        # non-ASCII str, and a malformed token must 401 rather than raise.
        # An unset/empty configured token can never be matched by an empty one.
        if not expected_token or not secrets.compare_digest(
            expected_token.encode("utf-8"), token.encode("utf-8")
        ):
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid bearer token"},
            )
        return await call_next(request)


# ---------------------------------------------------------------------------
# Lifespan: pre-load XAI artifacts into memory
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    use_legacy_anomaly = getattr(settings, "use_legacy_anomaly_model", getattr(settings, "use_legacy_models", False))
    use_legacy_risk = getattr(settings, "use_legacy_risk_model", getattr(settings, "use_legacy_models", False))
    anom_label = "Autoencoder (legacy fallback)" if use_legacy_anomaly else "FT-Transformer (primary)"
    risk_label = "GraphSAGE (legacy fallback)" if use_legacy_risk else "Graph Transformer (primary)"
    logger.info("[MODEL CONFIG] Anomaly: %s | Risk: %s", anom_label, risk_label)

    logger.info("Loading XAI artifact store into memory…")
    xai_store.load()
    logger.info(
        "XAI store ready — %d wallets indexed, verdict distribution: %s",
        xai_store.composite_count(),
        xai_store.verdict_counts(),
    )
    yield
    await graph_router.close_driver()
    logger.info("Shutting down — XAI store released.")


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SIH26146 — NTRO Bitcoin AML Surveillance API",
    description=(
        "Production-grade forensic API for Bitcoin AML monitoring. "
        "Exposes paginated alert feeds, forensic dossiers, and Neo4j subgraphs "
        "backed by Phase 8 XAI artifacts (SHAP + GNNExplainer)."
    ),
    version="9.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS allow-list
# ---------------------------------------------------------------------------

# Fallback when CORS_ORIGINS is unset/empty: the documented dev/docker default
# (FRONTEND_PORT=3000). An empty allow-list would break every browser call, so
# the fallback is never dropped.
_DEFAULT_CORS_ORIGINS = ("http://localhost:3000", "http://127.0.0.1:3000")


def _cors_origins() -> list[str]:
    """Parse CORS_ORIGINS (comma-separated) into a CORSMiddleware allow-list.

    Whitespace around each entry is trimmed and empty entries are dropped.
    """
    configured = (origin.strip() for origin in settings.cors_origins.split(","))
    origins = [origin for origin in configured if origin]
    return origins or list(_DEFAULT_CORS_ORIGINS)


# ---------------------------------------------------------------------------
# Middleware (registration order: last-added = outermost)
# ---------------------------------------------------------------------------

# 1. CORS — innermost (applied first on request, last on response)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# 2. Bearer auth — middle
app.add_middleware(BearerAuthMiddleware)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

# Legacy paths (no version prefix) — backward compat
app.include_router(health.router)
app.include_router(ingest.router)

# Phase 9 forensic API
app.include_router(alerts_router.router)
app.include_router(entity_router.router)
app.include_router(graph_router.router)

# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(ValidationError)
async def pydantic_validation_handler(request: Request, exc: ValidationError) -> JSONResponse:
    """Return a structured 422 for Pydantic validation errors."""
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(include_url=False)},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all: log and return a structured 500 instead of an empty error."""
    logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check server logs for details."},
    )
