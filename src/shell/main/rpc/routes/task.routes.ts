import { Elysia } from 'elysia'

import type { App } from '../../../app/app'
import { getEntryParams, idWithDirSchema, idWithReorderDirSchema, taskCreateSchema, taskUpdateSchema } from '../schemas'

export function taskRoutes(app: App) {
  return new Elysia({ name: 'task.routes' })
    .post('/createTask', ({ body }) => app.createTask(body), { body: taskCreateSchema })
    .post('/updateTask', ({ body }) => app.updateTask(body.id, body.patch), { body: taskUpdateSchema })
    .post('/deleteTask', ({ body }) => app.deleteTask(body.id), { body: getEntryParams })
    .post('/cycleStatus', ({ body }) => app.cycleStatus(body.id, body.dir), { body: idWithDirSchema })
    .post('/cyclePriority', ({ body }) => app.cyclePriority(body.id, body.dir), { body: idWithDirSchema })
    .post('/reorderTask', ({ body }) => app.reorderTask(body.id, body.dir), {
      body: idWithReorderDirSchema
    })
}
