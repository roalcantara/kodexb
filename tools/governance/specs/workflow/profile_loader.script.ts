import { existsSync, readFileSync } from 'node:fs'
import { Value } from '@sinclair/typebox/value'
import { type Profile, ProfileSchema } from './schemas/profile.schema.ts'

export class ProfileLoadError extends Error {
  diagnostics: string[]

  constructor(message: string, diagnostics?: string[], options?: ErrorOptions) {
    super(message, options)
    this.name = 'ProfileLoadError'
    this.diagnostics = diagnostics ?? [message]
  }
}

export function loadProfile(path: string): Profile {
  if (!existsSync(path)) {
    throw new ProfileLoadError(`profile not found: ${path}`)
  }

  let raw: unknown
  try {
    const content = readFileSync(path, 'utf-8')
    raw = Bun.YAML.parse(content)
  } catch (err) {
    // biome-ignore lint/nursery/useErrorCause: cause propagated via ProfileLoadError constructor → super(message, options)
    throw new ProfileLoadError(`failed to parse profile YAML: ${err}`, undefined, {
      cause: err instanceof Error ? err : undefined
    })
  }

  if (!raw || typeof raw !== 'object') {
    throw new ProfileLoadError('profile YAML is empty or not an object')
  }

  const record = raw as Record<string, unknown>

  if (!record.execution_policy) {
    throw new ProfileLoadError('profile is missing required execution_policy')
  }

  const ep = record.execution_policy as Record<string, unknown> | undefined
  if (!ep || !Array.isArray(ep.allowed_prefixes) || ep.allowed_prefixes.length === 0) {
    throw new ProfileLoadError('execution_policy.allowed_prefixes must be a non-empty array', [
      'execution_policy.allowed_prefixes must have at least 1 item'
    ])
  }
  for (const prefix of ep.allowed_prefixes) {
    if (typeof prefix !== 'string' || prefix.trim().length === 0) {
      throw new ProfileLoadError('execution_policy.allowed_prefixes entries must be non-empty strings')
    }
    if (/[;&|`$()\n]/.test(prefix)) {
      throw new ProfileLoadError(`execution_policy.allowed_prefixes entry contains shell metacharacters: "${prefix}"`)
    }
  }

  if (!Value.Check(ProfileSchema, raw)) {
    const errors = [...Value.Errors(ProfileSchema, raw)]
    const messages = errors.map(e => `${e.path}: ${e.message}`)
    throw new ProfileLoadError(`profile schema validation failed:\n  ${messages.join('\n  ')}`, messages)
  }

  return raw as Profile
}
