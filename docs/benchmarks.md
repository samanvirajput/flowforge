# Benchmarks

Note: Benchmarks on MacBook M2 8GB, targeting a local FastAPI
echo server. Results will vary with target API latency.

## Load Runner Throughput

| Concurrency | Requests | Ramp (s) | RPS achieved | Peak RSS |
|---|---|---|---|---|
| 10 | 100 | 0 | ~310 | ~48 MB |
| 20 | 500 | 5 | ~290 | ~51 MB |
| 50 | 1000 | 10 | ~270 | ~58 MB |
| 100 | 2000 | 15 | ~245 | ~67 MB |

RPS degrades slightly at high concurrency due to event loop
scheduling overhead -- not due to connection limits.

## Workflow Engine Latency

| Operation | Mean (ms) |
|---|---|
| YAML parse + validate | 3 |
| Variable extraction per step | <1 |
| Simulation rule application | <1 |
| Metrics collection per request | <1 |
| Z-score computation (100 samples) | 2 |
| WebSocket broadcast per event | <1 |

## Anomaly Detection

| Metric | Value |
|---|---|
| Baseline window (default) | 30 samples |
| Z-score threshold (default) | 2.0 |
| False positive rate (synthetic data) | ~8% |
| Detection latency after anomaly occurs | <50ms |

## Frontend

| Metric | Value |
|---|---|
| Production bundle size (gzipped) | ~203 KB |
| WebSocket reconnect on drop | <500ms |
| Dashboard render at 100 RPS stream | stable 60fps |
