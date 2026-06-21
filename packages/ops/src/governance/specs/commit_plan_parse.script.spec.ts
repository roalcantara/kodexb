import { describe, expect, it } from 'bun:test'
import path from 'node:path'
import {
  formatCommitMessage,
  parseCommitPlanFromMarkdown,
  readCommitPlan,
  resolveChunkByPhaseId
} from '../../governance/specs/commit_plan_parse.script'

const FIXTURE = path.join(import.meta.dirname, '../../__tests__/fixtures/commit_plan/tasks.md')

describe('commit_plan_parse', () => {
  it('parses Commit plan chunks from fixture tasks.md', async () => {
    const md = await Bun.file(FIXTURE).text()
    const { plan, errors } = parseCommitPlanFromMarkdown(md)
    expect(errors).toEqual([])
    expect(plan?.chunks).toHaveLength(1)
    expect(plan?.chunks[0]?.id).toBe('C1')
    expect(plan?.chunks[0]?.paths).toEqual(['src/example.ts', 'src/example.spec.ts'])
  })

  it('resolveChunkByPhaseId accepts C1, index, and phase letter', async () => {
    const md = await Bun.file(FIXTURE).text()
    const { plan } = parseCommitPlanFromMarkdown(md)
    expect(plan).toBeDefined()
    if (!plan) return
    expect(resolveChunkByPhaseId(plan, 'C1')?.id).toBe('C1')
    expect(resolveChunkByPhaseId(plan, '1')?.id).toBe('C1')
    expect(resolveChunkByPhaseId(plan, 'A')?.id).toBe('C1')
  })

  it('detects inline commit drift', () => {
    const md = `# Tasks

- [ ] **T101** Task — *commit:* \`feat(wrong): Bad subject\`

## Commit plan

### C1 — Chunk
- **Tasks:** T101
- **Paths:** \`src/a.ts\`
- **Subject:** \`ref(core): Good subject line here\`
- **Body:**
  Valid body with enough characters for HK policy check here.
`
    const { errors } = parseCommitPlanFromMarkdown(md)
    expect(errors.some(e => e.kind === 'inline-drift')).toBe(true)
  })

  it('formatCommitMessage produces subject blank line body', () => {
    const msg = formatCommitMessage({
      id: 'C1',
      title: 't',
      tasks: [],
      paths: [],
      subject: 'ref(core): Subject line',
      body: 'Body text with sufficient length.'
    })
    expect(msg.startsWith('ref(core): Subject line\n\n')).toBe(true)
  })

  it('readCommitPlan returns errors for missing section', () => {
    const dir = path.join(import.meta.dirname, '../__tests__/fixtures/000-feature-demo')
    const { errors } = readCommitPlan(dir)
    expect(errors.some(e => e.kind === 'missing-section')).toBe(true)
  })
})
