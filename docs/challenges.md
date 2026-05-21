# Challenges

## Z-score baseline cold start
Z-score detection requires a minimum number of samples to build
a meaningful baseline. With fewer than ~10 samples, the standard
deviation is unstable and produces false positives on every request.
Solution: anomaly detection is disabled for the first N requests
per endpoint (configurable, default 10) until the baseline is
warmed. Endpoints in the warmup window are marked as
"baseline building" in the anomaly log.

## Variable extraction across nested JSON
The {{step.field}} template syntax works cleanly for top-level
response fields but fails on nested structures (e.g. data.user.token).
Solution: dot-notation path resolution -- {{login.data.user.token}}
walks the response JSON recursively. Arrays are supported via
index notation: {{login.items.0.id}}.

## WebSocket backpressure at high RPS
At 300+ RPS, the WebSocket broadcaster was dropping events --
the frontend could not consume them fast enough. Solution: the
broadcaster uses an asyncio queue with a configurable max size.
When the queue fills, older events are dropped (newest wins)
rather than blocking the load runner. The frontend shows a
"high load -- some events dropped" indicator when this occurs.

## Async worker coordination for ramp-up
Spawning all workers simultaneously produces a thundering herd
-- the target API sees a sudden spike rather than a realistic
load profile. The ramp controller uses asyncio.sleep intervals
between worker spawns to distribute startup across the ramp
window. At ramp=0, all workers start simultaneously (useful
for spike testing).

## YAML workflow validation errors
Invalid YAML workflows (missing required fields, bad template
syntax, circular variable references) previously caused
cryptic Python exceptions mid-run. Solution: a validation
pass runs before execution begins, collecting all errors and
returning structured validation results. Runs refuse to start
with invalid workflows.

## Production static file serving
FastAPI's StaticFiles mount for frontend/dist/ conflicts with
the /api prefix routing -- any 404 from the API was being
caught by the static file handler and returning index.html.
Solution: API routes are explicitly mounted before the static
file catch-all, and a dedicated /api/404 handler returns JSON
errors for API routes rather than falling through to the SPA.
