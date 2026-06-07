# Release Checklist

Run through this list before tagging a GitHub release.

## Before the first release

- [x] `npm run lint` passes with no errors
- [x] `npm run build` passes with no errors
- [x] `README.md` has a screenshot in the Screenshot section
- [x] `LICENSE` file exists (MIT)
- [x] `CONTRIBUTING.md` exists
- [x] `docs/trace-schema.json` is up to date
- [x] `examples/auth-fix.trace.json` is valid and matches the schema
- [x] `git init` completed and initial commit made
- [ ] GitHub repo description set
- [ ] GitHub topics set: `ai`, `coding-agent`, `trace-viewer`, `developer-tools`, `observability`, `react`, `typescript`
- [ ] `private: true` removed from `package.json` (only if publishing the package to npm; keep it for the repo)

## v0.3.0 release

- [x] `CHANGELOG.md` includes v0.3.0 entry
- [x] `docs/release-notes/v0.3.0.md` written
- [x] `README.md` links to changelog and release notes
- [x] CLI recorder smoke test: `npm run agentscope -- record -- npm run lint`
- [x] Trace validation smoke test: `npm run agentscope -- validate examples/auth-fix.trace.json`
- [x] Web UI opens and imports `examples/auth-fix.trace.json`
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Git tag created: `git tag v0.3.0`
- [x] GitHub Release published with `docs/release-notes/v0.3.0.md` content

## v0.4.0 release

- [x] `CHANGELOG.md` includes v0.4.0 entry
- [x] `docs/release-notes/v0.4.0.md` written
- [x] `README.md` links to v0.4.0 release notes
- [x] Import JSONL smoke test: `npm run agentscope -- import-jsonl examples/generic-agent.jsonl`
- [x] Validate generated trace: `npm run agentscope -- validate .agentscope/*.trace.json`
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Git tag created: `git tag v0.4.0`
- [x] GitHub Release published with `docs/release-notes/v0.4.0.md` content

## v0.5.0 release

- [x] `CHANGELOG.md` includes v0.5.0 entry
- [x] `docs/release-notes/v0.5.0.md` written
- [x] `README.md` links to v0.5.0 release notes
- [x] GitHub Actions guide documents PR summary comments
- [x] GitHub Actions example workflow posts PR summary comments
- [x] Summary dry-run smoke test: `npm run agentscope -- summarize --input examples/auth-fix.trace.json --dry-run`
- [x] Non-dry-run environment validation tested outside GitHub Actions
- [x] Mocked GitHub comment create/update paths tested
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Git tag created: `git tag v0.5.0`
- [x] GitHub Release published with `docs/release-notes/v0.5.0.md` content

## v0.6.0 release

- [x] `CHANGELOG.md` includes v0.6.0 entry
- [x] `docs/release-notes/v0.6.0.md` written
- [x] `README.md` links to v0.6.0 release notes
- [x] Session JSON guide written: `docs/session-json.md`
- [x] Example session added: `examples/agent-session.json`
- [x] Session import smoke test: `npm run agentscope -- import-session examples/agent-session.json`
- [x] Validate generated trace: `npm run agentscope -- validate .agentscope/*.trace.json`
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Git tag created: `git tag v0.6.0`
- [x] GitHub Release published with `docs/release-notes/v0.6.0.md` content

## v0.7.0 release

- [x] `CHANGELOG.md` includes v0.7.0 entry
- [x] `docs/release-notes/v0.7.0.md` written
- [x] `README.md` links to v0.7.0 release notes
- [x] `npm test` covers CLI smoke and error paths
- [x] `record` validates generated traces before writing
- [x] `record` success and failure command tests pass
- [x] `validate` error-path tests pass
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Git tag created: `git tag v0.7.0`
- [x] GitHub Release published with `docs/release-notes/v0.7.0.md` content

## v0.8.0 release

- [x] `CHANGELOG.md` includes v0.8.0 entry
- [x] `docs/release-notes/v0.8.0.md` written
- [x] `README.md` links to v0.8.0 release notes
- [x] `validate` prints quality warnings to stderr for suspicious traces
- [x] `summarize --dry-run` renders `### Trace Quality Warnings` section
- [x] All three warning rules have CLI test coverage
- [x] Multi-warning on the same run is covered by a test
- [x] Clean traces produce no warnings (tested on `examples/auth-fix.trace.json`)
- [x] `npm test` (19 pass, 0 fail)
- [x] `npm run lint` passes
- [x] `npm run build` passes
- [x] Git tag created: `git tag v0.8.0`
- [x] GitHub Release published with `docs/release-notes/v0.8.0.md` content

## v0.9.0 release

- [x] CHANGELOG.md includes v0.9.0 entry
- [x] docs/release-notes/v0.9.0.md written
- [x] README.md links to v0.9.0 release notes
- [x] summarize renders Review Checklist table above actions table
- [x] Checklist covers Code changes, Verification, Failures recovered, High-risk evidence
- [x] auth-fix trace checklist passes all 4 checks
- [x] Edits-without-verification checklist test passes
- [x] Failed-tests-without-recovery checklist test passes
- [x] npm test (21 pass, 0 fail)
- [x] npm run lint passes
- [x] npm run build passes
- [x] Git tag created: git tag v0.9.0
- [x] GitHub Release published with docs/release-notes/v0.9.0.md content

## v0.10.0 release

- [x] CHANGELOG.md includes v0.10.0 entry
- [x] docs/release-notes/v0.10.0.md written
- [x] README.md links to v0.10.0 release notes
- [x] 5 new CLI error-path tests covering record, summarize, import-session
- [x] docs/roadmap.md #7 status updated to since v0.8.0
- [x] npm test (26 pass, 0 fail)
- [x] npm run lint passes
- [x] npm run build passes
- [x] Git tag created: git tag v0.10.0
- [x] GitHub Release published with docs/release-notes/v0.10.0.md content

## v0.11.0 release

- [x] CHANGELOG.md includes v0.11.0 entry
- [x] docs/release-notes/v0.11.0.md written
- [x] README.md links to v0.11.0 release notes
- [x] --version flag prints "AgentScope CLI v0.11.0"
- [x] npm test (27 pass, 0 fail)
- [x] npm run lint passes
- [x] npm run build passes
- [x] Git tag created: git tag v0.11.0
- [x] GitHub Release published with docs/release-notes/v0.11.0.md content

## v0.12.0 release

- [x] CHANGELOG.md includes v0.12.0 entry
- [x] docs/release-notes/v0.12.0.md written
- [x] README.md links to v0.12.0 release notes
- [x] CLI_VERSION bumped to 0.11.0
- [x] README test count corrected to 27
- [x] --version test uses exact match
- [x] npm test (28 pass, 0 fail)
- [x] npm run lint passes
- [x] npm run build passes
- [x] Git tag created: git tag v0.12.0
- [x] GitHub Release published with docs/release-notes/v0.12.0.md content

## v0.13.0 release

- [x] CHANGELOG.md includes v0.13.0 entry
- [x] docs/release-notes/v0.13.0.md written
- [x] README.md links to v0.13.0 release notes
- [x] summarize omitted action counts show type breakdown
- [x] summarize --compact reduces verification output
- [x] docs/roadmap.md #8 omitted-count and compact-comment items checked
- [x] npm test (30 pass, 0 fail)
- [x] npm run lint passes
- [x] npm run build passes
- [x] summarize --dry-run smoke test passes
- [x] summarize --compact --dry-run smoke test passes
- [ ] Git tag created: git tag v0.13.0
- [ ] GitHub Release published with docs/release-notes/v0.13.0.md content

## Every release

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run dev` smoke test passes
- [ ] CLI_VERSION in `bin/agentscope.js` matches the new tag
- [ ] Import `examples/auth-fix.trace.json` works and renders correctly
- [ ] CLI recorder smoke test passes, if CLI changed
- [ ] GitHub Actions example workflow is up to date, if CI docs changed
- [ ] Changelog updated (if maintaining one)
- [ ] Tag pushed: `git tag vX.Y.Z && git push --tags`
