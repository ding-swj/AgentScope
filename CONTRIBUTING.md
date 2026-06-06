# Contributing to AgentScope

Thanks for your interest in contributing.

## Getting started

```bash
git clone https://github.com/ding-swj/AgentScope.git
cd AgentScope
npm install
npm run dev
```

Open `http://localhost:5173` to see the mock trace viewer.

## Before submitting a PR

```bash
npm run lint
npm test
npm run build
```

All three must pass with no errors.

## What to work on

- See the [README Roadmap](README.md#roadmap) for planned features.
- See [`docs/vision.md`](docs/vision.md) for the project vision and architecture.
- See [`docs/roadmap.md`](docs/roadmap.md) for near-term priorities and issue links.
- Issues labeled `good first issue` are a good starting point.

## Code style

- Use the existing ESLint config -- no extra rules needed.
- Match the patterns already used in `src/App.tsx`.
- CLI code lives in `bin/agentscope.js`; tests live in `test/agentscope-cli.test.mjs`.
- Keep it plain ASCII in docs (no emoji, no special Unicode decorators).

## CLI changes

- Any change to `bin/agentscope.js` must pass `npm test`.
- New subcommand behavior should include a CLI test case.
- Error paths should include a `runCliFailure`-style test that asserts the exact error message.

## Trace format

If you are adding a recorder adapter or modifying the trace schema, please update [`docs/trace-schema.json`](docs/trace-schema.json) and add a corresponding example to [`examples/`](examples/). Keep docs, examples, and the schema in sync.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
