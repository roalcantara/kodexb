import { afterEach, describe, expect, it } from 'bun:test'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { loadProfile, ProfileLoadError } from './profile_loader.script.ts'

let tmpDir: string | null = null

const EXECUTION_POLICY_REGEX = /execution_policy:\n {2}allowed_prefixes:\n {4}- "bun run"\n {4}- "echo"\n/
const ALLOWED_PREFIXES_REGEX = /allowed_prefixes:\n {4}- "bun run"\n {4}- "echo"/

function writeProfile(content: string): string {
  tmpDir = mkdtempSync(path.join(tmpdir(), 'profile-test-'))
  const fp = path.join(tmpDir, 'profile.yaml')
  writeFileSync(fp, content)
  return fp
}

afterEach(() => {
  if (tmpDir && existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
  tmpDir = null
})

function validProfileYaml(): string {
  return `
schema_version: 009.1.0
name: test-profile
execution_policy:
  allowed_prefixes:
    - "bun run"
    - "echo"
stages:
  - id: specify
    worker: primary
  - id: plan
    worker: primary
transitions:
  - from: specify
    to: plan
    on: DONE
terminal:
  - gate
default_retry:
  max_attempts: 3
  backoff: exponential
  base_ms: 500
  cap_ms: 30000
  jitter: full
  reset_on_new_cause: true
  escalation_event: stage.escalated
memory:
  conflict: prompt_user
  retention:
    tmp_days: 30
    durable_days: 365
providers: {}
shutdown:
  grace_ms: 10000
  signals:
    - SIGINT
    - SIGTERM
`.trim()
}

describe('loadProfile', () => {
  it('loads a valid profile', () => {
    const fp = writeProfile(validProfileYaml())
    const profile = loadProfile(fp)
    expect(profile.name).toBe('test-profile')
    expect(profile.execution_policy.allowed_prefixes).toEqual(['bun run', 'echo'])
  })

  it('throws ProfileLoadError when file does not exist', () => {
    expect(() => loadProfile('/nonexistent/path.yaml')).toThrow(ProfileLoadError)
  })

  it('throws when execution_policy is missing', () => {
    const yaml = validProfileYaml().replace(EXECUTION_POLICY_REGEX, '')
    const fp = writeProfile(yaml)
    expect(() => loadProfile(fp)).toThrow('missing required execution_policy')
  })

  it('throws when allowed_prefixes is empty', () => {
    const yaml = validProfileYaml().replace(ALLOWED_PREFIXES_REGEX, 'allowed_prefixes: []')
    const fp = writeProfile(yaml)
    expect(() => loadProfile(fp)).toThrow(ProfileLoadError)
  })

  it('throws on malformed YAML', () => {
    const fp = writeProfile(':: invalid yaml ::')
    expect(() => loadProfile(fp)).toThrow(ProfileLoadError)
  })
})
