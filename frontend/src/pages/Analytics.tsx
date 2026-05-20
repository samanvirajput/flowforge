import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Run } from '../types'
import LatencyChart from '../components/LatencyChart'
import ThroughputChart from '../components/ThroughputChart'
import MetricCard from '../components/MetricCard'

function pct(arr: number[], p: number) {
  if (!arr.length) return 0
  const s = [...arr].sort((a, b) => a - b)
  return s[Math.floor(s.length * p)] ?? 0
}

function aggregate(runs: Run[], stepName: string) {
  return runs.map((r, i) => {
    const lats = r.latency_profiles?.[stepName] ?? []
    return {
      label: `#${runs.length - i}`,
      p50: pct(lats, 0.5),
      p95: pct(lats, 0.95),
      p99: pct(lats, 0.99),
    }
  }).reverse()
}

export default function Analytics() {
  const [runs, setRuns] = useState<Run[]>([])
  const [step, setStep] = useState('')

  useEffect(() => {
    api.runs.list().then(r => {
      const done = r.filter(x => x.status === 'done' || x.status === 'failed')
      setRuns(done)
      const steps = Array.from(new Set(done.flatMap(x => Object.keys(x.latency_profiles ?? {}))))
      if (steps.length && !step) setStep(steps[0])
    })
  }, [])

  const done = runs
  const allSteps = Array.from(new Set(done.flatMap(r => Object.keys(r.latency_profiles ?? {}))))
  const allLats = done.flatMap(r => r.latency_profiles?.[step] ?? [])

  const totalReqs = done.reduce((s, r) => s + (r.summary?.total ?? 0), 0)
  const totalFailed = done.reduce((s, r) => s + (r.summary?.failed ?? 0), 0)
  const errorRate = totalReqs ? ((totalFailed / totalReqs) * 100).toFixed(2) + '%' : '—'

  const thrData = done.slice(-10).map((r, i) => ({
    label: `#${i + 1}`,
    rps: r.summary?.throughput_rps ?? 0,
    failed: r.summary?.failed ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-text">ANALYTICS</h1>
          <p className="text-text-dim text-xs mt-1">
            Latency distribution and throughput across all completed runs
          </p>
        </div>
        {allSteps.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="label">Endpoint</span>
            <select
              value={step}
              onChange={e => setStep(e.target.value)}
              className="bg-surface border border-border text-text font-mono text-xs px-3 py-2
                         focus:outline-none focus:border-accent"
            >
              {allSteps.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {done.length === 0 ? (
        <div className="card flex items-center justify-center h-40 text-text-dim label">
          no completed runs — run a workflow from the dashboard
        </div>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Completed Runs"  value={done.length}                            />
            <MetricCard label="Error Rate"       value={errorRate}   danger={parseFloat(errorRate) > 5} />
            <MetricCard label={`P50 — ${step}`}  value={`${pct(allLats, 0.5).toFixed(0)}ms`}  accent />
            <MetricCard label={`P99 — ${step}`}  value={`${pct(allLats, 0.99).toFixed(0)}ms`}
                        warn={pct(allLats, 0.99) > 1000} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <LatencyChart
              data={aggregate(done, step)}
              title={`Latency Percentiles — ${step || 'all steps'}`}
            />
            <ThroughputChart data={thrData} title="Throughput & Errors per Run" />
          </div>

          {/* Per-endpoint breakdown table */}
          {allSteps.length > 1 && (
            <div className="card p-0">
              <div className="px-4 py-3 border-b border-border">
                <span className="label">Endpoint Breakdown</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Endpoint', 'Samples', 'Mean', 'P50', 'P95', 'P99', 'Min', 'Max'].map(h => (
                      <th key={h} className="label text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allSteps.map(sName => {
                    const lats = done.flatMap(r => r.latency_profiles?.[sName] ?? []).sort((a, b) => a - b)
                    const mean = lats.length ? lats.reduce((s, x) => s + x, 0) / lats.length : 0
                    return (
                      <tr key={sName} className="border-b border-border/50 hover:bg-panel">
                        <td className="px-4 py-3 font-mono text-text">{sName}</td>
                        <td className="px-4 py-3 mono tabular-nums text-text-dim">{lats.length}</td>
                        <td className="px-4 py-3 mono tabular-nums text-text">{mean.toFixed(1)}ms</td>
                        <td className="px-4 py-3 mono tabular-nums text-accent">{pct(lats, 0.5).toFixed(1)}ms</td>
                        <td className="px-4 py-3 mono tabular-nums text-warn">{pct(lats, 0.95).toFixed(1)}ms</td>
                        <td className="px-4 py-3 mono tabular-nums text-danger">{pct(lats, 0.99).toFixed(1)}ms</td>
                        <td className="px-4 py-3 mono tabular-nums text-text-dim">{(lats[0] ?? 0).toFixed(1)}ms</td>
                        <td className="px-4 py-3 mono tabular-nums text-text-dim">{(lats[lats.length - 1] ?? 0).toFixed(1)}ms</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
