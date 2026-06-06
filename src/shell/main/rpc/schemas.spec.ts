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

function isValid(schema: Parameters<typeof Value.Check>[0], data: unknown): boolean {
  return Value.Check(schema, data) === true
}

describe('listOptsSchema', () => {
  describe('when payload is valid', () => {
    describe.each([
      ['minimal fields', {}],
      [
        'full filter',
        {
          query: 'bun',
          tags: ['shell'],
          types: ['bookmark', 'task'],
          taskView: 'actionable',
          limit: 20,
          offset: 0
        }
      ]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(listOptsSchema, data)).toBe(true)
      })
    })
  })

  describe('when payload is invalid', () => {
    describe.each([
      ['invalid type', { types: ['invalid'] }],
      ['limit exceeding max', { limit: 999_999 }]
    ])('with %s', (_, data) => {
      it('fails validation', () => {
        expect(isValid(listOptsSchema, data)).toBe(false)
      })
    })
  })
})

describe('listStatsFilterSchema', () => {
  describe('when filter is valid', () => {
    it('passes validation', () => {
      expect(isValid(listStatsFilterSchema, {})).toBe(true)
    })
  })

  describe('when filter is invalid', () => {
    it('fails validation', () => {
      expect(isValid(listStatsFilterSchema, { limit: 20 })).toBe(false)
    })
  })
})

describe('configPatchSchema', () => {
  describe('when patch is valid', () => {
    describe.each([
      ['partial patch', { pageSize: 50 }],
      ['empty patch', {}]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(configPatchSchema, data)).toBe(true)
      })
    })
  })

  describe('when patch is invalid', () => {
    it('fails validation', () => {
      expect(isValid(configPatchSchema, { pageSize: 15 })).toBe(false)
    })
  })
})

describe('taskCreateSchema', () => {
  describe('when payload is valid', () => {
    describe.each([
      ['minimal task', { key: 'Build kb' }],
      [
        'full task',
        {
          key: 'Build kb',
          desc: 'Make it work',
          tags: ['dev'],
          priority: 'high',
          dependsOn: [1, 2]
        }
      ]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(taskCreateSchema, data)).toBe(true)
      })
    })
  })

  describe('when payload is invalid', () => {
    describe.each([
      ['missing key', {}],
      ['invalid priority', { key: 'x', priority: 'extreme' }]
    ])('with %s', (_, data) => {
      it('fails validation', () => {
        expect(isValid(taskCreateSchema, data)).toBe(false)
      })
    })
  })
})

describe('taskUpdateSchema', () => {
  describe('when payload is valid', () => {
    describe.each([
      ['minimal patch', { id: 1, patch: {} }],
      ['status change', { id: 1, patch: { status: 'done' } }]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(taskUpdateSchema, data)).toBe(true)
      })
    })
  })

  describe('when payload is invalid', () => {
    describe.each([
      ['missing id', { patch: {} }],
      ['invalid status', { id: 1, patch: { status: 'finished' } }]
    ])('with %s', (_, data) => {
      it('fails validation', () => {
        expect(isValid(taskUpdateSchema, data)).toBe(false)
      })
    })
  })
})

describe('showOpenDialogSchema', () => {
  describe('when body is valid', () => {
    describe.each([
      ['empty body', {}],
      ['dialog options', { opts: { title: 'Open', properties: ['openDirectory'] } }]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(showOpenDialogSchema, data)).toBe(true)
      })
    })
  })

  describe('when body is invalid', () => {
    it('fails validation', () => {
      expect(isValid(showOpenDialogSchema, { unexpected: true })).toBe(false)
    })
  })
})

describe('syncParamsInner', () => {
  describe('when params are valid', () => {
    describe.each([
      ['empty params', {}],
      ['custom sourcesDir', { sourcesDir: '/tmp/src' }],
      ['e2e reseed flag', { skipLearnedRestore: true }]
    ])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(syncParamsInner, data)).toBe(true)
      })
    })
  })
})

describe('openExternalSchema', () => {
  describe('when url is valid', () => {
    it('passes validation', () => {
      expect(isValid(openExternalSchema, { url: 'https://example.com' })).toBe(true)
    })
  })

  describe('when url is empty', () => {
    it('fails validation', () => {
      expect(isValid(openExternalSchema, { url: '' })).toBe(false)
    })
  })
})

describe('pasteInTerminalSchema', () => {
  describe('when cmd is present', () => {
    it('passes validation', () => {
      expect(isValid(pasteInTerminalSchema, { cmd: 'ls' })).toBe(true)
    })
  })
})

describe('suggestTagsSchema', () => {
  describe('when entryId is present', () => {
    it('passes validation', () => {
      expect(isValid(suggestTagsSchema, { entryId: 1 })).toBe(true)
    })
  })
})

describe('emptyBodySchema', () => {
  describe('when body is empty', () => {
    it('passes validation', () => {
      expect(isValid(emptyBodySchema, {})).toBe(true)
    })
  })
})
