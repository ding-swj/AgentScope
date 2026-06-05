# AgentScope Vision

AgentScope is an open-source visual trace viewer for AI coding agents.

It turns agent behavior into an auditable timeline: what files the agent read, what it changed, what commands it ran, where it failed, how it recovered, and whether verification passed.

Think of it as Chrome DevTools for AI coding agents.

## Problem

AI coding agents can now make real code changes, run commands, and prepare pull requests. But the review experience is still focused on the final diff.

That leaves important questions unanswered:

- Did the agent gather enough context?
- Did it inspect the files that actually mattered?
- Did it run the right tests?
- Did it hide or skip a failure?
- Did it touch files outside the intended scope?
- Can another developer replay the reasoning path?

AgentScope exists to make these runs observable.

## Target Users

| Persona | Need |
| ------- | ---- |
| Developer reviewing an agent PR | Understand whether the agent actually found the bug |
| Tech lead | Spot failure patterns across team agent usage |
| Agent framework builder | Provide users with a standard trace viewer |
| Security reviewer | Inspect touched files, risky commands, and suspicious steps |
| AI researcher | Compare strategies across different agents |

## Design Principles

1. Visual first: timelines, diffs, and logs should be easy to scan.
2. Framework agnostic: any agent should be able to emit a compatible trace.
3. Local first: developers should be able to inspect traces without sending code elsewhere.
4. Evidence oriented: every trust signal should point to concrete actions.
5. Extensible: recorders and adapters can grow around a stable viewer.

## Planned Architecture

```text
Agent recorders
  - Claude Code recorder
  - Codex recorder
  - Aider recorder
  - Cursor adapter
        |
        v
Trace JSON
  - run metadata
  - timeline actions
  - file changes
  - commands
  - risks
  - outputs and diffs
        |
        v
AgentScope UI
  - run list
  - timeline
  - action detail
  - output and diff panel
  - future execution graph
```

## Roadmap

### Phase 1: MVP Polish

- [x] Interactive trace timeline
- [x] Run list with trust score, status, branch, and duration
- [x] Action detail panel
- [x] Output panel for logs and diffs
- [x] Realistic mock data
- [ ] Responsive polish for mobile and tablet
- [ ] Keyboard navigation
- [ ] Action search and filters

### Phase 2: Real Data

- [x] Trace format spec as JSON Schema ([docs/trace-schema.json](trace-schema.json))
- [x] Example trace gallery ([examples/auth-fix.trace.json](../examples/auth-fix.trace.json))
- [ ] File import for trace JSON
- [ ] Claude Code recorder prototype

### Phase 3: Ecosystem

- [ ] GitHub Action summary for pull requests
- [ ] VS Code extension
- [ ] Execution graph
- [ ] CLI command: `agentscope open trace.json`

### Phase 4: Advanced

- [ ] Multi-agent comparison
- [ ] Trust score heuristics
- [ ] Team dashboard
- [ ] Plugin API for recorder adapters

## Non-goals

- AgentScope is not an agent framework.
- AgentScope is not a replacement for CI.
- AgentScope is not a general code review bot.
- AgentScope is a trust and observability layer for agent-generated work.
