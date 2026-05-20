import re
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx


@dataclass
class Step:
    name: str
    method: str
    url: str
    headers: Dict[str, str] = field(default_factory=dict)
    body: Optional[Dict] = None
    expect_status: Optional[int] = None
    # Keys to extract from response JSON for use in later steps: {"var": "json.path"}
    extract: Dict[str, str] = field(default_factory=dict)


@dataclass
class StepResult:
    name: str
    status: int
    latency_ms: float
    success: bool
    response_body: Any
    error: Optional[str] = None


def _render(value: str, context: Dict[str, Any]) -> str:
    """Replace {{step_name.key}} placeholders with values from prior step responses."""
    def replacer(m: re.Match) -> str:
        parts = m.group(1).split(".", 1)
        step_data = context.get(parts[0], {})
        if len(parts) == 2 and isinstance(step_data, dict):
            return str(step_data.get(parts[1], m.group(0)))
        return str(step_data)

    return re.sub(r"\{\{([\w\.]+)\}\}", replacer, value)


def _render_step(step: Step, context: Dict[str, Any]) -> Step:
    return Step(
        name=step.name,
        method=step.method,
        url=_render(step.url, context),
        headers={k: _render(v, context) for k, v in step.headers.items()},
        body=step.body,
        expect_status=step.expect_status,
        extract=step.extract,
    )


def _get_nested(d: Any, path: str) -> Any:
    for key in path.split("."):
        if isinstance(d, dict):
            d = d.get(key)
        else:
            return None
    return d


class Pipeline:
    def __init__(self, steps: List[Step], base_url: str = "", timeout: float = 30.0):
        self.steps = steps
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def run(self, client: httpx.AsyncClient) -> List[StepResult]:
        results: List[StepResult] = []
        context: Dict[str, Any] = {}

        for step in self.steps:
            rendered = _render_step(step, context)
            url = (
                self.base_url + rendered.url
                if not rendered.url.startswith("http")
                else rendered.url
            )
            t0 = time.perf_counter()
            try:
                resp = await client.request(
                    method=rendered.method.upper(),
                    url=url,
                    headers=rendered.headers,
                    json=rendered.body,
                    timeout=self.timeout,
                )
                latency_ms = (time.perf_counter() - t0) * 1000
                success = (
                    rendered.expect_status is None
                    or resp.status_code == rendered.expect_status
                )
                try:
                    body = resp.json()
                except Exception:
                    body = resp.text

                # store full response + extracted vars for templating
                extracted = (
                    {k: _get_nested(body, path) for k, path in rendered.extract.items()}
                    if rendered.extract and isinstance(body, dict)
                    else {}
                )
                context[rendered.name] = {**(body if isinstance(body, dict) else {}), **extracted}

                results.append(
                    StepResult(
                        name=rendered.name,
                        status=resp.status_code,
                        latency_ms=latency_ms,
                        success=success,
                        response_body=body,
                    )
                )
            except Exception as exc:
                latency_ms = (time.perf_counter() - t0) * 1000
                results.append(
                    StepResult(
                        name=rendered.name,
                        status=0,
                        latency_ms=latency_ms,
                        success=False,
                        response_body=None,
                        error=str(exc),
                    )
                )
                break  # abort pipeline on network/timeout error

        return results
