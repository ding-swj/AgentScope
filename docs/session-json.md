# Session JSON Adapter

The Session JSON adapter is a small compatibility importer for Claude Code, Codex, and similar agent session exports. It reads a JSON array or a JSON object containing tool-call entries and normalizes those entries into an AgentScope trace.

This is intentionally permissive. Agent session formats change, so the adapter looks for common field names instead of requiring one exact schema.

## Quick start

```bash
npm run agentscope -- import-session examples/agent-session.json
npm run agentscope -- validate .agentscope/*.trace.json
npm run dev
```

Then import the generated trace via the Web UI Import button or drag and drop.

## Accepted input shape

The input may be either:

- A JSON array of tool-call entries
- A JSON object with one of these array fields: `events`, `messages`, `actions`, `entries`, `toolCalls`, `tool_calls`, or `steps`

Example:

```json
{
  "title": "Fix auth token expiry test",
  "agent": "Claude Code",
  "events": [
    {
      "tool": "Read",
      "input": {
        "file_path": "src/auth/session.test.ts"
      },
      "summary": "Read the failing test before editing code."
    },
    {
      "tool": "Bash",
      "input": {
        "command": "npm test -- session.test.ts"
      },
      "output": "PASS src/auth/session.test.ts"
    }
  ]
}
```

## Field mapping

The adapter recognizes common fields from Claude/Codex-like logs:

| AgentScope field | Source fields checked |
| --- | --- |
| Tool name | `tool`, `toolName`, `tool_name`, `name`, `type`, `action`, `function.name` |
| Input object | `input`, `tool_input`, `arguments`, `args`, `params`, `request` |
| File path | `file`, `path`, `file_path`, `filepath`, `target_file`, or the same fields under `input` |
| Command | `command`, `cmd`, or the same fields under `input` |
| Diff | `diff`, `patch`, or the same fields under `input` |
| Output | `output`, `stdout`, `stderr`, `content`, `result`, `response`, `tool_result` |
| Timestamp | `timestamp`, `time`, `startedAt`, `started_at`, `created_at` |
| Duration | `duration`, `elapsed`, `durationMs`, `duration_ms`, `elapsed_ms` |

## Action type mapping

The adapter maps common tool names and content to AgentScope action types:

| Source signal | AgentScope action type |
| --- | --- |
| `Read`, `View`, `Open`, `Cat`, `Grep`, `Search` with a file | `read_file` |
| `Edit`, `Write`, `MultiEdit`, `apply_patch`, `Replace`, or a patch/diff | `edit_file` |
| `Bash`, `Shell`, `Terminal`, `Exec`, `Command`, or a command field | `run_command` |
| Command/test output with failure keywords | `test_failed` |
| Command/test output with pass/success keywords | `test_passed` |
| `Summarize`, `Report`, `Wrap up` | `generate_summary` |

Unrecognized entries are skipped. If no supported tool-call actions are found, the CLI exits with an error.

## Generated metadata

The adapter generates a valid single-run trace:

- `id`: `run-session-<timestamp>`
- `title`: from `title`, `task`, `summary`, or the file name
- `agent`: explicit `agent` if present, otherwise inferred from Claude/Codex strings
- `branch`: explicit `branch` if present, otherwise current git branch
- `status`: `failed` if any `test_failed`, otherwise `passed` if any `test_passed`, otherwise `warning`
- `trustScore`: 85 for passed, 60 for warning, 35 for failed
- `filesChanged`: unique edited files
- `commands`: command and test action count

## Limitations

- This is a best-effort importer, not a native parser for every upstream session format.
- It only reads files you explicitly pass to the CLI.
- It does not scrape private IDE data or call external services.
- If a native export format changes, the mapping may need a small update.
