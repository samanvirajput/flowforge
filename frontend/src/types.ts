export interface WorkflowStep {
  name: string
  method: string
  url: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  expect_status?: number
  extract?: Record<string, string>
}

export interface Workflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  created_at: string
}

export interface RunSummary {
  total: number
  succeeded: number
  failed: number
  duration_s: number
  throughput_rps: number
  error?: string
}

export interface AnomalyInfo {
  mean: number
  stdev: number
  anomaly_count: number
  anomaly_indices: number[]
}

export interface Run {
  id: string
  workflow_id: string
  workflow_name: string
  status: 'pending' | 'running' | 'done' | 'failed'
  concurrency: number
  total_requests: number
  ramp_duration: number
  z_threshold: number
  summary?: RunSummary
  latency_profiles?: Record<string, number[]>
  anomalies?: Record<string, AnomalyInfo>
  started_at?: string
  finished_at?: string
}

export interface SimRule {
  endpoint: string
  latency_ms: number
  error_rate: number
  forced_status?: number
  timeout_rate: number
}
