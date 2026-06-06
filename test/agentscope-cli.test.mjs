import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import assert from 'node:assert/strict'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cli = join(root, 'bin', 'agentscope.js')
const jsonlFixture = join(root, 'examples', 'generic-agent.jsonl')
const sessionFixture = join(root, 'examples', 'agent-session.json')
const authTrace = join(root, 'examples', 'auth-fix.trace.json')

function runCli(args, options = {}) {
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  })
}

function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'agentscope-test-'))
  try {
    return fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function parseWrittenTrace(output) {
  const match = output.match(/AgentScope trace written to (.+)\r?\n?$/)
  assert.ok(match, `expected trace output path in:\n${output}`)
  return JSON.parse(readFileSync(match[1], 'utf8'))
}

test('import-jsonl creates a valid trace from the generic fixture', () => {
  withTempDir((dir) => {
    const output = runCli(['import-jsonl', jsonlFixture], { cwd: dir })
    const trace = parseWrittenTrace(output)

    assert.equal(trace.schemaVersion, '1.0.0')
    assert.equal(trace.runs.length, 1)
    assert.equal(trace.runs[0].agent, 'Generic JSONL')
    assert.equal(trace.runs[0].actions.length, 7)
    assert.equal(trace.runs[0].status, 'failed')
  })
})

test('import-session maps Claude/Codex-style tool calls into trace actions', () => {
  withTempDir((dir) => {
    const output = runCli(['import-session', sessionFixture], { cwd: dir })
    const trace = parseWrittenTrace(output)
    const actionTypes = trace.runs[0].actions.map((action) => action.type)

    assert.equal(trace.schemaVersion, '1.0.0')
    assert.equal(trace.runs[0].agent, 'Claude Code')
    assert.deepEqual(actionTypes, [
      'read_file',
      'read_file',
      'edit_file',
      'test_failed',
      'edit_file',
      'test_passed',
      'generate_summary',
    ])
    assert.equal(trace.runs[0].filesChanged, 2)
    assert.equal(trace.runs[0].commands, 2)
  })
})

test('validate accepts the example trace', () => {
  const output = runCli(['validate', authTrace])
  assert.match(output, /Valid AgentScope trace:/)
})

test('summarize --dry-run renders a Markdown summary', () => {
  const output = runCli(['summarize', '--input', authTrace, '--dry-run'])

  assert.match(output, /## AgentScope Run Summary/)
  assert.match(output, /Fix failing auth token expiry tests/)
  assert.match(output, /### Verification/)
})
