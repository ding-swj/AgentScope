# Generic JSONL Adapter Guide

The Generic JSONL adapter is the easiest way to get external agent data into AgentScope. Write one JSON object per line and run `import-jsonl` to produce a valid trace file you can validate and view.

## What it is

The `import-jsonl` command reads a line-delimited JSON file where each line represents one agent action. It normalizes every line into a `TraceAction`, auto-generates run-level metadata, and writes a complete trace file to `.agentscope/`.

No SDK, no library, no dependency. Any script or agent log exporter that can print JSON to stdout can produce a compatible JSONL file.

## Quick start

Create a file named `my-agent.jsonl`:

```jsonl
{"type":"read_file","title":"Read auth module","file":"src/auth/login.ts","risk":"low","summary":"Found the login handler."}
{"type":"edit_file","title":"Fix redirect","file":"src/auth/login.ts","risk":"medium","summary":"Changed window.location to router.push.", "diff":"- window.location.href = '/'\n+ router.push('/')"}
{"type":"test_passed","title":"Run auth tests","command":"npm test -- auth","risk":"low","summary":"All 12 tests pass.","output":"12 passed, 0 failed"}
```

Then import it:

```bash
npm run agentscope -- import-jsonl my-agent.jsonl
npm run agentscope -- validate .agentscope/2026-06-06-*.trace.json
npm run dev
```

Open `http://localhost:5173` and import the generated trace via the Import button or drag-and-drop.

## Required field

Only one field is required on each line:

**`type`** (string) -- one of the 6 action types:

| `type` value | Meaning |
| ------------ | ------- |
| `read_file` | Agent read a file to understand context |
| `edit_file` | Agent modified a file |
| `run_command` | Agent executed a shell command |
| `test_failed` | A test or verification step failed |
| `test_passed` | A test or verification step passed |
| `generate_summary` | Agent produced a summary or report |

If `type` is missing or invalid, the CLI reports the line number and exits.

## Recommended fields

All fields except `type` are optional and have sensible defaults. Fill as many as you can for a richer timeline.

| Field | Type | Default | Description |
| ----- | ---- | ------- | ----------- |
| `title` | string | `"Untitled action"` | Short label shown in the timeline |
| `timestamp` | string | import time | When the action started, e.g. `"14:03:12"` |
| `duration` | string | `"0s"` | How long the action took, e.g. `"18s"` or `"1m 12s"` |
| `risk` | string | `"low"` | One of `"low"`, `"medium"`, `"high"` |
| `summary` | string | same as `title` | One-to-two sentence description of what happened |
| `details` | string[] | `[]` | Bullet-point evidence notes |
| `file` | string | -- | File path this action read or edited |
| `command` | string | -- | Shell command that was executed |
| `output` | string | -- | Captured stdout or stderr |
| `diff` | string | -- | Unified diff for `edit_file` actions |

## Mapping examples

If your agent's log uses different naming conventions, here is how to map common patterns to AgentScope action types.

### File reads

If your log has `"tool": "read"`, `"action": "read_file"`, or `"operation": "read"`:

```
Tool: read_file    -> {"type":"read_file", ...}
Tool: open          -> {"type":"read_file", ...}
Tool: view          -> {"type":"read_file", ...}
Tool: cat           -> {"type":"read_file", ...}
```

### File edits

If your log has `"tool": "edit"`, `"action": "apply_patch"`, or `"operation": "write"`:

```
Tool: edit_file      -> {"type":"edit_file", ...}
Tool: apply_patch    -> {"type":"edit_file", ...}
Tool: write          -> {"type":"edit_file", ...}
Tool: replace        -> {"type":"edit_file", ...}
```

### Shell commands

If your log has `"tool": "shell"`, `"action": "run_terminal"`, or `"operation": "exec"`:

```
Tool: run_command  -> {"type":"run_command", ...}
Tool: shell        -> {"type":"run_command", ...}
Tool: terminal     -> {"type":"run_command", ...}
Tool: exec         -> {"type":"run_command", ...}
Tool: bash         -> {"type":"run_command", ...}
```

### Test failures

If a command or verification step produced a non-zero exit code, or your log marks it as `"outcome": "fail"`:

```
Exit code != 0    -> {"type":"test_failed", ...}
Outcome: fail     -> {"type":"test_failed", ...}
Status: error     -> {"type":"test_failed", ...}
```

### Test passes

If a command or verification step produced exit code 0, or your log marks it as `"outcome": "pass"`:

```
Exit code == 0    -> {"type":"test_passed", ...}
Outcome: pass     -> {"type":"test_passed", ...}
Status: ok        -> {"type":"test_passed", ...}
```

### Summary

If your agent produces a final summary, wrap-up, or PR description at the end of the run:

```
Tool: summary         -> {"type":"generate_summary", ...}
Action: wrap_up       -> {"type":"generate_summary", ...}
Phase: report         -> {"type":"generate_summary", ...}
Tool: generate_report -> {"type":"generate_summary", ...}
```

## Minimal example

The smallest valid JSONL file. Only `type` is provided; everything else uses defaults.

```jsonl
{"type":"read_file"}
{"type":"edit_file","file":"src/app.ts"}
{"type":"run_command","command":"npm test"}
{"type":"test_passed"}
```

Produces a 4-action trace with auto-generated IDs, `"Untitled action"` titles where missing, `"low"` risk on all actions, `"0s"` durations, and summaries based on each title.

## Rich example

A realistic 7-action trace covering all action types. See [`examples/generic-agent.jsonl`](../examples/generic-agent.jsonl) for the full file.

```jsonl
{"type":"read_file","title":"Read auth middleware","file":"src/auth/middleware.ts","timestamp":"14:03:12","duration":"18s","risk":"low","summary":"Inspected auth middleware to understand the token validation flow.","details":["Found token extraction from Authorization header"]}
{"type":"edit_file","title":"Fix expired token status code","file":"src/auth/token.ts","timestamp":"14:04:50","duration":"1m 12s","risk":"medium","summary":"Changed the expired-token response from 401 to 403.","details":["Updated status code in the expiry branch"],"diff":"- return res.status(401)\n+ return res.status(403)"}
{"type":"run_command","title":"Run auth tests","command":"npm test -- src/auth/token.test.ts","timestamp":"14:06:12","duration":"45s","risk":"low","summary":"Ran targeted auth tests.","output":"PASS src/auth/helpers.test.ts\nFAIL src/auth/integration.test.ts"}
{"type":"test_failed","title":"Integration test expects old status code","file":"src/auth/integration.test.ts","timestamp":"14:07:02","duration":"28s","risk":"medium","summary":"The integration test was asserting 401 for a different failure mode."}
{"type":"edit_file","title":"Update integration test","file":"src/auth/integration.test.ts","timestamp":"14:08:10","duration":"1m 04s","risk":"medium","summary":"Split test into separate cases.","diff":"+ it('returns 403 for expired tokens with valid signature', ...)"}
{"type":"test_passed","title":"Full verification","command":"npm test","timestamp":"14:09:30","duration":"2m 18s","risk":"low","summary":"All tests pass.","output":"Test Suites: 6 passed\nTests: 42 passed"}
{"type":"generate_summary","title":"PR summary","timestamp":"14:10:00","duration":"15s","risk":"low","summary":"One-line fix. Recommend merging.","details":["Changed status code in token.ts","Added regression test in integration.test.ts"]}
```

## Common validation errors

When the import fails, the CLI reports what went wrong. Here are the most common errors and how to fix them.

### Invalid JSON on a line

```
Line 3: invalid JSON.
```

Each line must be valid JSON. Check for missing quotes, trailing commas, or unescaped characters.

Common causes:
- Single quotes instead of double quotes: `{'type':'read_file'}` is invalid JSON.
- Trailing comma: `{"type":"read_file",}` is invalid JSON.
- Unescaped newlines inside a string value.

### Invalid or missing type

```
Line 1: missing or invalid "type". Must be one of: read_file, edit_file, run_command, test_failed, test_passed, generate_summary.
```

The `type` field must be exactly one of the 6 values. Check for typos (`read_file` not `ReadFile` or `read-file`).

### details must be an array of strings

```
details: [1, 2, 3]       -- Wrong. Numbers are not strings.
details: "some text"      -- Wrong. Must be an array.
details: ["ok", "good"]   -- Correct.
```

### Optional fields must be strings

```
file: 42                  -- Wrong. Numbers are not strings.
command: ["npm", "test"]  -- Wrong. Arrays are not strings.
file: "src/app.ts"        -- Correct.
```

## Privacy notes

JSONL files may contain paths, command output, or code snippets. Before sharing or committing a trace:

- Remove secrets, tokens, API keys, and passwords from `output` and `diff` fields.
- Replace private file paths (e.g. internal server names, home directories) with placeholder names.
- Review `command` fields. Commands like `npm test` are safe; commands with credentials or internal URLs should be sanitized.
- Do not commit trace files with sensitive data. `.agentscope/` is in `.gitignore` by convention.

The adapter does not modify your content. It copies field values as-is into the trace file. Sanitization is your responsibility.
