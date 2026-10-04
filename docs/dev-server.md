# Local Development Server Guide (No Docker / Bare-Metal)

This guide provides end-to-end instructions for running the complete SIH26146 surveillance platform locally on your host machine without Docker containers.

---

## 1. Prerequisites & Infrastructure Services

Before starting the application servers, ensure the underlying databases and message queues are running locally on their default ports:

| Service | Default Port | Connection URL | Verification Command |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | 5432 | postgresql://sih_user:sih_password@localhost:5432/sih_bitcoin | psql -U sih_user -d sih_bitcoin -h localhost |
| **Neo4j (with GDS)** | 7687 (Bolt), 7474 (HTTP) | bolt://localhost:7687 (user: neo4j, pass: password123) | Open http://localhost:7474 in browser |
| **Redis** | 6379 | redis://localhost:6379/0 | redis-cli ping (returns PONG) |

> **Note:** If you run Postgres/Neo4j/Redis via local binaries or desktop apps (e.g. Neo4j Desktop, native Redis service, PostgreSQL Windows Service), make sure your .env matches the credentials above.

---

## 2. Environment Configuration

Ensure .env exists in the repository root (copied from .env.example):

```bash
# Windows PowerShell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Key environment variables required (all present in `.env.example`):

```dotenv
DATABASE_URL=postgresql://sih_user:sih_password@localhost:5432/sih_bitcoin
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> `.env` is gitignored. Never commit real credentials — `MAXMIND_ACCOUNT_ID` / `MAXMIND_LICENSE_KEY` stay local.

> **`CORS_ORIGINS` is optional.** The backend parses it as a comma-separated list
> of browser origins (whitespace trimmed, empty entries dropped). Leave it unset
> or empty and the allow-list falls back to `http://localhost:3000` and
> `http://127.0.0.1:3000`, which covers the `npm run dev` port. Set it only when
> you serve the dashboard elsewhere — e.g. `CORS_ORIGINS=http://localhost:3100`
> for port 3100, or a multi-origin list such as
> `CORS_ORIGINS=http://localhost:3000,http://192.168.1.50:3000`. Note that
> `--host 0.0.0.0` on uvicorn makes the *API* reachable from the LAN, but the
> browser on the other machine still sends `Origin: http://<lan-ip>:3000`, which
> the backend cannot infer — that origin has to be listed explicitly. Restart
> uvicorn after changing it.

---

## 3. Terminal Setup (3 Terminals Required)

To run the complete system with live async ingestion and UI updates, open **3 separate terminal windows**:

```
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│       TERMINAL 1        │  │       TERMINAL 2        │  │       TERMINAL 3        │
│     FastAPI Backend     │  │      Celery Worker      │  │     Next.js Frontend    │
│  http://localhost:8000  │  │  (Async Ingest Tasks)   │  │  http://localhost:3000  │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
```

---

### Terminal 1: FastAPI Backend Server

```powershell
# From project root:
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run database migrations (first time only)
alembic upgrade head

# Start FastAPI server with live hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

> `alembic/env.py` reads `DATABASE_URL` from the environment and overrides the
> URL hardcoded in `alembic.ini`, so migrations target the same database the app
> uses.

---

### Terminal 2: Celery Background Ingest Worker

Celery processes async CSV/JSON/XML file uploads, runs MaxMind GeoIP resolution, and performs batch database inserts.

```powershell
# From project root:
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start Celery worker (use solo pool on Windows)
celery -A app.celery_app worker --loglevel=info --pool=solo
```

---

### Terminal 3: Next.js Frontend Dashboard

```powershell
# From project root:
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

- **Dashboard UI**: [http://localhost:3000](http://localhost:3000)

---

## 4. One-Click Smoke Test Verification

Once all 3 terminals are up, verify the pipeline is healthy:

1. **Backend Health** (no auth required — `/health` is exempt from the bearer middleware):

   ```bash
   curl http://localhost:8000/health
   # Expected: {"status":"ok"}
   ```

   This is a liveness probe only — it returns a static payload and does **not**
   report database / Neo4j / Redis connectivity.

2. **Alerts Grid** (auth required — every path except `/health`, `/docs`,
   `/redoc` and `/openapi.json` needs the bearer token, else `401`):

   ```bash
   curl "http://localhost:8000/api/v1/alerts?limit=5" \
     -H "Authorization: Bearer dev-token-ntro-2026"
   ```

3. **Frontend Access**: Open http://localhost:3000 in your browser. The live alert table and metrics grid should populate immediately.

> The alerts table is served from the in-memory XAI store, which is loaded from
> `data/xai/*.json` at process start. An empty table on a freshly started server
> means the artifacts are missing — see `setup.md` for the full seed procedure.

---

## 5. Troubleshooting Common Issues

- **WinError 10061 / Connection Refused on Redis (6379)**:
  - Redis service is not running. Start Redis service or launch `redis-server.exe`.
- **Celery Worker Permission / Freeze on Windows**:
  - Windows does not support `fork`. Always ensure you pass `--pool=solo` to the celery worker command.
- **401 on every API call**:
  - The bearer token is missing or wrong. Send `-H "Authorization: Bearer dev-token-ntro-2026"` (override via `API_DEV_TOKEN` in `.env`).
- **Browser CORS error, or the dashboard loads with empty panels**:
  - The browser's `Origin` is not in the backend allow-list. Set `CORS_ORIGINS` to the exact origin you are serving the dashboard from (comma-separated for several), then restart uvicorn. Unset or empty it falls back to `http://localhost:3000,http://127.0.0.1:3000`. `curl` is unaffected.
- **404 on Entity Explanation (`/api/v1/entity/{address}/explain`)**:
  - The address is in neither the XAI composite index nor PostgreSQL telemetry. Ensure the Phase 8 artifacts in `data/xai/` exist, or open a wallet from the alert table.
- **Dashboard shows stale entity counts after an ingest**:
  - The XAI store is a process-lifetime snapshot. Use `POST /ingest/enrichment/{ingest_task_id}/reload` to hot-reload without restarting, or restart `uvicorn`.