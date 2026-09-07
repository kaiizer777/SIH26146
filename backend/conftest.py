"""conftest.py — pytest configuration for the backend test suite.

Adds backend/ to sys.path so that 'import app' works from any CWD
when running `pytest backend/tests` from the project root.
"""

import sys
from pathlib import Path

# backend/ directory
_BACKEND_DIR = Path(__file__).resolve().parent

if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))
