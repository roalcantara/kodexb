import {
  GUM,
  gumAccent,
  gumBadge,
  gumFail,
  gumFore,
  gumInfo,
  gumJoinHorizontal,
  gumJoinVertical,
  gumMuted,
  gumNextSteps,
  gumOk,
  gumRationale,
  gumSection,
  gumSubtitle,
  gumTable,
  gumTitle,
  gumWarn
} from '../cli/gum_theme.script.ts'
import type { RenderMode } from '../cli/render_mode.script.ts'
import {
  CATEGORY_COLORS,
  installGlyph,
  locationBadge,
  POLICY_COLORS,
  policySection
} from './skill_output_theme.script.ts'
import type {
  Finding,
  ListFormat,
  ReconcilePayload,
  ReportPayload,
  SkillListRow,
  ValidatePayload
} from './skill_registry.types.ts'
import { POLICY_GROUP_ORDER } from './skill_registry_core.script.ts'

export type { RenderMode } from '../cli/render_mode.script.ts'
export { chooseRenderer } from '../cli/render_mode.script.ts'

function findingsByCategory(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>()
  for (const f of findings) {
    const list = map.get(f.category) ?? []
    list.push(f)
    map.set(f.category, list)
  }
  return map
}

function categoryCounts(summary: Record<string, number>): [string, string][] {
  const order = [
    'lock_without_yaml',
    'global_in_lock',
    'installed_extra',
    'installed_missing',
    'policy_incomplete',
    'yaml_without_lock',
    'owned_dir_missing',
    'schema'
  ]
  const rows: [string, string][] = []
  for (const key of order) {
    const n = summary[key] ?? 0
    if (n > 0) rows.push([key, String(n)])
  }
  return rows
}

export function renderValidate(payload: ValidatePayload, mode: RenderMode): void {
  if (mode === 'json') {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  if (mode === 'raw') {
    const total = payload.findings.length
    console.log(`skill validate: ${payload.valid ? 'OK' : 'FAILED'} (${total} findings)`)
    for (const [k, v] of Object.entries(payload.summary)) {
      if (v > 0) console.log(`  ${k}: ${v}`)
    }
    for (const f of payload.findings) {
      const prefix = f.skill_id ? `${f.skill_id}: ` : ''
      console.log(`skill validate: ${prefix}${f.message}`)
    }
    return
  }

  console.log(gumTitle('Skill registry · validate'))
  console.log(
    payload.valid
      ? gumOk('  ✓ Registry valid')
      : gumFail(`  ✗ ${payload.findings.length} finding${payload.findings.length === 1 ? '' : 's'}`)
  )
  console.log('')

  const tableRows = categoryCounts(payload.summary).map(([cat, n]) => [
    gumBadge(cat, CATEGORY_COLORS[cat] ?? GUM.muted),
    gumWarn(n)
  ])
  if (tableRows.length > 0) {
    console.log(gumSection('Findings by category'))
    console.log(gumTable(['Category', 'Count'], tableRows))
    console.log('')
  }

  const grouped = findingsByCategory(payload.findings)
  for (const [cat, items] of grouped) {
    const color = CATEGORY_COLORS[cat] ?? GUM.muted
    console.log(gumSection(`${cat} (${items.length})`))
    const limit = 20
    for (const f of items.slice(0, limit)) {
      const id = f.skill_id ? `${gumInfo(f.skill_id)} — ` : ''
      console.log(`  ${gumWarn('•')} ${id}${gumFore(f.message, color)}`)
    }
    if (items.length > limit) console.log(gumMuted(`  … (+${items.length - limit} more)`))
    console.log('')
  }

  if (!payload.valid) {
    gumNextSteps(['mise run skill reconcile --dry-run', 'mise run skill report --list-skills'])
  }
}

export function renderReconcile(payload: ReconcilePayload, mode: RenderMode): void {
  if (mode === 'json') {
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  if (mode === 'raw') {
    console.log(`skill reconcile: ${payload.mode}`)
    console.log(`missing_in_yaml (${payload.missing_in_yaml.length}): ${payload.missing_in_yaml.join(', ')}`)
    console.log(`orphan_in_yaml (${payload.orphan_in_yaml.length}): ${payload.orphan_in_yaml.join(', ')}`)
    console.log(`global_in_lock (${payload.global_in_lock.length}): ${payload.global_in_lock.join(', ')}`)
    console.log(`owned_drift (${payload.owned_drift.length}): ${payload.owned_drift.join(', ')}`)
    console.log(`would_write: ${payload.would_write}`)
    return
  }

  const modeLabel = payload.mode === 'dry-run' ? gumWarn('dry-run') : gumOk('write')
  console.log(gumTitle(`Skill registry · reconcile · ${modeLabel}`))
  console.log('')

  console.log(gumSection('Plan'))
  console.log(
    gumTable(
      ['Action', 'Count', 'Note'],
      [
        ['Scaffold rows', String(payload.missing_in_yaml.length), locationBadge('project')],
        [
          'Write SKILLS.yaml',
          payload.would_write ? gumOk('yes') : gumMuted('no'),
          payload.would_write ? gumOk('append') : gumWarn('preview only')
        ]
      ]
    )
  )
  console.log('')

  if (payload.missing_in_yaml.length) {
    console.log(gumSection(`Missing in SKILLS.yaml (${payload.missing_in_yaml.length})`))
    for (const id of payload.missing_in_yaml.slice(0, 30)) console.log(`  ${gumInfo('+')} ${gumInfo(id)}`)
    if (payload.missing_in_yaml.length > 30) console.log(gumMuted(`  … (+${payload.missing_in_yaml.length - 30} more)`))
    console.log('')
  }
  if (payload.orphan_in_yaml.length) {
    console.log(gumSection(`Orphan project rows (${payload.orphan_in_yaml.length})`))
    for (const id of payload.orphan_in_yaml) console.log(`  ${gumWarn('⚠')} ${gumWarn(id)}`)
    console.log('')
  }
  if (payload.global_in_lock.length) {
    console.log(gumSection(`Global in lock (${payload.global_in_lock.length})`))
    for (const id of payload.global_in_lock) {
      console.log(`  ${gumFail('✗')} ${gumFail(id)} ${gumMuted('— YAML says global; remove lock row')}`)
    }
    console.log('')
  }
  if (payload.owned_drift.length) {
    console.log(gumSection(`Owned drift (${payload.owned_drift.length})`))
    for (const id of payload.owned_drift)
      console.log(`  ${gumWarn('?')} ${id} ${gumMuted('— on disk but not in YAML')}`)
    console.log('')
  }

  if (payload.would_write) {
    gumNextSteps(['edit TODO fields in SKILLS.yaml', 'mise run skill validate', 'mise run skill sync'])
  } else {
    gumNextSteps([
      'mise run skill reconcile          # append scaffolds',
      'edit TODO fields in SKILLS.yaml',
      'mise run skill validate'
    ])
  }
}

function formatCompactLine(row: SkillListRow, verbose: boolean, pretty: boolean): string {
  const blocked = row.policy_type === 'blocked'
  const installed = row.installed || row.location === 'global' || (row.location === 'owned' && !blocked)
  if (!pretty) {
    const glyph = blocked ? '⊘' : installed ? '✔' : '✗'
    let line = `${glyph} ${row.id} (${row.location}) (${row.policy_type}): ${row.rationale}`
    if (verbose && row.usage_summary) line += `\n  Load: ${row.usage_summary}`
    if (verbose && row.load_triggers?.length) line += `\n  When: ${row.load_triggers.slice(0, 3).join(', ')}`
    return line
  }

  const glyph = installGlyph(installed, blocked)
  const loc = locationBadge(row.location)
  const policy = gumBadge(row.policy_type, POLICY_COLORS[row.policy_type] ?? GUM.muted)
  let line = `${glyph} ${gumAccent(row.id)} ${loc} ${policy} ${gumRationale(row.rationale)}`
  if (verbose && row.usage_summary) line += `\n  ${gumInfo('Load:')} ${row.usage_summary}`
  if (verbose && row.load_triggers?.length) {
    line += `\n  ${gumInfo('When:')} ${row.load_triggers.slice(0, 3).join(', ')}`
  }
  return line
}

function groupRows(rows: SkillListRow[]): Map<string, SkillListRow[]> {
  const map = new Map<string, SkillListRow[]>()
  for (const t of POLICY_GROUP_ORDER) map.set(t, [])
  for (const row of rows) {
    const list = map.get(row.policy_type) ?? []
    list.push(row)
    map.set(row.policy_type, list)
  }
  return map
}

const POLICY_LABELS: Record<string, string> = {
  required: 'Standing — required',
  routed: 'Routed — Electrobun',
  optional: 'Optional companions',
  reference: 'Reference',
  blocked: 'Blocked'
}

export function renderSkillList(rows: SkillListRow[], mode: RenderMode, format: ListFormat, verbose: boolean): void {
  if (mode === 'json') {
    console.log(JSON.stringify({ total: rows.length, skills: rows }, null, 2))
    return
  }

  if (mode === 'raw') {
    for (const row of rows) console.log(formatCompactLine(row, verbose, false))
    return
  }

  if (format === 'compact') {
    console.log(gumTitle(`Skill registry · list (${rows.length})`))
    console.log('')
    for (const row of rows) console.log(formatCompactLine(row, verbose, true))
    return
  }

  if (format === 'cards') {
    console.log(gumTitle(`Skill registry · cards (${rows.length})`))
    console.log('')
    for (const row of rows) {
      const blocked = row.policy_type === 'blocked'
      const installed = row.installed || row.location === 'global'
      console.log(
        gumJoinHorizontal([
          installGlyph(installed, blocked),
          gumAccent(row.id),
          locationBadge(row.location),
          gumBadge(row.policy_type, POLICY_COLORS[row.policy_type] ?? GUM.muted),
          row.installed ? gumOk('installed') : gumMuted('missing')
        ])
      )
      console.log(gumRationale(`  ${row.rationale}`))
      if (row.usage_summary) console.log(gumInfo(`  Load when: ${row.usage_summary}`))
      console.log('')
    }
    return
  }

  console.log(gumTitle(`Skill registry · catalog (${rows.length})`))
  console.log(gumSubtitle('Grouped by policy type · badges show location'))
  console.log('')
  const grouped = groupRows(rows)
  for (const t of POLICY_GROUP_ORDER) {
    const items = grouped.get(t) ?? []
    if (items.length === 0) continue
    console.log(policySection(`${POLICY_LABELS[t]} (${items.length})`, t))
    for (const row of items) {
      const blocked = row.policy_type === 'blocked'
      const installed = row.installed || row.location === 'global'
      const glyph = installGlyph(installed, blocked)
      const loc = locationBadge(row.location)
      const rationale = row.rationale.length > 100 ? `${row.rationale.slice(0, 100)}…` : row.rationale
      console.log(` ${glyph} ${gumAccent(row.id)} ${loc} ${gumRationale(rationale)}`)
    }
    console.log('')
  }
}

export function renderReport(payload: ReportPayload, mode: RenderMode, listFormat: ListFormat, verbose: boolean): void {
  if (mode === 'json') {
    console.log(JSON.stringify(payload, null, 2))
    return
  }

  if (mode === 'raw') {
    console.log(`schema_version: ${payload.schema_version}`)
    console.log(`total_skills: ${payload.total_skills}`)
    console.log(`by_location: ${JSON.stringify(payload.by_location)}`)
    console.log(`by_policy_type: ${JSON.stringify(payload.by_policy_type)}`)
    console.log(`electrobun_routes: ${payload.electrobun_routes}`)
    console.log(`valid: ${payload.valid}`)
    if (payload.drift.missing.length) console.log(`missing: ${JSON.stringify(payload.drift.missing)}`)
    if (payload.drift.extra.length) console.log(`extra: ${JSON.stringify(payload.drift.extra)}`)
    else if (!payload.skills?.length) console.log('drift: none')
    if (payload.skills?.length) {
      console.log('')
      for (const row of payload.skills) console.log(formatCompactLine(row, verbose, false))
    }
    return
  }

  console.log(gumTitle('Skill registry · report'))
  console.log('')
  const loc = payload.by_location
  const pol = payload.by_policy_type
  console.log(
    gumJoinVertical([
      gumJoinHorizontal([
        gumMuted('Registry'),
        gumBadge(`schema v${payload.schema_version}`, GUM.accent),
        gumBadge(`${payload.total_skills} skills`, GUM.info)
      ]),
      payload.valid ? gumOk('  ✓ Valid') : gumFail('  ✗ Invalid — run validate')
    ])
  )
  console.log('')

  console.log(gumSection('Inventory'))
  console.log(
    gumTable(
      ['Location', 'Count', 'Policy', 'Count'],
      [
        [
          locationBadge('owned'),
          String(loc.owned ?? 0),
          gumBadge('required', POLICY_COLORS.required ?? GUM.success),
          String(pol.required ?? 0)
        ],
        [
          locationBadge('project'),
          String(loc.project ?? 0),
          gumBadge('optional', POLICY_COLORS.optional ?? GUM.info),
          String(pol.optional ?? 0)
        ],
        [
          locationBadge('global'),
          String(loc.global ?? 0),
          gumBadge('reference', POLICY_COLORS.reference ?? GUM.muted),
          String(pol.reference ?? 0)
        ],
        ['', '', gumBadge('routed', POLICY_COLORS.routed ?? GUM.accent), String(pol.routed ?? 0)],
        ['', '', gumBadge('blocked', POLICY_COLORS.blocked ?? GUM.error), String(pol.blocked ?? 0)]
      ]
    )
  )
  console.log('')

  if (payload.drift.missing.length || payload.drift.extra.length) {
    console.log(gumSection('Install drift'))
    if (payload.drift.missing.length) {
      console.log(
        `  ${gumInfo('missing')} (${payload.drift.missing.length}): ${payload.drift.missing.slice(0, 8).join(', ')}`
      )
    }
    if (payload.drift.extra.length) {
      console.log(
        `  ${gumWarn('extra')} (${payload.drift.extra.length}): ${payload.drift.extra.slice(0, 8).join(', ')}`
      )
    }
    console.log('')
  }

  console.log(gumSection('Commands'))
  console.log(
    gumJoinHorizontal([gumInfo('validate'), gumInfo('reconcile --dry-run'), gumInfo('install'), gumInfo('list')])
  )
  console.log('')

  if (payload.skills?.length) {
    console.log(gumAccent(`── Registered skills (${payload.skills.length}) ──`))
    console.log('')
    renderSkillList(payload.skills, 'pretty', listFormat, verbose)
  }
}

export type SyncLine = { path: string; marker: string; status: 'up to date' | 'would update' | 'updated' }

export function renderSync(lines: SyncLine[], dryRun: boolean, mode: RenderMode): void {
  if (mode === 'raw') {
    for (const l of lines) console.log(`skill sync: ${dryRun ? 'dry-run ' : ''}${l.status} ${l.path}:${l.marker}`)
    return
  }
  console.log(gumTitle(`Skill registry · sync${dryRun ? ' · dry-run' : ''}`))
  console.log('')
  const rows = lines.map(l => {
    const status =
      l.status === 'up to date' ? gumOk(l.status) : l.status === 'would update' ? gumWarn(l.status) : gumInfo(l.status)
    return [gumMuted(l.path), gumBadge(l.marker, GUM.accent), status]
  })
  console.log(gumTable(['File', 'Marker', 'Status'], rows))
  if (!dryRun) gumNextSteps(['mise run skill validate'])
}

export function renderInstall(dryRun: boolean, mode: RenderMode): void {
  if (mode === 'raw') {
    console.log(
      `skill install: ${dryRun ? 'dry-run would run skills experimental_install' : 'running skills experimental_install'}`
    )
    return
  }
  console.log(gumTitle(`Skill registry · install${dryRun ? ' · dry-run' : ''}`))
  console.log(
    dryRun ? gumWarn('  Would run: skills experimental_install') : gumInfo('  Running: skills experimental_install')
  )
}

export function renderAdd(newIds: string[], dryRun: boolean, url: string, mode: RenderMode, scaffold?: string): void {
  if (mode === 'raw') {
    if (dryRun) {
      console.log(`skill add: dry-run would run skills add ${url}`)
      if (scaffold) console.log(scaffold)
      return
    }
    console.log(
      'skill add: next steps: edit TODO fields in SKILLS.yaml → mise run skill validate → mise run skill sync'
    )
    for (const id of newIds) console.log(`  - ${id}`)
    return
  }
  console.log(gumTitle(`Skill registry · add${dryRun ? ' · dry-run' : ''}`))
  if (dryRun) {
    console.log(gumWarn(`  Would run: skills add ${url}`))
    if (scaffold) console.log(gumMuted(scaffold))
    return
  }
  console.log(gumOk(`  ✓ Added ${newIds.length} skill${newIds.length === 1 ? '' : 's'}`))
  for (const id of newIds) console.log(`  ${gumInfo('+')} ${gumAccent(id)}`)
  gumNextSteps(['edit TODO fields in SKILLS.yaml', 'mise run skill validate', 'mise run skill sync'])
}

export function renderCreate(
  skillId: string,
  mdPath: string,
  dryRun: boolean,
  mode: RenderMode,
  scaffold?: string
): void {
  if (mode === 'raw') {
    if (dryRun) {
      console.log(`skill create: dry-run would create ${mdPath}`)
      if (scaffold) console.log(scaffold)
      return
    }
    console.log(`skill create: created ${mdPath}`)
    console.log('skill create: complete TODOs → mise run skill validate → mise run skill sync')
    return
  }
  console.log(gumTitle(`Skill registry · create${dryRun ? ' · dry-run' : ''}`))
  if (dryRun) {
    console.log(gumWarn(`  Would create: ${mdPath}`))
    if (scaffold) console.log(gumMuted(scaffold))
    return
  }
  console.log(gumOk(`  ✓ Created owned skill ${gumAccent(skillId)}`))
  console.log(gumMuted(`  ${mdPath}`))
  gumNextSteps(['complete TODOs in SKILL.md and SKILLS.yaml', 'mise run skill validate', 'mise run skill sync'])
}

export function renderPrune(orphans: string[], dryRun: boolean, mode: RenderMode): void {
  if (mode === 'raw') {
    if (orphans.length === 0) {
      console.log('skill prune: no orphan project installs')
      return
    }
    console.log(`skill prune: ${orphans.length} orphan(s): ${orphans.join(', ')}`)
    return
  }
  console.log(gumTitle(`Skill registry · prune${dryRun ? ' · dry-run' : ''}`))
  if (orphans.length === 0) {
    console.log(gumOk('  ✓ No orphan project installs'))
    return
  }
  console.log(gumWarn(`  ${orphans.length} orphan${orphans.length === 1 ? '' : 's'} to remove`))
  for (const id of orphans) console.log(`  ${gumFail('−')} ${gumWarn(id)}`)
  if (dryRun) {
    console.log('')
    console.log(gumMuted('  Run without --dry-run to uninstall via Skills CLI'))
  }
}
