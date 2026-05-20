import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { api } from '../api'
import type { Run } from '../types'

interface AnomalyRow {
  runId: string
  workflowName: string
  endpoint: string
  anomalyCount: number
  mean: number
  stdev: number
  zScore: number
  startedAt?: string
}

export default function Anomalies() {
  const [rows, setRows] = useState<AnomalyRow[]>([])

  useEffect(() => {
    api.runs.list().then(runs => {
      const out: AnomalyRow[] = []
      for (const run of runs) {
        if (!run.anomalies) continue
        for (const [endpoint, info] of Object.entries(run.anomalies)) {
          if (info.anomaly_count === 0) continue
          const maxZ = info.stdev > 0
            ? Math.max(
                ...info.anomaly_indices.map(i => {
                  const lat = run.latency_profiles?.[endpoint]?.[i] ?? info.mean
                  return Math.abs((lat - info.mean) / info.stdev)
                })
              )
            : 0
          out.push({
            runId: run.id,
            workflowName: run.workflow_name,
            endpoint,
            anomalyCount: info.anomaly_count,
            mean: info.mean,
            stdev: info.stdev,
            zScore: maxZ,
            startedAt: run.started_at,
          })
        }
      }
      setRows(out.sort((a, b) => b.zScore - a.zScore))
    })
  }, [])

  const maxZ = rows.length ? rows[0].zScore : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wider text-text">ANOMALY DETECTION</h1>
        <p className="text-text-dim text-xs mt-1">
          Z-score based statistical outlier detection across all endpoint latency profiles
        </p>
      </div>

      {/* Methodology note */}
      <div className="border border-border/50 bg-surface px-4 py-3 space-y-1">
        <span className="label text-accent">Detection Method</span>
        <p className="text-xs text-text-dim leading-relaxed">
          Each data point is scored as <span className="mono text-text">z = (x − μ) / σ</span> where μ is the
          per-endpoint mean latency and σ is the standard deviation. Points with{' '}
          <span className="mono text-text">|z| &gt; threshold</span> (default 2.0) are flagged.
          Requires ≥ 3 samples per endpoint.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center h-48 gap-3 text-accent">
          <CheckCircle size={32} />
          <span className="label">No anomalies detected across all runs</span>
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card space-y-2">
              <span className="label">Total Anomalies</span>
              <span className="font-mono text-2xl font-bold text-warn tabular-nums">
                {rows.reduce((s, r) => s + r.anomalyCount, 0)}
              </span>
            </div>
            <div className="card space-y-2">
              <span className="label">Affected Endpoints</span>
              <span className="font-mono text-2xl font-bold text-warn tabular-nums">
                {new Set(rows.map(r => r.endpoint)).size}
              </span>
            </div>
            <div className="card space-y-2">
              <span className="label">Peak Z-Score</span>
              <span className="font-mono text-2xl font-bold text-danger tabular-nums">
                {maxZ.toFixed(2)}σ
              </span>
            </div>
          </div>

          {/* Anomaly table */}
          <div className="card p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Run', 'Workflow', 'Endpoint', 'Anomalies', 'Mean Latency', 'Std Dev', 'Peak |Z|', 'Severity'].map(h => (
                    <th key={h} className="label text-left px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const severity = row.zScore > 4 ? 'CRITICAL' : row.zScore > 3 ? 'HIGH' : 'MODERATE'
                  const sevColor = row.zScore > 4 ? 'text-danger' : row.zScore > 3 ? 'text-warn' : 'text-text-dim'
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-panel">
                      <td className="px-4 py-3 font-mono text-text-dim">{row.runId}</td>
                      <td className="px-4 py-3 text-text">{row.workflowName}</td>
                      <td className="px-4 py-3 font-mono text-accent">{row.endpoint}</td>
                      <td className="px-4 py-3 mono tabular-nums text-warn font-bold">{row.anomalyCount}</td>
                      <td className="px-4 py-3 mono tabular-nums text-text">{row.mean.toFixed(1)}ms</td>
                      <td className="px-4 py-3 mono tabular-nums text-text-dim">±{row.stdev.toFixed(1)}ms</td>
                      <td className="px-4 py-3 mono tabular-nums text-danger font-bold">{row.zScore.toFixed(2)}σ</td>
                      <td className={`px-4 py-3 font-mono text-2xs font-bold tracking-wider ${sevColor}`}>
                        {severity}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Z-score bar visualizer */}
          <div className="card space-y-3">
            <span className="label">Z-Score Distribution by Endpoint</span>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="mono text-2xs text-text-dim">{row.endpoint}</span>
                    <span className="mono text-2xs text-danger">{row.zScore.toFixed(2)}σ</span>
                  </div>
                  <div className="h-1 bg-surface w-full overflow-hidden">
                    <div
                      className="h-full bg-danger transition-all duration-700"
                      style={{ width: `${Math.min((row.zScore / Math.max(maxZ, 1)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
