# Design Decisions

## Why Z-score anomaly detection over fixed thresholds
Fixed thresholds (flag if latency > 500ms) fail across different
APIs -- a database query endpoint has a different normal latency
profile than a static asset endpoint. Z-score detection builds a
statistical baseline per endpoint from historical runs, then flags
deviations beyond a configurable threshold (default |z| > 2.0).
This makes anomaly detection relative to each endpoint's own
behavior, not an arbitrary global constant.

## Why YAML workflow definitions
YAML workflows are human-readable, version-controllable, and
shareable. Engineers can commit workflow definitions alongside
their API code and track changes over time. The alternative
(UI-only workflow builder) would make workflows opaque to code
review. FlowForge supports both: workflows can be authored in
the UI builder or committed as YAML files.

## Why variable extraction with {{step.field}} templating
Real API workflows are stateful -- an auth token from step 1 is
needed in step 2's Authorization header. Without variable
extraction, each step would need to be hardcoded or the entire
workflow would require a scripting layer. The {{step.field}}
template syntax covers 95% of real-world chaining patterns
with minimal complexity.

## Why asyncio for the load runner
Python's asyncio enables thousands of concurrent HTTP connections
without OS-level thread overhead. For load testing -- where
concurrency is the entire point -- this matters. A thread-based
runner would hit OS limits at ~100 concurrent workers; an asyncio
worker pool scales to the event loop's capacity.

## Why failure injection at the simulation layer
Injecting failures at the simulation layer (between the workflow
engine and the actual HTTP call) means failures are applied
consistently regardless of the target API. Engineers can test
their system's resilience to a specific API degrading without
needing to actually degrade that API. Injection rules are
per-endpoint and per-run -- they don't persist between runs.

## Why WebSocket for live metrics
HTTP polling for run status introduces latency proportional to
the polling interval. For a load test running hundreds of
requests per second, polling at 1s intervals means metrics are
always 1s stale. WebSocket pushes metrics to the dashboard as
they are collected -- latency is bounded by the event loop
cycle, not the polling interval.

## Why FastAPI serves the production frontend build
In production, the FastAPI server serves the React build from
frontend/dist/ -- a single process handles both API and static
assets. This simplifies deployment (one port, one process) at
the cost of coupling frontend and backend deployments.
The dev mode (Vite dev server proxying to :8000) keeps them
decoupled during development.
