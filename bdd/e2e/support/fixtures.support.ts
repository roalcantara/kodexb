import { test as base, createBdd } from 'playwright-bdd'
import { Actor } from '../screenplay/actor.ability'

type E2eFixtures = {
  actor: Actor
}

export const test = base.extend<E2eFixtures>({
  actor: async ({ page, context }, use) => {
    const baseUrl = process.env.PREVIEW_PORT ? `http://localhost:${process.env.PREVIEW_PORT}` : 'http://localhost:3456'
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl })
    const actor = new Actor(page)
    await use(actor)
  }
})

export const { Given, When, Then } = createBdd(test)
