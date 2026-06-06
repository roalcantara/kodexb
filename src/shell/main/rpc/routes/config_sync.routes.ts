import { Elysia } from 'elysia'

import type { App } from '../../../app/app'
import { configPatchSchema, emptyBodySchema, syncInfoSchema, syncParamsInner } from '../schemas'

function syncTestHooks(body: { skipLearnedRestore?: boolean }) {
  if (body.skipLearnedRestore !== true || process.env.NODE_ENV !== 'test') return
  return { skipLearnedRestore: true as const }
}

export function configSyncRoutes(app: App) {
  return new Elysia({ name: 'config_sync.routes' })
    .post('/sync', ({ body }) => app.sync(body.sourcesDir, syncTestHooks(body)), { body: syncParamsInner })
    .post('/getStats', () => app.getStats(), { body: emptyBodySchema })
    .post('/getConfig', () => app.getConfig(), { body: emptyBodySchema })
    .post('/saveConfig', ({ body }) => app.applyConfigPatch(body), { body: configPatchSchema })
    .post('/getSyncInfo', () => app.getSyncInfo(), { body: syncInfoSchema })
}
