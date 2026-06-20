import { describe, expect, it } from 'bun:test'
import { UsageError } from '@kb/exec'
import { parseGovernanceAuditArgs, parseGovernanceFixArgs } from './spec_governance_cli.script'

describe('spec_governance_cli', () => {
  it('parseGovernanceFixArgs accepts feature dir and output flags', () => {
    expect(parseGovernanceFixArgs(['/tmp/feature-demo', '--json'])).toEqual({
      featureDir: '/tmp/feature-demo',
      dryRun: false,
      force: false,
      json: true,
      raw: false
    })
  })

  it('parseGovernanceAuditArgs rejects dry-run without fix', () => {
    expect(() => parseGovernanceAuditArgs(['--dry-run'])).toThrow(UsageError)
  })

  it('parseGovernanceAuditArgs accepts fix dry-run together', () => {
    expect(parseGovernanceAuditArgs(['--fix', '--dry-run', '--strict']).fix).toBe(true)
    expect(parseGovernanceAuditArgs(['--fix', '--dry-run', '--strict']).dryRun).toBe(true)
  })
})
