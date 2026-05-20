import type { Run } from '../types'

interface Props { runs: Run[]; onSelect?: (r: Run) => void }

function StatusBadge({ status }: { status: Run['status'] }) {
  const cfg = {
    pending: { dot: 'dot-dead',  text: 'text-muted',    label: 'PENDING' },
    running: { dot: 'dot-live',  text: 'text-accent',   label: 'RUNNING' },
    done:    { dot: 'bg-accent', text: 'text-accent',   label: 'DONE'    },
    failed:  { dot: 'bg-danger', text: 'text-danger',   label: 'FAILED'  },
  }[status]

  return (
    <span className={`flex items-center gap-1.5 font-mono text-2xs ${cfg.text}`}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${
        status === 'running' ? 'dot-live' : cfg.dot
      }`} />
      {cfg.label}
    </span>
  )
}

function pct(run: Run) {
  if (!run.summary || !run.summary.total) return '—'
  return ((run.summary.succeeded / run.summary.total) * 100).toFixed(1) + '%'
}

export default function RunsTable({ runs, onSelect }: Props) {
  if (runs.length === 0) {
    return (
      <div className="card flex items-center justify-center h-32 text-text-dim label">
        no runs yet
      </div>
    )
  }

  return (
    <div className="card overflow-x-auto p-0">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {['Run ID', 'Workflow', 'Status', 'Success %', 'Throughput', 'Duration', 'Anomalies'].map(h => (
              <th key={h} className="label text-left px-4 py-3">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, i) => {
            const totalAnomalies = run.anomalies
              ? Object.values(run.anomalies).reduce((s, a) => s + a.anomaly_count, 0)
              : 0

            return (
              <tr
                key={run.id}
                className={`border-b border-border/50 hover:bg-panel transition-colors duration-100
                            ${onSelect ? 'cursor-pointer' : ''}`}
                onClick={() => onSelect?.(run)}
              >
                <td className="px-4 py-3 font-mono text-text-dim">{run.id}</td>
                <td className="px-4 py-3 text-text">{run.workflow_name}</td>
                <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                <td className={`px-4 py-3 mono tabular-nums ${
                  run.summary?.failed ? 'text-danger' : 'text-accent'
                }`}>
                  {pct(run)}
                </td>
                <td className="px-4 py-3 mono tabular-nums text-text">
                  {run.summary ? `${run.summary.throughput_rps.toFixed(1)} rps` : '—'}
                </td>
                <td className="px-4 py-3 mono tabular-nums text-text-dim">
                  {run.summary ? `${run.summary.duration_s.toFixed(2)}s` : '—'}
                </td>
                <td className={`px-4 py-3 mono tabular-nums ${totalAnomalies > 0 ? 'text-warn' : 'text-text-dim'}`}>
                  {run.status === 'done' || run.status === 'failed' ? totalAnomalies : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
