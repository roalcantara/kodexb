#!/usr/bin/env bun
/**
 * mise run spec audit — deterministic SDD readiness gate.
 */
import { withUsage } from '@kb/exec'
import { runAudit } from './audit_core.script'
import { applyFixes, planFixes } from './audit_fix_core.script'
import { chooseRenderer, renderAudit } from './audit_output.script'
import {
  parseGovernanceAuditArgs,
  prepareGovernanceFeatureRun,
  printFixPlanSummary
} from './spec_governance_cli.script'

function main(): number {
  const root = process.env.SPEC_AUDIT_ROOT ?? process.cwd()
  const ar = withUsage(() => parseGovernanceAuditArgs(process.argv.slice(2)), 'spec audit', usageString())
  if ('exitCode' in ar) return ar.exitCode
  const args = ar.value

  const prepared = prepareGovernanceFeatureRun(root, args.featureDir, 'spec audit')
  if (!prepared.ok) {
    console.error(prepared.message)
    return prepared.exitCode
  }

  if (args.fix) {
    let plan = planFixes(prepared.resolvedDir, { force: args.force })
    printFixPlanSummary('spec audit fix', plan, args.dryRun)
    if (!args.dryRun) {
      for (let pass = 0; pass < 3 && plan.actions.length > 0; pass++) {
        applyFixes(prepared.resolvedDir, plan)
        plan = planFixes(prepared.resolvedDir, { force: args.force })
      }
    }
  }

  const result = runAudit(prepared.resolvedDir)
  const mode = chooseRenderer({ json: args.json, raw: args.raw, isTty: process.stdout.isTTY })
  renderAudit(result, mode)

  if (args.strict && result.summary.errors > 0) return 1
  return result.summary.errors > 0 ? 1 : 0
}

function usageString(): string {
  return 'Usage: mise run spec audit [feature_dir] [--strict] [--fix] [--dry-run] [--force] [--json] [--raw]'
}

if (import.meta.main) process.exit(main())
