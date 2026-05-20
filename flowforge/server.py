"""
FlowForge FastAPI server — trigger runs remotely and retrieve results via REST.
Start with: python -m flowforge serve
"""
import json
from typing import Any, Dict

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel

from flowforge.anomaly import analyze_profiles
from flowforge.loader import load_workflow
from flowforge.reporter import to_json
from flowforge.runner import RunConfig, run as runner_run

app = FastAPI(title="FlowForge", description="Async API workflow testing platform", version="0.1.0")

_state: Dict[str, Any] = {"running": False, "result": None}


class RunRequest(BaseModel):
    workflow: str
    concurrency: int = 10
    total_requests: int = 50
    ramp_duration: float = 0.0
    z_threshold: float = 2.0


@app.get("/")
def root() -> Dict:
    return {"service": "FlowForge", "version": "0.1.0", "status": "ready"}


@app.get("/results")
def get_results() -> Dict:
    if _state["result"] is None:
        raise HTTPException(status_code=404, detail="No results yet — POST /run first.")
    return _state["result"]


@app.post("/run", status_code=202)
def trigger_run(req: RunRequest, background_tasks: BackgroundTasks) -> Dict:
    if _state["running"]:
        raise HTTPException(status_code=409, detail="A run is already in progress.")
    background_tasks.add_task(_do_run, req)
    return {"status": "accepted", "workflow": req.workflow}


async def _do_run(req: RunRequest) -> None:
    _state["running"] = True
    try:
        pipeline = load_workflow(req.workflow)
        config = RunConfig(
            concurrency=req.concurrency,
            total_requests=req.total_requests,
            ramp_duration=req.ramp_duration,
        )
        result = await runner_run(pipeline, config)
        anomalies = analyze_profiles(result.latency_profiles, threshold=req.z_threshold)
        _state["result"] = json.loads(to_json(result, anomalies))
    finally:
        _state["running"] = False
