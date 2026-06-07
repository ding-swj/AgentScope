# Launch Copy

Copy-pasteable text for announcing AgentScope.

---

## 1. One-line pitch

```text
AgentScope: a visual trace viewer that shows what your AI coding agent read, changed, ran, failed, fixed, and verified.
```

---

## 2. GitHub repo short description

```text
Visual trace viewer for AI coding agents. Record, validate, inspect, and summarize agent runs locally or in CI.
```

---

## 3. X / Twitter post

```text
AgentScope makes AI coding agent runs observable.

Instead of blind-reviewing agent PRs, you get a trace: files read, code changed, commands run, failures, recovery, and a PR-ready summary.

v0.13.0 adds compact PR summaries and clearer omitted-action counts.

Live demo: https://ding-swj.github.io/AgentScope/
GitHub: https://github.com/ding-swj/AgentScope
```

---

## 4. Hacker News / Reddit post

**Title:** Show HN: AgentScope -- a visual trace viewer for AI coding agents

**Body:**

AI coding agents are getting good enough to ship real PRs. But the review experience still often comes down to looking at the final diff and deciding whether to trust it. You do not get much visibility into what the agent actually did along the way.

I built AgentScope to make those runs easier to inspect. It is an open-source trace viewer and CLI workflow for AI coding agents.

What it does today (v0.13.0):

- Web UI: interactive timeline, run list, trust score, action details, diffs, and command output
- CLI recorder: `record` wraps any shell command and writes an AgentScope trace
- Trace validation: `validate` checks structure plus quality warnings
- Generic JSONL adapter: `import-jsonl` converts line-delimited agent logs
- Session adapter: `import-session` imports common Claude/Codex-style session exports
- PR summaries: `summarize --dry-run` previews Markdown locally, and GitHub Actions can post or update live PR comments
- Review checklist: each PR summary shows code changes, verification, failure recovery, and high-risk evidence
- Quality warnings: flags edits without verification, failures without recovery, and high-risk edits without evidence
- Compact mode: `summarize --compact` keeps verification output to one line per command
- CLI version: `--version` / `-V` prints the AgentScope CLI version for bug reports
- Test coverage: 30 CLI smoke and error-path tests pass

Current limitations:

- Native Claude Code and Codex adapters are still planned; the Session JSON adapter is a permissive bridge
- VS Code extension is planned
- Execution graph view is planned
- The Web UI shows mock data by default; real traces are imported via the Import button or drag-and-drop

It is MIT licensed. If you use AI coding agents regularly and wish you could see more than the final diff, I would appreciate feedback.

Live demo: https://ding-swj.github.io/AgentScope/
GitHub: https://github.com/ding-swj/AgentScope

---

## 5. V2EX / Chinese community post

**Title:** 做了个开源工具：AI coding agent 的可视化 trace viewer

**Body:**

最近我用 AI coding agent 写代码越来越多，但 review 的时候一直有个问题：最后通常只能看到 diff，不知道中间发生了什么。它读了哪些文件，跑了哪些命令，在哪里失败，又是怎么修回来的，这些过程通常不透明。

所以我做了 AgentScope，一个开源的可视化 trace viewer，把 agent run 变成可以查看和回放的时间线。

目前 v0.13.0 支持：

- Web UI：时间线、run list、trust score、action detail、diff 和 command output
- CLI recorder：`record` 可以把任意 shell command 包成 trace
- Trace validation：`validate` 做结构校验和质量提示
- Generic JSONL adapter：`import-jsonl` 导入通用逐行 JSON agent log
- Session adapter：`import-session` 导入常见 Claude/Codex 风格 session export
- PR summary：`summarize --dry-run` 本地预览，GitHub Actions 里可以自动发/更新 PR comment
- Review checklist：PR summary 里显示代码改动、验证、失败恢复、高风险证据
- Quality warnings：提示改了代码但没验证、失败后没恢复、高风险改动缺证据
- Compact mode：`summarize --compact` 把验证输出压成每条命令一行
- CLI version：`--version` / `-V` 方便 bug report 填版本
- 30 个 CLI smoke / error-path 测试通过

当前限制：

- native Claude Code / Codex adapter 还在计划中，Session JSON adapter 目前是比较宽松的桥接层
- VS Code extension 还在计划中
- execution graph 还在计划中
- Web UI 默认展示 mock data，真实 trace 需要通过 Import 按钮或拖拽导入

技术栈是 React + Vite + TypeScript + Tailwind CSS，MIT 协议。如果你平时也用 Claude Code / Codex / Cursor / Aider，欢迎试试看，也欢迎提建议。

Live demo: https://ding-swj.github.io/AgentScope/
GitHub: https://github.com/ding-swj/AgentScope
