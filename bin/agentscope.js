#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cwd, exit, argv, platform } from 'node:process'

const SCHEMA_VERSION = '1.0.0'

function printHelp() {
  console.log(`AgentScope CLI

Usage:
  npm run agentscope -- record -- <command> [args...]
  npm run agentscope -- validate <trace-file>
  npm run agentscope -- import-jsonl <input.jsonl>
  npm run agentscope -- import-session <input.json>
  npm run agentscope -- summarize --input <trace-file> [--dry-run] [--marker <marker>]

Examples:
  npm run agentscope -- record -- npm run lint
  npm run agentscope -- record -- npm run build
  npm run agentscope -- validate .agentscope/example.trace.json
  npm run agentscope -- import-jsonl examples/generic-agent.jsonl
  npm run agentscope -- import-session examples/agent-session.json
  npm run agentscope -- summarize --input examples/auth-fix.trace.json --dry-run
`)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`

  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

function timestampForFile(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function timeOfDay(date) {
  return [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(':')
}

function getGitBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value) {
  return typeof value === 'string'
}

function isNumber(value) {
  return typeof value === 'number' && !Number.isNaN(value)
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => isString(item))
}

const validStatuses = new Set(['passed', 'failed', 'warning'])
const validActionTypes = new Set([
  'read_file',
  'edit_file',
  'run_command',
  'test_failed',
  'test_passed',
  'generate_summary',
])
const validRisks = new Set(['low', 'medium', 'high'])

function validateAction(action, runIndex, actionIndex) {
  const prefix = `Run [${runIndex}], action [${actionIndex}]`

  if (!isObject(action)) return `${prefix}: expected an object.`

  for (const field of ['id', 'type', 'title', 'timestamp', 'duration', 'risk', 'summary']) {
    if (!isString(action[field]) || action[field].length === 0) {
      return `${prefix}: missing or invalid required field "${field}".`
    }
  }

  if (!validActionTypes.has(action.type)) {
    return `${prefix}: invalid "type" "${action.type}".`
  }

  if (!validRisks.has(action.risk)) {
    return `${prefix}: invalid "risk" "${action.risk}".`
  }

  if (!isStringArray(action.details)) {
    return `${prefix}: "details" must be an array of strings.`
  }

  for (const field of ['file', 'command', 'output', 'diff']) {
    if (action[field] !== undefined && !isString(action[field])) {
      return `${prefix}: optional field "${field}" must be a string if provided.`
    }
  }

  return null
}

function validateRun(run, runIndex) {
  if (!isObject(run)) return `Run [${runIndex}]: expected an object.`

  for (const field of ['id', 'title', 'agent', 'branch', 'status', 'startedAt', 'duration', 'cost']) {
    if (!isString(run[field]) || run[field].length === 0) {
      return `Run [${runIndex}]: missing or invalid required field "${field}".`
    }
  }

  if (!validStatuses.has(run.status)) {
    return `Run [${runIndex}]: invalid "status" "${run.status}".`
  }

  if (!isNumber(run.trustScore) || run.trustScore < 0 || run.trustScore > 100) {
    return `Run [${runIndex}]: "trustScore" must be a number from 0 to 100.`
  }

  if (!isNumber(run.filesChanged) || run.filesChanged < 0) {
    return `Run [${runIndex}]: "filesChanged" must be a non-negative number.`
  }

  if (!isNumber(run.commands) || run.commands < 0) {
    return `Run [${runIndex}]: "commands" must be a non-negative number.`
  }

  if (!Array.isArray(run.actions)) {
    return `Run [${runIndex}]: "actions" must be an array.`
  }

  for (let actionIndex = 0; actionIndex < run.actions.length; actionIndex += 1) {
    const error = validateAction(run.actions[actionIndex], runIndex, actionIndex)
    if (error) return error
  }

  return null
}

function collectRunQualityWarnings(run, runIndex) {
  const prefix = `Run [${runIndex + 1}]`
  const warnings = []
  const actions = run.actions

  const edits = actions.filter((action) => action.type === 'edit_file')
  const verificationActions = actions.filter((action) =>
    action.type === 'run_command' || action.type === 'test_failed' || action.type === 'test_passed',
  )

  if (edits.length > 0 && verificationActions.length === 0) {
    warnings.push(`${prefix}: Run has ${edits.length} edit(s) but no verification command was run.`)
  }

  const firstFailedTestIndex = actions.findIndex((action) => action.type === 'test_failed')
  if (
    firstFailedTestIndex !== -1 &&
    !actions.slice(firstFailedTestIndex + 1).some((action) => action.type === 'test_passed')
  ) {
    warnings.push(`${prefix}: Run has failed test(s) with no later passing test.`)
  }

  const highRiskEditsWithoutEvidence = edits.filter((action) =>
    action.risk === 'high' && action.details.length === 0,
  )
  if (highRiskEditsWithoutEvidence.length > 0) {
    warnings.push(`${prefix}: Run has high-risk edit(s) with no evidence notes.`)
  }

  return warnings
}

function collectTraceQualityWarnings(trace) {
  return trace.runs.flatMap((run, runIndex) => collectRunQualityWarnings(run, runIndex))
}

function validateTraceObject(raw) {
  if (!isObject(raw)) {
    return { ok: false, message: 'Invalid trace: expected a JSON object at the top level.', warnings: [] }
  }

  if (raw.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, message: `Invalid trace: expected schemaVersion "${SCHEMA_VERSION}".`, warnings: [] }
  }

  if (!Array.isArray(raw.runs)) {
    return { ok: false, message: 'Invalid trace: missing "runs" array.', warnings: [] }
  }

  if (raw.runs.length === 0) {
    return { ok: false, message: 'Invalid trace: the "runs" array is empty.', warnings: [] }
  }

  for (let runIndex = 0; runIndex < raw.runs.length; runIndex += 1) {
    const error = validateRun(raw.runs[runIndex], runIndex)
    if (error) return { ok: false, message: error, warnings: [] }
  }

  return { ok: true, warnings: collectTraceQualityWarnings(raw) }
}

function buildTrace({ commandText, startedAt, duration, exitCode, stdout, stderr }) {
  const passed = exitCode === 0
  const output = [
    stdout.trim() && `stdout:\n${stdout.trim()}`,
    stderr.trim() && `stderr:\n${stderr.trim()}`,
  ].filter(Boolean).join('\n\n')

  return {
    schemaVersion: SCHEMA_VERSION,
    runs: [
      {
        id: `run-cli-${timestampForFile(startedAt)}`,
        title: `Record command: ${commandText}`,
        agent: 'AgentScope CLI',
        branch: getGitBranch(),
        status: passed ? 'passed' : 'failed',
        trustScore: passed ? 85 : 35,
        startedAt: startedAt.toISOString(),
        duration,
        cost: '$0.00',
        filesChanged: 0,
        commands: 1,
        actions: [
          {
            id: 'a1',
            type: passed ? 'test_passed' : 'test_failed',
            title: passed ? 'Command completed successfully' : 'Command failed',
            command: commandText,
            timestamp: timeOfDay(startedAt),
            duration,
            risk: passed ? 'low' : 'medium',
            summary: passed
              ? 'The recorded command completed with exit code 0.'
              : `The recorded command failed with exit code ${exitCode}.`,
            details: [
              `Working directory: ${cwd()}`,
              `Git branch: ${getGitBranch()}`,
              `Exit code: ${exitCode}`,
            ],
            output: output || '(no output captured)',
          },
        ],
      },
    ],
  }
}

function writeTrace(trace, startedAt) {
  const outDir = join(cwd(), '.agentscope')
  mkdirSync(outDir, { recursive: true })

  const baseName = timestampForFile(startedAt)
  let outPath = join(outDir, `${baseName}.trace.json`)
  let suffix = 2
  while (existsSync(outPath)) {
    outPath = join(outDir, `${baseName}-${suffix}.trace.json`)
    suffix += 1
  }

  writeFileSync(outPath, `${JSON.stringify(trace, null, 2)}\n`, 'utf8')
  return outPath
}

function record(commandArgs) {
  if (commandArgs.length === 0) {
    console.error('Missing command. Use: npm run agentscope -- record -- <command>')
    exit(1)
  }

  const [command, ...args] = commandArgs
  const commandText = [command, ...args].join(' ')
  const startedAt = new Date()
  const startMs = Date.now()
  let stdout = ''
  let stderr = ''

  const child = platform === 'win32'
    ? spawn(commandText, [], { cwd: cwd(), env: process.env, shell: true })
    : spawn(command, args, { cwd: cwd(), env: process.env })

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString()
    process.stdout.write(chunk)
  })

  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString()
    process.stderr.write(chunk)
  })

  child.on('error', (error) => {
    stderr += `${error.message}\n`
  })

  child.on('close', (code) => {
    const exitCode = code ?? 1
    const duration = formatDuration(Date.now() - startMs)
    const trace = buildTrace({
      commandText,
      startedAt,
      duration,
      exitCode,
      stdout,
      stderr,
    })
    const result = validateTraceObject(trace)
    if (!result.ok) {
      console.error(`Recorded trace failed validation: ${result.message}`)
    }
    const outPath = writeTrace(trace, startedAt)

    console.log(`\nAgentScope trace written to ${outPath}`)
    exit(exitCode)
  })
}

function importJsonl(jsonlPath) {
  if (!jsonlPath) {
    console.error('Missing input file. Use: npm run agentscope -- import-jsonl <input.jsonl>')
    exit(1)
  }

  const startedAt = new Date()
  const defaultTimestamp = timeOfDay(startedAt)
  let raw
  try {
    raw = readFileSync(jsonlPath, 'utf8').replace(/^\uFEFF/, '')
  } catch (error) {
    console.error(`Failed to read "${jsonlPath}": ${error.message}`)
    exit(1)
  }

  const lines = raw.split(/\r?\n/)
  const actions = []

  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1
    const trimmed = lines[i].trim()
    if (trimmed.length === 0) continue

    let entry
    try {
      entry = JSON.parse(trimmed)
    } catch {
      console.error(`Line ${lineNumber}: invalid JSON.`)
      exit(1)
    }

    if (!isObject(entry)) {
      console.error(`Line ${lineNumber}: expected a JSON object.`)
      exit(1)
    }

    if (!isString(entry.type) || !validActionTypes.has(entry.type)) {
      console.error(`Line ${lineNumber}: missing or invalid "type". Must be one of: ${[...validActionTypes].join(', ')}.`)
      exit(1)
    }

    const title = isString(entry.title) && entry.title.length > 0 ? entry.title : 'Untitled action'

    actions.push({
      id: `a${actions.length + 1}`,
      type: entry.type,
      title,
      timestamp: isString(entry.timestamp) && entry.timestamp.length > 0 ? entry.timestamp : defaultTimestamp,
      duration: isString(entry.duration) && entry.duration.length > 0 ? entry.duration : '0s',
      risk: isString(entry.risk) && validRisks.has(entry.risk) ? entry.risk : 'low',
      summary: isString(entry.summary) && entry.summary.length > 0 ? entry.summary : title,
      details: isStringArray(entry.details) ? entry.details : [],
      file: isString(entry.file) ? entry.file : undefined,
      command: isString(entry.command) ? entry.command : undefined,
      output: isString(entry.output) ? entry.output : undefined,
      diff: isString(entry.diff) ? entry.diff : undefined,
    })
  }

  if (actions.length === 0) {
    console.error('No valid actions found. The file is empty or contains only blank lines.')
    exit(1)
  }

  // Infer run metadata
  const hasFailed = actions.some(a => a.type === 'test_failed')
  const hasPassed = actions.some(a => a.type === 'test_passed')
  const status = hasFailed ? 'failed' : hasPassed ? 'passed' : 'warning'
  const trustScore = status === 'passed' ? 85 : status === 'failed' ? 35 : 60

  const uniqueFiles = new Set()
  let commandCount = 0
  for (const a of actions) {
    if (a.type === 'edit_file' && a.file) uniqueFiles.add(a.file)
    if (a.type === 'run_command' || a.type === 'test_failed' || a.type === 'test_passed') {
      commandCount++
    }
  }

  const fileName = jsonlPath.replace(/^.*[\\/]/, '')
  const trace = {
    schemaVersion: SCHEMA_VERSION,
    runs: [
      {
        id: `run-jsonl-${timestampForFile(startedAt)}`,
        title: `Import JSONL trace: ${fileName}`,
        agent: 'Generic JSONL',
        branch: getGitBranch(),
        status,
        trustScore,
        startedAt: startedAt.toISOString(),
        duration: '0s',
        cost: '$0.00',
        filesChanged: uniqueFiles.size,
        commands: commandCount,
        actions,
      },
    ],
  }

  const result = validateTraceObject(trace)
  if (!result.ok) {
    console.error(result.message)
    exit(1)
  }

  const outPath = writeTrace(trace, startedAt)
  console.log(`AgentScope trace written to ${outPath}`)
}

function readPath(source, path) {
  let current = source
  for (const key of path) {
    if (!isObject(current) && !Array.isArray(current)) return undefined
    current = current[key]
  }
  return current
}

function readFirstString(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path)
    if (isString(value) && value.length > 0) return value
  }
  return undefined
}

function readFirstNumber(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path)
    if (isNumber(value)) return value
  }
  return undefined
}

function readFirstObject(source, paths) {
  for (const path of paths) {
    const value = readPath(source, path)
    if (isObject(value)) return value
  }
  return {}
}

function stringifyContent(value) {
  if (value === undefined || value === null) return ''
  if (isString(value)) return value
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isString(item)) return item
      if (isObject(item)) return readFirstString(item, [['text'], ['content'], ['message']]) ?? ''
      return ''
    }).filter(Boolean).join('\n')
  }
  if (isObject(value)) {
    return readFirstString(value, [['text'], ['content'], ['message'], ['output']]) ?? JSON.stringify(value)
  }
  return String(value)
}

function compactWhitespace(value) {
  return value.replace(/\s+/g, ' ').trim()
}

function getSessionEntries(raw) {
  if (Array.isArray(raw)) return raw

  for (const field of ['events', 'messages', 'actions', 'entries', 'toolCalls', 'tool_calls', 'steps']) {
    if (Array.isArray(raw[field])) return raw[field]
  }

  return []
}

function inferSessionAgent(raw, entries) {
  const explicit = readFirstString(raw, [['agent'], ['metadata', 'agent'], ['source'], ['model'], ['session', 'agent']])
  if (explicit) return explicit

  const sample = JSON.stringify(entries.slice(0, 8)).toLowerCase()
  if (sample.includes('claude')) return 'Claude Code'
  if (sample.includes('codex')) return 'Codex'
  return 'Agent Session'
}

function inferSessionStatus(actions) {
  const hasFailed = actions.some(a => a.type === 'test_failed')
  const hasPassed = actions.some(a => a.type === 'test_passed')
  return hasFailed ? 'failed' : hasPassed ? 'passed' : 'warning'
}

function normalizeSessionEntry(entry, index, defaultTimestamp) {
  if (!isObject(entry)) return null

  const input = readFirstObject(entry, [['input'], ['tool_input'], ['arguments'], ['args'], ['params'], ['request']])
  const result = readFirstObject(entry, [['result'], ['response'], ['tool_result']])
  const toolName = readFirstString(entry, [
    ['tool'],
    ['toolName'],
    ['tool_name'],
    ['name'],
    ['type'],
    ['action'],
    ['function', 'name'],
  ]) ?? ''
  const title = readFirstString(entry, [
    ['title'],
    ['summary'],
    ['message'],
    ['content', 'title'],
  ]) ?? toolName
  const file = readFirstString(entry, [
    ['file'],
    ['path'],
    ['file_path'],
    ['filepath'],
    ['target_file'],
    ['input', 'file'],
    ['input', 'path'],
    ['input', 'file_path'],
    ['tool_input', 'file_path'],
    ['arguments', 'file_path'],
    ['params', 'file'],
  ]) ?? readFirstString(input, [['file'], ['path'], ['file_path'], ['filepath'], ['target_file']])
  const command = readFirstString(entry, [
    ['command'],
    ['cmd'],
    ['input', 'command'],
    ['tool_input', 'command'],
    ['arguments', 'command'],
    ['params', 'command'],
  ]) ?? readFirstString(input, [['command'], ['cmd'], ['script']])
  const diff = readFirstString(entry, [
    ['diff'],
    ['patch'],
    ['input', 'diff'],
    ['input', 'patch'],
    ['tool_input', 'patch'],
    ['arguments', 'patch'],
  ]) ?? readFirstString(input, [['diff'], ['patch']])

  const output = [
    stringifyContent(readPath(entry, ['output'])),
    stringifyContent(readPath(entry, ['stdout'])),
    stringifyContent(readPath(entry, ['stderr'])),
    stringifyContent(readPath(entry, ['content'])),
    Object.keys(result).length > 0 ? stringifyContent(result) : '',
  ].filter(Boolean).join('\n').trim()

  const source = [
    toolName,
    title,
    file,
    command,
    output.slice(0, 500),
  ].filter(Boolean).join(' ').toLowerCase()

  let type = ''
  if (source.match(/\b(summary|summarize|report|wrap[-_ ]?up)\b/)) {
    type = 'generate_summary'
  } else if (source.match(/\b(read|view|open|cat|glob|grep|search)\b/) && file) {
    type = 'read_file'
  } else if (source.match(/\b(edit|write|replace|patch|multi[_-]?edit|apply_patch)\b/) || diff) {
    type = 'edit_file'
  } else if (source.match(/\b(bash|shell|terminal|exec|command|run_command)\b/) || command) {
    const failed = source.match(/\b(fail|failed|failure|error|exit code 1|exit_code\":1)\b/)
    const passed = source.match(/\b(pass|passed|success|succeeded|exit code 0|exit_code\":0)\b/)
    const looksLikeTest = source.match(/\b(test|vitest|jest|pytest|typecheck|lint|check)\b/)
    type = failed && looksLikeTest ? 'test_failed' : passed && looksLikeTest ? 'test_passed' : 'run_command'
  }

  if (!type) return null

  const timestamp = readFirstString(entry, [['timestamp'], ['time'], ['startedAt'], ['started_at'], ['created_at']]) ?? defaultTimestamp
  const duration = readFirstString(entry, [['duration'], ['elapsed'], ['duration_ms']])
    ?? (readFirstNumber(entry, [['durationMs'], ['duration_ms'], ['elapsed_ms']]) !== undefined
      ? formatDuration(readFirstNumber(entry, [['durationMs'], ['duration_ms'], ['elapsed_ms']]))
      : '0s')
  const risk = isString(entry.risk) && validRisks.has(entry.risk)
    ? entry.risk
    : type === 'edit_file' || type === 'test_failed' ? 'medium' : 'low'
  const actionTitle = title || (
    type === 'read_file' ? `Read ${file}` :
      type === 'edit_file' ? `Edit ${file ?? 'file'}` :
        type === 'generate_summary' ? 'Generate summary' :
          command ? `Run ${command}` : 'Imported session action'
  )
  const details = isStringArray(entry.details) ? entry.details : []
  const summary = readFirstString(entry, [['summary'], ['description']])
    ?? compactWhitespace(actionTitle)

  return {
    id: `a${index + 1}`,
    type,
    title: actionTitle,
    timestamp,
    duration,
    risk,
    summary,
    details,
    file: file || undefined,
    command: command || undefined,
    output: output || undefined,
    diff: diff || undefined,
  }
}

function importSession(sessionPath) {
  if (!sessionPath) {
    console.error('Missing input file. Use: npm run agentscope -- import-session <input.json>')
    exit(1)
  }

  const startedAt = new Date()
  const defaultTimestamp = timeOfDay(startedAt)
  let raw
  try {
    raw = JSON.parse(readFileSync(sessionPath, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    console.error(`Invalid session: failed to read or parse "${sessionPath}".`)
    console.error(error.message)
    exit(1)
  }

  if (!isObject(raw) && !Array.isArray(raw)) {
    console.error('Invalid session: expected a JSON object or array.')
    exit(1)
  }

  const entries = getSessionEntries(raw)
  if (entries.length === 0) {
    console.error('Invalid session: expected an array or an object with events, messages, actions, entries, toolCalls, tool_calls, or steps.')
    exit(1)
  }

  const actions = entries
    .map((entry, index) => normalizeSessionEntry(entry, index, defaultTimestamp))
    .filter(Boolean)
    .map((action, index) => ({ ...action, id: `a${index + 1}` }))

  if (actions.length === 0) {
    console.error('No supported tool-call actions found in the session file.')
    exit(1)
  }

  const status = inferSessionStatus(actions)
  const uniqueFiles = new Set()
  let commandCount = 0
  for (const action of actions) {
    if (action.type === 'edit_file' && action.file) uniqueFiles.add(action.file)
    if (action.type === 'run_command' || action.type === 'test_failed' || action.type === 'test_passed') {
      commandCount++
    }
  }

  const fileName = sessionPath.replace(/^.*[\\/]/, '')
  const trace = {
    schemaVersion: SCHEMA_VERSION,
    runs: [
      {
        id: `run-session-${timestampForFile(startedAt)}`,
        title: readFirstString(raw, [['title'], ['task'], ['summary'], ['metadata', 'title']]) ?? `Import session trace: ${fileName}`,
        agent: inferSessionAgent(raw, entries),
        branch: readFirstString(raw, [['branch'], ['metadata', 'branch']]) ?? getGitBranch(),
        status,
        trustScore: status === 'passed' ? 85 : status === 'failed' ? 35 : 60,
        startedAt: readFirstString(raw, [['startedAt'], ['started_at'], ['created_at'], ['metadata', 'startedAt']]) ?? startedAt.toISOString(),
        duration: readFirstString(raw, [['duration'], ['elapsed'], ['metadata', 'duration']]) ?? '0s',
        cost: readFirstString(raw, [['cost'], ['metadata', 'cost']]) ?? '$0.00',
        filesChanged: uniqueFiles.size,
        commands: commandCount,
        actions,
      },
    ],
  }

  const result = validateTraceObject(trace)
  if (!result.ok) {
    console.error(result.message)
    exit(1)
  }

  const outPath = writeTrace(trace, startedAt)
  console.log(`AgentScope trace written to ${outPath}`)
}

const statusLabels = {
  passed: 'PASSED',
  failed: 'FAILED',
  warning: 'WARNING',
}

const maxSummaryActions = 20
const defaultSummaryMarker = '<!-- agentscope-summary -->'

function escapeTable(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function renderVerification(actions) {
  const verificationActions = actions.filter((action) =>
    action.type === 'run_command' || action.type === 'test_failed' || action.type === 'test_passed',
  )

  if (verificationActions.length === 0) return []

  const lines = ['### Verification', '']
  for (const action of verificationActions) {
    const label = action.command || action.title
    lines.push(`- **${action.type}:** \`${String(label).replace(/`/g, '\\`')}\``)
    if (action.output) {
      const outputLines = action.output.trim().split(/\r?\n/).slice(0, 12)
      for (const line of outputLines) {
        lines.push(`  ${line}`)
      }
      const totalLines = action.output.trim().split(/\r?\n/).length
      if (totalLines > outputLines.length) {
        lines.push(`  ...and ${totalLines - outputLines.length} more output line(s) omitted`)
      }
    }
  }
  lines.push('')
  return lines
}

function renderRunSummary(run, headingLevel = 2) {
  const heading = '#'.repeat(headingLevel)
  const lines = [
    `${heading} AgentScope Run Summary`,
    '',
    `**Run:** ${run.title}`,
    `**Agent:** ${run.agent}`,
    `**Branch:** \`${String(run.branch).replace(/`/g, '\\`')}\``,
    `**Status:** ${statusLabels[run.status] ?? run.status}`,
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Trust Score | **${run.trustScore}%** |`,
    `| Files Changed | ${run.filesChanged} |`,
    `| Commands Run | ${run.commands} |`,
    `| Duration | ${run.duration} |`,
    `| Est. Cost | ${run.cost} |`,
    '',
  ]

  if (run.actions.length > 0) {
    const shownActions = run.actions.slice(0, maxSummaryActions)
    const omitted = run.actions.length - shownActions.length

    lines.push('### Actions', '')
    lines.push('| # | Type | What | Risk |')
    lines.push('| --- | --- | --- | --- |')
    shownActions.forEach((action, index) => {
      lines.push(`| ${index + 1} | ${escapeTable(action.type)} | ${escapeTable(action.title)} | ${escapeTable(action.risk)} |`)
    })
    if (omitted > 0) {
      lines.push('', `...and ${omitted} more action(s) omitted`, '')
    } else {
      lines.push('')
    }
  }

  lines.push(...renderVerification(run.actions))
  lines.push('---')
  lines.push(`Generated by AgentScope - \`${String(run.id).replace(/`/g, '\\`')}\``)
  return lines.join('\n')
}

function generateTraceSummary(trace) {
  const warnings = collectTraceQualityWarnings(trace)
  const warningLines = renderQualityWarnings(warnings)

  if (trace.runs.length === 1) {
    return [renderRunSummary(trace.runs[0]), ...warningLines].join('\n').trimEnd()
  }

  const lines = [
    '## AgentScope Trace Summary',
    '',
    '| Run | Agent | Status | Trust | Files | Commands | Duration | Cost |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const run of trace.runs) {
    lines.push(
      `| \`${escapeTable(run.id)}\` | ${escapeTable(run.agent)} | ${statusLabels[run.status] ?? run.status} | ${run.trustScore}% | ${run.filesChanged} | ${run.commands} | ${escapeTable(run.duration)} | ${escapeTable(run.cost)} |`,
    )
  }

  lines.push('')
  for (const run of trace.runs) {
    lines.push('---', '', renderRunSummary(run, 3), '')
  }

  lines.push(...warningLines)
  return lines.join('\n').trimEnd()
}

function renderQualityWarnings(warnings) {
  if (warnings.length === 0) return []

  return [
    '',
    '### Trace Quality Warnings',
    '',
    ...warnings.map((warning) => `- ${warning}`),
    '',
  ]
}

function parseSummarizeOptions(args) {
  const options = { input: '', dryRun: false, marker: defaultSummaryMarker }
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--input') {
      options.input = args[i + 1] ?? ''
      i += 1
    } else if (args[i] === '--dry-run') {
      options.dryRun = true
    } else if (args[i] === '--marker') {
      options.marker = args[i + 1] ?? ''
      i += 1
    } else {
      console.error(`Unknown summarize option: ${args[i]}`)
      exit(1)
    }
  }
  return options
}

function githubApiHeaders(token) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'AgentScope CLI',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function getPullRequestNumber() {
  const eventPath = process.env.GITHUB_EVENT_PATH
  if (eventPath) {
    try {
      const event = JSON.parse(readFileSync(eventPath, 'utf8'))
      if (event.pull_request?.number) return String(event.pull_request.number)
      if (event.number) return String(event.number)
    } catch {
      // Fall through to GITHUB_REF parsing.
    }
  }

  const ref = process.env.GITHUB_REF ?? ''
  const match = ref.match(/^refs\/pull\/(\d+)\/(?:merge|head)$/)
  return match?.[1] ?? ''
}

async function githubRequest(url, { method = 'GET', token, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: githubApiHeaders(token),
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`GitHub API ${method} ${url} failed with ${response.status}: ${text}`)
  }

  if (response.status === 204) return null
  return response.json()
}

async function postPullRequestSummary(markdown, marker) {
  const token = process.env.GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY ?? ''
  const prNumber = getPullRequestNumber()

  if (!token) {
    throw new Error('GITHUB_TOKEN is required when --dry-run is not set.')
  }

  const [owner, repo] = repository.split('/')
  if (!owner || !repo) {
    throw new Error('GITHUB_REPOSITORY must be set to "owner/repo".')
  }

  if (!prNumber) {
    throw new Error('Could not detect pull request number from GITHUB_EVENT_PATH or GITHUB_REF.')
  }

  const baseUrl = `https://api.github.com/repos/${owner}/${repo}`
  const comments = await githubRequest(`${baseUrl}/issues/${prNumber}/comments`, { token })
  const existing = comments.find((comment) =>
    comment.user?.type === 'Bot' &&
    typeof comment.body === 'string' &&
    comment.body.includes(marker),
  )

  const body = `${marker}\n\n${markdown}`
  if (existing) {
    await githubRequest(`${baseUrl}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      token,
      body: { body },
    })
    console.log(`Updated AgentScope summary comment on PR #${prNumber}.`)
    return
  }

  await githubRequest(`${baseUrl}/issues/${prNumber}/comments`, {
    method: 'POST',
    token,
    body: { body },
  })
  console.log(`Created AgentScope summary comment on PR #${prNumber}.`)
}

async function summarize(args) {
  const options = parseSummarizeOptions(args)

  if (!options.input) {
    console.error('Missing input file. Use: npm run agentscope -- summarize --input <trace-file> [--dry-run]')
    exit(1)
  }

  if (!options.marker) {
    console.error('The --marker value cannot be empty.')
    exit(1)
  }

  if (!options.dryRun && typeof fetch !== 'function') {
    console.error('Global fetch is required to post GitHub comments. Use Node.js 18 or newer.')
    exit(1)
  }

  let raw
  try {
    raw = JSON.parse(readFileSync(options.input, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    console.error(`Invalid trace: failed to read or parse "${options.input}".`)
    console.error(error.message)
    exit(1)
  }

  const result = validateTraceObject(raw)
  if (!result.ok) {
    console.error(result.message)
    exit(1)
  }

  const markdown = generateTraceSummary(raw)
  if (options.dryRun) {
    console.log(markdown)
    return
  }

  await postPullRequestSummary(markdown, options.marker)
}

function validate(tracePath) {
  if (!tracePath) {
    console.error('Missing trace file. Use: npm run agentscope -- validate <trace-file>')
    exit(1)
  }

  let raw
  try {
    raw = JSON.parse(readFileSync(tracePath, 'utf8').replace(/^\uFEFF/, ''))
  } catch (error) {
    console.error(`Invalid trace: failed to read or parse "${tracePath}".`)
    console.error(error.message)
    exit(1)
  }

  const result = validateTraceObject(raw)
  if (!result.ok) {
    console.error(result.message)
    exit(1)
  }

  console.log(`Valid AgentScope trace: ${tracePath}`)
  for (const warning of result.warnings) {
    console.error(`Warning: ${warning}`)
  }
}

const [, , subcommand, separator, ...rest] = argv

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  printHelp()
  exit(0)
}

if (subcommand === 'validate') {
  validate(separator)
  exit(0)
}

if (subcommand === 'import-jsonl') {
  importJsonl(separator)
  exit(0)
}

if (subcommand === 'import-session') {
  importSession(separator)
  exit(0)
}

if (subcommand === 'summarize') {
  try {
    await summarize([separator, ...rest].filter(Boolean))
    exit(0)
  } catch (error) {
    console.error(error.message)
    exit(1)
  }
}

if (subcommand !== 'record') {
  console.error(`Unknown command: ${subcommand}`)
  printHelp()
  exit(1)
}

record(separator === '--' ? rest : [separator, ...rest].filter(Boolean))
