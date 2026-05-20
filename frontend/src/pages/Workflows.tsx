import { useEffect, useState } from 'react'
import { Plus, Trash2, Play, ChevronDown, ChevronRight } from 'lucide-react'
import { api } from '../api'
import type { Workflow, WorkflowStep } from '../types'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

function StepRow({ step, i }: { step: WorkflowStep; i: number }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border/50 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-2.5 hover:bg-panel cursor-pointer"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <ChevronDown size={12} className="text-muted" /> : <ChevronRight size={12} className="text-muted" />}
        <span className="font-mono text-2xs text-text-dim w-5 tabular-nums">{i + 1}</span>
        <span className={`font-mono text-2xs font-bold w-14 ${
          step.method === 'GET' ? 'text-accent' :
          step.method === 'POST' ? 'text-warn' : 'text-text-dim'
        }`}>{step.method}</span>
        <span className="font-mono text-xs text-text flex-1">{step.name}</span>
        <span className="font-mono text-2xs text-text-dim truncate max-w-[200px]">{step.url}</span>
        {step.expect_status && (
          <span className="font-mono text-2xs text-muted ml-2">{step.expect_status}</span>
        )}
      </div>
      {open && (
        <div className="px-10 pb-3 font-mono text-2xs text-text-dim space-y-1">
          <div><span className="text-muted">url:</span> {step.url}</div>
          {step.headers && Object.keys(step.headers).length > 0 && (
            <div><span className="text-muted">headers:</span> {JSON.stringify(step.headers)}</div>
          )}
          {step.body && (
            <div><span className="text-muted">body:</span> {JSON.stringify(step.body)}</div>
          )}
        </div>
      )}
    </div>
  )
}

function WorkflowCard({
  wf, onDelete, onRun
}: {
  wf: Workflow
  onDelete: () => void
  onRun: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card p-0">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <button onClick={() => setExpanded(e => !e)} className="text-muted hover:text-text">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="font-mono text-sm text-text font-bold truncate">{wf.name}</div>
          {wf.description && (
            <div className="text-2xs text-text-dim mt-0.5 truncate">{wf.description}</div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="label">{wf.steps.length} step{wf.steps.length !== 1 ? 's' : ''}</span>
          <button onClick={onRun} className="btn-primary flex items-center gap-1.5 py-1 px-3">
            <Play size={10} />Run
          </button>
          <button
            onClick={onDelete}
            className="text-text-dim hover:text-danger p-1 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      {expanded && (
        <div>
          {wf.steps.map((s, i) => <StepRow key={i} step={s} i={i} />)}
        </div>
      )}
    </div>
  )
}

const BLANK_STEP: WorkflowStep = {
  name: '', method: 'GET', url: '', headers: {}, expect_status: 200
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [showForm, setShowForm]   = useState(false)
  const [name, setName]           = useState('')
  const [desc, setDesc]           = useState('')
  const [baseUrl, setBaseUrl]     = useState('')
  const [steps, setSteps]         = useState<WorkflowStep[]>([{ ...BLANK_STEP }])
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  const load = () => api.workflows.list().then(setWorkflows)
  useEffect(() => { load() }, [])

  const addStep = () => setSteps(s => [...s, { ...BLANK_STEP }])
  const removeStep = (i: number) => setSteps(s => s.filter((_, j) => j !== i))
  const updateStep = (i: number, patch: Partial<WorkflowStep>) =>
    setSteps(s => s.map((step, j) => j === i ? { ...step, ...patch } : step))

  const save = async () => {
    if (!name.trim() || steps.some(s => !s.url.trim())) return
    setSaving(true)
    try {
      await api.workflows.create({ name, description: desc, steps })
      setShowForm(false); setName(''); setDesc(''); setSteps([{ ...BLANK_STEP }])
      load()
    } finally { setSaving(false) }
  }

  const runWf = async (id: string, wfName: string) => {
    await api.runs.trigger({ workflow_id: id, concurrency: 10, total_requests: 30 })
    setMsg(`Launched run for "${wfName}"`)
    setTimeout(() => setMsg(''), 3000)
  }

  const del = async (id: string) => {
    await api.workflows.delete(id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold tracking-wider text-text">WORKFLOWS</h1>
          <p className="text-text-dim text-xs mt-1">Define and manage API execution scenarios</p>
        </div>
        <button onClick={() => setShowForm(f => !f)} className="btn-primary flex items-center gap-2">
          <Plus size={12} />
          {showForm ? 'Cancel' : 'New Workflow'}
        </button>
      </div>

      {msg && (
        <div className="border border-accent/40 bg-accent-dim px-4 py-2 font-mono text-xs text-accent">
          {msg}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="card space-y-4">
          <span className="label">New Workflow</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="label">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-bg border border-border text-text font-mono text-xs px-3 py-2
                           focus:outline-none focus:border-accent"
                placeholder="my-api-workflow" />
            </div>
            <div className="space-y-1">
              <label className="label">Base URL</label>
              <input value={baseUrl} onChange={e => setBaseUrl(e.target.value)}
                className="w-full bg-bg border border-border text-text font-mono text-xs px-3 py-2
                           focus:outline-none focus:border-accent"
                placeholder="https://api.example.com" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="label">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full bg-bg border border-border text-text text-xs px-3 py-2
                         focus:outline-none focus:border-accent"
              placeholder="What does this workflow test?" />
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <span className="label">Steps</span>
            {steps.map((step, i) => (
              <div key={i} className="border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-2xs text-muted w-4">{i + 1}</span>
                  <select value={step.method} onChange={e => updateStep(i, { method: e.target.value })}
                    className="bg-bg border border-border text-warn font-mono text-xs px-2 py-1
                               focus:outline-none focus:border-accent w-24">
                    {METHODS.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <input value={step.name} onChange={e => updateStep(i, { name: e.target.value })}
                    className="flex-1 bg-bg border border-border text-text font-mono text-xs px-2 py-1
                               focus:outline-none focus:border-accent"
                    placeholder="step name" />
                  <button onClick={() => removeStep(i)} className="text-text-dim hover:text-danger">
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <input value={step.url} onChange={e => updateStep(i, { url: e.target.value })}
                    className="flex-1 bg-bg border border-border text-text-dim font-mono text-xs px-2 py-1
                               focus:outline-none focus:border-accent"
                    placeholder="/endpoint or full URL" />
                  <input
                    type="number"
                    value={step.expect_status ?? 200}
                    onChange={e => updateStep(i, { expect_status: parseInt(e.target.value) })}
                    className="w-20 bg-bg border border-border text-muted font-mono text-xs px-2 py-1
                               focus:outline-none focus:border-accent"
                    placeholder="200"
                  />
                </div>
              </div>
            ))}
            <button onClick={addStep} className="btn-ghost w-full flex items-center justify-center gap-2">
              <Plus size={12} />Add Step
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost">Cancel</button>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : 'Save Workflow'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {workflows.length === 0 ? (
          <div className="card flex items-center justify-center h-32 text-text-dim label">
            no workflows — create one above
          </div>
        ) : (
          workflows.map(wf => (
            <WorkflowCard
              key={wf.id}
              wf={wf}
              onDelete={() => del(wf.id)}
              onRun={() => runWf(wf.id, wf.name)}
            />
          ))
        )}
      </div>
    </div>
  )
}
