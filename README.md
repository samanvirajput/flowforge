# FlowForge

> Scenario-based API workflow execution and load analysis platform — execute chained workflows, simulate concurrent load, inject failures, collect runtime metrics, and detect anomalies with Z-score analysis.

## Architecture

```
Frontend (React + Vite + Tailwind)
        │
        ▼
Backend (FastAPI + WebSocket)
        │
   ┌────┴───────────────────────┐
   ▼            ▼               ▼
Workflow     Load Runner    Simulation
 Engine      (asyncio)     (failure injection)
        │
        ▼
  Anomaly Engine
  (Z-score detection)
```

## Features

- **Workflow Engine** — sequential step execution with variable extraction and response templating
- **Load Runner** — configurable concurrency + ramp-up profiles, async worker pool
- **Failure Injection** — per-endpoint latency injection, error rate, forced status codes, timeout simulation
- **Z-score Anomaly Detection** — statistical baseline per endpoint, flags `|z| > threshold` outliers
- **Real-time WebSocket** — live run status and metrics streamed to the dashboard
- **REST API** — full CRUD for workflows; trigger runs; retrieve results
- **React Dashboard** — dark terminal-aesthetic UI: execution dashboard, workflow builder, analytics, anomaly log

## Quick Start

### Backend

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run the API server
uvicorn backend.main:app --reload --port 8000
```

### Frontend (dev mode)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (proxies /api → :8000)
```

### Frontend (production build)

```bash
cd frontend && npm run build
# Built output at frontend/dist/ — served automatically by the FastAPI server
uvicorn backend.main:app --port 8000
```

### CLI (standalone)

```bash
# Validate a workflow YAML
python -m flowforge check examples/example_workflow.yaml

# Run with 20 concurrent workers, 100 requests, 5s ramp
python -m flowforge run examples/example_workflow.yaml -c 20 -n 100 -r 5

# JSON output (useful for CI)
python -m flowforge run examples/example_workflow.yaml -o json
```

## Workflow YAML Format

```yaml
name: "my-api-scenario"
base_url: "https://api.example.com"
timeout: 10.0

steps:
  - name: login
    method: POST
    url: /auth/token
    body:
      username: test
      password: test
    expect_status: 200
    extract:
      token: access_token          # → {{login.token}}

  - name: fetch-profile
    method: GET
    url: /users/me
    headers:
      Authorization: "Bearer {{login.token}}"
    expect_status: 200
```

## Failure Injection (via REST API)

```json
POST /api/runs/
{
  "workflow_id": "demo-wf",
  "concurrency": 10,
  "total_requests": 100,
  "simulation_rules": [
    { "endpoint": "/api/orders", "latency_ms": 800, "error_rate": 0.3 },
    { "endpoint": "/api/pay",    "timeout_rate": 0.1 }
  ]
}
```

## Stack

`Python 3.11` `FastAPI` `asyncio` `httpx` `React 18` `TypeScript` `Vite` `Tailwind CSS` `Recharts` `GitHub Actions`

## Used in

VIT Vellore — Software Engineering Lab (BCSE301P)
