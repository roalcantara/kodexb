#!/usr/bin/env bun
/**
 * mise run catalog — shipped-feature registry (catalog.yaml).
 */
import { catalogListRows, loadCatalog } from '../governance/registries/catalog/catalog.script'
import { renderShip, runShip } from '../governance/registries/catalog/catalog_ship.script'
import { renderValidate, runValidate } from '../governance/registries/catalog/catalog_validate.script'
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script'

const VALID_ACTIONS = new Set(['list', 'validate', 'ship'])

function envBool(name: string): boolean {
  return process.env[name] === 'true'
}

function parseAction(): string {
  const fromEnv = process.env.usage_cmd ?? ''
  if (fromEnv && VALID_ACTIONS.has(fromEnv)) return fromEnv
  const arg = process.argv[2]
  if (arg && VALID_ACTIONS.has(arg)) return arg
  return fromEnv || 'list'
}

function positionalArgs(action: string): string[] {
  const argv = process.argv.slice(2)
  const start = argv[0] === action ? 1 : 0
  return argv.slice(start).filter(a => !a.startsWith('--'))
}

async function runList(json: boolean, _raw: boolean): Promise<void> {
  const rows = catalogListRows(await loadCatalog())
  if (json) {
    console.log(JSON.stringify({ features: rows }, null, 2))
    return
  }
  if (rows.length === 0) {
    console.log('(no catalog entries)')
    return
  }
  for (const row of rows) {
    console.log(`${row.key} [${row.status}]`)
    console.log(`  title: ${row.title}`)
    if (row.specs.length) console.log(`  specs: ${row.specs.join(', ')}`)
    if (row.superseded_by) console.log(`  superseded_by: ${row.superseded_by}`)
    console.log('')
  }
}

async function runValidateCmd(json: boolean, raw: boolean, feature?: string): Promise<number> {
  const payload = await runValidate({ feature })
  renderValidate(payload, json, raw)
  return payload.valid ? 0 : 1
}

async function runShipCmd(json: boolean, key?: string): Promise<number> {
  if (!key?.trim()) {
    console.error('catalog ship: catalog key required (e.g. command_palette)')
    return 2
  }
  const payload = await runShip({ key })
  renderShip(payload, json)
  return payload.ready ? 0 : 1
}

async function main(): Promise<void> {
  chdirToRepoRoot()
  const action = parseAction()
  const json = envBool('usage_json')
  const raw = envBool('usage_raw')
  const feature = process.env.usage_feature?.trim() || undefined
  const pos = positionalArgs(action)

  let exitCode = 0
  switch (action) {
    case 'list':
      await runList(json, raw)
      break
    case 'validate':
      exitCode = await runValidateCmd(json, raw, feature ?? pos[0])
      break
    case 'ship':
      exitCode = await runShipCmd(json, process.env.usage_key?.trim() ?? pos[0])
      break
    default:
      console.error(`catalog: unknown action ${action} (expected list|validate|ship)`)
      exitCode = 2
  }

  if (exitCode !== 0) process.exit(exitCode)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
