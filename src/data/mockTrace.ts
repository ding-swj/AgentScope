/** Matches docs/trace-schema.json schemaVersion const. */
export const SCHEMA_VERSION = '1.0.0'

export type ActionType =
  | 'read_file'
  | 'edit_file'
  | 'run_command'
  | 'test_failed'
  | 'test_passed'
  | 'generate_summary'

export type TraceAction = {
  id: string
  type: ActionType
  title: string
  file?: string
  command?: string
  timestamp: string
  duration: string
  risk: 'low' | 'medium' | 'high'
  summary: string
  details: string[]
  output?: string
  diff?: string
}

export type AgentRun = {
  id: string
  title: string
  agent: string
  branch: string
  status: 'passed' | 'failed' | 'warning'
  trustScore: number
  filesChanged: number
  commands: number
  duration: string
  cost: string
  startedAt: string
  actions: TraceAction[]
}

export type TraceFile = {
  schemaVersion: typeof SCHEMA_VERSION
  runs: AgentRun[]
}

export const mockTrace: TraceFile = {
  schemaVersion: SCHEMA_VERSION,
  runs: [
  {
    id: 'run-auth-421',
    title: 'Fix failing auth token expiry tests',
    agent: 'Claude Code + DeepSeek V4 Pro',
    branch: 'fix/auth-token-expiry',
    status: 'passed',
    trustScore: 92,
    filesChanged: 4,
    commands: 7,
    duration: '12m 48s',
    cost: '$0.38',
    startedAt: 'Today, 18:41',
    actions: [
      {
        id: 'a1',
        type: 'read_file',
        title: 'Read failing test context',
        file: 'src/auth/session.test.ts',
        timestamp: '18:41:12',
        duration: '24s',
        risk: 'low',
        summary: 'Inspected the failing expiry test and related fixture setup before editing production code.',
        details: [
          'Found expected expiry time is mocked at 15 minutes.',
          'Confirmed failure only appears when refresh tokens are present.',
          'No source files changed during this step.',
        ],
        output: 'session.test.ts: expected token.expiresAt to equal mockedNow + 900000',
      },
      {
        id: 'a2',
        type: 'read_file',
        title: 'Trace session creation path',
        file: 'src/auth/session.ts',
        timestamp: '18:42:03',
        duration: '48s',
        risk: 'low',
        summary: 'Followed the session factory and token refresh branch to locate the incorrect expiry calculation.',
        details: [
          'Session creation delegates expiry to createAccessToken.',
          'Refresh branch passes Date.now() directly instead of the injected clock.',
          'The bug is isolated to token time source handling.',
        ],
      },
      {
        id: 'a3',
        type: 'edit_file',
        title: 'Patch expiry source',
        file: 'src/auth/token.ts',
        timestamp: '18:43:10',
        duration: '1m 16s',
        risk: 'medium',
        summary: 'Changed access token creation to use the existing clock abstraction across both normal and refresh flows.',
        details: [
          'Reused the existing clock dependency.',
          'Kept public token shape unchanged.',
          'Limited the edit to expiry calculation and one test fixture.',
        ],
        diff: `- const expiresAt = Date.now() + ACCESS_TOKEN_TTL_MS
+ const expiresAt = clock.now() + ACCESS_TOKEN_TTL_MS
 
  return {
    subject: user.id,
    expiresAt,
  }`,
      },
      {
        id: 'a4',
        type: 'run_command',
        title: 'Run targeted auth tests',
        command: 'npm test -- session.test.ts',
        timestamp: '18:45:01',
        duration: '39s',
        risk: 'low',
        summary: 'Executed the narrow test file first to validate the suspected fix quickly.',
        details: [
          'One assertion still failed in the refresh-token path.',
          'The command completed without lint or type errors.',
          'Next step focused on fixture setup rather than broad refactor.',
        ],
        output: `FAIL src/auth/session.test.ts
  refresh session
    x preserves mocked expiry source

Expected: 1717600500000
Received: 1717601400000`,
      },
      {
        id: 'a5',
        type: 'test_failed',
        title: 'Failure isolated to refresh fixture',
        file: 'src/auth/session.test.ts',
        timestamp: '18:45:44',
        duration: '1m 03s',
        risk: 'medium',
        summary: 'The failure showed the test helper was creating a real clock for the refresh-token fixture.',
        details: [
          'Production fix was directionally correct.',
          'Fixture helper bypassed the mocked clock only in refresh sessions.',
          'Risk stayed medium because test code and production code both changed.',
        ],
      },
      {
        id: 'a6',
        type: 'edit_file',
        title: 'Align refresh test fixture',
        file: 'src/auth/session.test.ts',
        timestamp: '18:47:02',
        duration: '2m 07s',
        risk: 'medium',
        summary: 'Updated the refresh fixture to receive the same deterministic clock as the main session factory.',
        details: [
          'No snapshots or broad expectations were rewritten.',
          'Fixture now mirrors production dependency injection.',
          'Added one regression assertion for refresh expiry.',
        ],
        diff: `- const refreshSession = createRefreshSession(user)
+ const refreshSession = createRefreshSession(user, { clock })
 
+ expect(refreshSession.accessToken.expiresAt).toBe(mockedNow + ACCESS_TOKEN_TTL_MS)`,
      },
      {
        id: 'a7',
        type: 'test_passed',
        title: 'Run full verification',
        command: 'npm test && npm run typecheck',
        timestamp: '18:49:36',
        duration: '2m 44s',
        risk: 'low',
        summary: 'Targeted and full verification passed after the fixture alignment.',
        details: [
          '238 tests passed.',
          'TypeScript completed with zero errors.',
          'No unexpected files changed after final diff review.',
        ],
        output: `PASS src/auth/session.test.ts
PASS src/auth/token.test.ts

Test Suites: 18 passed, 18 total
Tests: 238 passed, 238 total
Typecheck: clean`,
      },
      {
        id: 'a8',
        type: 'generate_summary',
        title: 'Generate PR summary',
        timestamp: '18:53:14',
        duration: '31s',
        risk: 'low',
        summary: 'Produced a reviewer-ready summary with changed files, verification commands, and risk notes.',
        details: [
          'Marked production change as low blast radius.',
          'Called out modified fixture and new regression assertion.',
          'Recommended no follow-up migration.',
        ],
        output: `Summary:
- Use injected clock for access token expiry.
- Align refresh session fixture with production clock injection.

Verification:
- npm test
- npm run typecheck`,
      },
    ],
  },
  {
    id: 'run-billing-118',
    title: 'Investigate billing webhook duplicate charge',
    agent: 'Codex',
    branch: 'investigate/webhook-idempotency',
    status: 'warning',
    trustScore: 71,
    filesChanged: 2,
    commands: 5,
    duration: '9m 12s',
    cost: '$0.21',
    startedAt: 'Yesterday, 21:05',
    actions: [],
  },
  {
    id: 'run-cache-087',
    title: 'Reduce dashboard cache invalidations',
    agent: 'Claude Code',
    branch: 'perf/dashboard-cache',
    status: 'failed',
    trustScore: 46,
    filesChanged: 9,
    commands: 4,
    duration: '16m 03s',
    cost: '$0.44',
    startedAt: 'May 31, 10:18',
    actions: [],
  },
  ],
}

export const runs = mockTrace.runs
