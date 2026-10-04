# SIH26146 backend image — shared by the FastAPI service and the Celery worker.
#
# Base: CPython 3.11 on Debian bookworm-slim (matches backend/venv and the
# cp311 manylinux wheels every pinned dependency resolves to).
#
# The image intentionally ships ONLY what the runtime needs: app/, alembic/ and
# alembic.ini — the exact three paths the COPY instructions below name.
# Everything else is excluded by that narrow COPY, not by .dockerignore:
# tests/, conftest.py and scripts/ are never named so they can never be copied,
# and .dockerignore handles what the COPY would otherwise drag in from the build
# context (venv/, __pycache__/, data/, *.mmdb). So the image can never
# accidentally contain a stale __pycache__, a host virtualenv, or test-only code.
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Deliberately no compiler toolchain and no libpq-dev: every pin in
# requirements.txt resolves to a cp311 manylinux wheel (psycopg2-binary bundles
# its own libpq), so a full build-essential in the runtime image would be ~250 MB
# of unused attack surface. If a future pin adds a source-only dependency, add
# build-essential back here. curl is required by the container healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./

# torch 2.4.1 MUST come from the CPU wheel index first: the default PyPI wheel
# drags in ~2 GB of CUDA runtime this image never uses. requirements.txt pins the
# identical version, so the second install is a verified no-op for torch.
# --mount=type=cache keeps the wheels between rebuilds so iterating on the app
# does not re-download ~700 MB of torch/shap/scipy on every build.
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --default-timeout=1000 torch==2.4.1 \
        --index-url https://download.pytorch.org/whl/cpu \
    && pip install --default-timeout=1000 -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./alembic.ini

# 8000 is the port the FastAPI service publishes; the Celery worker reuses this
# image but listens on nothing.
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
