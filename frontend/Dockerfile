# SIH26146 frontend image — Next.js 16 production server.
#
# Node 22 (LTS) is required: frontend/node_modules/next declares
# engines.node >= 20.9.0 and Next 16 is built against Node 22.
#
# The build is split into three stages because next.config.ts does NOT set
# `output: "standalone"`. There is therefore no self-contained server bundle to
# copy — the runtime needs a real node_modules, so it gets the production
# dependency tree (devDependencies pruned) instead of the full install.

# ---------------------------------------------------------------------------
# Stage 1 — dependency install
# ---------------------------------------------------------------------------
FROM node:22-alpine AS deps

WORKDIR /app

# `npm ci` installs exactly the tree pinned in package-lock.json, so the lock
# must stay in sync with package.json.
#
# Regenerate with `npm install --package-lock-only`, but run it on Linux (e.g.
# `docker run --rm -v "$PWD":/app -w /app node:22-alpine npm install
# --package-lock-only`). npm 11 on Windows prunes the bundled dependencies of
# `cpu: ["wasm32"]` optional packages such as @tailwindcss/oxide-wasm32-wasi,
# which drops @emnapi/core and @emnapi/runtime from the lock and makes the
# `npm ci` below fail. Regenerating on Linux keeps the lock a superset that
# every platform accepts.
COPY package.json package-lock.json ./

RUN npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm ci

# ---------------------------------------------------------------------------
# Stage 2 — production build
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# must arrive as build args. docker-compose.yml forwards the same variables it
# passes at runtime, which keeps the browser bundle and the server in agreement.
ARG NEXT_PUBLIC_API_BASE=http://localhost:8000
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ARG NEXT_PUBLIC_API_TOKEN=dev-token-ntro-2026

ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_API_TOKEN=$NEXT_PUBLIC_API_TOKEN

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3 — runtime server
# ---------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Production dependency tree only. Next's own compiler/native binaries are prod
# dependencies of `next`, so nothing needed at runtime is dropped here.
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev

# .next is chowned to `node` so the server can write its own build cache at
# runtime; the app renders no <Image>, so there is no optimiser cache to miss.
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --chown=node:node package.json next.config.ts ./

USER node

EXPOSE 3000

CMD ["npm", "start"]
