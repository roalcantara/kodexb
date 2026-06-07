#!/usr/bin/env bun
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { runDependenciesCheck } from './checks/dependencies.check.script.ts'
import { runElectrobunSurfaceCheck } from './checks/electrobun_surface.check.script.ts'
import { runSecretsCheck } from './checks/secrets.check.script.ts'
import { exitCodeForFindings } from './exit_policy.script.ts'
import { normalizeRepoPath, resolveBaseRef, selectCandidateFiles } from './file_selection.script.ts'
import { pruneOlderThan } from './retention.script.ts'
import { appendSecurityRunEvent } from './run_writer.script.ts'
import { maxSeverity, type SecurityScanResult } from './security.types.ts'

type CliArgs = {
  strict: boolean
  changedOnly: boolean
  base: string | null
  json: boolean
}

function parseArgs(argv: string[]): CliArgs {
  let strict = false
  let changedOnly = false
  let base: string | null = null
  let json = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg) continue
    if (arg === '--strict') {
      strict = true
      continue
    }
    if (arg === '--changed-only') {
      changedOnly = true
      continue
    }
    if (arg === '--json') {
      json = true
      continue
    }
    if (arg === '--base') {
      base = argv[i + 1] ?? null
      i += 1
      continue
    }
    throw new Error(`spec security: unknown argument ${arg}`)
  }

  return { strict, changedOnly, base, json }
}

export function runScan(_args: CliArgs): SecurityScanResult {
  const lsFiles = Bun.spawnSync(['git', 'ls-files'])
  const repoFiles = lsFiles.success
    ? new TextDecoder()
        .decode(lsFiles.stdout)
        .split('\n')
        .map(file => file.trim())
        .filter(Boolean)
    : []

  const selected = selectCandidateFiles(repoFiles, {
    changedOnly: _args.changedOnly,
    base: resolveBaseRef(_args.base)
  })

  const absolute = selected.map(file => path.resolve(file))
  const findings = runSecretsCheck(absolute)

  const repoSelected = selected.map(f => normalizeRepoPath(f))

  if (repoSelected.includes('bun.lock')) {
    const lockfilePath = path.resolve('bun.lock')
    const cveListPath = path.resolve('tools/governance/security/cve.list.yml')
    findings.push(...runDependenciesCheck(lockfilePath, cveListPath))
  }

  if (repoSelected.includes('electrobun.config.ts')) {
    const electrobunConfigPath = path.resolve('electrobun.config.ts')
    findings.push(...runElectrobunSurfaceCheck(electrobunConfigPath))
  }

  return { findings, durationMs: 0 }
}

function main(): number {
  const start = performance.now()
  const args = parseArgs(process.argv.slice(2))
  const result = runScan(args)
  result.durationMs = Math.max(0, Math.round(performance.now() - start))

  const payload = {
    findings: result.findings,
    findingsCount: result.findings.length,
    severityMax: maxSeverity(result.findings),
    strict: args.strict,
    changedOnly: args.changedOnly,
    base: args.base,
    durationMs: result.durationMs
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
    console.log(
      `spec security: findings=${payload.findingsCount} severity=${payload.severityMax ?? 'none'} durationMs=${payload.durationMs}`
    )
  }

  return exitCode
}

if (import.meta.main) process.exit(main())
