import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { syncFixtureDir } from '../../../../../__tests__/fixtures/sync'
import { parseSourceFileResilient } from './parse_source_file_resilient.parser'

function fixturePath(name: string): string {
  return join(syncFixtureDir, name)
}

function readFixture(name: string): string {
  return readFileSync(fixturePath(name), 'utf8')
}

const ENTRY_ERROR_PATTERN = /entry "[^"]+"/
const TAG_ERROR_PATTERN = /tag/i

describe('parseSourceFileResilient()', () => {
  it('partial_valid.yml yields ≥ 2 entries and ≥ 1 error string', () => {
    const content = readFixture('partial_valid.yml')
    const result = parseSourceFileResilient('/fake/partial_valid.yml', content)
    expect(result.entries.length).toBeGreaterThanOrEqual(2)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('malformed_yaml.yml yields 0 entries and 1 file-level error', () => {
    const content = readFixture('malformed_yaml.yml')
    const result = parseSourceFileResilient('/fake/malformed_yaml.yml', content)
    expect(result.entries).toHaveLength(0)
    expect(result.errors).toHaveLength(1)
    const firstError = result.errors[0]
    if (!firstError) throw new Error('expected at least one error')
    expect(firstError).toContain('/fake/malformed_yaml.yml')
  })

  it('devbox_like.yml error mentions the offending key or tag rule', () => {
    const content = readFixture('devbox_like.yml')
    const result = parseSourceFileResilient('/fake/devbox_like.yml', content)
    expect(result.errors.length).toBeGreaterThanOrEqual(1)
    const errorText = result.errors.join(' ')
    expect(errorText).toMatch(ENTRY_ERROR_PATTERN)
    expect(errorText).toMatch(TAG_ERROR_PATTERN)
  })
})
