import { describe, expect, it } from 'bun:test'
import { writeRunRetrospective } from './orchestrator_retro.script'

describe('orchestrator_retro', () => {
  it('exports writeRunRetrospective', () => {
    expect(typeof writeRunRetrospective).toBe('function')
  })

  it('no-ops on null ndjson path', () => {
    expect(() =>
      writeRunRetrospective(
        null,
        'run-1',
        '2026-06-10',
        { rootDir: '/tmp', metricsDir: '/tmp/metrics' },
        '/tmp/catalog.yaml'
      )
    ).not.toThrow()
  })

  it('no-ops on missing ndjson file', () => {
    expect(() =>
      writeRunRetrospective(
        '/nonexistent/path.ndjson',
        'run-1',
        '2026-06-10',
        { rootDir: '/tmp', metricsDir: '/tmp/metrics' },
        '/tmp/catalog.yaml'
      )
    ).not.toThrow()
  })
})
