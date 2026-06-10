#!/usr/bin/env bun
import { resolveActiveFeatureDir } from './resolve_active_feature_dir.script.ts'
import { resolveCatalogKey } from './resolve_catalog_key.script.ts'

const SPECS = 'tools/governance/specs'

function usage(): never {
  console.error('Usage: mise run spec test [scope] [--feat <dir>]')
  console.error('  scope: unit | e2e | smoke | regression (omit = composite)')
  process.exit(2)
}

function main(): void {
  const args = process.argv.slice(2)
  const scope = args.shift() ?? ''
  let featureDir = ''

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--feat' && typeof args[i + 1] === 'string') {
      featureDir = args[i + 1] ?? ''
      i++
    }
  }

  const cf = featureDir ? { ok: true as const, featureDir } : resolveActiveFeatureDir()
  if (!cf.ok) {
    console.error(cf.message)
    process.exit(cf.exitCode)
  }

  const keyResult = resolveCatalogKey(cf.featureDir)
  const key = keyResult.key

  switch (scope) {
    case '': {
      const unitExit = Bun.spawnSync(['bun', 'test', '--config', '/dev/null', `${SPECS}/`, `${cf.featureDir}/`], {
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
      const r = Bun.spawnSync(['bun', 'test', '--config', '/dev/null', cf.featureDir], {
        stdio: ['inherit', 'inherit', 'inherit']
      })
      process.exit(r.exitCode ?? 0)
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
      const r = Bun.spawnSync(
        ['mise', 'run', 'spec', 'workflow', 'run', '--feature', 'tools/__tests__/fixtures/workflow/smoke-feature'],
        { stdio: ['inherit', 'inherit', 'inherit'] }
      )
      process.exit(r.exitCode ?? 0)
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
