import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

interface DataPoint { label: string; rps: number; failed: number }
interface Props { data: DataPoint[]; title?: string }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-surface border border-border px-3 py-2 font-mono text-xs space-y-1">
      <p className="text-text-dim label mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.dataKey === 'rps' ? 'THROUGHPUT' : 'FAILED'}: {p.value?.toFixed(1)}
          {p.dataKey === 'rps' ? ' rps' : ''}
        </p>
      ))}
    </div>
  )
}

export default function ThroughputChart({ data, title }: Props) {
  return (
    <div className="card flex flex-col gap-3">
      {title && <span className="label">{title}</span>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="0" stroke="#14243a" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: '#3a5a7a', fontSize: 10, fontFamily: 'Space Mono' }} />
          <YAxis tick={{ fill: '#3a5a7a', fontSize: 10, fontFamily: 'Space Mono' }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="rps"    fill="#00d4a8" opacity={0.8} radius={[2, 2, 0, 0]} />
          <Bar dataKey="failed" fill="#ff3355" opacity={0.7} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
