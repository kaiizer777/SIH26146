# Docker troubleshooting appendix (SIH26146)

Scope: `docker compose up -d` for the full stack — PostgreSQL 16, Neo4j 5.26
with Graph Data Science, Redis 7, FastAPI, Celery worker, Next.js 16.

This file is an appendix. It deliberately does **not** restate the project
overview, the feature list, or the non-Docker setup steps.

---

## 1. Expected healthy state

```bash
docker compose up -d
docker compose ps
```

`docker compose ps` must show:

| Service         | Expected status                | Published port              |
| --------------- | ------------------------------ | --------------------------- |
| `postgres`      | `Up (healthy)`                 | `5433 -> 5432`              |
| `neo4j`         | `Up (healthy)`                 | `7474`, `7687`              |
| `redis`         | `Up (healthy)`                 | `6380 -> 6379`              |
| `migrate`       | `Exited (0)`                   | —                           |
| `fastapi`       | `Up (healthy)`                 | `8000 -> 8000`              |
| `celery-worker` | `Up (healthy)`                 | —                           |
| `next-frontend` | `Up (healthy)`                 | `3000 -> 3000`              |

`migrate` is a one-shot job and is *supposed* to be `Exited (0)`. `Exited (1)`
there means the schema bootstrap failed and the API and worker were never
started — check `docker compose logs migrate` first.

First boot takes a few minutes: the Neo4j Graph Data Science jar (~200 MB) is
downloaded on the first start, and the API parses ~50 MB of XAI artifacts during
startup. `start_period` budgets are sized for that.

Smoke test:

```bash
curl http://localhost:8000/health          # {"status":"ok"}
curl http://localhost:3000/                # dashboard shell
```

---

## 2. Ports already in use

The default published host ports are 5433 (PostgreSQL), 6380 (Redis), 7474/7687
(Neo4j), 8000 (API) and 3000 (frontend). PostgreSQL and Redis are deliberately
*not* on 5432/6379 so a locally installed PostgreSQL/Redis does not collide.

Override any of them in `.env` or on the command line:

```bash
FRONTEND_PORT=3100 BACKEND_PORT=8100 CORS_ORIGINS=http://localhost:3100 \
  docker compose up -d
```

> **Frontend port gotcha — `CORS_ORIGINS` must move with `FRONTEND_PORT`.**
> `FRONTEND_PORT` only republishes the container on a different *host* port. The
> browser then sends `Origin: http://localhost:3100` instead of
> `Origin: http://localhost:3000`, and the API's allow-list is a **fixed string
> list**, so the new origin is refused and the browser drops the response — the
> dashboard renders but every panel stays empty and the console shows a CORS
> error. `FRONTEND_PORT` alone is therefore *not* sufficient.
>
> The allow-list is read, not hardcoded: `backend/app/config.py:93` declares
> `cors_origins`, and `backend/app/main.py:167-184` splits it on `,` into
> `CORSMiddleware(allow_origins=…)`, falling back to
> `http://localhost:3000,http://127.0.0.1:3000` when it is unset or empty.
> `docker-compose.yml`'s `x-backend-environment` anchor passes `CORS_ORIGINS`
> into the `migrate` / `fastapi` / `celery-worker` containers, so setting it in
> `.env` is enough. **No source edit and no frontend rebuild** — CORS is
> enforced solely by the API container.
>
> If you also browse via `127.0.0.1`, list that origin too:
> `CORS_ORIGINS=http://localhost:3100,http://127.0.0.1:3100`.

---

## 3. First boot needs outbound network access

Two downloads happen once, then they are cached in Docker volumes:

1. `postgres:16-alpine`, `neo4j:5.26-community`, `redis:7-alpine`, `node:22-alpine`,
   `python:3.11-slim`.
2. The Neo4j **graph-data-science** plugin, fetched by `NEO4J_PLUGINS` into the
   `sih26146_neo4j_plugins` volume.

GDS is not optional: `app/tasks/enrich.py` calls `gds.graph.project.cypher`
(`:167`), `gds.louvain.stream` (`:180`) and `gds.graph.drop` (`:130`). If the
download is blocked, Neo4j either never becomes healthy or comes up without the
plugin and the enrich pipeline fails with "There is no procedure with the name
gds.*".

Workaround for a locked-down network — pre-seed the plugin volume. Let the image's
own entrypoint do the install (it is what `NEO4J_PLUGINS` triggers on boot), then
exit immediately so no server is started:

```bash
docker run --rm -v sih26146_neo4j_plugins:/plugins \
  -e NEO4J_PLUGINS='["graph-data-science"]' -e NEO4J_AUTH=none \
  neo4j:5.26-community true
```

`NEO4J_AUTH=none` skips the initial-password step, which is irrelevant for a
throwaway container. Confirm the jar landed before restarting the stack:

```bash
docker run --rm -v sih26146_neo4j_plugins:/plugins --entrypoint ls \
  neo4j:5.26-community -la /plugins
```

> Do **not** try `neo4j-admin server plugins install …`. That subcommand does not
> exist in `neo4j:5.26-community` — `neo4j-admin server` only offers
> `console, help, memory-recommendation, migrate-configuration, report, restart,
> start, status, stop, unbind, validate-config`, and the invocation fails with
> `Unmatched arguments from index 1: 'plugins', 'install', …`.

Wipe it and retry:

```bash
docker compose down -v && docker compose up -d
```

---

## 4. Schema and migrations

Migrations run automatically. There is no manual step, and none is expected.

- `migrate` runs `alembic upgrade head` once per `up`, exits 0, and both the API
  and the worker wait for `service_completed_successfully`.
- A failed migration stops the rollout. Diagnose with `docker compose logs migrate`;
  the failure is always visible there, never as a silent uvicorn crash loop.

Re-running after a code change:

```bash
docker compose run --rm migrate
```

Inspect the resulting schema:

```bash
docker compose exec postgres psql -U sih_user -d sih_bitcoin -c '\dt'
```

---

## 5. Data persistence

| Host path          | Container path       | Notes                                                  |
| ------------------ | -------------------- | ------------------------------------------------------ |
| `./data`           | `/app/data` (bind)   | uploads, model weights, XAI artifacts, runtime overlay  |
| named volume       | `/var/lib/postgresql/data` | transactions table                                |
| named volume       | `/data` + `/plugins` | Neo4j store and GDS jar                              |
| named volume       | `/data`              | Redis RDB/AOF                                         |

`./data` is a **bind mount**, so ingested data and model artifacts survive
`docker compose down` and are visible from the host. Because
`docker-compose.yml` hardcodes `./data` (it is not a `${DATA_DIR}` variable),
pointing it elsewhere requires editing the compose file.

To destroy everything and start from an empty database:

```bash
docker compose down -v
```

The dashboard still renders after `down -v`: it is served from the committed
frozen XAI artifacts in `./data/xai/`, not from PostgreSQL.

---

## 6. Authentication

Every endpoint except `/health`, `/docs`, `/redoc` and `/openapi.json` requires
a static bearer token (`app/main.py` → `BearerAuthMiddleware`).

```bash
curl -H "Authorization: Bearer dev-token-ntro-2026" \
     "http://localhost:8000/api/v1/alerts?limit=1"
```

Set `API_DEV_TOKEN` in `.env` to change it. `docker-compose.yml` derives the
frontend's `NEXT_PUBLIC_API_TOKEN` from the same variable **and** passes it as a
build argument, so the two sides cannot diverge. Because the token is inlined
into the browser bundle by `next build`, changing it requires a frontend
rebuild:

```bash
docker compose build next-frontend && docker compose up -d next-frontend
```

There is no user store and no login. This is a static offline-demo token, not a
credential system — see the security notes in the main README for what would
have to change before this is exposed on anything but localhost.

---

## 7. Rebuilding after a code change

The API, the worker and the migrate job all run the image built from
`backend/`. Nothing is bind-mounted over the application code, so a rebuild is
required for backend or frontend changes:

```bash
docker compose build
docker compose up -d
```

`./data` *is* bind-mounted, so artifacts written by the pipeline are never
invalidated by a rebuild.

The backend build caches pip downloads in a BuildKit cache mount, so a rebuild
after a code-only change takes seconds rather than re-downloading torch.

---

## 8. Why the frontend image is not `output: "standalone"`

`frontend/next.config.ts` does not set `output: "standalone"`, and that file is
application config owned outside the Docker surface. The frontend image is
therefore split into three stages and the runtime stage carries a real
`node_modules` with devDependencies pruned.

If `standalone` is ever enabled in `next.config.ts`, the frontend image can be
simplified to copying `.next/standalone` — but do not switch to that before
`next.config.ts` actually sets it, or the runtime stage will ship with no
server bundle at all and `next start` will fail.

---

## 9. The frontend lockfile must be regenerated on Linux

`frontend/Dockerfile` **does** use `npm ci` (stage `deps`), and
`frontend/package-lock.json` is in sync with `frontend/package.json` — the lock
carries `node_modules/@tailwindcss/oxide-wasm32-wasi` together with its bundled
`@emnapi/core`, `@emnapi/runtime` and `@emnapi/wasi-threads` entries. A plain
`npm ci` in `frontend/` succeeds.

The real constraint is *where* you regenerate that lock. `npm install
--package-lock-only` run on **Windows** (npm 11) prunes the bundled dependencies
of `cpu: ["wasm32"]` optional packages, dropping `@emnapi/core` and
`@emnapi/runtime` from the lock. The resulting lock is still accepted on Windows
but `npm ci` inside the `node:22-alpine` image then hard-fails:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json or npm-shrinkwrap.json are in sync.
npm error Missing: @emnapi/core@… from lock file
```

Regenerate it on Linux so the lock stays a superset every platform accepts — run
it in the same Alpine image the build uses, mounting the frontend directory:

```bash
docker run --rm -v "$PWD/frontend":/app -w /app node:22-alpine \
  npm install --package-lock-only
```

(From the repo root. From inside `frontend/`, drop the `frontend/` path segment.)
Commit the regenerated `frontend/package-lock.json` — never hand-edit it.

If `npm ci` still fails, check the three `@emnapi/*` lock entries before blaming
the Dockerfile:

```bash
grep -o 'node_modules/@emnapi/[a-z-]*' frontend/package-lock.json | sort -u
# node_modules/@emnapi/core
# node_modules/@emnapi/runtime
# node_modules/@emnapi/wasi-threads
```

---

## 10. Common failures

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `migrate` shows `Exited (1)`; API never starts | migration error | `docker compose logs migrate` |
| API restarts in a loop | crash during lifespan | `docker compose logs fastapi`; XAI artifacts under `./data/xai/` are the usual cause |
| Neo4j never becomes healthy | GDS download blocked or slow | §3; expect up to ~90 s on first boot |
| `There is no procedure with the name gds.*` | GDS jar missing | §3 |
| Frontend loads but every panel is empty | frontend bundle has a stale API URL/token | rebuild: `docker compose build next-frontend && docker compose up -d` |
| Browser CORS error / panels stay empty after moving `FRONTEND_PORT` | `CORS_ORIGINS` still lists only port 3000 — `FRONTEND_PORT` does not change the `Origin` the browser sends | §2 — add the new origin, e.g. `CORS_ORIGINS=http://localhost:3100`, then `docker compose up -d fastapi` |
| Neo4j crash-loops with `Initial heap size set to a larger value than the maximum heap size` | `NEO4J_HEAP_INITIAL_SIZE` > `NEO4J_HEAP_MAX_SIZE` | lower the initial size or raise the max in `.env`; §1 of `.env.example` |
| `401` from every API call | token mismatch after an edit | §6 |
| `ECONNREFUSED` from the worker | Redis not up | `docker compose ps`; `docker compose logs redis` |
| Port bind error on `up` | something already listening | §2 |
| Disk pressure after several rebuilds | multi-GB torch image layers | `docker image prune`; keep volumes |

---

## 11. Log locations

```bash
docker compose logs -f fastapi        # request + lifespan, address-pseudonymised
docker compose logs -f celery-worker  # ingest / enrich task progress
docker compose logs -f migrate        # schema bootstrap
docker compose logs neo4j             # GDS install, auth, store recovery
docker compose logs next-frontend     # Next.js server
```

Per-service filtering and timestamps:

```bash
docker compose logs -f --since 10m fastapi
```

---

## 12. Full reset

```bash
docker compose down -v --remove-orphans
docker rmi kaiizer777/sih26146-backend:latest kaiizer777/sih26146-frontend:latest
docker compose build
docker compose up -d
docker compose ps
```
