# Launch Copy

Copy-pasteable text for announcing AgentScope. Replace `[REPO_URL]` and `[DEMO_URL]` with live links before posting.

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

Live demo: [DEMO_URL]
GitHub: [REPO_URL]
```

(244 characters including placeholder URLs)

---

## 4. Hacker News / Reddit post

**Title:** Show HN: AgentScope -- a visual trace viewer for AI coding agents

**Body:**

AI coding agents are getting good enough to ship real PRs. But the review experience still often comes down to looking at the final diff and deciding whether to trust it. You do not get much visibility into what the agent actually did along the way.

I built AgentScope to make those runs easier to inspect. It is a browser-based trace viewer that shows agent actions in chronological order: file reads, code edits, command runs, test passes/failures, and final summaries.

What it does today (v0.3.0):

- Web UI: interactive timeline with trust score, run list, action detail panel, and diff/output viewer
- CLI recorder: `npm run agentscope -- record -- npm test` wraps a shell command and produces a trace file
- Trace validation: checks required fields, enums, and basic value ranges
- GitHub Actions workflow: record and validate traces in CI, then upload artifacts
- Drag-and-drop trace import in the browser

What it does not do yet:

- It does not capture full agent IDE/tool-call activity. The CLI recorder tracks shell commands for now.
- GitHub Actions uploads artifacts but does not comment on PRs automatically.
- The trace schema is still early and will evolve.

It is open source under the MIT license. If you use AI coding agents regularly and wish you could see more than the final diff, I would appreciate feedback.

Live demo: [DEMO_URL]
GitHub: [REPO_URL]

---

## 5. V2EX / Chinese community post

**Title:** 做了个开源工具：AI coding agent 的可视化 trace viewer

**Body:**

最近我用 AI coding agent 写代码越来越多，但 review 的时候一直有个问题：最后通常只能看到 diff，不知道中间发生了什么。它读了哪些文件、跑了哪些命令、在哪里失败、又是怎么修回来的，这些过程通常都不透明。

所以我做了 AgentScope，一个开源的可视化 trace viewer，把 agent run 变成可以查看和回放的时间线。

目前 v0.3.0 支持 Web UI、CLI recorder、trace validation、GitHub Actions artifact workflow，以及浏览器拖拽导入 trace 文件。也有不少限制：CLI recorder 目前还是 shell command 级别，不是 agent IDE 调用级别；GitHub Actions 现在只上传 artifact，还不会自动评论 PR；界面目前偏桌面端。

技术栈是 React + Vite + TypeScript + Tailwind CSS，MIT 协议。如果你平时也用 Claude Code / Codex / Cursor / Aider，欢迎试试看，也欢迎提建议。

Live demo: [DEMO_URL]
GitHub: [REPO_URL]
