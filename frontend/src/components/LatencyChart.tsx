import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts'

interface DataPoint {
  label: string
  p50: number
  p95: number
  p99: number
}

interface Props { data: DataPoint[]; title?: string }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border px-3 py-2 font-mono text-xs space-y-1">
      <p className="text-text-dim label mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey.toUpperCase()}: {p.value?.toFixed(1)}ms
        </p>
      ))}
    </div>
  )
}

export default function LatencyChart({ data, title }: Props) {
  return (
    <div className="card flex flex-col gap-3">
      {title && <span className="label">{title}</span>}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="gP50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4a8" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00d4a8" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gP95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffb020" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ffb020" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gP99" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff3355" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ff3355" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="0" stroke="#14243a" />
          <XAxis dataKey="label" tick={{ fill: '#3a5a7a', fontSize: 10, fontFamily: 'Space Mono' }} />
          <YAxis tick={{ fill: '#3a5a7a', fontSize: 10, fontFamily: 'Space Mono' }} unit="ms" />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(v) => <span className="label">{v}</span>}
            wrapperStyle={{ paddingTop: 8 }}
          />
          <Area type="monotone" dataKey="p50" stroke="#00d4a8" fill="url(#gP50)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="p95" stroke="#ffb020" fill="url(#gP95)" strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="p99" stroke="#ff3355" fill="url(#gP99)" strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
