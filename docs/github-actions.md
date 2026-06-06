# GitHub Actions Integration

AgentScope can run inside GitHub Actions workflows. The CLI recorder wraps any command and produces a trace JSON file, which can be validated, uploaded as an artifact, and summarized in a pull request comment.

## How it works

1. Your workflow checks out the repo, installs dependencies, and runs the AgentScope CLI recorder.
2. The recorder wraps your command (e.g. `npm test`) and writes a trace file to `.agentscope/`.
3. The workflow validates the generated trace file.
4. On pull requests, the workflow creates or updates one AgentScope summary comment.
5. The `upload-artifact` step archives the trace file.
6. After the workflow finishes, download the artifact from the Actions tab.
7. Open the AgentScope Web UI and import the trace JSON via the Import button or drag-and-drop.

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
permissions:
  contents: read
  issues: write
  pull-requests: write

- uses: actions/checkout@v4
- uses: actions/setup-node@v4
  with:
    node-version: '20'
- run: npm ci
- id: record
  continue-on-error: true
  run: npm run agentscope -- record -- npm run lint
- run: npm run agentscope -- validate .agentscope/*.trace.json
- run: npm run agentscope -- summarize --input .agentscope/*.trace.json
  if: always() && github.event_name == 'pull_request'
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
- uses: actions/upload-artifact@v4
  with:
    name: agentscope-trace
    path: .agentscope/*.trace.json
- name: Preserve recorded command status
  if: steps.record.outcome == 'failure'
  run: exit 1
```

The recorder step uses `continue-on-error: true` so the trace can still be validated, uploaded, and summarized when the recorded command fails. The final step restores the original command status so CI still fails when the recorded command fails.

## Pull request summary comments

On pull requests, AgentScope can post a Markdown summary with run metadata, an action table, and verification output:

```bash
npm run agentscope -- summarize --input .agentscope/*.trace.json
```

Repeated workflow runs update the existing AgentScope comment instead of creating duplicates. The CLI uses a hidden marker in the comment body to find the previous comment.

## Viewing the trace

After the workflow completes:

1. Go to your GitHub repo's **Actions** tab.
2. Select the workflow run.
3. Scroll to the **Artifacts** section and download `agentscope-trace`.
4. Unzip the artifact and open the `.trace.json` file.
5. In the AgentScope Web UI, click **Import** or drag-and-drop the file.

## Limitations

- The CLI recorder currently records a single command per trace file. Multi-command runs (edit -> test -> lint) are planned for a later phase.
- PR comments summarize existing trace files only. They do not call an LLM or create new trace data.
- The trace includes exit code and output but does not yet diff files or parse test frameworks.
