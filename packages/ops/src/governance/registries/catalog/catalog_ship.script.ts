import { repoRoot } from '../../../support/lib/shared/repo_root.script'
import { findByCatalogRef, loadCatalog } from './catalog.script'
import { runValidate } from './catalog_validate.script'
import type { CatalogShipCheck, CatalogShipPayload } from './catalog_validate.types'
import { resolveTagKey } from './tag.script'

export type ShipOptions = {
  key: string
  root?: string
}

function check(id: string, ok: boolean, message: string): CatalogShipCheck {
  return { id, ok, message }
}

export async function runShip(options: ShipOptions): Promise<CatalogShipPayload> {
  const root = options.root ?? repoRoot()
  const ref = options.key.trim()
  const catalog = await loadCatalog()
  const match = findByCatalogRef(catalog, ref)

  const checks: CatalogShipCheck[] = []

  if (!match) {
    checks.push(check('catalog_entry', false, `no catalog entry for ${ref}`))
    return {
      ready: false,
      key: ref,
      status: 'unknown',
      tag: `@${ref.replace(/^@/, '')}`,
      checks,
      provenance: { features: [], units: [] }
    }
  }

  const { id, entry, tag } = match
  const resolution = await resolveTagKey(id, catalog)
  const validate = await runValidate({ feature: id, root })

  checks.push(check('catalog_entry', true, `catalog entry ${id} exists`))
  const schemaFindings = validate.findings.filter(f => f.category === 'schema' || f.category === 'forbidden_field')
  checks.push(
    check(
      'schema',
      schemaFindings.length === 0,
      schemaFindings.length === 0 ? 'entry schema valid' : 'entry schema invalid — run catalog validate'
    )
  )
  checks.push(
    check(
      'gherkin_tagged',
      resolution.features.length > 0,
      resolution.features.length > 0
        ? `${resolution.features.length} Gherkin file(s) tagged ${tag}`
        : `no Gherkin files tagged ${tag}`
    )
  )
  checks.push(
    check(
      'unit_tagged',
      resolution.units.length > 0,
      resolution.units.length > 0
        ? `${resolution.units.length} unit spec(s) tagged ${tag}`
        : `no unit specs tagged ${tag}`
    )
  )
  const errorFindings = validate.findings.filter(f => f.level === 'error')
  checks.push(
    check(
      'validate_clean',
      errorFindings.length === 0,
      errorFindings.length === 0 ? 'catalog validate passed for this key' : `${errorFindings.length} validate error(s)`
    )
  )

  if (entry.status === 'shipped') {
    checks.push(check('status', true, `${id} already shipped — re-verify only`))
  } else {
    checks.push(
      check(
        'status',
        entry.status !== 'superseded',
        entry.status === 'superseded'
          ? `${id} is superseded — promote replacement feature instead`
          : `status is ${entry.status ?? 'unknown'} — set status: shipped after gate passes`
      )
    )
  }

  const ready = checks.every(c => c.ok)

  return {
    ready,
    key: id,
    status: entry.status ?? 'unknown',
    tag,
    checks,
    provenance: {
      features: resolution.features,
      units: resolution.units
    }
  }
}

export function renderShip(payload: CatalogShipPayload, json: boolean): void {
  if (json) {
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  console.log(`catalog ship: ${payload.key} (${payload.tag}) — ${payload.ready ? 'READY' : 'NOT READY'}`)
  for (const c of payload.checks) {
    console.log(`  ${c.ok ? '✓' : '✗'} ${c.message}`)
  }
  if (payload.provenance.features.length || payload.provenance.units.length) {
    console.log('')
    console.log('Provenance (test tag --list):')
    for (const f of payload.provenance.features) console.log(`  e2e:  ${f}`)
    for (const u of payload.provenance.units) console.log(`  unit: ${u}`)
  }
}
