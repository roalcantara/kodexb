#!/usr/bin/env bun
/**
 * spec import-legacy — diff legacy M02 requirements.md EARS vs new spec.md.
 *
 * Usage:
 *   bun tools/governance/specs/import_legacy.script.ts --feature 001-sync-frecency-persistence
 */
import path from 'node:path'

const EARS_HEADING = /^##\s+REQUIREMENT\s+([A-Z]{2,}-\d+)\s*:/gm
const NUMBERED_FOLDER = /^\d{3}-/

const LEGACY_FOLDER: Record<string, string> = {
  '001-sync-frecency-persistence': '01_sync-frecency-persistence',
  '002-task-source-truthfulness': '02_task-source-truthfulness',
  '003-list-tag-facet-performance': '03_list-tag-facet-performance'
}

function extractIds(text: string): Set<string> {
  const ids = new Set<string>()
  for (const m of text.matchAll(EARS_HEADING)) {
    if (m[1]) ids.add(m[1])
  }
  return ids
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const fIdx = args.indexOf('--feature')
  const feature = fIdx >= 0 ? args[fIdx + 1] : undefined
  if (!feature) {
    console.error('usage: bun tools/governance/specs/import_legacy.script.ts --feature <NNN-slug>')
    process.exit(2)
  }

  const folder = NUMBERED_FOLDER.test(feature) ? feature : `001-${feature}`
  const legacyFolder = LEGACY_FOLDER[folder]
  if (!legacyFolder) {
    console.error(`import-legacy: no legacy mapping for ${folder}`)
    process.exit(1)
  }

  const newSpec = path.join('assets/specs', folder, 'spec.md')
  const legacyPath = path.join('assets/docs/specs/MILESTONE_02', legacyFolder, 'requirements.md')

  if (!(await Bun.file(newSpec).exists())) {
    console.error(`import-legacy: missing ${newSpec}`)
    process.exit(1)
  }
  if (!(await Bun.file(legacyPath).exists())) {
    console.error(`import-legacy: missing ${legacyPath}`)
    process.exit(1)
  }

  const newIds = extractIds(await Bun.file(newSpec).text())
  const legacyIds = extractIds(await Bun.file(legacyPath).text())

  const missing = [...legacyIds].filter(id => !newIds.has(id))
  const extra = [...newIds].filter(id => !legacyIds.has(id))

  console.log(`Legacy: ${legacyPath}`)
  console.log(`New:    ${newSpec}`)
  console.log(`Legacy REQUIREMENT ids: ${[...legacyIds].sort().join(', ') || '(none)'}`)
  console.log(`New    REQUIREMENT ids: ${[...newIds].sort().join(', ') || '(none)'}`)

  if (missing.length === 0 && extra.length === 0) {
    console.log('\n✓ EARS id sets match')
    process.exit(0)
  }
  if (missing.length) console.log(`\nMissing in spec.md: ${missing.join(', ')}`)
  if (extra.length) console.log(`Extra in spec.md: ${extra.join(', ')}`)
  process.exit(1)
}

await main().catch(err => {
  console.error(err)
  process.exit(1)
})
