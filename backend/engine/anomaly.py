import statistics
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class AnomalyResult:
    endpoint: str
    latencies: List[float]
    mean: float
    stdev: float
    anomalies: List[int]  # indices into latencies
    z_scores: List[float]


def detect(latencies: List[float], threshold: float = 2.0) -> Tuple[float, float, List[int], List[float]]:
    """Compute Z-scores and return anomalous indices where |z| > threshold."""
    if len(latencies) < 3:
        return 0.0, 0.0, [], [0.0] * len(latencies)
    mean = statistics.mean(latencies)
    stdev = statistics.stdev(latencies)
    if stdev == 0:
        return mean, stdev, [], [0.0] * len(latencies)
    z_scores = [(x - mean) / stdev for x in latencies]
    anomalies = [i for i, z in enumerate(z_scores) if abs(z) > threshold]
    return mean, stdev, anomalies, z_scores


def analyze_profiles(
    profiles: Dict[str, List[float]], threshold: float = 2.0
) -> Dict[str, AnomalyResult]:
    """Run Z-score detection across all per-endpoint latency profiles."""
    results = {}
    for endpoint, latencies in profiles.items():
        mean, stdev, anomalies, z_scores = detect(latencies, threshold)
        results[endpoint] = AnomalyResult(
            endpoint=endpoint,
            latencies=latencies,
            mean=mean,
            stdev=stdev,
            anomalies=anomalies,
            z_scores=z_scores,
        )
    return results
