import path from 'node:path'
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

/** Gitignored; written by preview_with_fixture.support.ts at webServer boot. */
export const FIXTURE_PATHS_FILE = path.join(import.meta.dirname, '..', '.fixture-paths.json')

export const { Given, When, Then } = createBdd(test)
