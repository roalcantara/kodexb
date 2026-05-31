import { Elysia } from 'elysia'

import type { App } from '../../../app/app'
import {
  emptyBodySchema,
  getEntryParams,
  listBindingsByChordSchema,
  listOptsSchema,
  listStatsFilterSchema,
  recordBindingVisitSchema,
  suggestTagsSchema
} from '../schemas'

export function catalogRoutes(app: App) {
  return new Elysia({ name: 'catalog.routes' })
    .post('/list', ({ body }) => app.list(body), { body: listOptsSchema })
    .post('/listMatchCount', ({ body }) => app.listMatchCount(body), { body: listOptsSchema })
    .post('/getListStats', ({ body }) => app.getListStats(body), { body: listStatsFilterSchema })
    .post('/getEntry', ({ body }) => app.getEntry(body.id), { body: getEntryParams })
    .post('/recordEntryVisit', ({ body }) => app.recordEntryVisit(body.id), { body: getEntryParams })
    .post('/listBindings', () => app.listBindings(), { body: emptyBodySchema })
    .post('/listBindingsByChord', ({ body }) => app.listBindingsByChord(body.hash), {
      body: listBindingsByChordSchema
    })
    .post('/recordBindingVisit', ({ body }) => app.recordBindingVisit(body.id, body.weight), {
      body: recordBindingVisitSchema
    })
    .post('/suggestTags', ({ body }) => app.suggestTags(body.entryId), { body: suggestTagsSchema })
}
