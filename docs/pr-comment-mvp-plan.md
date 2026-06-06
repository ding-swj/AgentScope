# GitHub PR Comment MVP Plan

This document tracks the plan for turning AgentScope trace files into GitHub PR summary comments.

## Phase 1: Dry-Run Summary

Status: implemented.

Command:

```bash
npm run agentscope -- summarize --input <trace.json> --dry-run
```

What it does:

- Reads an existing AgentScope trace JSON file.
- Validates it with the same lightweight trace validation used by `validate`.
- Prints an ASCII-only Markdown summary to stdout.
- Does not call the GitHub API.
- Does not post or update PR comments yet.

The generated Markdown includes:

- Run status, trust score, files changed, commands, duration, and cost.
- An actions table with `#`, `type`, `title`, and `risk`.
- A verification section based on `run_command`, `test_failed`, and `test_passed` actions.
- A footer with the run id.
- Multi-run trace support, with a summary table and one section per run.

Large traces are truncated in the actions table after 20 actions.

## Phase 2: PR Comment Posting

Status: planned.

Target command:

```bash
npm run agentscope -- summarize --input <trace.json>
```

When `--dry-run` is omitted, a future implementation will:

- Read `GITHUB_TOKEN`.
- Detect PR context from GitHub Actions environment variables.
- Generate the same Markdown summary.
- Find an existing AgentScope comment using an HTML marker.
- Update the old comment or create a new one.

Recommended workflow permissions:

```yaml
permissions:
  contents: read
  issues: write
  pull-requests: write
```

## Comment Marker

Phase 2 should use this hidden marker as the first line of generated comments:

```markdown
<!-- agentscope-summary -->
```

This keeps repeated workflow runs from creating duplicate comments.

## Not In Scope For The MVP

- No external API or LLM summarization.
- No App UI changes.
- No Octokit or `@actions/github` dependency.
- No inline code review comments.
- No push-event comments.
- No configuration file.

## Test Plan

Phase 1:

```bash
npm run agentscope -- summarize --input examples/auth-fix.trace.json --dry-run
npm run agentscope -- import-jsonl examples/generic-agent.jsonl
npm run agentscope -- summarize --input .agentscope/<generated>.trace.json --dry-run
npm run lint
npm run build
```

Phase 2:

- Create a test PR.
- Run the workflow once and verify a comment is created.
- Run it again and verify the existing comment is updated.
- Delete the comment and verify the next run creates a new one.
