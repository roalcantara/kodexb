import { test as base, createBdd } from 'playwright-bdd'
import { Actor } from '../screenplay/actor.ability'

type E2eFixtures = {
  actor: Actor
}

export const test = base.extend<E2eFixtures>({
  actor: async ({ page }, use) => {
    const actor = new Actor(page)
    await use(actor)
  }
})

export const { Given, When, Then } = createBdd(test)
