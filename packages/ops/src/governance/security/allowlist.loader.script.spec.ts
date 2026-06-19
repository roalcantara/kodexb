import { describe, expect, it } from 'bun:test'
import { writeFileSync } from 'node:fs'
import { HandoffAllowlistError, loadAllowlist } from './allowlist.loader.script'

describe('loadAllowlist', () => {
  it('loads valid YAML with entries', async () => {
    const tmp = `/tmp/allowlist_test_${Date.now()}.yaml`
    writeFileSync(tmp, 'entries:\n  - literal-token\n')
    const result = await loadAllowlist(tmp)
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap().entries).toEqual(['literal-token'])
  })

  it('returns err(HandoffAllowlistError) on invalid YAML', async () => {
    const tmp = `/tmp/allowlist_test_bad_${Date.now()}.yaml`
    writeFileSync(tmp, 'entries: [\n')
    const result = await loadAllowlist(tmp)
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(HandoffAllowlistError)
  })

  it('returns err(HandoffAllowlistError) on schema failure', async () => {
    const tmp = `/tmp/allowlist_test_schema_${Date.now()}.yaml`
    writeFileSync(tmp, 'foo: bar\n')
    const result = await loadAllowlist(tmp)
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(HandoffAllowlistError)
  })

  it('returns err for nonexistent file', async () => {
    const tmp = `/tmp/nonexistent_${Date.now()}.yaml`
    const result = await loadAllowlist(tmp)
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(HandoffAllowlistError)
  })
})
