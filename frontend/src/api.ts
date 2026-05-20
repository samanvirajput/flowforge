import type { Run, SimRule, Workflow, WorkflowStep } from './types'

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path)
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

async function del(path: string): Promise<void> {
  await fetch(BASE + path, { method: 'DELETE' })
}

// ── Workflows ────────────────────────────────────────────────────────────────

export const api = {
  workflows: {
    list: () => get<Workflow[]>('/workflows/'),
    get:  (id: string) => get<Workflow>(`/workflows/${id}`),
    create: (payload: { name: string; description?: string; steps: WorkflowStep[] }) =>
      post<Workflow>('/workflows/', payload),
    delete: (id: string) => del(`/workflows/${id}`),
  },

  runs: {
    list: () => get<Run[]>('/runs/'),
    get:  (id: string) => get<Run>(`/runs/${id}`),
    trigger: (payload: {
      workflow_id: string
      concurrency?: number
      total_requests?: number
      ramp_duration?: number
      z_threshold?: number
      simulation_rules?: SimRule[]
    }) => post<{ run_id: string; status: string }>('/runs/', payload),
  },
}

// ── WebSocket helper ─────────────────────────────────────────────────────────

export function watchRun(
  runId: string,
  onMessage: (msg: { event: string; run: Run }) => void
): () => void {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${window.location.host}/api/runs/ws/${runId}`)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  return () => ws.close()
}
