import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  FileCode2,
  FileJson,
  GitBranch,
  GitPullRequest,
  Play,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Terminal,
  Upload,
} from 'lucide-react'
import clsx from 'clsx'
import { runs as defaultRuns, type ActionType, type AgentRun, type TraceAction } from './data/mockTrace'
import { validateTraceFile } from './lib/traceValidation'

const actionMeta: Record<ActionType, { label: string; icon: typeof FileCode2; tone: string }> = {
  read_file: { label: 'Read', icon: FileCode2, tone: 'text-sky-300 bg-sky-400/10 border-sky-400/20' },
  edit_file: { label: 'Edit', icon: Code2, tone: 'text-amber-300 bg-amber-400/10 border-amber-400/20' },
  run_command: { label: 'Command', icon: Terminal, tone: 'text-violet-300 bg-violet-400/10 border-violet-400/20' },
  test_failed: { label: 'Failed', icon: AlertTriangle, tone: 'text-rose-300 bg-rose-400/10 border-rose-400/20' },
  test_passed: { label: 'Passed', icon: CheckCircle2, tone: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/20' },
  generate_summary: { label: 'Summary', icon: ScrollText, tone: 'text-cyan-300 bg-cyan-400/10 border-cyan-400/20' },
}

function App() {
  const [runs, setRuns] = useState<AgentRun[]>(defaultRuns)
  const [activeRunId, setActiveRunId] = useState(runs[0].id)
  const [importError, setImportError] = useState<string | null>(null)
  const [traceSource, setTraceSource] = useState('examples/auth-fix.trace.json')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeRun = runs.find((run) => run.id === activeRunId) ?? runs[0]
  const [activeActionId, setActiveActionId] = useState(activeRun.actions[0]?.id ?? '')
  const activeAction = useMemo(() => {
    if (!activeRun.actions.length) return undefined
    return activeRun.actions.find((action) => action.id === activeActionId) ?? activeRun.actions[0]
  }, [activeActionId, activeRun])

  const selectRun = (runId: string) => {
    const nextRun = runs.find((run) => run.id === runId)
    setActiveRunId(runId)
    setActiveActionId(nextRun?.actions[0]?.id ?? '')
  }

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportError(null)

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string)

        const result = validateTraceFile(raw)
        if (!result.ok) {
          setImportError(result.message)
          return
        }

        setRuns(result.runs)
        setTraceSource(file.name)
        setActiveRunId(result.runs[0].id)
        setActiveActionId(result.runs[0].actions?.[0]?.id ?? '')
      } catch {
        setImportError('Failed to parse the file as JSON. Check the file and try again.')
      }
    }

    reader.onerror = () => {
      setImportError('Failed to read the file. Try again or use a different file.')
    }

    reader.readAsText(file)

    // Reset input so the same file can be re-imported
    e.target.value = ''
  }, [])

  const selectedMeta = activeAction ? actionMeta[activeAction.type] : undefined
  const SelectedIcon = selectedMeta?.icon ?? Bot

  return (
    <main className="min-h-screen bg-[#07090d] text-slate-200">
      <header className="border-b border-white/10 bg-[#0b0f16]/95 px-5 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-300/25 bg-cyan-300/10">
              <Bot className="h-5 w-5 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-white">AgentScope</h1>
                <span className="flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-px text-[10px] text-slate-500">
                  <FileJson className="h-3 w-3" />
                  {traceSource}
                </span>
              </div>
              <p className="text-xs text-slate-400">Visual trace viewer for AI coding agents</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Metric icon={ShieldCheck} label="Trust" value={`${activeRun.trustScore}%`} tone="text-emerald-200" />
              <Metric icon={CheckCircle2} label="Tests" value={activeRun.status} tone="text-cyan-200" />
              <Metric icon={FileCode2} label="Files" value={String(activeRun.filesChanged)} tone="text-amber-200" />
              <Metric icon={Clock3} label="Duration" value={activeRun.duration} tone="text-violet-200" />
            </div>

            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.08] transition"
              title="Import a .json trace file"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>

        {importError && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1">{importError}</div>
            <button
              onClick={() => setImportError(null)}
              className="text-rose-400 hover:text-rose-300 shrink-0 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}
      </header>

      <section className="grid min-h-[calc(100vh-66px)] grid-cols-1 xl:grid-cols-[300px_minmax(420px,1fr)_380px]">
        <aside className="border-b border-white/10 bg-[#0a0d13] p-4 xl:border-b-0 xl:border-r">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Agent runs</span>
            <button className="rounded border border-white/10 p-1.5 text-slate-300 hover:bg-white/5" title="Replay run">
              <Play className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {runs.map((run) => (
              <button
                key={run.id}
                className={clsx(
                  'w-full rounded-md border p-3 text-left transition',
                  run.id === activeRun.id
                    ? 'border-cyan-300/35 bg-cyan-300/10'
                    : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.06]',
                )}
                onClick={() => selectRun(run.id)}
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <span className="text-sm font-medium leading-5 text-slate-100">{run.title}</span>
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span className="truncate">{run.branch}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500">{run.startedAt}</span>
                  <span
                    className={clsx(
                      'font-medium',
                      run.status === 'passed' && 'text-emerald-300',
                      run.status === 'warning' && 'text-amber-300',
                      run.status === 'failed' && 'text-rose-300',
                    )}
                  >
                    {run.trustScore}% trust
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-[620px] flex-col bg-[#080b11]">
          <div className="border-b border-white/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>{activeRun.agent}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span>{activeRun.commands} commands</span>
                  <span className="h-1 w-1 rounded-full bg-slate-600" />
                  <span>{activeRun.cost} estimated</span>
                </div>
                <h2 className="text-xl font-semibold text-white">{activeRun.title}</h2>
              </div>
              <button className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-200 hover:bg-white/[0.08]">
                <GitPullRequest className="h-4 w-4" />
                Export PR report
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {activeRun.actions.length ? (
              <div className="relative space-y-3">
                <div className="absolute left-[21px] top-8 h-[calc(100%-48px)] w-px bg-white/10" />
                {activeRun.actions.map((action) => {
                  const meta = actionMeta[action.type]
                  const Icon = meta.icon
                  return (
                    <button
                      key={action.id}
                      onClick={() => setActiveActionId(action.id)}
                      className={clsx(
                        'relative grid w-full grid-cols-[44px_1fr] rounded-md border p-3 text-left transition',
                        activeAction?.id === action.id
                          ? 'border-cyan-300/35 bg-cyan-300/[0.08]'
                          : 'border-white/10 bg-white/[0.025] hover:bg-white/[0.055]',
                      )}
                    >
                      <div className={clsx('z-10 flex h-9 w-9 items-center justify-center rounded-md border', meta.tone)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{meta.label}</span>
                            <span className="truncate text-sm font-medium text-slate-100">{action.title}</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {action.timestamp} / {action.duration}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-400">{action.summary}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {action.file && <Chip>{action.file}</Chip>}
                          {action.command && <Chip>{action.command}</Chip>}
                          <RiskBadge risk={action.risk} />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center rounded-md border border-dashed border-white/10 text-center">
                <div>
                  <Sparkles className="mx-auto mb-3 h-6 w-6 text-slate-500" />
                  <p className="text-sm font-medium text-slate-300">No trace data recorded</p>
                  <p className="mt-1 text-xs text-slate-500">This run has no recorded actions yet. Connect a recorder to capture trace data.</p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 bg-[#06080c] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Terminal className="h-4 w-4" />
              Output
            </div>
            <pre className="max-h-44 overflow-auto rounded-md border border-white/10 bg-black/40 p-4 text-xs leading-6 text-slate-300">
              {activeAction?.diff ??
                activeAction?.output ??
                'Select an action to inspect command output, generated summaries, and code diffs.'}
            </pre>
          </div>
        </section>

        <aside className="border-t border-white/10 bg-[#0a0d13] p-5 xl:border-l xl:border-t-0">
          <div className="mb-5 flex items-start gap-3">
            <div className={clsx('flex h-10 w-10 items-center justify-center rounded-md border', selectedMeta?.tone)}>
              <SelectedIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Selected action</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{activeAction?.title ?? 'No action selected'}</h3>
            </div>
          </div>

          {activeAction && (
            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                <p className="text-sm leading-6 text-slate-300">{activeAction.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Info label="Time" value={activeAction.timestamp} />
                <Info label="Duration" value={activeAction.duration} />
                <Info label="Type" value={actionMeta[activeAction.type].label} />
                <Info label="Risk" value={activeAction.risk} />
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Evidence</p>
                <div className="space-y-2">
                  {activeAction.details.map((detail) => (
                    <div key={detail} className="rounded-md border border-white/10 bg-white/[0.025] p-3 text-sm leading-6 text-slate-300">
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof ShieldCheck; label: string; value: string; tone: string }) {
  return (
    <div className="flex min-w-32 items-center gap-2 rounded-md border border-white/10 bg-white/[0.035] px-3 py-2">
      <Icon className={clsx('h-4 w-4', tone)} />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-semibold capitalize text-slate-100">{value}</p>
      </div>
    </div>
  )
}

function RiskBadge({ risk }: { risk: TraceAction['risk'] }) {
  return (
    <span
      className={clsx(
        'rounded border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        risk === 'high' && 'border-rose-400/30 bg-rose-400/10 text-rose-200',
        risk === 'medium' && 'border-amber-400/30 bg-amber-400/10 text-amber-200',
        risk === 'low' && 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
      )}
    >
      {risk} risk
    </span>
  )
}

function Chip({ children }: { children: string }) {
  return (
    <span className="max-w-full truncate rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs text-slate-400">
      {children}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize text-slate-200">{value}</p>
    </div>
  )
}

export default App
