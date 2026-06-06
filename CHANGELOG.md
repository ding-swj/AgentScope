# Changelog

All notable changes to AgentScope are documented in this file.

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
