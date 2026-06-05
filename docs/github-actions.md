# GitHub Actions Integration

AgentScope can run inside GitHub Actions workflows. The CLI recorder wraps any command and produces a trace JSON file, which is uploaded as a workflow artifact. You can download the artifact and import it into the AgentScope Web UI for visual inspection.

## How it works

1. Your workflow checks out the repo, installs dependencies, and runs the AgentScope CLI recorder.
2. The recorder wraps your command (e.g. `npm test`) and writes a trace file to `.agentscope/`.
3. The workflow validates the generated trace file.
4. The `upload-artifact` step archives the trace file.
5. After the workflow finishes, download the artifact from the Actions tab.
6. Open the AgentScope Web UI and import the trace JSON via the Import button or drag-and-drop.

## Suitable commands to record

- `npm test` -- capture test output, failures, and duration
- `npm run lint` -- capture lint errors as actionable evidence
- `npm run build` -- capture build output and warnings
- `npm run typecheck` -- capture type errors
- Any composite CI command: `npm run ci`

## Example workflow

See [`examples/github-actions/record-trace.yml`](../examples/github-actions/record-trace.yml) for a complete, copy-pasteable workflow.

Key steps in the example:

```yaml
- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- run: npm ci
- run: npm run agentscope -- record -- npm run lint
- run: npm run agentscope -- validate .agentscope/*.trace.json
- uses: actions/upload-artifact@v4
  with:
    name: agentscope-trace
    path: .agentscope/*.trace.json
```

## Viewing the trace

After the workflow completes:

1. Go to your GitHub repo's **Actions** tab.
2. Select the workflow run.
3. Scroll to the **Artifacts** section and download `agentscope-trace`.
4. Unzip the artifact and open the `.trace.json` file.
5. In the AgentScope Web UI, click **Import** or drag-and-drop the file.

## Limitations (Phase 1)

- The CLI recorder currently records a single command per trace file. Multi-command runs (edit -> test -> lint) are planned for a later phase.
- Artifact upload is manual for now. Automated PR comments with trace summaries are planned for Phase 2.
- The trace includes exit code and output but does not yet diff files or parse test frameworks.
