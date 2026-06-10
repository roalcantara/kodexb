import { describe, expect, it } from 'bun:test'
import type { Static } from '@sinclair/typebox'
import {
  checkFsScope,
  checkNetwork,
  checkSandbox,
  checkToolAllowlist,
  validateSecretHandling
} from './sandbox.script.ts'
import type { SandboxDescriptor } from './schemas/profile.schema.ts'

function makeSandbox(overrides?: Partial<Static<typeof SandboxDescriptor>>): Static<typeof SandboxDescriptor> {
  return {
    tool_allowlist: ['echo', 'bun run', 'mkdir'],
    fs_scope: {
      allow_roots: ['/workspace', '/tmp/workflow-runs'],
      deny: ['/workspace/.env', '/workspace/.git']
    },
    secret_handling: 'redacted',
    network: 'offline',
    acknowledged_unsafe: false,
    ...overrides
  }
}

describe('sandbox checks', () => {
  describe('AWO-11 AC2: tool_allowlist', () => {
    it('allows matching command prefix', () => {
      const sandbox = makeSandbox()
      const violation = checkToolAllowlist(sandbox, 'echo hello')
      expect(violation).toBeNull()
    })

    it('blocks disallowed command', () => {
      const sandbox = makeSandbox({ tool_allowlist: ['echo'] })
      const violation = checkToolAllowlist(sandbox, 'rm -rf /')
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('tool_allowlist')
      expect(violation?.attempted).toBe('rm -rf /')
    })
  })

  describe('AWO-11 AC2: fs_scope', () => {
    it('allows path within allow_root', () => {
      const sandbox = makeSandbox()
      const violation = checkFsScope(sandbox, '/workspace/src/file.ts')
      expect(violation).toBeNull()
    })

    it('blocks path matching deny pattern', () => {
      const sandbox = makeSandbox()
      const violation = checkFsScope(sandbox, '/workspace/.env')
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('fs_scope')
    })

    it('blocks path outside allow_roots', () => {
      const sandbox = makeSandbox({ fs_scope: { allow_roots: ['/workspace'] } })
      const violation = checkFsScope(sandbox, '/etc/passwd')
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('fs_scope')
    })
  })

  describe('AWO-11 AC2: secret_handling', () => {
    it('passthrough without acknowledged_unsafe fails validation', () => {
      const sandbox = makeSandbox({ secret_handling: 'passthrough', acknowledged_unsafe: false })
      const violation = validateSecretHandling(sandbox)
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('secret_handling')
    })

    it('passthrough with acknowledged_unsafe passes validation', () => {
      const sandbox = makeSandbox({ secret_handling: 'passthrough', acknowledged_unsafe: true })
      const violation = validateSecretHandling(sandbox)
      expect(violation).toBeNull()
    })

    it('redacted passes validation', () => {
      const sandbox = makeSandbox({ secret_handling: 'redacted' })
      const violation = validateSecretHandling(sandbox)
      expect(violation).toBeNull()
    })
  })

  describe('AWO-11 AC2: network', () => {
    it('offline blocks any host', () => {
      const sandbox = makeSandbox({ network: 'offline' })
      const violation = checkNetwork(sandbox, 'api.github.com')
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('network')
    })

    it('localhost allows localhost', () => {
      const sandbox = makeSandbox({ network: 'localhost' })
      expect(checkNetwork(sandbox, 'localhost')).toBeNull()
      expect(checkNetwork(sandbox, '127.0.0.1')).toBeNull()
    })

    it('localhost rejects external host', () => {
      const sandbox = makeSandbox({ network: 'localhost' })
      const violation = checkNetwork(sandbox, 'api.github.com')
      expect(violation).not.toBeNull()
    })

    it('declared_hosts allows listed hosts', () => {
      const sandbox = makeSandbox({
        network: 'declared_hosts',
        declared_hosts: ['api.github.com', 'registry.npmjs.org']
      })
      expect(checkNetwork(sandbox, 'api.github.com')).toBeNull()
    })

    it('declared_hosts rejects unlisted hosts', () => {
      const sandbox = makeSandbox({
        network: 'declared_hosts',
        declared_hosts: ['api.github.com']
      })
      const violation = checkNetwork(sandbox, 'evil.com')
      expect(violation).not.toBeNull()
    })
  })

  describe('checkSandbox aggregate', () => {
    it('AWO-11 AC1: returns null when all checks pass (dispatch honors descriptor)', () => {
      const sandbox = makeSandbox()
      const violation = checkSandbox(sandbox, {
        command: 'echo hello',
        path: '/workspace/src/file.ts'
      })
      expect(violation).toBeNull()
    })

    it('returns first violation on command failure', () => {
      const sandbox = makeSandbox({ tool_allowlist: ['echo'] })
      const violation = checkSandbox(sandbox, {
        command: 'rm -rf /',
        path: '/workspace/src/file.ts'
      })
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('tool_allowlist')
    })

    it('returns first violation on path failure', () => {
      const sandbox = makeSandbox()
      const violation = checkSandbox(sandbox, {
        command: 'echo hello',
        path: '/etc/passwd'
      })
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('fs_scope')
    })

    it('returns violation on secret_handling issue', () => {
      const sandbox = makeSandbox({ secret_handling: 'passthrough', acknowledged_unsafe: false })
      const violation = checkSandbox(sandbox, { command: 'echo hello' })
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('secret_handling')
    })

    it('returns violation on network issue', () => {
      const sandbox = makeSandbox({ network: 'offline' })
      const violation = checkSandbox(sandbox, { host: 'api.github.com' })
      expect(violation).not.toBeNull()
      expect(violation?.dimension).toBe('network')
    })
  })
})
