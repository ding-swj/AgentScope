# Changelog

All notable changes to AgentScope are documented in this file.

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
