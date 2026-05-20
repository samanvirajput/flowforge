import asyncio
import time
from dataclasses import dataclass, field
from typing import Dict, List

import httpx

from flowforge.pipeline import Pipeline, StepResult


@dataclass
class RunConfig:
    concurrency: int = 10
    total_requests: int = 50
    ramp_duration: float = 0.0  # seconds to spread initial workers over
    timeout: float = 30.0


@dataclass
class RunResult:
    total: int
    succeeded: int
    failed: int
    duration_s: float
    latency_profiles: Dict[str, List[float]] = field(default_factory=dict)


async def _execute(
    pipeline: Pipeline,
    client: httpx.AsyncClient,
    acc: Dict,
) -> None:
    step_results: List[StepResult] = await pipeline.run(client)
    success = all(sr.success for sr in step_results)
    acc["success"].append(success)
    for sr in step_results:
        acc["latencies"].setdefault(sr.name, []).append(sr.latency_ms)


async def run(pipeline: Pipeline, config: RunConfig) -> RunResult:
    sem = asyncio.Semaphore(config.concurrency)
    acc: Dict = {"success": [], "latencies": {}}
    t0 = time.perf_counter()

    async def guarded(delay: float) -> None:
        if delay > 0:
            await asyncio.sleep(delay)
        async with sem:
            async with httpx.AsyncClient() as client:
                await _execute(pipeline, client, acc)

    tasks = []
    for i in range(config.total_requests):
        # Ramp: spread the first `concurrency` slots over ramp_duration
        if config.ramp_duration > 0 and config.concurrency > 1:
            slot = i % config.concurrency
            delay = (slot / (config.concurrency - 1)) * config.ramp_duration
        else:
            delay = 0.0
        tasks.append(asyncio.create_task(guarded(delay)))

    await asyncio.gather(*tasks)
    duration = time.perf_counter() - t0
    succeeded = sum(1 for s in acc["success"] if s)

    return RunResult(
        total=config.total_requests,
        succeeded=succeeded,
        failed=config.total_requests - succeeded,
        duration_s=duration,
        latency_profiles=acc["latencies"],
    )
