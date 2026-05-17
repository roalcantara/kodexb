import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import {
  configPatchSchema,
  emptyBodySchema,
  listOptsSchema,
  listStatsFilterSchema,
  openExternalSchema,
  pasteInTerminalSchema,
  showOpenDialogSchema,
  suggestTagsSchema,
  syncParamsInner,
  taskCreateSchema,
  taskUpdateSchema
} from './schemas'

describe('listOptsSchema', () => {
  it('accepts minimal valid payload', () => {
    expect(Value.Check(listOptsSchema, {})).toBe(true)
  })

  it('accepts full filter payload', () => {
    expect(
      Value.Check(listOptsSchema, {
        query: 'bun',
        tags: ['shell'],
        types: ['bookmark', 'task'],
        taskView: 'actionable',
        limit: 20,
        offset: 0
      })
    ).toBe(true)
  })

  it('rejects invalid type', () => {
    expect(Value.Check(listOptsSchema, { types: ['invalid'] })).toBe(false)
  })

  it('rejects limit exceeding max', () => {
    expect(Value.Check(listOptsSchema, { limit: 999_999 })).toBe(false)
  })
})

describe('listStatsFilterSchema', () => {
  it('accepts empty filter', () => {
    expect(Value.Check(listStatsFilterSchema, {})).toBe(true)
  })

  it('rejects pagination keys', () => {
    expect(Value.Check(listStatsFilterSchema, { limit: 20 })).toBe(false)
  })
})

describe('configPatchSchema', () => {
  it('accepts partial config patch', () => {
    expect(Value.Check(configPatchSchema, { pageSize: 50 })).toBe(true)
  })

  it('accepts empty patch', () => {
    expect(Value.Check(configPatchSchema, {})).toBe(true)
  })

  it('rejects invalid pageSize', () => {
    expect(Value.Check(configPatchSchema, { pageSize: 15 })).toBe(false)
  })
})

describe('taskCreateSchema', () => {
  it('accepts minimal task', () => {
    expect(Value.Check(taskCreateSchema, { key: 'Build kb' })).toBe(true)
  })

  it('accepts full task with priority and tags', () => {
    expect(
      Value.Check(taskCreateSchema, {
        key: 'Build kb',
        desc: 'Make it work',
        tags: ['dev'],
        priority: 'high',
        dependsOn: [1, 2]
      })
    ).toBe(true)
  })

  it('rejects missing key', () => {
    expect(Value.Check(taskCreateSchema, {})).toBe(false)
  })

  it('rejects invalid priority', () => {
    expect(Value.Check(taskCreateSchema, { key: 'x', priority: 'extreme' })).toBe(false)
  })
})

describe('taskUpdateSchema', () => {
  it('accepts minimal patch', () => {
    expect(Value.Check(taskUpdateSchema, { id: 1, patch: {} })).toBe(true)
  })

  it('accepts status change', () => {
    expect(Value.Check(taskUpdateSchema, { id: 1, patch: { status: 'done' } })).toBe(true)
  })

  it('rejects missing id', () => {
    expect(Value.Check(taskUpdateSchema, { patch: {} })).toBe(false)
  })

  it('rejects invalid status', () => {
    expect(Value.Check(taskUpdateSchema, { id: 1, patch: { status: 'finished' } })).toBe(false)
  })
})

describe('showOpenDialogSchema', () => {
  it('accepts empty body', () => {
    expect(Value.Check(showOpenDialogSchema, {})).toBe(true)
  })

  it('accepts with dialog options', () => {
    expect(
      Value.Check(showOpenDialogSchema, {
        opts: { title: 'Open', properties: ['openDirectory'] }
      })
    ).toBe(true)
  })

  it('rejects unknown property', () => {
    expect(Value.Check(showOpenDialogSchema, { unexpected: true })).toBe(false)
  })
})

describe('syncParamsInner', () => {
  it('accepts empty sync params', () => {
    expect(Value.Check(syncParamsInner, {})).toBe(true)
  })

  it('accepts custom sourcesDir', () => {
    expect(Value.Check(syncParamsInner, { sourcesDir: '/tmp/src' })).toBe(true)
  })
})

describe('shell surface schemas', () => {
  it('openExternalSchema accepts valid url', () => {
    expect(Value.Check(openExternalSchema, { url: 'https://example.com' })).toBe(true)
  })

  it('openExternalSchema rejects empty url', () => {
    expect(Value.Check(openExternalSchema, { url: '' })).toBe(false)
  })

  it('pasteInTerminalSchema accepts valid cmd', () => {
    expect(Value.Check(pasteInTerminalSchema, { cmd: 'ls' })).toBe(true)
  })

  it('suggestTagsSchema accepts valid entryId', () => {
    expect(Value.Check(suggestTagsSchema, { entryId: 1 })).toBe(true)
  })

  it('emptyBodySchema accepts empty object', () => {
    expect(Value.Check(emptyBodySchema, {})).toBe(true)
  })
})
