"""conftest.py — pytest configuration for the backend test suite.

Adds backend/ to sys.path so that 'import app' works from any CWD
when running `pytest backend/tests` from the project root.
"""

import sys
from pathlib import Path

import pytest

# backend/ directory
_BACKEND_DIR = Path(__file__).resolve().parent

if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))


def pytest_configure(config: pytest.Config) -> None:
    """Register custom marks to suppress PytestUnknownMarkWarning."""
    config.addinivalue_line(
        "markers",
        "integration: mark test as requiring live services (Neo4j, PostgreSQL, Redis). "
        "These tests skip gracefully when services are unreachable.",
    )
