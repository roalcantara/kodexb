import { describe, expect, it } from 'bun:test'

import { expectBodyValidationError } from '@testing'
import { runRoute } from '@testing/helpers/run_route.util'

import { catalogRoutes } from './catalog.routes'
import { setupRpcRouteSpecSuite } from './utils/rpc_route_spec.util'

describe('catalogRoutes', () => {
  const { postViaRoutes } = setupRpcRouteSpecSuite()

  async function postCatalog<T>(path: string, body: unknown): Promise<{ status: number; data: T }> {
    return await runRoute<T>(() => postViaRoutes(catalogRoutes, path, body))
  }

  async function firstSeededEntryId(): Promise<number> {
    const listRes = await postViaRoutes(catalogRoutes, '/api/list', {})
    if (listRes.status !== 200) {
      throw new Error('Failed to get seeded entry id')
    }
    const entries = (await listRes.json()) as Array<{ id: number }>
    if (entries.length === 0) {
      throw new Error('No seeded entries found')
    }
    return entries[0]?.id ?? 0
  }

  describe('POST /api/list', () => {
    it('returns matching entries', () => {
      expect(postCatalog<unknown[]>('/api/list', {})).resolves.toMatchObject({
        status: 200,
        data: expect.any(Array)
      })
    })
  })

  describe('POST /api/listMatchCount', () => {
    it('returns the match count', () => {
      expect(postCatalog<number>('/api/listMatchCount', {})).resolves.toMatchObject({
        status: 200,
        data: expect.any(Number)
      })
    })
  })

  describe('invalid list filter bodies', () => {
    describe.each([
      ['types are invalid', { types: ['invalid'] }, 'types/0', 'Expected union value'],
      ['limit exceeds the maximum', { limit: 999_999 }, 'limit', 'Expected integer to be less or equal to 10000']
    ] as const)('when %s', (_desc, body, property, message) => {
      it.each(['/api/list', '/api/listMatchCount'])('returns 500 for %s', async path => {
        const res = await postCatalog<{ error: string }>(path, body)
        expect(res.status).toBe(500)
        expectBodyValidationError(res.data, { property, message })
      })
    })
  })

  describe('POST /api/getListStats', () => {
    it('returns facet totals', () => {
      expect(postCatalog<{ total: number }>('/api/getListStats', {})).resolves.toMatchObject({
        status: 200,
        data: { total: expect.any(Number) }
      })
    })

    describe('when types are invalid', () => {
      it('returns 500', async () => {
        const res = await postCatalog<{ error: string }>('/api/getListStats', { types: ['invalid'] })
        expect(res.status).toBe(500)
        expectBodyValidationError(res.data, {
          property: 'types/0',
          message: 'Expected union value'
        })
      })
    })

    describe('when the body includes pagination keys', () => {
      it('returns 200 because unknown keys are stripped before validation', () => {
        expect(postCatalog('/api/getListStats', { limit: 20 })).resolves.toMatchObject({ status: 200 })
      })
    })
  })

  describe('POST /api/getEntry', () => {
    describe('when the entry exists', () => {
      it('returns the entry', async () => {
        const entryId = await firstSeededEntryId()

        expect(postCatalog<{ id: number }>('/api/getEntry', { id: entryId })).resolves.toMatchObject({
          status: 200,
          data: { id: entryId }
        })
      })
    })

    describe('when the entry does not exist', () => {
      it('returns 200 with a null-equivalent body', async () => {
        const res = await postCatalog<null | undefined>('/api/getEntry', { id: 9_999_999 })
        expect(res.status).toBe(200)
        expect(res.data === null || res.data === undefined).toBe(true)
      })
    })
  })

  describe('POST /api/recordEntryVisit', () => {
    it('records a visit for a valid entry id', async () => {
      const entryId = await firstSeededEntryId()
      expect(postCatalog<{ ok: true }>('/api/recordEntryVisit', { id: entryId })).resolves.toMatchObject({
        status: 200,
        data: { ok: true }
      })
    })
  })

  describe('invalid entry id bodies', () => {
    describe.each([
      ['id is missing', {}, 'Expected integer'],
      ['id is not an integer', { id: 'nope' }, 'Expected integer']
    ])('when %s', (_desc, body, message) => {
      it.each(['/api/getEntry', '/api/recordEntryVisit'])('returns 500 for %s', async path => {
        const res = await postCatalog<{ error: string }>(path, body)
        expect(res.status).toBe(500)
        expectBodyValidationError(res.data, { property: 'id', message })
      })
    })
  })

  describe('POST /api/listBindings', () => {
    it('returns all binding refs', () => {
      expect(postCatalog<unknown[]>('/api/listBindings', {})).resolves.toMatchObject({
        status: 200,
        data: expect.any(Array)
      })
    })

    describe.each([
      ['contains extra properties', { unexpected: true }],
      ['empty', {}],
      ['is not an object', { hash: 123 }]
    ])('when the body %s', (_desc, body) => {
      it('returns 200', () => {
        expect(postCatalog('/api/listBindings', body)).resolves.toMatchObject({ status: 200 })
      })
    })
  })

  describe('POST /api/listBindingsByChord', () => {
    describe('when the chord hash matches', () => {
      it('returns the matching bindings', () => {
        expect(postCatalog<unknown[]>('/api/listBindingsByChord', { hash: 'cmd+s' })).resolves.toMatchObject({
          status: 200,
          data: expect.any(Array)
        })
      })
    })

    describe.each([
      ['empty', { hash: '' }, 'Expected string length greater or equal to 1'],
      ['not a string', { hash: 123 }, 'Expected string']
    ] as const)('when hash is %s', (_desc, body, message) => {
      it('returns 500', async () => {
        const res = await postCatalog<{ error: string }>('/api/listBindingsByChord', body)
        expect(res.status).toBe(500)
        expectBodyValidationError(res.data, { property: 'hash', message })
      })
    })
  })

  describe('POST /api/recordBindingVisit', () => {
    describe('when the binding exists', () => {
      it('records a binding visit', () => {
        expect(
          postCatalog<{ ok: true }>('/api/recordBindingVisit', { id: 'vscode:go-to-file', weight: 1 })
        ).resolves.toMatchObject({
          status: 200,
          data: { ok: true }
        })
      })
    })

    describe('when id is empty', () => {
      it('returns 500', async () => {
        const res = await postCatalog<{ error: string }>('/api/recordBindingVisit', { id: '', weight: 1 })
        expect(res.status).toBe(500)
        expectBodyValidationError(res.data, {
          property: 'id',
          message: 'Expected string length greater or equal to 1'
        })
      })
    })
  })

  describe('POST /api/suggestTags', () => {
    describe('when the entry exists', async () => {
      const entryId = await firstSeededEntryId()
      it('returns tag suggestions for a valid entry id', () => {
        expect(postCatalog<string[]>('/api/suggestTags', { entryId })).resolves.toMatchObject({
          status: 200,
          data: expect.any(Array)
        })
      })
    })

    describe.each([
      ['entryId is missing', {}],
      ['entryId is not an integer', { entryId: 'nope' }]
    ])('when the %s', (_desc, reqBody) => {
      it('returns 500', async () => {
        const res = await postCatalog<{ error: string }>('/api/suggestTags', reqBody)
        expect(res.status).toBe(500)
        expectBodyValidationError(res.data, {
          property: 'entryId',
          message: 'Expected integer'
        })
      })
    })
  })
})
