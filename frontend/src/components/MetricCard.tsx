interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
  danger?: boolean
  warn?: boolean
}

export default function MetricCard({ label, value, sub, accent, danger, warn }: Props) {
  const valueColor = danger
    ? 'text-danger'
    : warn
    ? 'text-warn'
    : accent
    ? 'text-accent'
    : 'text-text'

  return (
    <div className="card flex flex-col gap-2 min-w-0">
      <span className="label">{label}</span>
      <span className={`font-mono text-2xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </span>
      {sub && <span className="text-2xs text-text-dim mono">{sub}</span>}
    </div>
  )
}
