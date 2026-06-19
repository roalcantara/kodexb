import { describe, expect, it } from 'bun:test'
import {
  copyUsageToChild,
  rawJsonConflict,
  stripUsageEnv,
  usageCmd,
  usageFlag,
  usageFlags,
  usageOptString,
  usageStrings
} from './usage_env.script'

describe('usageFlag', () => {
  it('returns true when usage_<name> === "true"', () => {
    expect(usageFlag({ usage_foo: 'true' }, 'foo')).toBe(true)
  })
  it('returns false when usage_<name> is missing', () => {
    expect(usageFlag({}, 'foo')).toBe(false)
  })
  it('returns false when value is not "true"', () => {
    expect(usageFlag({ usage_foo: 'false' }, 'foo')).toBe(false)
  })
})

describe('usageOptString', () => {
  it('returns trimmed value when present', () => {
    expect(usageOptString({ usage_foo: '  bar  ' }, 'foo')).toBe('bar')
  })
  it('returns undefined when key is missing', () => {
    expect(usageOptString({}, 'foo')).toBeUndefined()
  })
})

describe('usageCmd', () => {
  it('returns usage_cmd when non-empty', () => {
    expect(usageCmd({ usage_cmd: 'list' })).toBe('list')
  })
  it('returns fallback when usage_cmd empty', () => {
    expect(usageCmd({}, 'list')).toBe('list')
  })
  it('returns empty string when both absent', () => {
    expect(usageCmd({})).toBe('')
  })
})

describe('stripUsageEnv', () => {
  it('removes all usage_ keys', () => {
    const env = { usage_foo: 'true', usage_bar: 'x', PATH: '/usr/bin' }
    const stripped = stripUsageEnv(env)
    expect(stripped.PATH).toBe('/usr/bin')
    expect(stripped.usage_foo).toBeUndefined()
    expect(stripped.usage_bar).toBeUndefined()
  })
})

describe('copyUsageToChild', () => {
  it('copies specified usage_ keys from parent to child', () => {
    const child = copyUsageToChild({ PATH: '/usr/bin' }, { usage_foo: 'true', usage_bar: 'x' }, ['foo'])
    expect(child.PATH).toBe('/usr/bin')
    expect(child.usage_foo).toBe('true')
    expect(child.usage_bar).toBeUndefined()
  })
})

describe('rawJsonConflict', () => {
  it('returns conflict message when both are true', () => {
    expect(rawJsonConflict(true, true)).toContain('mutually exclusive')
  })
  it('returns null when only raw is true', () => {
    expect(rawJsonConflict(true, false)).toBeNull()
  })
  it('returns null when only json is true', () => {
    expect(rawJsonConflict(false, true)).toBeNull()
  })
  it('returns null when neither is true', () => {
    expect(rawJsonConflict(false, false)).toBeNull()
  })
})

describe('usageFlags', () => {
  it('returns booleans for multiple keys', () => {
    const env = { usage_raw: 'true', usage_json: 'false', usage_dry_run: 'true' }
    expect(usageFlags(env, ['raw', 'json', 'dry_run'])).toEqual({ raw: true, json: false, dry_run: true })
  })
})

describe('usageStrings', () => {
  it('returns strings for multiple keys', () => {
    const env = { usage_key: 'foo', usage_format: 'json' }
    expect(usageStrings(env, ['key', 'format', 'missing'])).toEqual({ key: 'foo', format: 'json', missing: undefined })
  })
})
