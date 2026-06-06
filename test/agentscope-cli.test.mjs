import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
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

function runCliFailure(args, options = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  })

  assert.notEqual(result.status, 0, `expected command to fail: ${args.join(' ')}`)
  options.assertError?.({
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
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

test('import-jsonl reports invalid JSON with a line number', () => {
  withTempDir((dir) => {
    const fixture = join(dir, 'bad.jsonl')
    writeFileSync(fixture, '{"type":"read_file"}\n{bad json}\n', 'utf8')

    runCliFailure(['import-jsonl', fixture], {
      cwd: dir,
      assertError(error) {
        assert.equal(error.status, 1)
        assert.match(error.stderr, /Line 2: invalid JSON\./)
      },
    })
  })
})

test('import-session reports empty session arrays', () => {
  withTempDir((dir) => {
    const fixture = join(dir, 'empty-session.json')
    writeFileSync(fixture, '{"events":[]}\n', 'utf8')

    runCliFailure(['import-session', fixture], {
      cwd: dir,
      assertError(error) {
        assert.equal(error.status, 1)
        assert.match(error.stderr, /expected an array or an object with events/)
      },
    })
  })
})

test('import-session reports sessions with no supported tool calls', () => {
  withTempDir((dir) => {
    const fixture = join(dir, 'unsupported-session.json')
    writeFileSync(fixture, '{"events":[{"role":"assistant","content":"hello"}]}\n', 'utf8')

    runCliFailure(['import-session', fixture], {
      cwd: dir,
      assertError(error) {
        assert.equal(error.status, 1)
        assert.match(error.stderr, /No supported tool-call actions found/)
      },
    })
  })
})

test('summarize without --dry-run requires GITHUB_TOKEN', () => {
  const env = { ...process.env }
  delete env.GITHUB_TOKEN
  delete env.GITHUB_REPOSITORY
  delete env.GITHUB_EVENT_PATH
  delete env.GITHUB_REF

  runCliFailure(['summarize', '--input', authTrace], {
    env,
    assertError(error) {
      assert.equal(error.status, 1)
      assert.match(error.stderr, /GITHUB_TOKEN is required/)
    },
  })
})
