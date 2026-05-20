import { useEffect, useState } from 'react'
import { Play, RefreshCw } from 'lucide-react'
import { api } from '../api'
import type { Run, Workflow } from '../types'
import MetricCard from '../components/MetricCard'
import RunsTable from '../components/RunsTable'
import LatencyChart from '../components/LatencyChart'
import ThroughputChart from '../components/ThroughputChart'

function pct(runs: Run[], field: 'p50' | 'p95' | 'p99', step: string): number {
  const lats = runs.flatMap(r => r.latency_profiles?.[step] ?? []).sort((a, b) => a - b)
  if (!lats.length) return 0
  const i = { p50: 0.5, p95: 0.95, p99: 0.99 }[field]
  return lats[Math.floor(lats.length * i)] ?? 0
}

export default function Dashboard() {
  const [runs, setRuns]         = useState<Run[]>([])
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [launching, setLaunching] = useState(false)
  const [selectedWf, setSelectedWf] = useState('')

  const load = async () => {
    const [r, w] = await Promise.all([api.runs.list(), api.workflows.list()])
    setRuns(r)
    setWorkflows(w)
    if (w.length && !selectedWf) setSelectedWf(w[0].id)
  }

  useEffect(() => { load() }, [])

  const done = runs.filter(r => r.status === 'done' || r.status === 'failed')
  const active = runs.filter(r => r.status === 'running').length

  const totalReqs    = done.reduce((s, r) => s + (r.summary?.total ?? 0), 0)
  const totalFailed  = done.reduce((s, r) => s + (r.summary?.failed ?? 0), 0)
  const avgThroughput = done.length
    ? done.reduce((s, r) => s + (r.summary?.throughput_rps ?? 0), 0) / done.length
    : 0
  const successRate   = totalReqs > 0
    ? (((totalReqs - totalFailed) / totalReqs) * 100).toFixed(1) + '%'
    : '—'

  // Chart data — one point per completed run (last 10)
  const allStepNames = Array.from(
    new Set(done.flatMap(r => Object.keys(r.latency_profiles ?? {})))
  )

  const chartRuns = done.slice(-10)
  const latData = chartRuns.map((r, i) => {
    const step = allStepNames[0] ?? 'step'
    const lats = (r.latency_profiles?.[step] ?? []).sort((a, b) => a - b)
    const p = (pct: number) => lats[Math.floor(lats.length * pct)] ?? 0
    return { label: `#${i + 1}`, p50: p(0.5), p95: p(0.95), p99: p(0.99) }
  })

  const thrData = chartRuns.map((r, i) => ({
    label: `#${i + 1}`,
    rps: r.summary?.throughput_rps ?? 0,
    failed: r.summary?.failed ?? 0,
  }))

  const launch = async () => {
    if (!selectedWf) return
    setLaunching(true)
    try {
      await api.runs.trigger({ workflow_id: selectedWf, concurrency: 10, total_requests: 50 })
      setTimeout(load, 800)
      const poll = setInterval(() => load(), 2000)
      setTimeout(() => clearInterval(poll), 30000)
    } finally {
      setLaunching(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-text">
            EXECUTION DASHBOARD
          </h1>
          <p className="text-text-dim text-xs mt-1">
            Real-time API workflow execution and load analysis
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedWf}
            onChange={e => setSelectedWf(e.target.value)}
            className="bg-surface border border-border text-text font-mono text-xs px-3 py-2
                       focus:outline-none focus:border-accent"
          >
            {workflows.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <button onClick={launch} disabled={launching || !selectedWf} className="btn-primary flex items-center gap-2">
            <Play size={12} />
            {launching ? 'launching…' : 'Run Workflow'}
          </button>

          <button onClick={load} className="btn-ghost flex items-center gap-2">
            <RefreshCw size={12} />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Total Runs"    value={done.length}                   sub="completed"       />
        <MetricCard label="Success Rate"  value={successRate}                   accent sub={`${totalReqs} total requests`} />
        <MetricCard label="Avg Throughput" value={`${avgThroughput.toFixed(1)}`} sub="req/s"           />
        <MetricCard label="Active Workers" value={active}                        accent={active > 0}
                    sub={active ? 'running now' : 'idle'} />
      </div>

      {/* Active run banner */}
      {active > 0 && (
        <div className="border border-accent/40 bg-accent-dim px-4 py-3 flex items-center gap-3">
          <span className="dot-live" />
          <span className="font-mono text-xs text-accent tracking-wide">
            {active} workflow{active > 1 ? 's' : ''} running — collecting metrics
          </span>
        </div>
      )}

      {/* Charts */}
      {latData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <LatencyChart   data={latData}  title="Latency Percentiles — Last 10 Runs" />
          <ThroughputChart data={thrData} title="Throughput & Error Distribution" />
        </div>
      )}

      {/* Runs table */}
      <div className="space-y-2">
        <span className="label">Recent Executions</span>
        <RunsTable runs={[...runs].reverse()} />
      </div>
    </div>
  )
}
