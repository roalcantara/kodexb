#!/usr/bin/env bun
/**
 * mise run spec conform — brainstorm → speckit bridge (audit fix + re-audit).
 */
import { withUsage } from '@kb/exec'
import { runConform } from './audit_fix_core.script'
import { chooseRenderer, renderAudit } from './audit_output.script'
import { parseGovernanceFixArgs, prepareGovernanceFeatureRun, printFixPlanSummary } from './spec_governance_cli.script'

function main(): number {
  const ar = withUsage(() => parseGovernanceFixArgs(process.argv.slice(2)), 'spec conform', usageString())
  if ('exitCode' in ar) return ar.exitCode
  const args = ar.value

  const prepared = prepareGovernanceFeatureRun(process.cwd(), args.featureDir, 'spec conform')
  if (!prepared.ok) {
    console.error(prepared.message)
    return prepared.exitCode
  }

  const { after, plan } = runConform(prepared.resolvedDir, { dryRun: args.dryRun, force: args.force })
  printFixPlanSummary('spec conform', plan, args.dryRun)

  const mode = chooseRenderer({ json: args.json, raw: args.raw, isTty: process.stdout.isTTY })
  renderAudit(after, mode)

  const phaseHint = after.findings.find(f => f.rule === 'phase.detect')
  if (phaseHint && !args.dryRun) {
    const cmd = phaseHint.message.match(/suggested command: ([^\s)]+)/)?.[1]
    if (cmd?.includes('analyze'))
      console.log(`\nNext: run ${cmd} (or /speckit-analyze) for feature-specific checklist items.`)
  }

  return after.summary.errors > 0 ? 1 : 0
}

function usageString(): string {
  return 'Usage: mise run spec conform [feature_dir] [--dry-run] [--force] [--json] [--raw]'
}

if (import.meta.main) process.exit(main())
