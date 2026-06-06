# Adapters

AgentScope uses adapters to convert agent tool-call logs into the standard trace format. This document outlines the adapter roadmap: what they are, which agents are targeted, and what the interface looks like.

## Why adapters

The CLI recorder (`npm run agentscope -- record -- <command>`) is a good starting point: it wraps a shell command and captures exit code, stdout, stderr, duration, working directory, and git branch.

But the most valuable trace data comes from the agent's own tool calls: every file read, every code edit, every command executed, every test result, and every summary. These are the building blocks of a full agent run timeline. The CLI recorder cannot see them because it only wraps one process.

Adapters bridge that gap. They read the agent's native log format and normalize it into the AgentScope trace schema -- giving you a complete, interactive timeline in the Web UI.

| Source | What the CLI recorder captures | What an adapter adds |
| ------ | ------------------------------ | -------------------- |
| `npm test` | exit code, stdout, stderr, duration | -- |
| Agent tool calls | -- | file reads, code edits, command runs, test results, summaries, risk assessment |

## Target adapters

The following agents are on the roadmap. The Generic JSONL adapter is available now; the rest are planned.

| Adapter | Input source | Status |
| ------- | ------------ | ------ |
| **Generic JSONL** | Line-delimited JSON with tool calls | [MVP available](generic-jsonl.md) |
| **Claude Code** | Session export or hooks output | Planned |
| **Codex** | Session log or export | Planned |
| **Cursor** | Export or local log | Planned |
| **Aider** | Chat log / edit history | Planned |

## Adapter contract

Every adapter follows the same contract:

**Input:** a source of raw agent data (JSONL file, session export, CLI hook output, log file).

**Output:** an object conforming to [`docs/trace-schema.json`](trace-schema.json). The output includes:

- `schemaVersion`: always `"1.0.0"`
- `runs`: array of `AgentRun` objects, each with:
  - Run metadata: `id`, `title`, `agent`, `branch`, `status`, `trustScore`, `startedAt`, `duration`, `cost`
  - Summary metrics: `filesChanged`, `commands`
  - `actions`: array of `TraceAction` objects, each with:
    - `id`, `type`, `title`, `timestamp`, `duration`, `risk`, `summary`, `details`
    - Optional: `file`, `command`, `output`, `diff`

The adapter should fill as many fields as the source data allows. Missing optional fields default to `undefined` -- the Web UI handles them gracefully.

## Generic JSONL adapter (MVP available)

The first adapter shipped is a generic JSONL importer. It reads line-delimited JSON files where each line represents one agent action and converts them into a valid AgentScope trace.

### Usage

```bash
npm run agentscope -- import-jsonl examples/generic-agent.jsonl
```

This produces `.agentscope/YYYY-MM-DD-HHmmss.trace.json`. Validate the output with:

```bash
npm run agentscope -- validate .agentscope/2026-06-06-140342.trace.json
```

Then import the trace into the Web UI via the Import button or drag-and-drop.

### JSONL line format

Each line is a JSON object with these fields:

| Field | Required | Default | Notes |
| ----- | -------- | ------- | ----- |
| `type` | Yes | -- | One of: `read_file`, `edit_file`, `run_command`, `test_failed`, `test_passed`, `generate_summary` |
| `title` | No | `"Untitled action"` | Short label for the timeline |
| `timestamp` | No | Import time | Action start time (e.g. `"14:03:12"`) |
| `duration` | No | `"0s"` | Action duration (e.g. `"18s"`, `"1m 12s"`) |
| `risk` | No | `"low"` | One of: `low`, `medium`, `high` |
| `summary` | No | `title` or `"Untitled action"` | One-to-two sentence description |
| `details` | No | `[]` | Array of evidence strings |
| `file` | No | -- | File path (for read_file / edit_file) |
| `command` | No | -- | Shell command (for run_command / test actions) |
| `output` | No | -- | Captured stdout / stderr |
| `diff` | No | -- | Unified diff (for edit_file) |

### Example

See [`examples/generic-agent.jsonl`](../examples/generic-agent.jsonl) for a 7-action trace covering all 6 action types.

```jsonl
{"type":"read_file","title":"Read config","file":"src/config.ts","risk":"low","summary":"Inspected config file for the rate-limit setting."}
{"type":"edit_file","title":"Bump rate limit","file":"src/config.ts","risk":"medium","summary":"Changed rate limit from 100 to 200.","details":["Default rate limit was too low for production traffic"]}
{"type":"run_command","title":"Run tests","command":"npm test","risk":"low","summary":"All tests pass."}
```

### Auto-generated run metadata

When converting JSONL to a trace, the adapter auto-generates run-level fields:

- `run id`: `run-jsonl-<timestamp>` (e.g. `run-jsonl-2026-06-06-140342`)
- `agent`: `"Generic JSONL"`
- `branch`: detected from current git branch
- `status`: inferred from action types (`failed` if any `test_failed`, otherwise `passed` if any `test_passed`, otherwise `warning`)
- `trustScore`: 85 for passed, 60 for warning, 35 for failed
- `filesChanged`: count of unique files in `edit_file` actions
- `commands`: count of `run_command` / `test_failed` / `test_passed` actions

## Minimal adapter API sketch

Each adapter exposes a single entry point:

```typescript
// Generic sketch -- not implemented
interface Adapter {
  /** One-line label shown in UI / CLI. */
  readonly name: string

  /** Parses raw agent output into an AgentScope trace. */
  parse(input: string): AgentScopeTrace
}

// Example: a generic JSONL adapter
function parseJsonl(raw: string): AgentScopeTrace {
  const lines = raw.trim().split('\n').map(line => JSON.parse(line))
  return {
    schemaVersion: '1.0.0',
    runs: [
      {
        id: generateRunId(),
        title: inferTitle(lines),
        agent: inferAgent(lines),
        branch: inferBranch(),
        status: inferStatus(lines),
        trustScore: computeTrust(lines),
        startedAt: lines[0]?.timestamp ?? '',
        duration: computeDuration(lines),
        cost: inferCost(lines),
        filesChanged: countUniqueFiles(lines),
        commands: countCommands(lines),
        actions: lines.map(normalize),
      },
    ],
  }
}

function normalize(entry: Record<string, unknown>): TraceAction {
  return {
    id: entry.id as string,
    type: mapActionType(entry),
    title: readString(entry.title) ?? readString(entry.action) ?? 'Untitled action',
    timestamp: readString(entry.timestamp) ?? '',
    duration: readString(entry.duration) ?? '',
    risk: inferRisk(entry),
    summary: readString(entry.summary) ?? '',
    details: readStringArray(entry.details),
    file: readString(entry.file),
    command: readString(entry.command),
    output: readString(entry.output),
    diff: readString(entry.diff),
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : []
}
```

The `normalize` function is the core of each adapter: it maps one raw tool-call entry to one `TraceAction`. The action type mapping depends on the source agent's naming conventions.

## Prioritization

1. **Generic JSONL adapter** (available). A line-delimited JSON format that any agent framework or log exporter can emit. This gives immediate coverage for all agents without writing agent-specific parsers.
2. **Claude Code / Codex session export** (next priority). These two agents have large user bases and may produce structured output that maps well to the trace schema.
3. **Cursor / Aider** (later priority). Cursor logs and Aider chat/edit history may require more normalization work.

## Limitations

- Adapters do not read private IDE internal data. They only process publicly exported logs, session files, or hook output that the user explicitly provides.
- No unauthorized log scraping. Adapters are passive parsers; they consume files the user chooses to feed in.
- The trace schema will evolve. Adapter authors should pin a `schemaVersion` and be prepared for minor breaking changes as the format stabilizes.
- Agent output formats change. Each adapter may need periodic updates when the upstream agent changes its export format.

## Contributing an adapter

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for general contribution guidelines. Adapter contributions should include:

- A parser module under `bin/agentscope.js` or a future `src/adapters/` directory, depending on scope
- A test that parses a real (anonymized) session export and produces a valid trace
- Updated [`docs/adapters.md`](adapters.md) with the new adapter entry

If you have exported agent session data you are willing to share for testing, please include a small, anonymized sample.
