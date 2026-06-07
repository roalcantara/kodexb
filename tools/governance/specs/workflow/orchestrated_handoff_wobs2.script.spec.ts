import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { run } from './orchestrated_handoff.script.ts'
import { createFixtureKit, expectEventBasics, suppressLog } from './workflow_test_helpers.script.ts'

describe('WOBS-2 AC1: phase_decided event has all required fields', () => {
  it('emits type, run_id, ts, feature_dir, duration_ms, fileset_fingerprint, manifest_needs_handoff, phase, command, focus_hint', () => {
    const kit = createFixtureKit(
      '# plan',
      '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | must see UI | Operator smoke below — pending human run |',
      'oh-ac1'
    )
    suppressLog(() => run(['orchestrated-handoff', '--feature', kit.root, '--next'], { writer: kit.writer }))
    const event = JSON.parse(readFileSync(kit.writer.currentPath as string, 'utf-8').trim())
    expectEventBasics(event, 'phase_decided', kit.root)
    expect(typeof event.fileset_fingerprint).toBe('string')
    expect((event.fileset_fingerprint as string).length).toBeGreaterThan(0)
    expect(typeof event.manifest_needs_handoff).toBe('boolean')
    expect(event.phase).toBe('handoff-generate')
    expect(typeof event.command).toBe('string')
    expect((event.command as string).length).toBeGreaterThan(0)
    expect(Object.hasOwn(event, 'focus_hint')).toBe(true)
    kit.cleanup()
  })
})

describe('WOBS-2 AC2: manifest_needs_handoff in phase_decided event', () => {
  it('true when handoff.md has operator-smoke evidence', () => {
    const kit = createFixtureKit(
      '# plan',
      '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | must see UI | Operator smoke below — pending human run |',
      'oh-w2a'
    )
    suppressLog(() => run(['orchestrated-handoff', '--feature', kit.root, '--next'], { writer: kit.writer }))
    expect(JSON.parse(readFileSync(kit.writer.currentPath as string, 'utf-8').trim()).manifest_needs_handoff).toBe(true)
    kit.cleanup()
  })

  it('false when handoff.md has only bun test evidence and plan mentions no Gherkin', () => {
    const kit = createFixtureKit(
      '# plan\nJust unit tests.',
      '| ID | Done when | Evidence |\n| --- | --------- | -------- |\n| SF-1 AC1 | works | `bun test x` |',
      'oh-w2b'
    )
    suppressLog(() => run(['orchestrated-handoff', '--feature', kit.root, '--next'], { writer: kit.writer }))
    expect(JSON.parse(readFileSync(kit.writer.currentPath as string, 'utf-8').trim()).manifest_needs_handoff).toBe(
      false
    )
    kit.cleanup()
  })
})
