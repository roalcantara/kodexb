import type { Static } from '@sinclair/typebox'
import type { SandboxDescriptor } from './schemas/profile.schema.ts'

export type SandboxDimension = 'tool_allowlist' | 'fs_scope' | 'secret_handling' | 'network'

export type ViolationDescriptor = {
  dimension: SandboxDimension
  attempted: string
  detail?: string
} | null

export function checkToolAllowlist(
  sandbox: Static<typeof SandboxDescriptor>,
  attemptedCommand: string
): ViolationDescriptor {
  const allowed = sandbox.tool_allowlist.map(t => t.toLowerCase())
  const cmd = attemptedCommand.toLowerCase()

  const match = allowed.some(a => cmd.startsWith(a))
  if (!match) {
    return {
      dimension: 'tool_allowlist',
      attempted: attemptedCommand,
      detail: `command must start with one of: ${allowed.join(', ')}`
    }
  }
  return null
}

export function checkFsScope(sandbox: Static<typeof SandboxDescriptor>, attemptedPath: string): ViolationDescriptor {
  const denyRoots = (sandbox.fs_scope.deny ?? []).map(d => d.replace(/\$\{[^}]+\}/g, ''))
  const allowRoots = sandbox.fs_scope.allow_roots.map(r => r.replace(/\$\{[^}]+\}/g, ''))
  const normalizedPath = attemptedPath.replace(/\/$/, '')

  for (const denyPattern of denyRoots) {
    if (normalizedPath.startsWith(denyPattern) || normalizedPath === denyPattern) {
      return {
        dimension: 'fs_scope',
        attempted: attemptedPath,
        detail: `path matches deny pattern: ${denyPattern}`
      }
    }
  }

  for (const allow of allowRoots) {
    if (normalizedPath.startsWith(allow)) return null
  }

  if (allowRoots.length > 0) {
    return {
      dimension: 'fs_scope',
      attempted: attemptedPath,
      detail: 'path not within any allow_root'
    }
  }

  return null
}

export function checkNetwork(sandbox: Static<typeof SandboxDescriptor>, attemptedHost: string): ViolationDescriptor {
  if (sandbox.network === 'offline') {
    return {
      dimension: 'network',
      attempted: attemptedHost,
      detail: 'network is offline'
    }
  }

  if (sandbox.network === 'localhost') {
    const host = attemptedHost.toLowerCase()
    if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
      return {
        dimension: 'network',
        attempted: attemptedHost,
        detail: 'only localhost access allowed'
      }
    }
    return null
  }

  if (sandbox.network === 'declared_hosts') {
    const declared = (sandbox.declared_hosts ?? []).map(h => h.toLowerCase())
    if (!declared.includes(attemptedHost.toLowerCase())) {
      return {
        dimension: 'network',
        attempted: attemptedHost,
        detail: `host not in declared_hosts: ${declared.join(', ')}`
      }
    }
    return null
  }

  return null
}

export function validateSecretHandling(sandbox: Static<typeof SandboxDescriptor>): ViolationDescriptor {
  if (sandbox.secret_handling === 'passthrough' && sandbox.acknowledged_unsafe !== true) {
    return {
      dimension: 'secret_handling',
      attempted: 'secret_handling: passthrough',
      detail: 'passthrough requires acknowledged_unsafe: true'
    }
  }
  return null
}

export function checkSandbox(
  sandbox: Static<typeof SandboxDescriptor>,
  check: {
    command?: string
    path?: string
    host?: string
  }
): ViolationDescriptor {
  const secretViolation = validateSecretHandling(sandbox)
  if (secretViolation) return secretViolation

  if (check.command) {
    const toolViolation = checkToolAllowlist(sandbox, check.command)
    if (toolViolation) return toolViolation
  }

  if (check.path) {
    const fsViolation = checkFsScope(sandbox, check.path)
    if (fsViolation) return fsViolation
  }

  if (check.host) {
    const netViolation = checkNetwork(sandbox, check.host)
    if (netViolation) return netViolation
  }

  return null
}
