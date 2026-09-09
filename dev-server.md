# Local Development Server Guide (No Docker / Bare-Metal)

This guide provides end-to-end instructions for running the complete SIH26146 surveillance platform locally on your host machine without Docker containers.

---

## 1. Prerequisites & Infrastructure Services

Before starting the application servers, ensure the underlying databases and message queues are running locally on their default ports:

| Service | Default Port | Connection URL | Verification Command |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | 5432 | postgresql://sih_user:sih_password@localhost:5432/sih_bitcoin | psql -U sih_user -d sih_bitcoin -h localhost |
| **Neo4j (with GDS)** | 7687 (Bolt), 7474 (HTTP) | olt://localhost:7687 (user: 
eo4j, pass: password123) | Open http://localhost:7474 in browser |
| **Redis** | 6379 | edis://localhost:6379/0 | edis-cli ping (returns PONG) |

> **Note**: If you run Postgres/Neo4j/Redis via local binaries or desktop apps (e.g. Neo4j Desktop, native Redis service, PostgreSQL Windows Service), make sure your .env matches the credentials above.

---

## 2. Environment Configuration

Ensure .env exists in the repository root (copied from .env.example):

`ash
# Windows PowerShell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
`

Key environment variables required:
`dotenv
DATABASE_URL=postgresql://sih_user:sih_password@localhost:5432/sih_bitcoin
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password123
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CORS_ORIGINS=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
`

---

## 3. Terminal Setup (3 Terminals Required)

To run the complete system with live async ingestion and UI updates, open **3 separate terminal windows**:

`
┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│       TERMINAL 1        │  │       TERMINAL 2        │  │       TERMINAL 3        │
│     FastAPI Backend     │  │      Celery Worker      │  │     Next.js Frontend    │
│  http://localhost:8000  │  │  (Async Ingest Tasks)   │  │  http://localhost:3000  │
└─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
`

---

### Terminal 1: FastAPI Backend Server

`powershell
# From project root:
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run database migrations (first time only)
alembic upgrade head

# Start FastAPI server with live hot-reload
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
`
- **Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

---

### Terminal 2: Celery Background Ingest Worker

Celery processes async CSV/JSON/XML file uploads, runs MaxMind GeoIP resolution, and performs batch database inserts.

`powershell
# From project root:
cd backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Start Celery worker (use solo pool on Windows)
celery -A app.celery_app worker --loglevel=info --pool=solo
`

---

### Terminal 3: Next.js Frontend Dashboard

`powershell
# From project root:
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
`
- **Dashboard UI**: [http://localhost:3000](http://localhost:3000)

---

## 4. One-Click Smoke Test Verification

Once all 3 terminals are up, verify the pipeline is healthy:

1. **Backend Health**:
   `ash
   curl http://localhost:8000/health
   # Expected: { status:healthy,database:connected,neo4j:connected,redis:connected}
   `
2. **Alerts Grid**:
   `ash
   curl http://localhost:8000/alerts?limit=5
   `
3. **Frontend Access**: Open http://localhost:3000 in your browser. The live alert table and metrics grid should populate immediately.

---

## 5. Troubleshooting Common Issues

- **WinError 10061 / Connection Refused on Redis (6379)**:
  - Redis service is not running. Start Redis service or launch edis-server.exe.
- **Celery Worker Permission / Freeze on Windows**:
  - Windows does not support ork. Always ensure you pass --pool=solo to the celery worker command.
- **404 on Entity Explanation (/entity/{address}/explain)**:
  - XAI Store loads cached artifacts from data/xai/ at startup. Ensure Phase 8 artifacts exist or use a pre-indexed entity from the alert table.
