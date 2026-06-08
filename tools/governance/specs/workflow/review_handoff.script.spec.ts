import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseHandoffAcTable } from './handoff_generate.script.ts'
import {
  buildAuditScaffoldMarkdown,
  classifyPathHits,
  classifyReviewSlice,
  commandsFromEvidenceText,
  extractBeforeDoneCommands,
  extractEvidenceCommands,
  routeReviewSkills,
  scaffoldAuditReport,
  slugFromFeatureDir
} from './review_handoff_core.script.ts'

describe('classifyPathHits', () => {
  it('detects governance and gherkin paths', () => {
    const hits = classifyPathHits([
      'tools/governance/specs/workflow/foo.script.ts',
      'assets/features/sync.feature',
      'bdd/unit/foo.spec.ts'
    ])
    expect(hits.governance).toBe(true)
    expect(hits.gherkin).toBe(true)
    expect(hits.testing).toBe(true)
  })
})

describe('classifyReviewSlice', () => {
  it('returns mixed when multiple worker surfaces change', () => {
    const slice = classifyReviewSlice(['src/shell/app/app.ts', 'tools/governance/specs/workflow/foo.script.ts'])
    expect(slice).toBe('mixed')
  })

  it('honours explicit focus hint', () => {
    expect(classifyReviewSlice([], 'governance-tools')).toBe('governance-tools')
  })
})

describe('routeReviewSkills', () => {
  it('caps skills at three and prioritises app-testing', () => {
    const route = routeReviewSkills(
      ['src/shell/app/foo.routes.ts', 'src/foo.spec.ts', 'tools/governance/x.ts', 'bdd/unit/y.spec.ts'],
      'mixed'
    )
    expect(route.skills.length).toBeLessThanOrEqual(3)
    expect(route.skills[0]).toBe('app-testing')
    expect(route.askSplitFollowUp).toBe(true)
  })
})

describe('commandsFromEvidenceText', () => {
  it('extracts backtick commands and skips prose references', () => {
    expect(commandsFromEvidenceText('`bun test foo.spec.ts` (round-trip)')).toEqual(['bun test foo.spec.ts'])
    expect(commandsFromEvidenceText('Same spec; see handoff')).toEqual([])
  })
})

describe('extractEvidenceCommands', () => {
  it('parses AC table evidence column', () => {
    const md = [
      '| ID         | Done when | Evidence                          |',
      '| ---------- | --------- | --------------------------------- |',
      '| WOBS-1 AC1 | passes    | `bun test workflow_run.script.spec.ts` |'
    ].join('\n')
    const rows = extractEvidenceCommands(md)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.acId).toBe('WOBS-1 AC1')
    expect(rows[0]?.commands).toEqual(['bun test workflow_run.script.spec.ts'])
  })
})

describe('extractBeforeDoneCommands', () => {
  it('reads lines after Before done in agent prompt block', () => {
    const md = [
      '## Agent prompt',
      '```text',
      'Implement foo.',
      '',
      'Before done:',
      '  bun test --config /dev/null tools/governance/specs/workflow/',
      '  mise run spec lint tools/__tests__/fixtures/005 --strict',
      '',
      'Do not commit unless asked.',
      '```'
    ].join('\n')
    expect(extractBeforeDoneCommands(md)).toEqual([
      'bun test --config /dev/null tools/governance/specs/workflow/',
      'mise run spec lint tools/__tests__/fixtures/005 --strict'
    ])
  })
})

describe('slugFromFeatureDir', () => {
  it('uses feature dir basename', () => {
    expect(slugFromFeatureDir('tools/__tests__/fixtures/005-workflow-observability', 'handoff.md')).toBe(
      '005-workflow-observability'
    )
  })

  it('parses tmp handoff filenames', () => {
    expect(slugFromFeatureDir(null, 'tmp/handoffs/review-005-workflow-observability-implement-src-abc.md')).toBe(
      '005-workflow-observability'
    )
  })
})

describe('buildAuditScaffoldMarkdown', () => {
  it('includes AC matrix separator and evidence rows', () => {
    const md = [
      '| ID         | Done when | Evidence                          |',
      '| ---------- | --------- | --------------------------------- |',
      '| WOBS-1 AC1 | passes    | `bun test workflow_run.script.spec.ts` |'
    ].join('\n')
    const input = {
      featureDir: 'tools/__tests__/fixtures/005-workflow-observability',
      handoffPath: 'tools/__tests__/fixtures/005-workflow-observability/handoff.md',
      slice: 'governance-tools' as const,
      base: 'abc123',
      head: 'def456',
      changedPaths: ['tools/governance/specs/workflow/foo.script.ts'],
      route: routeReviewSkills(['tools/governance/specs/workflow/foo.script.ts'], 'governance-tools'),
      acRows: parseHandoffAcTable(md),
      evidence: extractEvidenceCommands(md),
      beforeDone: ['mise run spec lint tools/__tests__/fixtures/005 --strict']
    }
    const content = buildAuditScaffoldMarkdown(input, {
      slug: '005-workflow-observability',
      shortSha: 'def456',
      branch: 'feat/005',
      isoTs: '2026-06-03T12:00:00.000Z'
    })
    expect(content).toContain('| --- | --- | --- |')
    expect(content).toContain('WOBS-1 AC1')
    expect(content).toContain('bun test workflow_run.script.spec.ts')
    expect(content).toContain('## Before done commands')
    expect(content).toContain('tools/governance/specs/workflow/foo.script.ts')
  })
})

describe('scaffoldAuditReport', () => {
  it('writes tmp/reviews/review-{slug}-{sha}.md', () => {
    const root = mkdtempSync(join(tmpdir(), 'review-scaffold-'))
    const featureDir = join(root, 'tools/__tests__/fixtures/005-workflow-observability')
    const handoffPath = join(featureDir, 'handoff.md')
    mkdirSync(featureDir, { recursive: true })
    writeFileSync(
      handoffPath,
      [
        '| ID         | Done when | Evidence |',
        '| ---------- | --------- | -------- |',
        '| WOBS-1 AC1 | ok        | `echo ok` |'
      ].join('\n')
    )
    const result = scaffoldAuditReport({
      handoffPath,
      featureDir,
      base: 'HEAD~1',
      head: 'HEAD',
      repoRoot: root
    })
    expect(result.path).toContain('tmp/reviews/review-005-workflow-observability-')
    expect(readFileSync(result.path, 'utf8')).toContain('WOBS-1 AC1')
  })
})
