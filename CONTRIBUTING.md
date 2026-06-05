# Contributing to AgentScope

Thanks for your interest in contributing.

## Getting started

```bash
git clone https://github.com/your-org/agentscope.git
cd agentscope
npm install
npm run dev
```

Open `http://localhost:5173` to see the mock trace viewer.

## Before submitting a PR

```bash
npm run lint
npm run build
```

Both must pass with no errors.

## What to work on

- See the [README Roadmap](README.md#roadmap) for planned features.
- See [`docs/vision.md`](docs/vision.md) for the project vision and architecture.
- Issues labeled `good first issue` are a good starting point.

## Code style

- Use the existing ESLint config -- no extra rules needed.
- Match the patterns already used in `src/App.tsx` and `src/lib/`.
- Keep it plain ASCII in docs (no emoji, no special Unicode decorators).

## Trace format

If you are adding a recorder adapter or modifying the trace schema, please update [`docs/trace-schema.json`](docs/trace-schema.json) and add a corresponding example to [`examples/`](examples/).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
