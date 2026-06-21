#!/usr/bin/env bun
import { getLogger } from '@logtape/logtape'
import { catalogListRows, loadCatalog } from '../governance/registries/catalog/catalog.script'
import { promoteCatalogEntry, registerCatalogEntry } from '../governance/registries/catalog/catalog_lifecycle.script'
import { renderShip, runShip } from '../governance/registries/catalog/catalog_ship.script'
import { renderValidate, runValidate } from '../governance/registries/catalog/catalog_validate.script'
import { resolveActiveFeatureDir } from '../governance/specs/resolve_active_feature_dir.script'
import { runBinMain } from '../support/lib/cli/dispatch.script'
import { usageCmd, usageFlags, usageStrings } from '../support/lib/cli/usage_env.script'
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script'

const VALID_ACTIONS = new Set(['list', 'validate', 'ship', 'register', 'promote'])

function positionalArgs(action: string): string[] {
  const argv = process.argv.slice(2)
  const start = argv[0] === action ? 1 : 0
  return argv.slice(start).filter(a => !a.startsWith('--'))
}

const logger = () => getLogger(['kb', 'ops', 'catalog'])

const actionMap: Record<string, () => undefined | number | Promise<undefined | number>> = {
  list: () =>
    loadCatalog()
      .then(rows => {
        const { json } = usageFlags(process.env, ['json'])
        const listRows = catalogListRows(rows)
        if (json) {
          console.log(JSON.stringify({ features: listRows }, null, 2))
        } else if (listRows.length === 0) {
          console.log('(no catalog entries)')
        } else {
          for (const row of listRows) {
            console.log(`${row.key} [${row.status}]`)
            console.log(`  title: ${row.title}`)
            if (row.specs.length) console.log(`  specs: ${row.specs.join(', ')}`)
            if (row.superseded_by) console.log(`  superseded_by: ${row.superseded_by}`)
            console.log('')
          }
        }
      })
      .then(() => undefined),
  validate: async () => {
    const { json, raw } = usageFlags(process.env, ['json', 'raw'])
    const { feature } = usageStrings(process.env, ['feature'])
    const pos = positionalArgs('validate')
    const payload = await runValidate({ feature: feature ?? pos[0] })
    renderValidate(payload, json, raw)
    return payload.valid ? 0 : 1
  },
  ship: async () => {
    const { json } = usageFlags(process.env, ['json'])
    const { key } = usageStrings(process.env, ['key'])
    const pos = positionalArgs('ship')
    const catalogKey = key?.trim() || pos[0]
    if (!catalogKey) {
      logger().error('catalog ship: catalog key required (e.g. command_palette)')
      return 2
    }
    const payload = await runShip({ key: catalogKey })
    renderShip(payload, json)
    return payload.ready ? 0 : 1
  },
  register: () => {
    const pos = positionalArgs('register')
    const resolved = resolveActiveFeatureDir(pos[0])
    if (!resolved.ok) {
      logger().error(resolved.message)
      return resolved.exitCode
    }
    try {
      const result = registerCatalogEntry(resolved.featureDir)
      console.log(`catalog register: ${result.message}`)
      return 0
    } catch (err) {
      logger().error(String(err))
      return 1
    }
  },
  promote: async () => {
    const { json } = usageFlags(process.env, ['json'])
    const { key } = usageStrings(process.env, ['key'])
    const dryRun = process.argv.includes('--dry-run')
    const pos = positionalArgs('promote')
    const catalogKey = key?.trim() || pos[0]
    if (!catalogKey) {
      logger().error('catalog promote: catalog key required (e.g. command_palette)')
      return 2
    }
    const result = await promoteCatalogEntry(catalogKey, { dryRun })
    if (json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      console.log(`catalog promote: ${result.message}`)
    }
    if (result.action === 'skipped') return 1
    return 0
  }
}

runBinMain(() => {
  chdirToRepoRoot()
  const action = usageCmd(process.env)
  const resolved = action && VALID_ACTIONS.has(action) ? action : 'list'
  const handler = actionMap[resolved]
  if (!handler) {
    logger().error(`catalog: unknown action ${resolved} (expected list|validate|ship|register|promote)`)
    return 2
  }
  return handler()
})
