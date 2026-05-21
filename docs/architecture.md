# Architecture

## System Overview

FlowForge is a full-stack API workflow testing and load analysis platform.
Workflows are defined in YAML, executed as chained HTTP steps, and
analysed for anomalies using per-endpoint Z-score baselines.

```
Frontend (React 18 + Vite + Tailwind)
         |
         |  REST + WebSocket
         v
[ FastAPI Backend ]
  |                           |
[ Workflow Engine ]    [ Load Runner ]
                              (asyncio worker pool)
  |                           |
  +----------+-----------+----+
             |
  [ Simulation Layer ]
    failure injection:
    latency / error rate /
    timeout / status codes
             |
             v
  [ Anomaly Engine ]
    Z-score per endpoint
    flags |z| > threshold
             |
             v
  [ WebSocket broadcaster ]
    live metrics -> frontend
```

## Workflow Execution Pipeline

```
YAML Workflow Definition
        |
        v
[ YAML Parser + Validator ]
        |
        v
[ Step Executor ]  ------>  [ Variable Extraction ]
  (sequential)                {{step.field}}
        |
        v
[ Simulation Layer ]   <- applies injection rules if present
        |
        v
[ httpx async client ] <- actual HTTP request
        |
        v
[ Metrics Collector ]  <- latency, status, response size
        |
        v
[ Anomaly Engine ]     <- Z-score against per-endpoint baseline
        |
        v
  WebSocket broadcast -> React dashboard
```

## Load Runner Architecture

```
Run Request (concurrency=C, total=N, ramp=R seconds)
        |
        v
[ Ramp Controller ]
  Gradually spawns workers
  over R seconds to reach C
        |
   +----+----+
   v         v
Worker 1   Worker C
(asyncio)  (asyncio)
   |         |
   +----+----+
        |
  Shared metrics queue
        |
        v
  Anomaly Engine
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | /api/workflows | List all workflows |
| POST | /api/workflows | Create workflow from YAML |
| GET | /api/workflows/{id} | Get workflow definition |
| DELETE | /api/workflows/{id} | Delete workflow |
| POST | /api/runs | Trigger a run (with optional simulation rules) |
| GET | /api/runs/{id} | Get run results + metrics |
| GET | /api/runs/{id}/anomalies | Get anomaly report for run |
| WS | /ws/runs/{id} | Live run metrics stream |

## Frontend Structure

```
frontend/src/
├── pages/
│   ├── Dashboard.tsx       # active runs, recent results
│   ├── WorkflowBuilder.tsx # YAML editor + step visualiser
│   ├── Analytics.tsx       # latency charts (Recharts)
│   └── AnomalyLog.tsx      # flagged endpoints + Z-scores
├── components/
│   ├── RunCard.tsx
│   ├── MetricsChart.tsx
│   ├── AnomalyBadge.tsx
│   └── WorkflowStep.tsx
└── hooks/
    ├── useWebSocket.ts     # live run metrics
    └── useWorkflows.ts     # REST CRUD
```
