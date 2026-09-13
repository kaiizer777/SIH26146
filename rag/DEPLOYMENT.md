# Cloudflare Workers Deployment Runbook for RAG Intelligence Subsystem

This document provides a concise 3-step runbook to deploy the `/rag` intelligence knowledge system to Cloudflare Workers using OpenNext.

---

### Prerequisites
- Node.js 20+
- Active Cloudflare account
- Groq API Keys (Primary & Fallback)

---

### 3-Step Production Deployment Runbook

#### 1. Authenticate with Cloudflare
From your terminal, authenticate your Wrangler CLI session:
```bash
npx wrangler login
```

#### 2. Configure Edge Secrets
Securely upload your Groq API keys to Cloudflare Workers Secret Store (these will be encrypted and injected at runtime):
```bash
npx wrangler secret put GROQ_API_KEY_PRIMARY
# Paste your primary Groq API key when prompted

npx wrangler secret put GROQ_API_KEY_FALLBACK
# Paste your fallback Groq API key when prompted
```

*(Optional: If deploying without Groq API keys, the system gracefully falls back to the air-gapped local inverted-index forensic engine.)*

#### 3. Build & Deploy to Edge
Execute the automated OpenNext build and Wrangler deployment from within the `/rag` directory:
```bash
npm run deploy
```

---

### Local Edge Preview / Development
To test the Cloudflare Worker bundle locally with simulated bindings:
```bash
# Copy local secrets template
cp .dev.vars.example .dev.vars
# Edit .dev.vars with your actual keys, then run:
npm run preview
```
