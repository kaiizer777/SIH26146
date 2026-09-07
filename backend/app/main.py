"""FastAPI application entrypoint.

Routers:
  GET  /health            → health.router
  POST /ingest            → ingest.router
  GET  /ingest/status/... → ingest.router

Global exception handlers prevent unhandled errors from returning
empty 500 responses.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.routers import health, ingest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="SIH26146 — Bitcoin AML Ingest API",
    description=(
        "Async ingest pipeline for Bitcoin transaction monitoring. "
        "Upload CSV/JSON/XML → Celery enrichment → PostgreSQL."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# In development, allow all origins so the Next.js dev server can hit the API.
# Phase 9 will tighten this to the known frontend origin.

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router)
app.include_router(ingest.router)

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
