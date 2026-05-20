import json
import statistics
from typing import Dict, List

from flowforge.anomaly import AnomalyResult
from flowforge.runner import RunResult


def _pct(data: List[float], p: float) -> float:
    if not data:
        return 0.0
    s = sorted(data)
    idx = min(int(len(s) * p / 100), len(s) - 1)
    return s[idx]


def print_report(run: RunResult, anomalies: Dict[str, AnomalyResult]) -> None:
    print(f"\n{'='*64}")
    print(f"  FlowForge Run Report")
    print(f"{'='*64}")
    print(f"  Total requests : {run.total}")
    print(f"  Succeeded      : {run.succeeded}")
    print(f"  Failed         : {run.failed}")
    print(f"  Duration       : {run.duration_s:.2f}s")
    print(f"  Throughput     : {run.total / max(run.duration_s, 0.001):.1f} req/s")
    print(f"\n  {'Endpoint':<26} {'mean':>8} {'p50':>8} {'p95':>8} {'p99':>8} {'anomalies':>10}")
    print(f"  {'─'*26} {'─'*8} {'─'*8} {'─'*8} {'─'*8} {'─'*10}")
    for name, lat in run.latency_profiles.items():
        mean = statistics.mean(lat) if lat else 0.0
        p50 = _pct(lat, 50)
        p95 = _pct(lat, 95)
        p99 = _pct(lat, 99)
        n_anom = len(anomalies[name].anomalies) if name in anomalies else 0
        flag = " ⚠" if n_anom else ""
        print(
            f"  {name:<26} {mean:>7.1f}ms {p50:>7.1f}ms {p95:>7.1f}ms {p99:>7.1f}ms {n_anom:>9}{flag}"
        )
    print(f"{'='*64}\n")


def to_json(run: RunResult, anomalies: Dict[str, AnomalyResult]) -> str:
    data = {
        "summary": {
            "total": run.total,
            "succeeded": run.succeeded,
            "failed": run.failed,
            "duration_s": round(run.duration_s, 3),
            "throughput_rps": round(run.total / max(run.duration_s, 0.001), 2),
        },
        "endpoints": {},
    }
    for name, lat in run.latency_profiles.items():
        anom = anomalies.get(name)
        data["endpoints"][name] = {
            "mean_ms": round(statistics.mean(lat), 2) if lat else 0,
            "p50_ms": round(_pct(lat, 50), 2),
            "p95_ms": round(_pct(lat, 95), 2),
            "p99_ms": round(_pct(lat, 99), 2),
            "sample_count": len(lat),
            "anomaly_count": len(anom.anomalies) if anom else 0,
            "anomaly_indices": anom.anomalies if anom else [],
        }
    return json.dumps(data, indent=2)
