from typing import Any, Dict

import yaml

from flowforge.pipeline import Pipeline, Step


def load_workflow(path: str) -> Pipeline:
    """Parse a workflow YAML file into a Pipeline."""
    with open(path) as f:
        data: Dict[str, Any] = yaml.safe_load(f)

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
        for s in data.get("steps", [])
    ]
    return Pipeline(
        steps=steps,
        base_url=data.get("base_url", ""),
        timeout=float(data.get("timeout", 30.0)),
    )
