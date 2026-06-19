import { loadConfiguration, loadSources, loadSupport } from '@cucumber/cucumber/api'
import { bddTagExpression } from '../../../packages/ops/src/governance/registries/catalog/tag.script.ts'
import { repoRoot } from '../../../packages/ops/src/support/lib/shared/repo_root.script.ts'

export const UNIT_FEATURE_GLOB = 'assets/features/**/*.feature'
export const UNIT_STEP_REGISTER = 'bdd/unit/support/register_steps.support.ts'
const CUCUMBER_BIN = 'node_modules/@cucumber/cucumber/bin/cucumber.js'

export type UnitBddRunOptions = {
  root?: string
  catalogTags: string[]
  acTag?: string
  dryRun?: boolean
}

export function unitTagExpression(catalogTags: string[], acTag?: string): string {
  const base = bddTagExpression(catalogTags, acTag)
  return `${base} and @unit and not @todo`
}

export function unitBddCliArgs(options: UnitBddRunOptions): string[] {
  const tagExpression = unitTagExpression(options.catalogTags, options.acTag)
  return [
    '--bun',
    CUCUMBER_BIN,
    '--import',
    UNIT_STEP_REGISTER,
    '--tags',
    tagExpression,
    '--format',
    'progress',
    ...(options.dryRun ? ['--dry-run'] : []),
    UNIT_FEATURE_GLOB
  ]
}

/** Validate features compile and all steps are defined (throws on undefined steps). */
export async function validateUnitBdd(options: UnitBddRunOptions): Promise<number> {
  const _root = options.root ?? repoRoot()
  const tagExpression = unitTagExpression(options.catalogTags, options.acTag)

  const { runConfiguration } = await loadConfiguration({
    provided: [
      '--import',
      UNIT_STEP_REGISTER,
      '--tags',
      tagExpression,
      '--dry-run',
      '--format',
      'progress',
      UNIT_FEATURE_GLOB
    ]
  })

  const sources = await loadSources(runConfiguration.sources)
  if (sources.errors.length > 0) {
    for (const err of sources.errors) {
      console.error(`${err.uri}:${err.location.line}: ${err.message}`)
    }
    return 1
  }
  if (sources.plan.length === 0) {
    console.error(`unit bdd: no scenarios matched tags ${tagExpression}`)
    return 1
  }

  try {
    await loadSupport({ sources: runConfiguration.sources, support: {} })
  } catch (err) {
    console.error('unit bdd: loadSupport failed:', err)
    return 1
  }
  return 0
}

export function runUnitBddSpawn(options: UnitBddRunOptions, root: string): number {
  const result = Bun.spawnSync(['bun', ...unitBddCliArgs(options)], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit'
  })
  return result.exitCode ?? 1
}
