# Launch Copy

Copy-pasteable text for announcing AgentScope.

---

## 1. One-line pitch

```text
AgentScope: a visual trace viewer that shows you what your AI coding agent read, changed, ran, failed, and fixed.
```

(112 characters)

---

## 2. GitHub repo short description

```text
Visual trace viewer for AI coding agents. Record, validate, and inspect agent runs locally or in CI.
```

(99 characters)

---

## 3. X / Twitter post

```text
AgentScope makes AI coding agent runs observable.

Instead of blind-reviewing agent PRs, you get an interactive timeline: files read, code changed, commands run, test failures, and final summaries.

Live demo: https://ding-swj.github.io/AgentScope/
GitHub: https://github.com/ding-swj/AgentScope
```

(244 characters including URLs)

---

## 4. Hacker News / Reddit post

**Title:** Show HN: AgentScope -- a visual trace viewer for AI coding agents

**Body:**

AI coding agents are getting good enough to ship real PRs. But the review experience still often comes down to looking at the final diff and deciding whether to trust it. You do not get much visibility into what the agent actually did along the way.

I built AgentScope to make those runs easier to inspect. It is a browser-based trace viewer that shows agent actions in chronological order: file reads, code edits, command runs, test passes/failures, and final summaries.

What it does today (v0.7.0):

- Web UI: interactive timeline with trust score, run list, action detail panel, and diff/output viewer
- CLI recorder: `npm run agentscope -- record -- npm test` wraps a shell command and produces a trace file
- Trace validation: checks required fields, enums, and basic value ranges
- Generic JSONL adapter: import line-delimited agent action logs
- Session JSON adapter: import Claude/Codex-style session exports
- PR summary comments: `summarize --dry-run` for local preview, or post live comments in GitHub Actions
- GitHub Actions workflow: record, validate, summarize, and comment on PRs in CI
- CLI test suite: 13 tests covering import, validate, summarize, and record with happy and error paths
- Drag-and-drop trace import in the browser

What it does not do yet:

- Native Claude Code and Codex adapters are still planned (the Session JSON adapter is a permissive bridge)
- No VS Code extension yet
- No execution graph view for read/edit/verify relationships
- The Web UI still shows mock data by default; real traces are imported via the Import button or drag-and-drop

It is open source under the MIT license. If you use AI coding agents regularly and wish you could see more than the final diff, I would appreciate feedback.

Live demo: https://ding-swj.github.io/AgentScope/
GitHub: https://github.com/ding-swj/AgentScope

---

## 5. V2EX / Chinese community post

**Title:** 做了个开源工具：AI coding agent 的可视化 trace viewer

**Body:**

最近我用 AI coding agent 写代码越来越多，但 review 的时候一直有个问题：最后通常只能看到 diff，不知道中间发生了什么。它读了哪些文件、跑了哪些命令、在哪里失败、又是怎么修回来的，这些过程通常都不透明。

所以我做了 AgentScope，一个开源的可视化 trace viewer，把 agent run 变成可以查看和回放的时间线。

目前 v0.7.0 支持 Web UI、CLI recorder、trace validation、Generic JSONL adapter、Session JSON adapter（可导入 Claude/Codex 风格的 session 导出）、PR summary comment（dry-run 本地预览或 GitHub Actions 自动评论）、CLI 测试套件（13 个测试覆盖 happy path 和 error path），以及浏览器拖拽导入 trace 文件。

限制：native Claude Code / Codex adapter 还在计划中（Session JSON adapter 是一个容错性较强的桥接层）；VS Code 扩展还没做；执行图（execution graph）还没做；Web UI 默认展示 mock 数据，真实 trace 通过 Import 按钮或拖拽导入。

技术栈是 React + Vite + TypeScript + Tailwind CSS，MIT 协议。如果你平时也用 Claude Code / Codex / Cursor / Aider，欢迎试试看，也欢迎提建议。

Live demo: https://ding-swj.github.io/AgentScope/
GitHub: https://github.com/ding-swj/AgentScope

