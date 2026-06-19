import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { parseTagCli, runE2e } from './test_cli.script'

describe('parseTagCli', () => {
  let origEnv: NodeJS.ProcessEnv
  let origArgv: string[]

  beforeEach(() => {
    origEnv = { ...process.env }
    origArgv = [...process.argv]
  })

  afterEach(() => {
    process.env = origEnv
    process.argv = origArgv
  })

  it('reads list/e2e/unit/json flags from usage_* env', () => {
    process.env = {
      ...origEnv,
      usage_list: 'true',
      usage_e2e: 'true',
      usage_unit: 'true',
      usage_json: 'true',
      usage_cmd: 'tag'
    }
    const parsed = parseTagCli()
    expect(parsed.list).toBe(true)
    expect(parsed.e2e).toBe(true)
    expect(parsed.unit).toBe(true)
    expect(parsed.json).toBe(true)
  })

  it('maps usage_key to catalogKeys when not an AC slice id', () => {
    process.env = { ...origEnv, usage_cmd: 'tag', usage_key: 'command_palette' }
    const parsed = parseTagCli()
    expect(parsed.catalogKeys).toEqual(['command_palette'])
    expect(parsed.acTag).toBeUndefined()
  })

  it('maps usage_slice AC id to acTag', () => {
    process.env = { ...origEnv, usage_cmd: 'tag', usage_slice: 'SF2AC3' }
    const parsed = parseTagCli()
    expect(parsed.acTag).toBe('@ac:SF-2_AC3')
    expect(parsed.catalogKeys).toEqual([])
  })

  it('collects positional argv catalog keys when cmd is tag', () => {
    process.env = { ...origEnv, usage_cmd: 'tag' }
    process.argv = ['bun', 'test.script.ts', 'tag', 'entry_action', 'SF2AC3']
    const parsed = parseTagCli()
    expect(parsed.catalogKeys).toEqual(['entry_action'])
    expect(parsed.acTag).toBe('@ac:SF-2_AC3')
  })

  it('skips known actions and flags in positional argv', () => {
    process.env = { ...origEnv, usage_cmd: 'tag' }
    process.argv = ['bun', 'test.script.ts', 'tag', 'unit', '--list', 'foo']
    const parsed = parseTagCli()
    expect(parsed.catalogKeys).toEqual(['foo'])
  })
})

describe('runE2e', () => {
  let origEnv: NodeJS.ProcessEnv
  let origExit: typeof process.exit

  beforeEach(() => {
    origEnv = { ...process.env }
    origExit = process.exit
    process.exit = ((code?: number) => {
      throw new Error(`exit:${code ?? 0}`)
    }) as typeof process.exit
  })

  afterEach(() => {
    process.env = origEnv
    process.exit = origExit
  })

  it('exits when smoke and regression are both set', () => {
    process.env = {
      ...origEnv,
      usage_smoke: 'true',
      usage_regression: 'true'
    }
    expect(() => runE2e('/tmp')).toThrow('exit:2')
  })
})
