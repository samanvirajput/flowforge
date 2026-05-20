import asyncio
import json
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.db.models import RunRecord, StepMetric, store
from backend.engine.anomaly import analyze_profiles
from backend.engine.pipeline import Pipeline, Step
from backend.engine.runner import RunConfig, run as engine_run
from backend.engine.simulation import SimulationRule, make_client

router = APIRouter()

# ── Active WebSocket connections: run_id → [WebSocket] ─────────────────────
_sockets: dict = {}


class SimRuleIn(BaseModel):
    endpoint: str
    latency_ms: float = 0.0
    error_rate: float = 0.0
    forced_status: Optional[int] = None
    timeout_rate: float = 0.0


class RunRequest(BaseModel):
    workflow_id: str
    concurrency: int = 10
    total_requests: int = 50
    ramp_duration: float = 0.0
    z_threshold: float = 2.0
    simulation_rules: List[SimRuleIn] = []


@router.get("/")
def list_runs():
    return sorted(store.runs.values(), key=lambda r: r.started_at or "", reverse=True)


@router.get("/{run_id}")
def get_run(run_id: str):
    run = store.runs.get(run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return run


@router.post("/", status_code=202)
def trigger_run(req: RunRequest, background_tasks: BackgroundTasks):
    wf = store.workflows.get(req.workflow_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")

    run = RunRecord(
        workflow_id=wf.id,
        workflow_name=wf.name,
        status="pending",
        concurrency=req.concurrency,
        total_requests=req.total_requests,
        ramp_duration=req.ramp_duration,
        z_threshold=req.z_threshold,
        simulation_rules=[r.model_dump() for r in req.simulation_rules],
    )
    store.runs[run.id] = run
    store.live_metrics[run.id] = []
    background_tasks.add_task(_execute_run, run.id, wf, req)
    return {"run_id": run.id, "status": "accepted"}


async def _execute_run(run_id: str, wf, req: RunRequest):
    run = store.runs[run_id]
    run.status = "running"
    run.started_at = datetime.utcnow().isoformat()

    sim_rules = [
        SimulationRule(**r.model_dump()) for r in req.simulation_rules
    ]

    steps = [
        Step(
            name=s["name"],
            method=s.get("method", "GET"),
            url=s["url"],
            headers=s.get("headers", {}),
            body=s.get("body"),
            expect_status=s.get("expect_status"),
            extract=s.get("extract", {}),
        )
        for s in wf.steps
    ]

    base_url = getattr(wf, "base_url", "") or "https://httpbin.org"
    pipeline = Pipeline(steps=steps, base_url=base_url)
    config = RunConfig(
        concurrency=req.concurrency,
        total_requests=req.total_requests,
        ramp_duration=req.ramp_duration,
    )

    try:
        result = await engine_run(pipeline, config)
        anomaly_map = analyze_profiles(result.latency_profiles, threshold=req.z_threshold)

        run.summary = {
            "total": result.total,
            "succeeded": result.succeeded,
            "failed": result.failed,
            "duration_s": round(result.duration_s, 3),
            "throughput_rps": round(result.total / max(result.duration_s, 0.001), 2),
        }
        run.latency_profiles = result.latency_profiles
        run.anomalies = {
            k: {
                "mean": round(v.mean, 2),
                "stdev": round(v.stdev, 2),
                "anomaly_count": len(v.anomalies),
                "anomaly_indices": v.anomalies,
            }
            for k, v in anomaly_map.items()
        }
        run.status = "done" if result.failed == 0 else "failed"
    except Exception as exc:
        run.status = "failed"
        run.summary = {"error": str(exc)}
    finally:
        run.finished_at = datetime.utcnow().isoformat()
        await _broadcast(run_id, {"event": "done", "run": _run_dict(run)})


def _run_dict(run: RunRecord) -> dict:
    return {
        "id": run.id,
        "workflow_id": run.workflow_id,
        "workflow_name": run.workflow_name,
        "status": run.status,
        "summary": run.summary,
        "anomalies": run.anomalies,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
    }


async def _broadcast(run_id: str, payload: dict):
    sockets = _sockets.get(run_id, [])
    dead = []
    for ws in sockets:
        try:
            await ws.send_text(json.dumps(payload))
        except Exception:
            dead.append(ws)
    for ws in dead:
        sockets.remove(ws)


@router.websocket("/ws/{run_id}")
async def ws_run(websocket: WebSocket, run_id: str):
    await websocket.accept()
    _sockets.setdefault(run_id, []).append(websocket)

    run = store.runs.get(run_id)
    if run:
        await websocket.send_text(json.dumps({"event": "state", "run": _run_dict(run)}))

    try:
        while True:
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        sockets = _sockets.get(run_id, [])
        if websocket in sockets:
            sockets.remove(websocket)
