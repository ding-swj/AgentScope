import type { AgentRun } from '../data/mockTrace'

// ---------------------------------------------------------------------------
// Runtime enums (kept inline so we don't need a separate constants file)
// ---------------------------------------------------------------------------

const VALID_STATUSES = new Set<string>(['passed', 'failed', 'warning'])

const VALID_ACTION_TYPES = new Set<string>([
  'read_file',
  'edit_file',
  'run_command',
  'test_failed',
  'test_passed',
  'generate_summary',
])

const VALID_RISKS = new Set<string>(['low', 'medium', 'high'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value)
}

function isStringArray(value: unknown): value is string[] {
  if (!Array.isArray(value)) return false
  return value.every((item) => isString(item))
}

// ---------------------------------------------------------------------------
// Validation result
// ---------------------------------------------------------------------------

type ValidationResult =
  | { ok: true; runs: AgentRun[] }
  | { ok: false; message: string }

// ---------------------------------------------------------------------------
// Run-level validation
// ---------------------------------------------------------------------------

const RUN_REQUIRED_STRINGS = [
  'id',
  'title',
  'agent',
  'status',
  'duration',
  'startedAt',
  'cost',
] as const

function validateRun(run: unknown, index: number): string | null {
  if (!isObject(run)) {
    return `Run [${index}]: expected an object but got ${typeof run}.`
  }

  // Required string fields
  for (const field of RUN_REQUIRED_STRINGS) {
    if (!isString(run[field])) {
      return `Run [${index}]: missing or invalid required field "${field}".`
    }
  }

  // status enum
  if (!isString(run.status) || !VALID_STATUSES.has(run.status)) {
    return `Run [${index}]: invalid status "${run.status}" (expected one of: passed, failed, warning).`
  }

  // trustScore: number, 0-100
  if (!isNumber(run.trustScore)) {
    return `Run [${index}]: "trustScore" must be a number.`
  }
  if (run.trustScore < 0 || run.trustScore > 100) {
    return `Run [${index}]: "trustScore" must be between 0 and 100, got ${run.trustScore}.`
  }

  // filesChanged: number
  if (!isNumber(run.filesChanged) || run.filesChanged < 0) {
    return `Run [${index}]: "filesChanged" must be a non-negative number.`
  }

  // commands: number
  if (!isNumber(run.commands) || run.commands < 0) {
    return `Run [${index}]: "commands" must be a non-negative number.`
  }

  // actions: array
  if (!Array.isArray(run.actions)) {
    return `Run [${index}]: "actions" must be an array.`
  }

  for (let ai = 0; ai < run.actions.length; ai++) {
    const err = validateAction(run.actions[ai], index, ai)
    if (err) return err
  }

  return null
}

// ---------------------------------------------------------------------------
// Action-level validation
// ---------------------------------------------------------------------------

const ACTION_REQUIRED_STRINGS = [
  'id',
  'title',
  'timestamp',
  'duration',
  'summary',
] as const

function validateAction(
  action: unknown,
  runIndex: number,
  actionIndex: number,
): string | null {
  const prefix = `Run [${runIndex}], action [${actionIndex}]`

  if (!isObject(action)) {
    return `${prefix}: expected an object but got ${typeof action}.`
  }

  // Required string fields
  for (const field of ACTION_REQUIRED_STRINGS) {
    if (!isString(action[field])) {
      return `${prefix}: missing or invalid required field "${field}".`
    }
  }

  // type: enum
  const actionType = action.type
  if (!isString(actionType) || !VALID_ACTION_TYPES.has(actionType)) {
    return `${prefix}: invalid "type" "${action.type}" (expected one of: read_file, edit_file, run_command, test_failed, test_passed, generate_summary).`
  }

  // risk: enum
  const actionRisk = action.risk
  if (!isString(actionRisk) || !VALID_RISKS.has(actionRisk)) {
    return `${prefix}: invalid "risk" "${action.risk}" (expected one of: low, medium, high).`
  }

  // details: string[]
  if (!isStringArray(action.details)) {
    return `${prefix}: "details" must be an array of strings.`
  }

  // Optional string fields: present values must be strings
  const optionalStrings = ['file', 'command', 'output', 'diff'] as const
  for (const field of optionalStrings) {
    if (action[field] !== undefined && !isString(action[field])) {
      return `${prefix}: optional field "${field}" must be a string if provided.`
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function validateTraceFile(raw: unknown): ValidationResult {
  // Top-level must be an object
  if (!isObject(raw)) {
    return {
      ok: false,
      message: `Invalid trace: expected a JSON object at the top level, got ${typeof raw}.`,
    }
  }

  // runs must be present and be an array
  if (!Array.isArray(raw.runs)) {
    return {
      ok: false,
      message: 'Invalid trace: missing "runs" array. Is this an AgentScope trace file?',
    }
  }

  // runs must be non-empty
  if (raw.runs.length === 0) {
    return {
      ok: false,
      message: 'Invalid trace: the "runs" array is empty. Provide at least one run.',
    }
  }

  // Validate each run
  for (let ri = 0; ri < raw.runs.length; ri++) {
    const err = validateRun(raw.runs[ri], ri)
    if (err) return { ok: false, message: err }
  }

  return { ok: true, runs: raw.runs as AgentRun[] }
}
