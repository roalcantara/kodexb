#!/usr/bin/env bun
import { resolveActiveFeatureDir } from './resolve_active_feature_dir.script'
import { resolveCatalogKey } from './resolve_catalog_key.script'
import { prepareSmokeFixture, SMOKE_FIXTURE, smokeChildEnv, teardownSmokeFixture } from './smoke_harness.script'

const SPECS = 'packages/ops/src/governance/specs'

const SCOPES = ['unit', 'e2e', 'smoke', 'regression'] as const

function usage(): never {
  console.error('Usage: mise run spec test [scope] [feature]')
  console.error('  scope: unit | e2e | smoke | regression (omit = composite)')
  console.error('  feature: feature dir (omit = active feature)')
  process.exit(2)
}

/**
 * Parse `[scope] [feature]` positionals (review f18c5638 rule 05 — no `--feat`).
 * A leading token matching a known scope is the scope; the remaining positional
 * is the feature dir. A sole non-scope positional is treated as the feature.
 */
export function parseScopeFeature(args: string[]): { scope: string; featureDir: string } {
  const rest = [...args]
  let scope = ''
  if (rest[0] && (SCOPES as readonly string[]).includes(rest[0])) scope = rest.shift() ?? ''
  const featureDir = rest.shift() ?? ''
  return { scope, featureDir }
}

function main(): void {
  const { scope, featureDir } = parseScopeFeature(process.argv.slice(2))

  const cf = featureDir ? { ok: true as const, featureDir } : resolveActiveFeatureDir()
  if (!cf.ok) {
    console.error(cf.message)
    process.exit(cf.exitCode)
  }

  const keyResult = resolveCatalogKey(cf.featureDir)
  const key = keyResult.key

  switch (scope) {
    case '': {
      const unitExit = Bun.spawnSync(['bun', 'test', '--config', '/dev/null', SPECS], {
        stdio: ['inherit', 'inherit', 'inherit']
      }).exitCode
      if (key) {
        const e2eExit = Bun.spawnSync(['mise', 'run', 'test', 'tag', key, '--e2e'], {
          stdio: ['inherit', 'inherit', 'inherit']
        }).exitCode
        process.exit(unitExit === 0 ? (e2eExit ?? 0) : unitExit)
      }
      process.exit(unitExit ?? 0)
      break
    }
    case 'unit': {
      const exitCode = Bun.spawnSync(['bun', 'test', '--config', '/dev/null', SPECS], {
        stdio: ['inherit', 'inherit', 'inherit']
      }).exitCode
      process.exit(exitCode ?? 0)
      break
    }
    case 'e2e': {
      if (!key) {
        console.log(`spec test e2e: no catalog key for ${cf.featureDir} — nothing to run`)
        process.exit(0)
      }
      const r = Bun.spawnSync(['mise', 'run', 'test', 'tag', key, '--e2e'], {
        stdio: ['inherit', 'inherit', 'inherit']
      })
      process.exit(r.exitCode ?? 0)
      break
    }
    case 'smoke': {
      const state = prepareSmokeFixture(SMOKE_FIXTURE)
      try {
        const r = Bun.spawnSync(['mise', 'run', 'spec', 'workflow', 'run', SMOKE_FIXTURE], {
          env: smokeChildEnv(),
          stdio: ['inherit', 'inherit', 'inherit']
        })
        process.exit(r.exitCode ?? 1)
      } finally {
        teardownSmokeFixture(state)
      }
      break
    }
    case 'regression': {
      const r = Bun.spawnSync(['bun', 'test'], { stdio: ['inherit', 'inherit', 'inherit'] })
      process.exit(r.exitCode ?? 0)
      break
    }
    default:
      console.error(`spec test: unknown scope "${scope}"`)
      usage()
  }
}

if (import.meta.main) main()
