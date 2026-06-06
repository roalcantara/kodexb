import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { repoRoot } from '../../../support/lib/shared/repo_root.script.ts'
import type { PolicyType, SkillListRow, SkillLocation, SkillRegistry } from './skill_registry.types.ts'

export const ALLOWED_LOCATIONS = new Set<SkillLocation>(['owned', 'project', 'global'])
export const ALLOWED_TYPES = new Set<PolicyType>(['required', 'routed', 'optional', 'reference', 'blocked'])
export const FORBIDDEN_SKILL_FIELDS = ['source', 'install', 'link', 'decision', 'load'] as const
export const REDUNDANT_NOTES = new Set(['owned', 'project', 'global only'])
export const POLICY_GROUP_ORDER: PolicyType[] = ['required', 'routed', 'optional', 'reference', 'blocked']
export const SKILL_ID_RE = /^[a-z][a-z0-9-]*$/

/** @deprecated Use repoRoot from tools/support/lib/shared/repo_root.script.ts */
export function gitRoot(): string {
  return repoRoot()
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export const SKILLS_REGISTRY_REL = 'assets/catalog/SKILLS.yaml'

export function registryPath(root: string): string {
  return join(root, SKILLS_REGISTRY_REL)
}

export function lockPath(root: string): string {
  return join(root, 'skills-lock.json')
}

export function agentsSkillsDir(root: string): string {
  return join(root, '.agents/skills')
}

export async function loadRegistry(root = gitRoot()): Promise<SkillRegistry> {
  const fp = registryPath(root)
  const url = Bun.pathToFileURL(fp).href
  const mod = await import(url, { with: { type: 'yaml' } })
  return mod.default as SkillRegistry
}

export function loadRegistryText(root = gitRoot()): string {
  return readFileSync(registryPath(root), 'utf8')
}

export function loadSkillLock(root = gitRoot()): Set<string> {
  const fp = lockPath(root)
  if (!existsSync(fp)) return new Set()
  const lock = JSON.parse(readFileSync(fp, 'utf8')) as { skills?: Record<string, unknown> }
  return new Set(Object.keys(lock.skills ?? {}))
}

export function loadSkillLockObject(root = gitRoot()): { version: number; skills: Record<string, unknown> } {
  const fp = lockPath(root)
  if (!existsSync(fp)) return { version: 1, skills: {} }
  return JSON.parse(readFileSync(fp, 'utf8')) as { version: number; skills: Record<string, unknown> }
}

export function writeSkillLock(root: string, lock: { version: number; skills: Record<string, unknown> }): void {
  writeFileSync(lockPath(root), `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
}

export function loadActualProjectSkills(root: string): Set<string> | null {
  const child = Bun.spawnSync(['skills', 'list', '--json'], { cwd: root })
  if (child.exitCode !== 0) return null
  try {
    const list = JSON.parse(new TextDecoder().decode(child.stdout)) as Array<{
      scope?: string
      path?: string
    }>
    return new Set(
      list
        .filter(s => s.scope === 'project' && (s.path ?? '').includes('.agents/skills/'))
        .map(s => (s.path ?? '').split('/').pop() ?? '')
        .filter(Boolean)
    )
  } catch {
    return null
  }
}

export function diffSets(actual: Set<string>, expected: Set<string>): { missing: string[]; extra: string[] } {
  const missing = [...expected].filter(s => !actual.has(s))
  const extra = [...actual].filter(s => !expected.has(s))
  return { missing, extra }
}

export function skillMdPath(root: string, id: string, location: SkillLocation): string {
  if (location === 'global') return join(homedir(), '.agents/skills', id, 'SKILL.md')
  return join(agentsSkillsDir(root), id, 'SKILL.md')
}

export function isInstalled(root: string, id: string, location: SkillLocation): boolean {
  return existsSync(skillMdPath(root, id, location))
}

export const TODO_PREFIX_RE = /^TODO:/i
export const TODO_WORD_RE = /\bTODO\b/

export function hasTodoText(value: string | undefined): boolean {
  if (!value) return false
  return TODO_PREFIX_RE.test(value.trim()) || TODO_WORD_RE.test(value)
}

export function formatScaffoldBlock(id: string, policyType: PolicyType, rationale?: string): string {
  const rat = rationale?.trim() ? rationale.trim() : 'TODO: why this skill is in kb'
  return `  ${id}:
    location: project
    rationale: ${JSON.stringify(rat)}
    policy:
      type: ${policyType}
      usage:
        summary: "TODO: one-line load guidance"
        when:
          load:
            - TODO
          avoid: []
`
}

export function appendYamlScaffolds(root: string, blocks: string[]): void {
  if (blocks.length === 0) return
  const fp = registryPath(root)
  const orig = readFileSync(fp, 'utf8')
  const trimmed = orig.trimEnd()
  const next = `${trimmed}\n${blocks.join('')}`
  writeFileSync(fp, `${next}\n`, 'utf8')
}

export function replaceManaged(
  root: string,
  relativePath: string,
  marker: string,
  content: string,
  dryRun: boolean
): 'up to date' | 'would update' | 'updated' {
  const fp = join(root, relativePath)
  const start = `<!-- skills:${marker}:start -->`
  const end = `<!-- skills:${marker}:end -->`
  const orig = readFileSync(fp, 'utf8')
  const si = orig.indexOf(start)
  const ei = orig.indexOf(end)
  if (si === -1 || ei === -1 || ei < si) {
    console.error(`skill sync: missing markers for ${marker} in ${relativePath}`)
    process.exit(1)
  }
  const next = `${orig.slice(0, si + start.length)}\n${content.trimEnd()}\n${orig.slice(ei)}`
  const unchanged = next === orig
  if (dryRun) return unchanged ? 'up to date' : 'would update'
  if (!unchanged) writeFileSync(fp, next)
  return unchanged ? 'up to date' : 'updated'
}

export function statusNote(location: SkillLocation): string {
  if (location === 'project') return 'project'
  if (location === 'owned') return 'owned'
  return 'global only'
}

export function listAgentsSkillDirs(root: string): string[] {
  const dir = agentsSkillsDir(root)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort()
}

export function collectSkillListRows(
  registry: SkillRegistry,
  root: string,
  filters: {
    locations?: Set<SkillLocation>
    types?: Set<PolicyType>
    installedOnly?: boolean
    missingOnly?: boolean
  } = {}
): SkillListRow[] {
  const rows: SkillListRow[] = []
  for (const [id, skill] of Object.entries(registry.skills ?? {})) {
    if (filters.locations && filters.locations.size > 0 && !filters.locations.has(skill.location)) continue
    const ptype = skill.policy?.type
    if (filters.types && filters.types.size > 0 && (!ptype || !filters.types.has(ptype))) continue

    const installed =
      skill.location === 'global'
        ? isInstalled(root, id, 'global')
        : existsSync(join(agentsSkillsDir(root), id, 'SKILL.md'))

    if (filters.installedOnly && !installed) continue
    const shouldBeOnDisk = skill.location === 'owned' || skill.location === 'project'
    if (filters.missingOnly && (!shouldBeOnDisk || installed)) continue

    const load = skill.policy?.usage?.when?.load
    const incomplete =
      hasTodoText(skill.rationale) ||
      hasTodoText(skill.policy?.usage?.summary) ||
      (Array.isArray(load) && load.some(x => hasTodoText(x))) ||
      (skill.policy?.type === 'routed' &&
        !Array.isArray((skill.policy.routing as { electrobun?: unknown } | undefined)?.electrobun))

    const row: SkillListRow = {
      id,
      location: skill.location,
      policy_type: skill.policy?.type ?? 'required',
      rationale: skill.rationale,
      usage_summary: skill.policy?.usage?.summary,
      load_triggers: skill.policy?.usage?.when?.load,
      avoid_triggers: skill.policy?.usage?.when?.avoid,
      installed,
      install_path:
        skill.location === 'global' ? join(homedir(), '.agents/skills', id) : join(agentsSkillsDir(root), id),
      incomplete
    }

    if (skill.policy?.type === 'blocked') {
      row.blocked = {
        reason: skill.policy.reason,
        redirect_to: skill.policy.redirect_to
      }
    }

    const eb = skill.policy?.routing?.electrobun
    if (Array.isArray(eb)) {
      row.electrobun_routes = eb.flatMap(r =>
        isRecord(r) && Array.isArray(r.triggers) ? r.triggers.filter((t): t is string => typeof t === 'string') : []
      )
    }

    rows.push(row)
  }

  rows.sort((a, b) => a.id.localeCompare(b.id))
  return rows
}

export function ownedSkillTemplate(id: string, description: string): string {
  const title = id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  return `---
name: ${id}
description: ${description}
---

# ${title}

## When to load

TODO

## Instructions

TODO
`
}

export function ownedYamlBlock(id: string, policyType: PolicyType, rationale?: string): string {
  const rat = rationale?.trim() ? rationale.trim() : 'TODO: owned skill rationale'
  return `  ${id}:
    location: owned
    rationale: ${JSON.stringify(rat)}
    policy:
      type: ${policyType}
      usage:
        summary: "TODO: one-line load guidance"
        when:
          load:
            - TODO
          avoid: []
`
}

export function summarizeCounts(registry: SkillRegistry): {
  by_location: Record<string, number>
  by_policy_type: Record<string, number>
  electrobun_routes: number
} {
  const byLoc: Record<string, number> = {}
  const byType: Record<string, number> = {}
  let ebTotal = 0
  for (const skill of Object.values(registry.skills ?? {})) {
    const loc = skill.location || '?'
    const t = skill.policy?.type || '?'
    byLoc[loc] = (byLoc[loc] ?? 0) + 1
    byType[t] = (byType[t] ?? 0) + 1
    const eb = skill.policy?.routing?.electrobun
    if (Array.isArray(eb)) ebTotal += eb.length
  }
  return { by_location: byLoc, by_policy_type: byType, electrobun_routes: ebTotal }
}
