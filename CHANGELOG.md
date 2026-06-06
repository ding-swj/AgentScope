# Changelog

All notable changes to AgentScope are documented in this file.

## [0.8.0] - 2026-06-06

### Added

- **Trace quality warnings.** `validate` and `summarize` now surface advisory warnings for edits without verification, failed tests without recovery, and high-risk edits without evidence notes.
- **Compact review checklist.** `summarize` now renders a review checklist above the actions table so reviewers can assess a run at a glance.

## [0.7.0] - 2026-06-06

### Added

- **CLI smoke tests.** `npm test` now runs Node's built-in test runner against the CLI import, validate, and summarize flows.
- **CLI error-path coverage.** Tests now lock in user-facing errors for invalid JSONL, empty/unsupported session imports, and PR summary posting without GitHub credentials.
- **Recorded trace validation check.** `record` now validates generated traces before writing them and has smoke test coverage for a successful recorded command.
- **Validate command error tests.** `npm test` now covers missing trace files, wrong schema versions, and empty `runs` arrays.
- **Record failing-command test.** `record` failing-command behavior is covered by CLI tests, locking in trace output on failure, exit code passthrough, and evidence notes.

## [0.6.0] - 2026-06-06

### Added

- **Session JSON adapter.** `npm run agentscope -- import-session <input.json>` imports common Claude/Codex-style JSON session exports and normalizes tool calls into AgentScope traces.
- **Session adapter guide and example.** `docs/session-json.md` documents accepted shapes, field mapping, action mapping, generated metadata, and limitations. `examples/agent-session.json` provides an anonymized sample session.

## [0.5.0] - 2026-06-06

### Added

- **PR summary comments.** `npm run agentscope -- summarize --input <trace.json>` can create or update an AgentScope Markdown summary comment on pull requests when run in GitHub Actions.
- **Dry-run summary rendering.** `npm run agentscope -- summarize --input <trace.json> --dry-run` renders the same Markdown locally without calling GitHub.
- **Duplicate comment prevention.** PR comments include the hidden `<!-- agentscope-summary -->` marker so repeated workflow runs update the existing AgentScope comment instead of creating duplicates.

### Changed

- **GitHub Actions workflow guide and example** now show the full flow: record a trace, validate it, post a PR summary comment, upload the trace artifact, and preserve the recorded command status.
- **README** now documents the PR comment workflow and marks GitHub Action PR trace reports as available.

## [0.4.0] - 2026-06-06

### Added

- **Generic JSONL adapter.** `npm run agentscope -- import-jsonl <input.jsonl>` reads line-delimited JSON action logs and converts them to AgentScope trace files. Each line maps to one `TraceAction`.
- **Example JSONL trace.** `examples/generic-agent.jsonl` contains a 7-action trace covering all 6 action types.
- **Auto-generated run metadata.** The adapter infers `status`, `trustScore`, `filesChanged`, and `commands` from the action list when these fields are not explicitly provided.

### Changed

- **`docs/adapters.md`** now marks Generic JSONL as MVP available, with a Usage section, field table, and example.

### Fixed

- **Trace output avoids overwriting files generated in the same second.** `writeTrace` now appends a suffix (`-2`, `-3`, ...) when the target path already exists.

## [0.3.0] - 2026-06-06

### Added

- **CLI recorder.** `npm run agentscope -- record -- <command>` wraps any shell command and produces a trace JSON file in `.agentscope/`. Captures exit code, stdout, stderr, duration, working directory, and git branch.
- **Trace validation.** `npm run agentscope -- validate <trace-file>` checks required fields, enums, and basic value ranges for AgentScope trace JSON files.
- **GitHub Actions integration.** Documented workflow and example (`examples/github-actions/record-trace.yml`) for running the recorder and validator in CI and uploading traces as workflow artifacts.
- **Drag-and-drop import.** Trace JSON files can be dragged onto the Web UI to import them, in addition to the Import button.
- **Trace schema published.** `docs/trace-schema.json` defines the AgentScope trace format as JSON Schema draft-07.
- **Example trace.** `examples/auth-fix.trace.json` provides a realistic 8-step trace of an auth token fix, importable into the Web UI.
- **Lightweight validation in the Web UI.** Imported traces are validated client-side (no ajv) with per-run and per-action checks.
- **Project docs.** `CONTRIBUTING.md`, `docs/vision.md`, `docs/github-actions.md`, `docs/release-checklist.md`.

### Changed

- **README overhaul.** Added Screenshot, CLI Recorder, GitHub Actions, Trace Format sections.
- **UI polish.** HTML title, meta tags, dark scrollbars, trace source badge in header, empty-state copy updated.
- **Trace format alignment.** TypeScript types in `src/data/mockTrace.ts` match the published `docs/trace-schema.json`.

### Fixed

- Nothing to report for the first published release.

## [0.1.0] - 2026-06-05

Initial prototype: interactive trace timeline, run list with trust score, action detail panel, output panel, and mock trace data.
