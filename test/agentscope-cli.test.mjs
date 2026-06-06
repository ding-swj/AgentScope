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

function runCliResult(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  })
}

function runCliFailure(args, options = {}) {
  const result = runCliResult(args, options)

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

function writeTraceFixture(dir, name, actions) {
  const tracePath = join(dir, name)
  const trace = {
    schemaVersion: '1.0.0',
    runs: [
      {
        id: 'run-test',
        title: 'Test run',
        agent: 'AgentScope Test',
        branch: 'test',
        status: 'warning',
        trustScore: 60,
        startedAt: '2026-06-06T00:00:00.000Z',
        duration: '1m',
        cost: '$0.00',
        filesChanged: actions.filter((action) => action.type === 'edit_file').length,
        commands: actions.filter((action) =>
          action.type === 'run_command' || action.type === 'test_failed' || action.type === 'test_passed',
        ).length,
        actions: actions.map((action, index) => ({
          id: `a${index + 1}`,
          timestamp: '00:00:00',
          duration: '1s',
          risk: 'low',
          summary: action.title,
          details: [],
          ...action,
        })),
      },
    ],
  }

  writeFileSync(tracePath, `${JSON.stringify(trace, null, 2)}\n`, 'utf8')
  return tracePath
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

test('validate does not warn on the example trace', () => {
  const result = runCliResult(['validate', authTrace])

  assert.equal(result.status, 0)
  assert.match(result.stdout, /Valid AgentScope trace:/)
  assert.equal(result.stderr, '')
})

test('quality check warns on edits without verification', () => {
  withTempDir((dir) => {
    const fixture = writeTraceFixture(dir, 'edits-no-verification.trace.json', [
      {
        type: 'edit_file',
        title: 'Edit source',
        file: 'src/example.ts',
      },
    ])
    const result = runCliResult(['validate', fixture], { cwd: dir })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /Valid AgentScope trace:/)
    assert.match(result.stderr, /Warning: Run \[1\]: Run has 1 edit\(s\) but no verification command was run\./)
  })
})

test('quality check warns on failed tests without recovery', () => {
  withTempDir((dir) => {
    const fixture = writeTraceFixture(dir, 'failed-no-recovery.trace.json', [
      {
        type: 'test_failed',
        title: 'Run failing tests',
        command: 'npm test',
      },
    ])
    const result = runCliResult(['validate', fixture], { cwd: dir })

    assert.equal(result.status, 0)
    assert.match(result.stderr, /Warning: Run \[1\]: Run has failed test\(s\) with no later passing test\./)
  })
})

test('quality check warns on high-risk edits without evidence', () => {
  withTempDir((dir) => {
    const fixture = writeTraceFixture(dir, 'high-risk-no-evidence.trace.json', [
      {
        type: 'edit_file',
        title: 'Edit auth logic',
        file: 'src/auth.ts',
        risk: 'high',
        details: [],
      },
      {
        type: 'test_passed',
        title: 'Run tests',
        command: 'npm test',
      },
    ])
    const result = runCliResult(['validate', fixture], { cwd: dir })

    assert.equal(result.status, 0)
    assert.match(result.stderr, /Warning: Run \[1\]: Run has high-risk edit\(s\) with no evidence notes\./)
  })
})

test('quality check reports multiple warnings for the same run', () => {
  withTempDir((dir) => {
    const fixture = writeTraceFixture(dir, 'multiple-warnings.trace.json', [
      {
        type: 'edit_file',
        title: 'Edit auth logic',
        file: 'src/auth.ts',
        risk: 'high',
        details: [],
      },
    ])
    const result = runCliResult(['validate', fixture], { cwd: dir })

    assert.equal(result.status, 0)
    assert.match(result.stderr, /Run \[1\]: Run has 1 edit\(s\) but no verification command was run\./)
    assert.match(result.stderr, /Run \[1\]: Run has high-risk edit\(s\) with no evidence notes\./)
  })
})

test('validate reports an error for a missing file', () => {
  runCliFailure(['validate', join(root, 'nonexistent.trace.json')], {
    assertError(error) {
      assert.equal(error.status, 1)
      assert.match(error.stderr, /failed to read or parse/)
    },
  })
})

test('validate rejects a trace with wrong schemaVersion', () => {
  withTempDir((dir) => {
    const fixture = join(dir, 'bad-version.trace.json')
    writeFileSync(fixture, '{"schemaVersion":"9.9.9","runs":[]}\n', 'utf8')

    runCliFailure(['validate', fixture], {
      cwd: dir,
      assertError(error) {
        assert.equal(error.status, 1)
        assert.match(error.stderr, /expected schemaVersion "1\.0\.0"/)
      },
    })
  })
})

test('validate rejects an empty runs array', () => {
  withTempDir((dir) => {
    const fixture = join(dir, 'empty-runs.trace.json')
    writeFileSync(fixture, '{"schemaVersion":"1.0.0","runs":[]}\n', 'utf8')

    runCliFailure(['validate', fixture], {
      cwd: dir,
      assertError(error) {
        assert.equal(error.status, 1)
        assert.match(error.stderr, /the "runs" array is empty/)
      },
    })
  })
})

test('summarize --dry-run renders a Markdown summary', () => {
  const output = runCli(['summarize', '--input', authTrace, '--dry-run'])

  assert.match(output, /## AgentScope Run Summary/)
  assert.match(output, /Fix failing auth token expiry tests/)
  assert.match(output, /### Verification/)
})

test('summarize --dry-run renders trace quality warnings', () => {
  withTempDir((dir) => {
    const fixture = writeTraceFixture(dir, 'summary-warning.trace.json', [
      {
        type: 'edit_file',
        title: 'Edit source',
        file: 'src/example.ts',
      },
    ])
    const output = runCli(['summarize', '--input', fixture, '--dry-run'], { cwd: dir })

    assert.match(output, /### Trace Quality Warnings/)
    assert.match(output, /Run \[1\]: Run has 1 edit\(s\) but no verification command was run\./)
  })
})

test('record captures a simple command', () => {
  withTempDir((dir) => {
    const output = runCli(['record', '--', 'echo', 'hello'], { cwd: dir })
    const trace = parseWrittenTrace(output)

    assert.equal(trace.schemaVersion, '1.0.0')
    assert.equal(trace.runs.length, 1)
    assert.equal(trace.runs[0].status, 'passed')
    assert.equal(trace.runs[0].commands, 1)
    assert.equal(trace.runs[0].actions[0].type, 'test_passed')
    assert.match(trace.runs[0].actions[0].output, /hello/)
  })
})

test('record captures a failing command', () => {
  withTempDir((dir) => {
    // Write a temp script to avoid inline -e quoting issues on Windows
    const scriptPath = join(dir, 'failing-command.mjs')
    writeFileSync(scriptPath, "console.error('boom');\nprocess.exit(7);\n", 'utf8')

    // On Windows, record uses shell:true with a joined command string.
    // If process.execPath contains spaces (e.g. "C:\\Program Files\\nodejs\\node.exe"),
    // the inner shell needs it quoted. On Unix, record spawns args directly.
    const quoteForShell = (s) =>
      process.platform === 'win32' && s.includes(' ') ? `"${s}"` : s

    const result = spawnSync(process.execPath, [
      cli,
      'record', '--',
      quoteForShell(process.execPath),
      quoteForShell(scriptPath),
    ], {
      cwd: dir,
      encoding: 'utf8',
      env: process.env,
    })

    assert.equal(result.status, 7, `expected exit code 7, got ${result.status}`)

    // The trace is still written even when the recorded command fails
    const trace = parseWrittenTrace(result.stdout)

    assert.equal(trace.schemaVersion, '1.0.0')
    assert.equal(trace.runs.length, 1)
    assert.equal(trace.runs[0].status, 'failed')
    assert.equal(trace.runs[0].actions[0].type, 'test_failed')
    assert.match(trace.runs[0].actions[0].output, /boom/)

    const details = trace.runs[0].actions[0].details
    assert.ok(
      details.some((d) => d.includes('Exit code: 7')),
      `expected details to contain "Exit code: 7", got: ${JSON.stringify(details)}`,
    )
  })
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
