"""
Failure injection middleware — wraps httpx.AsyncClient to apply
SimulationRules before any request is actually sent.
"""
import asyncio
import random
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import httpx


@dataclass
class SimulationRule:
    endpoint: str                    # substring match against request URL
    latency_ms: float = 0.0         # extra delay to inject
    error_rate: float = 0.0         # 0.0–1.0 probability of forced error
    forced_status: Optional[int] = None   # override HTTP status code
    timeout_rate: float = 0.0       # 0.0–1.0 probability of simulated timeout


class SimulatingTransport(httpx.AsyncBaseTransport):
    """Wraps a real transport and injects faults before forwarding."""

    def __init__(self, inner: httpx.AsyncBaseTransport, rules: List[SimulationRule]):
        self._inner = inner
        self._rules = rules

    def _match(self, url: str) -> Optional[SimulationRule]:
        for rule in self._rules:
            if rule.endpoint in url:
                return rule
        return None

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        url = str(request.url)
        rule = self._match(url)

        if rule:
            if rule.latency_ms > 0:
                await asyncio.sleep(rule.latency_ms / 1000)

            if rule.timeout_rate > 0 and random.random() < rule.timeout_rate:
                raise httpx.TimeoutException(f"[simulated timeout] {url}")

            if rule.error_rate > 0 and random.random() < rule.error_rate:
                status = rule.forced_status or 500
                return httpx.Response(status, json={"error": "simulated failure"})

            if rule.forced_status is not None:
                resp = await self._inner.handle_async_request(request)
                return httpx.Response(
                    rule.forced_status,
                    headers=dict(resp.headers),
                    content=resp.content,
                )

        return await self._inner.handle_async_request(request)


def make_client(rules: List[SimulationRule], timeout: float = 30.0) -> httpx.AsyncClient:
    """Return an AsyncClient that applies simulation rules to every request."""
    if not rules:
        return httpx.AsyncClient(timeout=timeout)
    transport = SimulatingTransport(httpx.AsyncHTTPTransport(), rules)
    return httpx.AsyncClient(transport=transport, timeout=timeout)
