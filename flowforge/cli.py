import asyncio
import sys

import click

from backend.engine.anomaly import analyze_profiles
from backend.engine.loader import load_workflow
from backend.engine.reporter import print_report, to_json
from backend.engine.runner import RunConfig, run as runner_run


@click.group()
@click.version_option("0.1.0", prog_name="flowforge")
def main() -> None:
    """FlowForge — async API workflow testing and load analysis."""


@main.command()
@click.argument("workflow", type=click.Path(exists=True))
@click.option("--concurrency", "-c", default=10, show_default=True, help="Max concurrent workers.")
@click.option("--requests", "-n", default=50, show_default=True, help="Total requests to send.")
@click.option("--ramp", "-r", default=0.0, show_default=True, help="Ramp-up duration in seconds.")
@click.option("--threshold", "-t", default=2.0, show_default=True, help="Z-score anomaly threshold.")
@click.option(
    "--output", "-o",
    type=click.Choice(["table", "json"]),
    default="table",
    show_default=True,
    help="Output format.",
)
def run(workflow: str, concurrency: int, requests: int, ramp: float, threshold: float, output: str) -> None:
    """Run a workflow YAML and profile per-endpoint latency."""
    pipeline = load_workflow(workflow)
    config = RunConfig(concurrency=concurrency, total_requests=requests, ramp_duration=ramp)
    result = asyncio.run(runner_run(pipeline, config))
    anomalies = analyze_profiles(result.latency_profiles, threshold=threshold)

    if output == "json":
        click.echo(to_json(result, anomalies))
    else:
        print_report(result, anomalies)

    if result.failed > 0:
        sys.exit(1)


@main.command()
@click.argument("workflow", type=click.Path(exists=True))
def check(workflow: str) -> None:
    """Validate a workflow YAML file without running it."""
    try:
        pipeline = load_workflow(workflow)
        click.echo(f"✓ Valid — {len(pipeline.steps)} step(s) found")
        for step in pipeline.steps:
            click.echo(f"  · {step.name}  {step.method.upper()}  {step.url}")
    except Exception as exc:
        click.echo(f"✗ Invalid workflow: {exc}", err=True)
        sys.exit(1)


@main.command()
@click.option("--host", default="0.0.0.0", show_default=True, help="Bind host.")
@click.option("--port", default=8000, show_default=True, help="Bind port.")
def serve(host: str, port: int) -> None:
    """Start the FlowForge REST server (trigger runs, retrieve results)."""
    import uvicorn
    uvicorn.run("flowforge.server:app", host=host, port=port, reload=False)
