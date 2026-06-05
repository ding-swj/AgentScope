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
- [ ] `private: true` removed from `package.json` (only if publishing the package to npm -- keep it for the repo)

## Every release

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run dev` smoke test passes
- [ ] Import `examples/auth-fix.trace.json` works and renders correctly
- [ ] CLI recorder smoke test passes, if CLI changed
- [ ] Changelog updated (if maintaining one)
- [ ] Tag pushed: `git tag vX.Y.Z && git push --tags`
