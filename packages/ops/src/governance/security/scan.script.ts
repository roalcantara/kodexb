#!/usr/bin/env bun
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { configureOpsLogging } from '../../support/lib/cli/ops_logging.script'
import { usageFlag, usageOptString } from '../../support/lib/cli/usage_env.script'
import { runDependenciesCheck } from './checks/dependencies.script'
import { runElectrobunSurfaceCheck } from './checks/electrobun_surface.script'
import { exitCodeForFindings } from './exit_policy.script'
import { normalizeRepoPath, resolveBaseRef, selectCandidateFiles } from './file_selection.script'
import { pruneOlderThan } from './retention.script'
import { appendSecurityRunEvent } from './run_writer.script'
import { maxSeverity, type SecurityScanResult } from './security.types'

export type CliArgs = {
  strict: boolean
  changedOnly: boolean
  base: string | null
  json: boolean
}

const DEFAULT_SECURITY_SCAN_MAX_DURATION_MS = 1000

function maxDurationMsFromEnv(): number {
  const raw = process.env.SPEC_SECURITY_MAX_DURATION_MS
  if (!raw) return DEFAULT_SECURITY_SCAN_MAX_DURATION_MS
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SECURITY_SCAN_MAX_DURATION_MS
  return Math.round(parsed)
}

export function readSecurityScanArgs(env: Record<string, string | undefined>, argv: string[]): CliArgs {
  const strict = usageFlag(env, 'strict') || argv.includes('--strict')
  const changedOnly = usageFlag(env, 'changed_only') || argv.includes('--changed-only')
  const json = usageFlag(env, 'json') || argv.includes('--json')
  const envBase = usageOptString(env, 'base')
  const argvBase = (() => {
    const idx = argv.indexOf('--base')
    return idx >= 0 && idx + 1 < argv.length ? (argv[idx + 1] ?? null) : null
  })()
  const base: string | null = envBase ?? argvBase

  return { strict, changedOnly, base, json }
}

export function runScan(_args: CliArgs): SecurityScanResult {
  const lsFiles = Bun.spawnSync(['git', 'ls-files'])
  if (!lsFiles.success) {
    throw new Error('spec security: failed to enumerate repository files via git ls-files')
  }
  const repoFiles = new TextDecoder()
    .decode(lsFiles.stdout)
    .split('\n')
    .map(file => file.trim())
    .filter(Boolean)

  const selected = selectCandidateFiles(repoFiles, {
    changedOnly: _args.changedOnly,
    base: resolveBaseRef(_args.base)
  })

  // Secrets enforcement is handled by HK gitleaks; spec security focuses on
  // dependency and Electrobun-surface checks.
  const findings: SecurityScanResult['findings'] = []

  const repoSelected = selected.map(f => normalizeRepoPath(f))

  if (repoSelected.includes('bun.lock')) {
    const lockfilePath = path.resolve('bun.lock')
    const cveListPath = path.resolve('packages/ops/src/governance/security/cve.list.yml')
    findings.push(...runDependenciesCheck(lockfilePath, cveListPath))
  }

  if (repoSelected.includes('electrobun.config')) {
    const electrobunConfigPath = path.resolve('electrobun.config')
    findings.push(...runElectrobunSurfaceCheck(electrobunConfigPath))
  }

  return { findings, durationMs: 0 }
}

function main(): number {
  configureOpsLogging()
  const start = performance.now()
  const args = readSecurityScanArgs(process.env, process.argv.slice(2))
  const result = runScan(args)
  result.durationMs = Math.max(0, Math.round(performance.now() - start))

  const payload = {
    findings: result.findings,
    findingsCount: result.findings.length,
    severityMax: maxSeverity(result.findings),
    strict: args.strict,
    changedOnly: args.changedOnly,
    base: args.base,
    durationMs: result.durationMs,
    maxDurationMs: maxDurationMsFromEnv()
  }

  const exitCode = exitCodeForFindings(payload.severityMax, args.strict)
  appendSecurityRunEvent(process.cwd(), `scan-${Date.now()}`, {
    ts: new Date().toISOString(),
    phase: 'scan',
    trigger: args.changedOnly ? 'hk' : 'gate',
    findingsCount: payload.findingsCount,
    severityMax: payload.severityMax,
    exitCode,
    durationMs: payload.durationMs,
    feature: process.env.SPEC_FEATURE_SLUG ?? null
  })
  pruneOlderThan(process.cwd(), 30)

  if (args.json) {
    console.log(JSON.stringify(payload))
  } else {
    const durationStatus = payload.durationMs <= payload.maxDurationMs ? 'ok' : 'exceeded'
    console.log(
      `spec security: findings=${payload.findingsCount} severity=${payload.severityMax ?? 'none'} ` +
        `durationMs=${payload.durationMs} maxDurationMs=${payload.maxDurationMs} durationStatus=${durationStatus}`
    )
  }

  return exitCode
}

if (import.meta.main) process.exit(main())
