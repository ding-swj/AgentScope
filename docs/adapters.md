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

The following agents are on the roadmap. All are planned; none are implemented yet.

| Adapter | Input source | Status |
| ------- | ------------ | ------ |
| **Generic JSONL** | Line-delimited JSON with tool calls | Planned |
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

1. **Generic JSONL adapter** (first priority). A line-delimited JSON format that any agent framework or log exporter can emit. This gives immediate coverage for all agents without writing agent-specific parsers.
2. **Claude Code / Codex session export** (second priority). These two agents have the largest user bases and produce structured output that maps cleanly to the trace schema.
3. **Cursor / Aider** (third priority). Cursor's local logs and Aider's chat/edit history require more normalization work.

## Limitations

- Adapters do not read private IDE internal data. They only process publicly exported logs, session files, or hook output that the user explicitly provides.
- No unauthorized log scraping. Adapters are passive parsers; they consume files the user chooses to feed in.
- The trace schema will evolve. Adapter authors should pin a `schemaVersion` and be prepared for minor breaking changes as the format stabilizes.
- Agent output formats change. Each adapter may need periodic updates when the upstream agent changes its export format.

## Contributing an adapter

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) for general contribution guidelines. Adapter contributions should include:

- A parser module under a future `src/adapters/` directory (or equivalent)
- A test that parses a real (anonymized) session export and produces a valid trace
- Updated [`docs/adapters.md`](adapters.md) with the new adapter entry

If you have exported agent session data you are willing to share for testing, please include a small, anonymized sample.
