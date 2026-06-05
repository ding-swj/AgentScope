#!/usr/bin/env node
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cwd, exit, argv, platform } from 'node:process'

const SCHEMA_VERSION = '1.0.0'

function printHelp() {
  console.log(`AgentScope CLI

Usage:
  npm run agentscope -- record -- <command> [args...]

Examples:
  npm run agentscope -- record -- npm run lint
  npm run agentscope -- record -- npm run build
`)
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms}ms`

  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds}s`
  return `${minutes}m ${seconds}s`
}

function timestampForFile(date) {
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + '-' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function timeOfDay(date) {
  return [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(':')
}

function getGitBranch() {
  try {
    return execFileSync('git', ['branch', '--show-current'], {
      cwd: cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim() || 'unknown'
  } catch {
    return 'unknown'
  }
}

function buildTrace({ commandText, startedAt, duration, exitCode, stdout, stderr }) {
  const passed = exitCode === 0
  const output = [
    stdout.trim() && `stdout:\n${stdout.trim()}`,
    stderr.trim() && `stderr:\n${stderr.trim()}`,
  ].filter(Boolean).join('\n\n')

  return {
    schemaVersion: SCHEMA_VERSION,
    runs: [
      {
        id: `run-cli-${timestampForFile(startedAt)}`,
        title: `Record command: ${commandText}`,
        agent: 'AgentScope CLI',
        branch: getGitBranch(),
        status: passed ? 'passed' : 'failed',
        trustScore: passed ? 85 : 35,
        startedAt: startedAt.toISOString(),
        duration,
        cost: '$0.00',
        filesChanged: 0,
        commands: 1,
        actions: [
          {
            id: 'a1',
            type: passed ? 'test_passed' : 'test_failed',
            title: passed ? 'Command completed successfully' : 'Command failed',
            command: commandText,
            timestamp: timeOfDay(startedAt),
            duration,
            risk: passed ? 'low' : 'medium',
            summary: passed
              ? 'The recorded command completed with exit code 0.'
              : `The recorded command failed with exit code ${exitCode}.`,
            details: [
              `Working directory: ${cwd()}`,
              `Git branch: ${getGitBranch()}`,
              `Exit code: ${exitCode}`,
            ],
            output: output || '(no output captured)',
          },
        ],
      },
    ],
  }
}

function writeTrace(trace, startedAt) {
  const outDir = join(cwd(), '.agentscope')
  mkdirSync(outDir, { recursive: true })

  const outPath = join(outDir, `${timestampForFile(startedAt)}.trace.json`)
  writeFileSync(outPath, `${JSON.stringify(trace, null, 2)}\n`, 'utf8')
  return outPath
}

function record(commandArgs) {
  if (commandArgs.length === 0) {
    console.error('Missing command. Use: npm run agentscope -- record -- <command>')
    exit(1)
  }

  const [command, ...args] = commandArgs
  const commandText = [command, ...args].join(' ')
  const startedAt = new Date()
  const startMs = Date.now()
  let stdout = ''
  let stderr = ''

  const child = platform === 'win32'
    ? spawn(commandText, [], { cwd: cwd(), env: process.env, shell: true })
    : spawn(command, args, { cwd: cwd(), env: process.env })

  child.stdout?.on('data', (chunk) => {
    stdout += chunk.toString()
    process.stdout.write(chunk)
  })

  child.stderr?.on('data', (chunk) => {
    stderr += chunk.toString()
    process.stderr.write(chunk)
  })

  child.on('error', (error) => {
    stderr += `${error.message}\n`
  })

  child.on('close', (code) => {
    const exitCode = code ?? 1
    const duration = formatDuration(Date.now() - startMs)
    const trace = buildTrace({
      commandText,
      startedAt,
      duration,
      exitCode,
      stdout,
      stderr,
    })
    const outPath = writeTrace(trace, startedAt)

    console.log(`\nAgentScope trace written to ${outPath}`)
    exit(exitCode)
  })
}

const [, , subcommand, separator, ...rest] = argv

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  printHelp()
  exit(0)
}

if (subcommand !== 'record') {
  console.error(`Unknown command: ${subcommand}`)
  printHelp()
  exit(1)
}

record(separator === '--' ? rest : [separator, ...rest].filter(Boolean))
