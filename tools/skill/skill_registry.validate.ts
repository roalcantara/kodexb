import {
  ALLOWED_LOCATIONS,
  ALLOWED_TYPES,
  diffSets,
  FORBIDDEN_SKILL_FIELDS,
  gitRoot,
  hasTodoText,
  isInstalled,
  isRecord,
  loadActualProjectSkills,
  loadRegistry,
  loadSkillLock,
  REDUNDANT_NOTES,
  summarizeCounts
} from './skill_registry.lib.ts'
import type { DriftReport, Finding, FindingCategory, ValidatePayload } from './skill_registry.types.ts'

function bumpSummary(summary: Record<string, number>, category: FindingCategory): void {
  summary[category] = (summary[category] ?? 0) + 1
}

function addFinding(
  findings: Finding[],
  summary: Record<string, number>,
  category: FindingCategory,
  message: string,
  skill_id?: string
): void {
  findings.push({ category, skill_id, message })
  bumpSummary(summary, category)
}

export async function runValidate(root = gitRoot()): Promise<ValidatePayload> {
  const findings: Finding[] = []
  const summary: Record<string, number> = {}
  const registry = await loadRegistry(root)
  const lockedSkills = loadSkillLock(root)
  const registryProjectSkills = new Set<string>()
  let drift: DriftReport | null = null

  const check = (cond: boolean, category: FindingCategory, message: string, skill_id?: string) => {
    if (!cond) addFinding(findings, summary, category, message, skill_id)
  }

  check(registry?.schema_version === 3, 'schema', 'schema_version must be 3')
  check(isRecord(registry?.skills), 'schema', 'skills must be a mapping')
  check(!Object.hasOwn(registry ?? {}, 'electrobun_routing'), 'schema', 'top-level electrobun_routing must not exist')

  const skills = registry.skills ?? {}
  const counts = summarizeCounts(registry)

  for (const [name, skill] of Object.entries(skills)) {
    check(isRecord(skill), 'schema', `${name} must be a mapping`, name)
    if (!isRecord(skill)) continue

    check(ALLOWED_LOCATIONS.has(skill.location), 'schema', `${name}.location invalid: ${skill.location}`, name)
    check(
      typeof skill.rationale === 'string' && skill.rationale.trim() !== '',
      'schema',
      `${name}.rationale required`,
      name
    )
    check(isRecord(skill.policy), 'schema', `${name}.policy must be a mapping`, name)
    if (!isRecord(skill.policy)) continue

    check(ALLOWED_TYPES.has(skill.policy.type), 'schema', `${name}.policy.type invalid: ${skill.policy.type}`, name)

    if (hasTodoText(skill.rationale)) {
      addFinding(findings, summary, 'policy_incomplete', 'complete rationale before commit (TODO)', name)
    }

    if (skill.location === 'project') {
      registryProjectSkills.add(name)
      if (!lockedSkills.has(name)) {
        addFinding(
          findings,
          summary,
          'yaml_without_lock',
          'location project requires an entry in skills-lock.json',
          name
        )
      }
    } else if (lockedSkills.has(name)) {
      addFinding(
        findings,
        summary,
        'global_in_lock',
        'only location project entries may appear in skills-lock.json',
        name
      )
    }

    if (skill.location === 'owned' && !isInstalled(root, name, 'owned')) {
      addFinding(findings, summary, 'owned_dir_missing', 'owned skill missing .agents/skills/<id>/SKILL.md', name)
    }

    for (const f of FORBIDDEN_SKILL_FIELDS) {
      check(!Object.hasOwn(skill, f), 'schema', `${name} must not have forbidden field: ${f}`, name)
    }

    const t = skill.policy.type
    const hasUsage = isRecord(skill.policy.usage)
    const hasRouting = isRecord(skill.policy.routing)
    const hasSurfaces = isRecord(skill.policy.surfaces)
    const hasReason = typeof skill.policy.reason === 'string' && skill.policy.reason.trim() !== ''
    const hasRedirect = Array.isArray(skill.policy.redirect_to)

    if (t === 'required') {
      check(hasUsage, 'schema', `${name}: required must have usage`, name)
      check(!hasRouting, 'schema', `${name}: required must not have routing`, name)
      check(!hasSurfaces, 'schema', `${name}: required must not have surfaces`, name)
      check(!hasReason, 'schema', `${name}: required must not have reason`, name)
      check(!hasRedirect, 'schema', `${name}: required must not have redirect_to`, name)
    } else if (t === 'routed') {
      check(hasUsage, 'schema', `${name}: routed must have usage`, name)
      check(
        hasRouting && skill.policy.routing !== undefined && Object.keys(skill.policy.routing).length > 0,
        'schema',
        `${name}: routed must have non-empty routing`,
        name
      )
      check(!hasSurfaces, 'schema', `${name}: routed must not have surfaces`, name)
      check(!hasReason, 'schema', `${name}: routed must not have reason`, name)
      check(!hasRedirect, 'schema', `${name}: routed must not have redirect_to`, name)
      const eb = (skill.policy.routing as { electrobun?: unknown }).electrobun
      if (!Array.isArray(eb) || eb.length === 0) {
        addFinding(findings, summary, 'policy_incomplete', 'routed skill missing policy.routing.electrobun', name)
      }
    } else if (t === 'optional') {
      check(hasUsage, 'schema', `${name}: optional must have usage`, name)
      check(!hasRouting, 'schema', `${name}: optional must not have routing`, name)
      check(!hasReason, 'schema', `${name}: optional must not have reason`, name)
      check(!hasRedirect, 'schema', `${name}: optional must not have redirect_to`, name)
    } else if (t === 'reference') {
      check(hasUsage, 'schema', `${name}: reference must have usage`, name)
      check(!hasRouting, 'schema', `${name}: reference must not have routing`, name)
      check(!hasSurfaces, 'schema', `${name}: reference must not have surfaces`, name)
      check(!hasReason, 'schema', `${name}: reference must not have reason`, name)
      check(!hasRedirect, 'schema', `${name}: reference must not have redirect_to`, name)
    } else if (t === 'blocked') {
      check(hasReason, 'schema', `${name}: blocked must have reason`, name)
      check(!hasUsage, 'schema', `${name}: blocked must not have usage`, name)
      check(!hasRouting, 'schema', `${name}: blocked must not have routing`, name)
      check(!hasSurfaces, 'schema', `${name}: blocked must not have surfaces`, name)
      check(skill.location === 'global', 'schema', `${name}: blocked requires location: global`, name)
    }

    if (hasUsage) {
      const us = skill.policy.usage?.summary
      if (hasTodoText(us)) {
        addFinding(findings, summary, 'policy_incomplete', 'complete usage.summary (TODO)', name)
      }
      check(typeof us === 'string' && us.trim() !== '', 'schema', `${name}.usage.summary required`, name)
      const load = skill.policy.usage?.when?.load
      if (!Array.isArray(load) || load.length === 0 || load.some(item => hasTodoText(String(item)))) {
        addFinding(findings, summary, 'policy_incomplete', 'complete usage.when.load triggers', name)
      }
      const avoid = skill.policy.usage?.when?.avoid
      check(Array.isArray(avoid), 'schema', `${name}.usage.when.avoid must be a list`, name)
    }

    if (hasRouting && skill.policy.routing) {
      for (const [surface, routes] of Object.entries(skill.policy.routing)) {
        check(Array.isArray(routes), 'schema', `${name}.routing.${surface} must be a list`, name)
        if (!Array.isArray(routes)) continue
        for (const route of routes) {
          check(isRecord(route), 'schema', `${name}.routing.${surface} entries must be mappings`, name)
          if (!isRecord(route)) continue
          check(typeof route.order === 'number', 'schema', `${name}.routing.${surface}.order must be numeric`, name)
          check(
            Array.isArray(route.triggers) && route.triggers.length > 0,
            'schema',
            `${name}.routing.${surface}.triggers must be non-empty list`,
            name
          )
          if (Object.hasOwn(route, 'note')) {
            check(
              typeof route.note === 'string' && route.note.trim() !== '',
              'schema',
              `${name}.routing.${surface}.note must be non-empty string when present`,
              name
            )
            check(
              !REDUNDANT_NOTES.has(String(route.note).trim()),
              'schema',
              `${name}.routing.${surface}.note must not be a redundant status note: ${route.note}`,
              name
            )
          }
        }
      }
    }
  }

  for (const lockedName of lockedSkills) {
    if (!registryProjectSkills.has(lockedName)) {
      addFinding(
        findings,
        summary,
        'lock_without_yaml',
        'skills-lock.json entry requires a matching location project registry entry',
        lockedName
      )
    }
  }

  const actualSkills = loadActualProjectSkills(root)
  if (actualSkills === null) {
    addFinding(findings, summary, 'schema', 'skills CLI unavailable — cannot validate actual project installs')
  } else {
    const expectedSkills = new Set<string>()
    for (const [name, skill] of Object.entries(skills)) {
      if (skill.location === 'owned' || skill.location === 'project') expectedSkills.add(name)
    }
    const { missing, extra } = diffSets(actualSkills, expectedSkills)
    for (const m of missing) {
      addFinding(
        findings,
        summary,
        'installed_missing',
        'expected project skill not installed — run mise run skill install',
        m
      )
    }
    for (const e of extra) {
      addFinding(findings, summary, 'installed_extra', 'installed project skill not in registry as owned or project', e)
    }
    drift = {
      actual_skills: [...actualSkills].sort(),
      expected_skills: [...expectedSkills].sort(),
      missing,
      extra
    }
  }

  summary.total = findings.length

  return {
    valid: findings.length === 0,
    schema_version: registry.schema_version,
    counts_by_location: counts.by_location,
    counts_by_policy_type: counts.by_policy_type,
    findings,
    summary,
    drift
  }
}
