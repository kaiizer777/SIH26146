"""Health check router.

GET /health → 200 {"status": "ok"}
Used by Docker healthchecks and load balancers.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=dict, summary="Service health check")
async def health() -> JSONResponse:
    """Return 200 with a static payload when the service is up."""
    return JSONResponse(content={"status": "ok"})
