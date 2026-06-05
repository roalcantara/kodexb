#!/usr/bin/env bun
/**
 * mise run catalog — shipped-feature registry (catalog.yaml).
 */
import { catalogListRows, loadCatalog } from '../catalog/catalog.script.ts'
import { chdirToRepoRoot } from '../shared/repo_root.script.ts'

const VALID_ACTIONS = new Set(['list'])

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

async function main(): Promise<void> {
  chdirToRepoRoot()
  const action = parseAction()
  const json = envBool('usage_json')
  const raw = envBool('usage_raw')

  switch (action) {
    case 'list':
      await runList(json, raw)
      break
    default:
      console.error(`catalog: unknown action ${action} (expected list)`)
      process.exit(2)
  }
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
