import { describe, expect, it } from 'bun:test'
import { validateCommitMessage } from './commit_message_validate.script'

describe('validateCommitMessage', () => {
  it('accepts valid conventional commit with body', () => {
    const result = validateCommitMessage(
      'ref(logging): Merge RPC plugins into rpc.plugin\n\nConsolidate RPC middleware into one module per COH-1.\n'
    )
    expect(result.ok).toBe(true)
  })

  it('rejects missing body', () => {
    const result = validateCommitMessage('ref(logging): Merge RPC plugins into rpc.plugin\n\n')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.failures.some(f => f.includes('body'))).toBe(true)
  })

  it('rejects lowercase description', () => {
    const result = validateCommitMessage(
      'ref(logging): merge RPC plugins into rpc.plugin\n\nBody with enough characters for validation.\n'
    )
    expect(result.ok).toBe(false)
  })
})
