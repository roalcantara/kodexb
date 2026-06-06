/**
 * Guide / workflow-catalog / workflow-YAML / plan-template content fixtures.
 * Evidence for OHW-1 AC2/AC3, OHW-5 AC1/AC2, OHW-6 AC2, OHW-7 AC1, OHW-8 AC1/AC2.
 */
import { describe, expect, it } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'

const GUIDE = 'assets/guides/SDD_WORKFLOW_GUIDE.md'
const CATALOG = '.specify/workflow-catalogs.yml'
const WORKFLOW_YAML = '.specify/workflows/orchestrated-handoff/workflow.yml'
const PLAN_TEMPLATE = '.specify/templates/plan-template.md'

const RE_OH_HEADING = /^##\s+orchestrated-handoff workflow/m
const RE_DEFERRED_OH = /Deferred[^\n]+orchestrated-handoff/i
const RE_V1_OPENCODE = /v1[^\n]*opencode/i
const RE_PLAN_SKILL_HEADING = /^###\s+Plan skill routing/m
const RE_NORMATIVE_HEADING = /^###\s+Normative quartet/m
const RE_NEEDS_CLARIFICATION = /NEEDS CLARIFICATION/i
const RE_YAML_WORKFLOW_ID = /id:\s*["']?orchestrated-handoff["']?/
const RE_YAML_NAME = /^\s*name:/m
const RE_YAML_VERSION = /^\s*version:/m
const RE_YAML_DESCRIPTION = /^\s*description:/m
const RE_YAML_CLARIFY_STEP = /id:\s*clarify/
const RE_YAML_CHECKLIST_STEP = /id:\s*checklist/
const RE_YAML_TASKS_STEP = /id:\s*tasks/
const RE_YAML_IMPLEMENT_STEP = /id:\s*implement/
const RE_YAML_GATE_BLOCKS = /type:\s*gate[\s\S]*?(?=\n {2}-\s|\n$)/g
const RE_YAML_COMMAND_REF = /command:\s*([a-z.]+)/g
const RE_OHW_ID = /OHW-\d/
const RE_EARS_TEXT = /\bWHEN\s.+\bTHEN\s.+\bSHALL\b/

function loadGuide(): string {
  if (!existsSync(GUIDE)) throw new Error(`missing ${GUIDE}`)
  return readFileSync(GUIDE, 'utf-8')
}

describe('SDD_WORKFLOW_GUIDE.md — orchestrated-handoff section (OHW-5 AC1)', () => {
  const guide = loadGuide()

  it('contains the § orchestrated-handoff workflow heading', () => {
    expect(guide).toMatch(RE_OH_HEADING)
  })

  it('lists the three mise entry commands + resume', () => {
    expect(guide).toContain('mise run spec workflow orchestrated-handoff')
    expect(guide).toContain('mise run spec handoff-generate')
    expect(guide).toContain('mise run spec resume')
  })

  it('no longer marks orchestrated-handoff as deferred', () => {
    expect(guide).not.toMatch(RE_DEFERRED_OH)
  })

  it('does NOT contain mise `--` separator before `--feature`', () => {
    expect(guide).not.toContain('-- --feature')
  })

  it('contains working mise run form with `--feature` (no double-dash separator)', () => {
    expect(guide).toContain('mise run spec workflow orchestrated-handoff --feature')
  })
})

describe('SDD_WORKFLOW_GUIDE.md — opencode v1 dispatch (OHW-5 AC2)', () => {
  const guide = loadGuide()
  it('describes opencode worker handoff vs primary implement', () => {
    expect(guide).toContain('Opencode worker handoff')
    expect(guide).toContain('Primary implement')
    expect(guide).toContain('tmp/handoffs/')
    expect(guide).toContain('--focus')
  })

  it('states v1 opencode-only', () => {
    expect(guide).toMatch(RE_V1_OPENCODE)
  })
})

describe('SDD_WORKFLOW_GUIDE.md — Review-spec gate (OHW-6 AC2)', () => {
  const guide = loadGuide()
  it('contains the literal "deterministic EARS gate" phrase', () => {
    expect(guide).toContain('deterministic EARS gate')
  })
})

describe('SDD_WORKFLOW_GUIDE.md — Plan skill routing (OHW-7 AC1)', () => {
  const guide = loadGuide()
  it('contains a Plan skill routing section heading', () => {
    expect(guide).toMatch(RE_PLAN_SKILL_HEADING)
  })

  it('states the cap rule "Maximum 4 skills"', () => {
    expect(guide).toContain('Maximum 4 skills')
  })

  it('names at least one routing target per row', () => {
    expect(guide).toContain('app-context')
    expect(guide).toContain('app-rpc')
    expect(guide).toContain('app-testing')
  })
})

describe('SDD_WORKFLOW_GUIDE.md — Normative quartet (OHW-8 AC1)', () => {
  const guide = loadGuide()
  it('contains the Normative quartet section', () => {
    expect(guide).toMatch(RE_NORMATIVE_HEADING)
    expect(guide).toContain('Normative quartet')
  })

  it('lists optional satellites with the trigger condition', () => {
    expect(guide).toContain('research.md')
    expect(guide).toContain('data-model.md')
    expect(guide).toContain('contracts/')
    expect(guide).toContain('quickstart.md')
    expect(guide).toMatch(RE_NEEDS_CLARIFICATION)
  })

  it('forbids copying EARS AC text into plan/tasks', () => {
    expect(guide).toContain('SHALL NOT copy EARS AC text')
  })
})

describe('.specify/workflow-catalogs.yml — OHW-1 AC3', () => {
  it('lists both speckit and orchestrated-handoff workflow paths', () => {
    const yml = readFileSync(CATALOG, 'utf-8')
    expect(yml).toContain('workflows/speckit/workflow.yml')
    expect(yml).toContain('workflows/orchestrated-handoff/workflow.yml')
  })
})

describe('orchestrated-handoff workflow.yml — OHW-1 AC1, AC2', () => {
  const yml = readFileSync(WORKFLOW_YAML, 'utf-8')

  it('has workflow.id orchestrated-handoff with name/version/description', () => {
    expect(yml).toMatch(RE_YAML_WORKFLOW_ID)
    expect(yml).toMatch(RE_YAML_NAME)
    expect(yml).toMatch(RE_YAML_VERSION)
    expect(yml).toMatch(RE_YAML_DESCRIPTION)
  })

  it('includes the dual analyze steps (analyze-plan + analyze-tasks)', () => {
    expect(yml).toContain('id: analyze-plan')
    expect(yml).toContain('id: analyze-tasks')
  })

  it('includes clarify, checklist, tasks, implement steps', () => {
    expect(yml).toMatch(RE_YAML_CLARIFY_STEP)
    expect(yml).toMatch(RE_YAML_CHECKLIST_STEP)
    expect(yml).toMatch(RE_YAML_TASKS_STEP)
    expect(yml).toMatch(RE_YAML_IMPLEMENT_STEP)
  })

  it('every gate step uses [approve, reject] options', () => {
    const gateBlocks = yml.match(RE_YAML_GATE_BLOCKS) ?? []
    expect(gateBlocks.length).toBeGreaterThan(0)
    for (const gate of gateBlocks) {
      expect(gate).toContain('options: [approve, reject]')
    }
  })

  it('every command step references a known speckit.* command', () => {
    const KNOWN = new Set([
      'speckit.specify',
      'speckit.clarify',
      'speckit.checklist',
      'speckit.plan',
      'speckit.analyze',
      'speckit.tasks',
      'speckit.implement'
    ])
    const commands = [...yml.matchAll(RE_YAML_COMMAND_REF)].map(m => m[1])
    for (const c of commands) {
      if (!c) continue
      expect(KNOWN.has(c)).toBe(true)
    }
  })
})

describe('plan-template.md — OHW-8 AC2', () => {
  const template = readFileSync(PLAN_TEMPLATE, 'utf-8')
  it('marks satellites OPTIONAL with trigger conditions', () => {
    // Look in the Documentation block.
    const docBlock = template.split('### Documentation')[1]?.split('### Source Code')[0] ?? ''
    expect(docBlock).toContain('research.md')
    expect(docBlock).toContain('data-model.md')
    expect(docBlock).toContain('quickstart.md')
    expect(docBlock).toContain('contracts/')
    // Each satellite line should mark OPTIONAL.
    const optionalLines = docBlock.match(/OPTIONAL/g) ?? []
    expect(optionalLines.length).toBeGreaterThanOrEqual(4)
  })

  it('points readers at the normative quartet rule', () => {
    expect(template).toContain('normative quartet')
  })
})

describe('004 directory — OHW-8 AC3', () => {
  const dir = 'assets/specs/004-orchestrated-handoff'
  it('contains the normative quartet', () => {
    expect(existsSync(`${dir}/spec.md`)).toBe(true)
    expect(existsSync(`${dir}/plan.md`)).toBe(true)
    expect(existsSync(`${dir}/tasks.md`)).toBe(true)
    expect(existsSync(`${dir}/handoff.md`)).toBe(true)
  })
  it('does NOT contain optional satellites', () => {
    expect(existsSync(`${dir}/research.md`)).toBe(false)
    expect(existsSync(`${dir}/data-model.md`)).toBe(false)
    expect(existsSync(`${dir}/quickstart.md`)).toBe(false)
    expect(existsSync(`${dir}/contracts`)).toBe(false)
  })
  it('plan.md references OHW IDs (no EARS WHEN/SHALL text copied)', () => {
    const plan = readFileSync(`${dir}/plan.md`, 'utf-8')
    expect(plan).toMatch(RE_OHW_ID)
    expect(plan).not.toMatch(RE_EARS_TEXT)
  })
})
