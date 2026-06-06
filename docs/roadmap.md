# AgentScope Roadmap

AgentScope is building a practical trace layer for AI coding agents: record what happened, validate the trace, inspect it visually, and share it with reviewers.

This roadmap is intentionally small and implementation-oriented. The project is most useful when each release makes agent work easier to audit.

## Current Focus

The current focus is turning AgentScope from a useful viewer into a reliable workflow tool:

- Keep the trace format simple and stable.
- Make the CLI safe enough for local and CI usage.
- Support real agent logs through adapters.
- Make PR review output concise and repeatable.

## Near-Term Priorities

### 1. Native Claude Code / Codex Adapters

Status: planned ([#5](https://github.com/ding-swj/AgentScope/issues/5))

The Session JSON adapter is a permissive bridge for common tool-call exports. Native adapters should preserve richer metadata when stable export samples are available.

Expected work:

- Collect anonymized Claude Code and Codex session samples.
- Map native tool names to AgentScope action types.
- Preserve file reads, edits, commands, test results, and summaries.
- Add fixtures and CLI tests for each adapter.

### 2. Timeline Search and Filtering

Status: planned ([#6](https://github.com/ding-swj/AgentScope/issues/6))

Large traces need fast ways to find the important parts.

Expected work:

- Filter by action type: read, edit, command, failed test, passed test, summary.
- Filter by risk: low, medium, high.
- Search title, summary, file, command, and output.
- Keep the selected action stable while filtering.

### 3. Trace Quality Checks

Status: planned ([#7](https://github.com/ding-swj/AgentScope/issues/7))

Validation currently checks structural correctness. The next layer should flag suspicious or incomplete traces.

Expected work:

- Warn when a run has edits but no verification command.
- Warn when a run has failed tests but no later passed test.
- Warn when high-risk edits have no evidence notes.
- Surface quality warnings in CLI summary output.

### 4. PR Comment Improvements

Status: planned ([#8](https://github.com/ding-swj/AgentScope/issues/8))

The current PR comment summary is useful, but still basic.

Expected work:

- Add a compact quality checklist.
- Link uploaded trace artifacts when available.
- Show omitted action counts more clearly.
- Keep comments short enough for repeated PR review.

## Later Ideas

- VS Code extension for opening local traces.
- Execution graph view for read/edit/verify relationships.
- Trace comparison between two agent runs.
- Adapter contribution guide with fixture conventions.
- Optional npm package publishing once the CLI surface stabilizes.

## Good First Issues

Good first issues should be small, testable, and avoid private agent data:

- Add a new anonymized fixture for `import-session`.
- Add one CLI error-path test.
- Improve one README or docs section.
- Add one UI filter with a focused screenshot or browser check.

## Non-Goals For Now

- Scraping private IDE data.
- Reconstructing hidden model reasoning.
- Replacing GitHub review.
- Building a full observability backend.
- Storing traces on a hosted service.
