import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  chooseRenderer,
  type RenderMode,
  renderAdd,
  renderCreate,
  renderInstall,
  renderPrune,
  renderReconcile,
  renderReport,
  renderSkillList,
  renderSync,
  renderValidate,
  type SyncLine
} from './skill_output.script.ts'
import type {
  CliOptions,
  ListFormat,
  PolicyType,
  ReconcilePayload,
  ReportPayload,
  SkillLocation
} from './skill_registry.types.ts'
import {
  agentsSkillsDir,
  appendYamlScaffolds,
  collectSkillListRows,
  formatScaffoldBlock,
  gitRoot,
  isRecord,
  listAgentsSkillDirs,
  loadActualProjectSkills,
  loadRegistry,
  loadSkillLock,
  loadSkillLockObject,
  ownedSkillTemplate,
  ownedYamlBlock,
  replaceManaged,
  SKILL_ID_RE,
  skillMdPath,
  statusNote,
  summarizeCounts,
  writeSkillLock
} from './skill_registry_core.script.ts'
import { runValidate } from './skill_registry_validate.script.ts'

const VALID_ACTIONS = new Set([
  'validate',
  'sync',
  'install',
  'all',
  'report',
  'list',
  'add',
  'reconcile',
  'create',
  'prune'
])

function envBool(name: string): boolean {
  return process.env[name] === 'true'
}

function parseCli(): CliOptions {
  const argv = process.argv.slice(2)
  let i = 0
  let action = process.env.usage_cmd ?? ''
  if (action && VALID_ACTIONS.has(action)) {
    // mise passes action via env; skip if also duplicated in argv
    if (argv[0] === action) i = 1
  } else if (argv[0] && VALID_ACTIONS.has(argv[0])) {
    action = argv[0]
    i = 1
  }

  const opts: CliOptions = {
    action,
    raw: envBool('usage_raw'),
    json: envBool('usage_json'),
    dryRun: envBool('usage_dry_run'),
    listSkills: envBool('usage_list_skills'),
    verbose: false,
    interactive: false,
    locations: new Set(),
    types: new Set(),
    installedOnly: false,
    missingOnly: false,
    extraArgs: []
  }

  const pos: string[] = []
  while (i < argv.length) {
    const a = argv[i]
    if (!a) {
      i++
      continue
    }
    if (a === '--raw') opts.raw = true
    else if (a === '--json') opts.json = true
    else if (a === '--dry-run') opts.dryRun = true
    else if (a === '--list-skills') opts.listSkills = true
    else if (a === '--verbose') opts.verbose = true
    else if (a === '--interactive') opts.interactive = true
    else if (a === '--installed') opts.installedOnly = true
    else if (a === '--missing') opts.missingOnly = true
    else if (a === '--owned') opts.locations.add('owned')
    else if (a === '--project') opts.locations.add('project')
    else if (a === '--global' || a === '--include-global') opts.locations.add('global')
    else if (a === '--format' && argv[i + 1]) {
      opts.listFormat = argv[++i] as ListFormat
    } else if (a === '--type' && argv[i + 1]) {
      const pt = argv[++i] as PolicyType
      opts.types.add(pt)
      opts.policyType = pt
    } else if (a === '--rationale' && argv[i + 1]) {
      opts.rationale = argv[++i]
    } else if (a === '--description' && argv[i + 1]) {
      opts.description = argv[++i]
    } else if (a.startsWith('--')) {
      opts.extraArgs.push(a)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        opts.extraArgs.push(next)
        i++
      }
    } else {
      pos.push(a)
    }
    i++
  }

  if (process.env.usage_type) opts.policyType = process.env.usage_type as PolicyType
  if (process.env.usage_rationale) opts.rationale = process.env.usage_rationale
  if (process.env.usage_description) opts.description = process.env.usage_description
  if (process.env.usage_url) opts.url = process.env.usage_url
  if (process.env.usage_skill_id) opts.skillId = process.env.usage_skill_id

  if (opts.json) opts.raw = true

  if (opts.action === 'add') opts.url = opts.url ?? pos[0]
  if (opts.action === 'create') opts.skillId = opts.skillId ?? pos[0]

  return opts
}

export async function runSync(dryRun: boolean, mode: RenderMode): Promise<void> {
  const payload = await runValidate()
  if (!payload.valid && !dryRun) {
    renderValidate(payload, mode)
    process.exit(1)
  }

  const registry = await loadRegistry()
  const root = gitRoot()
  const skills = registry.skills ?? {}

  const optionals = Object.entries(skills)
    .filter(([, s]) => s.policy.type === 'optional' && isRecord(s.policy.surfaces))
    .map(([name, s]) => ({ name, ...s }))

  const claudeList = optionals.map(s => `- \`${s.name}\` - ${s.policy.surfaces?.claude_optional ?? ''}`).join('\n')
  const lines: SyncLine[] = [
    {
      path: 'CLAUDE.md',
      marker: 'optional-companions',
      status: replaceManaged(root, 'CLAUDE.md', 'optional-companions', claudeList, dryRun)
    }
  ]

  const ctxTable = [
    '| Skill | When |',
    '| --- | --- |',
    ...optionals.map(s => `| **${s.name}** | ${s.policy.surfaces?.app_context_optional ?? ''} |`)
  ].join('\n')
  lines.push({
    path: '.agents/skills/app-context/SKILL.md',
    marker: 'optional-companions',
    status: replaceManaged(root, '.agents/skills/app-context/SKILL.md', 'optional-companions', ctxTable, dryRun)
  })

  const ebRoutes: Array<{ name: string; order: number; triggers?: string[]; note?: string }> = []
  for (const [name, skill] of Object.entries(skills)) {
    const eb = isRecord(skill.policy?.routing) ? skill.policy.routing.electrobun : undefined
    if (!Array.isArray(eb)) continue
    for (const route of eb) {
      if (isRecord(route)) ebRoutes.push({ name, ...(route as object) } as (typeof ebRoutes)[number])
    }
  }
  ebRoutes.sort((a, b) => a.order - b.order)

  const ebTable = [
    '| When the task involves... | Read this skill first | Note |',
    '| --- | --- | --- |',
    ...ebRoutes.map(r => {
      const skill = skills[r.name]
      if (!skill) {
        const triggers = (r.triggers ?? []).join(', ')
        return `| ${triggers} | \`${r.name}\` | |`
      }
      let note = statusNote(skill.location)
      if (r.note) note += ` - ${r.note}`
      const triggers = (r.triggers ?? []).join(', ')
      return `| ${triggers} | \`${r.name}\` | ${note} |`
    })
  ].join('\n')
  lines.push({
    path: '.cursor/electrobun-skill-routing.md',
    marker: 'electrobun-routing',
    status: replaceManaged(root, '.cursor/electrobun-skill-routing.md', 'electrobun-routing', ebTable, dryRun)
  })

  renderSync(lines, dryRun, mode)
}

export async function runInstall(dryRun: boolean, mode: RenderMode): Promise<void> {
  const payload = await runValidate()
  const onlyMissing = !payload.valid && payload.findings.every(f => f.category === 'installed_missing')
  if (!payload.valid && !onlyMissing) {
    renderValidate(payload, mode)
    process.exit(1)
  }
  renderInstall(dryRun, mode)
  if (dryRun) return
  const child = Bun.spawnSync(['skills', 'experimental_install'], {
    cwd: gitRoot(),
    stdout: 'inherit',
    stderr: 'inherit'
  })
  if (child.exitCode !== 0) process.exit(child.exitCode ?? 1)
}

export function listFilters(opts: CliOptions): {
  locations?: Set<SkillLocation>
  types?: Set<PolicyType>
  installedOnly?: boolean
  missingOnly?: boolean
} {
  return {
    locations: opts.locations.size > 0 ? opts.locations : undefined,
    types: opts.types.size > 0 ? opts.types : undefined,
    installedOnly: opts.installedOnly,
    missingOnly: opts.missingOnly
  }
}

export async function runReport(opts: CliOptions): Promise<ReportPayload> {
  const payload = await runValidate()
  const registry = await loadRegistry()
  const counts = summarizeCounts(registry)
  const report: ReportPayload = {
    schema_version: registry.schema_version,
    total_skills: Object.keys(registry.skills ?? {}).length,
    by_location: counts.by_location,
    by_policy_type: counts.by_policy_type,
    electrobun_routes: counts.electrobun_routes,
    valid: payload.valid,
    drift: payload.drift ?? { actual_skills: [], expected_skills: [], missing: [], extra: [] }
  }
  if (opts.listSkills) {
    report.skills = collectSkillListRows(registry, gitRoot(), listFilters(opts))
  }
  return report
}

export async function runReconcile(dryRun: boolean): Promise<ReconcilePayload> {
  const root = gitRoot()
  const registry = await loadRegistry(root)
  const lock = loadSkillLock(root)
  const yamlProject = new Set(
    Object.entries(registry.skills ?? {})
      .filter(([, s]) => s.location === 'project')
      .map(([k]) => k)
  )
  const yamlGlobal = new Set(
    Object.entries(registry.skills ?? {})
      .filter(([, s]) => s.location === 'global')
      .map(([k]) => k)
  )
  const registered = new Set(Object.keys(registry.skills ?? {}))

  const missing_in_yaml = [...lock].filter(k => !(k in (registry.skills ?? {}))).sort()
  const orphan_in_yaml = [...yamlProject].filter(k => !lock.has(k)).sort()
  const global_in_lock = [...yamlGlobal].filter(k => lock.has(k)).sort()
  const owned_drift = listAgentsSkillDirs(root).filter(
    id => existsSync(skillMdPath(root, id, 'owned')) && !registered.has(id)
  )

  const blocks = missing_in_yaml.map(id => formatScaffoldBlock(id, 'optional'))
  const would_write = !dryRun && blocks.length > 0

  if (would_write) appendYamlScaffolds(root, blocks)

  return {
    mode: dryRun ? 'dry-run' : 'write',
    missing_in_yaml,
    orphan_in_yaml,
    global_in_lock,
    owned_drift,
    would_append: missing_in_yaml,
    would_write
  }
}

const ADD_POLICY_TYPES = new Set<PolicyType>(['optional', 'reference', 'required', 'routed'])

export async function runAdd(opts: CliOptions, mode: RenderMode): Promise<void> {
  if (!opts.url) {
    console.error('skill add: URL required')
    process.exit(1)
  }
  if (!opts.policyType || !ADD_POLICY_TYPES.has(opts.policyType)) {
    console.error('skill add: --type required (optional|reference|required|routed)')
    process.exit(1)
  }
  if (opts.policyType === 'routed' && !opts.rationale?.trim()) {
    console.error('skill add: --type routed requires --rationale (add policy.routing.electrobun manually after)')
    process.exit(1)
  }

  const root = gitRoot()
  const before = loadSkillLock(root)

  if (opts.dryRun) {
    renderAdd([], true, opts.url, mode, formatScaffoldBlock('<new-id>', opts.policyType, opts.rationale))
    return
  }

  const child = Bun.spawnSync(['skills', 'add', opts.url, '-y', ...opts.extraArgs], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit'
  })
  if (child.exitCode !== 0) process.exit(child.exitCode ?? 1)

  const after = loadSkillLock(root)
  const newIds = [...after].filter(k => !before.has(k))
  if (newIds.length === 0) {
    console.error('skill add: no new lock entries detected')
    process.exit(1)
  }

  const registry = await loadRegistry(root)
  const blocks: string[] = []
  for (const id of newIds) {
    const existing = registry.skills?.[id]
    if (existing?.location === 'owned') {
      console.error(`skill add: ${id} already registered as owned — refusing project scaffold`)
      process.exit(1)
    }
    if (!existing) blocks.push(formatScaffoldBlock(id, opts.policyType, opts.rationale))
  }
  if (blocks.length) appendYamlScaffolds(root, blocks)

  renderAdd(newIds, false, opts.url, mode)
}

export async function runCreate(opts: CliOptions, mode: RenderMode): Promise<void> {
  const id = opts.skillId
  if (!id) {
    console.error('skill create: skill-id required')
    process.exit(1)
  }
  if (id.includes('://') || id.includes('/')) {
    console.error('skill create: pass a skill id, not a URL — use skill add for external skills')
    process.exit(1)
  }
  if (!SKILL_ID_RE.test(id)) {
    console.error('skill create: id must match [a-z][a-z0-9-]*')
    process.exit(1)
  }

  const root = gitRoot()
  const registry = await loadRegistry(root)
  if (registry.skills?.[id]) {
    console.error(`skill create: ${id} already in SKILLS.yaml`)
    process.exit(1)
  }
  if (loadSkillLock(root).has(id)) {
    console.error(`skill create: ${id} exists in skills-lock.json — use skill add`)
    process.exit(1)
  }

  const policyType: PolicyType = opts.policyType === 'optional' ? 'optional' : 'required'
  const dir = join(agentsSkillsDir(root), id)
  const md = join(dir, 'SKILL.md')
  const desc = opts.description?.trim() || 'TODO: skill description'

  if (opts.dryRun) {
    renderCreate(id, md, true, mode, ownedYamlBlock(id, policyType, opts.rationale))
    return
  }

  if (existsSync(dir)) {
    console.error(`skill create: directory already exists: ${dir}`)
    process.exit(1)
  }

  mkdirSync(dir, { recursive: true })
  writeFileSync(md, ownedSkillTemplate(id, desc), 'utf8')
  appendYamlScaffolds(root, [ownedYamlBlock(id, policyType, opts.rationale)])

  renderCreate(id, md, false, mode)
}

export async function runPrune(dryRun: boolean, mode: RenderMode): Promise<void> {
  const root = gitRoot()
  const registry = await loadRegistry(root)
  const allowed = new Set(
    Object.entries(registry.skills ?? {})
      .filter(([, s]) => s.location === 'owned' || s.location === 'project')
      .map(([k]) => k)
  )

  const actual = loadActualProjectSkills(root)
  if (!actual) {
    console.error('skill prune: skills CLI unavailable')
    process.exit(1)
  }

  const orphans = [...actual].filter(id => !allowed.has(id)).sort()
  renderPrune(orphans, dryRun, mode)
  if (orphans.length === 0 || dryRun) return

  for (const id of orphans) {
    const child = Bun.spawnSync(['skills', 'remove', id, '-y'], { cwd: root, stdout: 'inherit', stderr: 'inherit' })
    if (child.exitCode !== 0) process.exit(child.exitCode ?? 1)
  }

  // Trim lock to only project registry keys still declared
  const lock = loadSkillLockObject(root)
  const projectIds = new Set(
    Object.entries(registry.skills ?? {})
      .filter(([, s]) => s.location === 'project')
      .map(([k]) => k)
  )
  for (const key of Object.keys(lock.skills)) {
    if (!projectIds.has(key)) delete lock.skills[key]
  }
  writeSkillLock(root, lock)
}

export async function main(): Promise<void> {
  const opts = parseCli()
  if (!VALID_ACTIONS.has(opts.action)) {
    console.error('skill: action required: validate, sync, install, all, report, list, add, reconcile, create, prune')
    process.exit(1)
  }

  const mode = chooseRenderer({ json: opts.json, raw: opts.raw, isTty: process.stdout.isTTY })
  const listFormat: ListFormat = opts.listFormat ?? (mode === 'raw' ? 'compact' : 'grouped')

  if (opts.action === 'validate') {
    const payload = await runValidate()
    renderValidate(payload, mode)
    if (!payload.valid) process.exit(1)
    return
  }

  if (opts.action === 'sync') {
    await runSync(opts.dryRun, mode)
    return
  }

  if (opts.action === 'install') {
    await runInstall(opts.dryRun, mode)
    return
  }

  if (opts.action === 'all') {
    await runSync(opts.dryRun, mode)
    await runInstall(opts.dryRun, mode)
    return
  }

  if (opts.action === 'report') {
    const report = await runReport(opts)
    renderReport(report, mode, listFormat, opts.verbose)
    if (!report.valid) process.exit(1)
    return
  }

  if (opts.action === 'list') {
    const registry = await loadRegistry()
    const rows = collectSkillListRows(registry, gitRoot(), listFilters(opts))
    renderSkillList(rows, mode, listFormat, opts.verbose)
    return
  }

  if (opts.action === 'add') {
    await runAdd(opts, mode)
    return
  }

  if (opts.action === 'reconcile') {
    const payload = await runReconcile(opts.dryRun)
    renderReconcile(payload, mode)
    return
  }

  if (opts.action === 'create') {
    await runCreate(opts, mode)
    return
  }

  if (opts.action === 'prune') {
    await runPrune(opts.dryRun, mode)
  }
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  })
}
