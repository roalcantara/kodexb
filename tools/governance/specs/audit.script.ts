#!/usr/bin/env bun
/**
 * mise run spec audit — deterministic SDD readiness gate.
 *
 * Checks quartet presence, handoff AC table, tasks hygiene, phase readiness,
 * and cross-artifact hints. Exit codes: 0 pass (or pass-with-warns without
 * --strict), 1 failures, 2 usage/bad feature path.
 *
 * Usage:
 *   bun tools/governance/specs/audit.script.ts <feature_dir> [--strict] [--json] [--raw]
 */
import { existsSync } from 'node:fs'
import path from 'node:path'
import { UsageError, withUsage } from '@kb/workflow-runtime'
import { runAudit } from './audit_core.script.ts'
import { chooseRenderer, renderAudit } from './audit_output.script.ts'

type CliOpts = {
  featureDir: string
  strict: boolean
  json: boolean
  raw: boolean
}

function parseArgs(argv: string[]): CliOpts {
  let featureDir = ''
  let strict = false
  let json = false
  let raw = false

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a) continue
    if (a === '--strict') {
      strict = true
      continue
    }
    if (a === '--json') {
      json = true
      continue
    }
    if (a === '--raw') {
      raw = true
      continue
    }
    if (a.startsWith('-')) throw new UsageError(`unknown flag: ${a}`)
    if (!featureDir) {
      featureDir = a
      continue
    }
    throw new UsageError(`unexpected argument: ${a}`)
  }

  if (!featureDir) throw new UsageError('<feature_dir> is required')
  if (json && raw) throw new UsageError('--json and --raw are mutually exclusive')

  return { featureDir, strict, json, raw }
}

function main(): number {
  const root = process.env.SPEC_AUDIT_ROOT ?? process.cwd()
  const ar = withUsage(() => parseArgs(process.argv.slice(2)), 'spec audit', usageString())
  if ('exitCode' in ar) return ar.exitCode
  const args = ar.value

  const resolvedDir = path.resolve(root, args.featureDir)
  if (!existsSync(resolvedDir) || !existsSync(path.join(resolvedDir, 'spec.md'))) {
    console.error(`spec audit: feature dir not found: ${resolvedDir} (must contain spec.md)`)
    return 2
  }

  const result = runAudit(resolvedDir)
  const mode = chooseRenderer({ json: args.json, raw: args.raw, isTty: process.stdout.isTTY })
  renderAudit(result, mode)

  if (args.strict && result.summary.errors > 0) return 1
  return result.summary.errors > 0 ? 1 : 0
}

function usageString(): string {
  return 'Usage: mise run spec audit <feature_dir> [--strict] [--json] [--raw]'
}

if (import.meta.main) process.exit(main())
