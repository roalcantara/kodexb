import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export interface Performable {
  performAs(actor: Actor): Promise<void>
}

export interface Answerable<T = void> {
  answeredBy(actor: Actor): Promise<T>
}

export class Actor {
  private memory = new Map<string, unknown>()

  constructor(public readonly page: Page) {}

  async attemptsTo(...tasks: Performable[]): Promise<void> {
    for (const task of tasks) {
      await task.performAs(this)
    }
  }

  async asksWhether(question: Answerable): Promise<void> {
    await question.answeredBy(this)
  }

  async asks<T>(question: Answerable<T>): Promise<T> {
    return question.answeredBy(this)
  }

  remember(key: string, value: unknown): void {
    this.memory.set(key, value)
  }

  recall<T = string>(key: string): T {
    return this.memory.get(key) as T
  }

  async eventually(fn: () => Promise<void>, timeoutMs = 10_000): Promise<void> {
    await expect(async () => {
      await fn()
    }).toPass({ timeout: timeoutMs })
  }
}
