"""
In-memory store for workflows, runs, metrics, and anomalies.
A real deployment would replace this with PostgreSQL + TimescaleDB.
"""
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


def _uid() -> str:
    return str(uuid.uuid4())[:8]


@dataclass
class WorkflowRecord:
    id: str = field(default_factory=_uid)
    name: str = ""
    description: str = ""
    steps: List[Dict] = field(default_factory=list)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class StepMetric:
    name: str
    latency_ms: float
    status: int
    success: bool
    error: Optional[str] = None


@dataclass
class RunRecord:
    id: str = field(default_factory=_uid)
    workflow_id: str = ""
    workflow_name: str = ""
    status: str = "pending"          # pending | running | done | failed
    concurrency: int = 10
    total_requests: int = 50
    ramp_duration: float = 0.0
    z_threshold: float = 2.0
    simulation_rules: List[Dict] = field(default_factory=list)
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    # populated after completion
    summary: Optional[Dict] = None
    latency_profiles: Optional[Dict[str, List[float]]] = None
    anomalies: Optional[Dict[str, Any]] = None


# ── Singleton store ──────────────────────────────────────────────────────────

class Store:
    def __init__(self):
        self.workflows: Dict[str, WorkflowRecord] = {}
        self.runs: Dict[str, RunRecord] = {}
        # real-time metric stream per run: run_id → [StepMetric]
        self.live_metrics: Dict[str, List[StepMetric]] = {}
        self._seed_defaults()

    def _seed_defaults(self):
        wf = WorkflowRecord(
            name="httpbin smoke test",
            description="Quick validation against httpbin.org",
            steps=[
                {"name": "health",      "method": "GET",  "url": "/get",    "expect_status": 200},
                {"name": "post-data",   "method": "POST", "url": "/post",
                 "headers": {"Content-Type": "application/json"},
                 "body": {"source": "flowforge"}, "expect_status": 200},
                {"name": "status-check","method": "GET",  "url": "/status/200", "expect_status": 200},
            ],
        )
        wf.id = "demo-wf"
        self.workflows[wf.id] = wf


store = Store()
