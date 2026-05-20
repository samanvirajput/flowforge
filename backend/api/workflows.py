from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.db.models import WorkflowRecord, store

router = APIRouter()


class StepIn(BaseModel):
    name: str
    method: str = "GET"
    url: str
    headers: dict = {}
    body: Optional[dict] = None
    expect_status: Optional[int] = None
    extract: dict = {}


class WorkflowIn(BaseModel):
    name: str
    description: str = ""
    base_url: str = ""
    steps: List[StepIn]


@router.get("/")
def list_workflows():
    return list(store.workflows.values())


@router.post("/", status_code=201)
def create_workflow(payload: WorkflowIn):
    wf = WorkflowRecord(
        name=payload.name,
        description=payload.description,
        steps=[s.model_dump() for s in payload.steps],
    )
    store.workflows[wf.id] = wf
    return wf


@router.get("/{wf_id}")
def get_workflow(wf_id: str):
    wf = store.workflows.get(wf_id)
    if not wf:
        raise HTTPException(404, "Workflow not found")
    return wf


@router.delete("/{wf_id}", status_code=204)
def delete_workflow(wf_id: str):
    if wf_id not in store.workflows:
        raise HTTPException(404, "Workflow not found")
    del store.workflows[wf_id]
