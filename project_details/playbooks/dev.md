# Playbook: Local Development

## Prerequisites
* Node.js 22+ (`node --version`)
* npm 10+ (`npm --version`)

## First-Time Setup

```powershell
# From project root:
npm install
```

## Running Locally (Dev Mode)

The API and web app run as separate processes. Open two terminals:

**Terminal 1 — API:**
```powershell
npm run dev:api
# Starts Fastify on http://localhost:3001
# Watches for file changes via --watch flag
```

**Terminal 2 — Web:**
```powershell
npm run dev:web
# Starts Vite dev server on http://localhost:5173
# Proxies /api and /ws to localhost:3001 automatically
```

Then open: http://localhost:5173

## Stopping

`Ctrl+C` in each terminal window. The API performs a graceful shutdown (stops mDNS, closes DB).

## Running via Docker (Recommended for Production-like Testing)

```powershell
cd apps/docker
docker compose up --build
# Full stack at http://localhost:3001
```

## Environment Variables (API)

| Variable         | Default       | Description                          |
|------------------|---------------|--------------------------------------|
| PORT             | 3001          | API listen port                      |
| HOST             | 0.0.0.0       | API listen host                      |
| DATA_DIR         | ./data        | Directory for SQLite database file   |
| FRONTEND_ORIGIN  | http://localhost:5173 | CORS allowed origin          |

Create `apps/api/.env` to override locally. It is gitignored.
