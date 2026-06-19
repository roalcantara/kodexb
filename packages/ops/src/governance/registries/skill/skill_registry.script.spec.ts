import { describe, expect, it } from 'bun:test'
import { renderValidate } from './skill_output.script'
import type { SkillRegistry, ValidatePayload } from './skill_registry.types'
import {
  collectSkillListRows,
  formatScaffoldBlock,
  hasTodoText,
  ownedYamlBlock,
  SKILL_ID_RE
} from './skill_registry_core.script'

describe('skill registry helpers', () => {
  it('formatScaffoldBlock includes project location and policy type', () => {
    const block = formatScaffoldBlock('bun-test', 'optional', 'Test helper')
    expect(block).toContain('bun-test:')
    expect(block).toContain('location: project')
    expect(block).toContain('type: optional')
    expect(block).toContain('Test helper')
  })

  it('ownedYamlBlock uses owned location', () => {
    const block = ownedYamlBlock('app-foo', 'required', 'Foo skill')
    expect(block).toContain('location: owned')
    expect(block).toContain('type: required')
  })

  it('hasTodoText detects TODO markers', () => {
    expect(hasTodoText('TODO: fix')).toBe(true)
    expect(hasTodoText('load when TODO')).toBe(true)
    expect(hasTodoText('Canonical RPC guidance')).toBe(false)
  })

  it('SKILL_ID_RE accepts kebab-case ids', () => {
    expect(SKILL_ID_RE.test('app-context')).toBe(true)
    expect(SKILL_ID_RE.test('react:components')).toBe(false)
  })
})

describe('collectSkillListRows filters', () => {
  const registry: SkillRegistry = {
    schema_version: 3,
    skills: {
      'app-context': {
        location: 'owned',
        rationale: 'Mandatory orientation',
        policy: { type: 'required', usage: { summary: 'Always', when: { load: ['any task'], avoid: [] } } }
      },
      'bun-runtime': {
        location: 'project',
        rationale: 'Bun runtime reference',
        policy: { type: 'optional', usage: { summary: 'Bun details', when: { load: ['bun runtime'], avoid: [] } } }
      },
      elysia: {
        location: 'global',
        rationale: 'Elysia companion',
        policy: { type: 'optional', usage: { summary: 'Routes', when: { load: ['elysia'], avoid: [] } } }
      }
    }
  }

  it('returns all skills by default', () => {
    const rows = collectSkillListRows(registry, '/tmp', {})
    expect(rows).toHaveLength(3)
  })

  it('filters by location OR semantics', () => {
    const rows = collectSkillListRows(registry, '/tmp', {
      locations: new Set(['owned', 'global'])
    })
    expect(rows.map(r => r.id).sort()).toEqual(['app-context', 'elysia'])
  })
})

describe('renderValidate raw snapshot', () => {
  it('prints grouped summary header', () => {
    const payload: ValidatePayload = {
      valid: false,
      schema_version: 3,
      counts_by_location: { owned: 1 },
      counts_by_policy_type: { required: 1 },
      findings: [{ category: 'lock_without_yaml', skill_id: 'bun-test', message: 'missing registry row' }],
      summary: { lock_without_yaml: 1, total: 1 },
      drift: null
    }
    const lines: string[] = []
    const orig = console.log
    console.log = (...args: unknown[]) => lines.push(args.join(' '))
    try {
      renderValidate(payload, 'raw')
    } finally {
      console.log = orig
    }
    expect(lines[0]).toContain('FAILED')
    expect(lines.some(l => l.includes('bun-test'))).toBe(true)
  })
})
