import { expect } from '@playwright/test'
import type { Actor, Answerable } from './actor.ability'

type HandoffLogEntry = {
  method: string
  path: string
  body: Record<string, unknown>
  status: number
}

export class HandoffReceivedOpenExternal implements Answerable {
  private constructor(private readonly url: string) {}

  static with(url: string): HandoffReceivedOpenExternal {
    return new HandoffReceivedOpenExternal(url)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const log = actor.recall<HandoffLogEntry[]>('handoffInterceptLog')
    expect(log).toBeDefined()
    const match = log.find(e => String(e.path).includes('/api/openExternal'))
    expect(match, 'expected openExternal request').toBeDefined()
    expect(match?.body).toMatchObject({ url: this.url })
  }
}

export class HandoffReceivedPasteInTerminal implements Answerable {
  private constructor(private readonly match: string) {}

  static containing(text: string): HandoffReceivedPasteInTerminal {
    return new HandoffReceivedPasteInTerminal(text)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const log = actor.recall<HandoffLogEntry[]>('handoffInterceptLog')
    expect(log).toBeDefined()
    const match = log.find(e => String(e.path).includes('/api/pasteInTerminal'))
    expect(match, 'expected pasteInTerminal request').toBeDefined()
    expect(String(match?.body.cmd)).toContain(this.match)
  }
}

export class HandoffReceivedRunInTerminal implements Answerable {
  private constructor(private readonly match: string) {}

  static containing(text: string): HandoffReceivedRunInTerminal {
    return new HandoffReceivedRunInTerminal(text)
  }

  async answeredBy(actor: Actor): Promise<void> {
    const log = actor.recall<HandoffLogEntry[]>('handoffInterceptLog')
    expect(log).toBeDefined()
    const match = log.find(e => String(e.path).includes('/api/runInTerminal'))
    expect(match, 'expected runInTerminal request').toBeDefined()
    expect(String(match?.body.cmd)).toContain(this.match)
  }
}

export class HandoffReceivedPasteDoc implements Answerable {
  static now(): HandoffReceivedPasteDoc {
    return new HandoffReceivedPasteDoc()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const log = actor.recall<HandoffLogEntry[]>('handoffInterceptLog')
    expect(log).toBeDefined()
    const match = log.find(e => String(e.path).includes('/api/pasteDoc'))
    expect(match, 'expected pasteDoc request').toBeDefined()
    expect(match?.body).toMatchObject({ doc: expect.any(String) })
  }
}

export class HandoffReceivedOpenInEditor implements Answerable {
  static now(): HandoffReceivedOpenInEditor {
    return new HandoffReceivedOpenInEditor()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const log = actor.recall<HandoffLogEntry[]>('handoffInterceptLog')
    expect(log).toBeDefined()
    const match = log.find(e => String(e.path).includes('/api/openInEditor'))
    expect(match, 'expected openInEditor request').toBeDefined()
  }
}

export class HandoffNoSuccessfulOpenExternal implements Answerable {
  static now(): HandoffNoSuccessfulOpenExternal {
    return new HandoffNoSuccessfulOpenExternal()
  }

  async answeredBy(actor: Actor): Promise<void> {
    const log = actor.recall<HandoffLogEntry[]>('handoffInterceptLog')
    expect(log).toBeDefined()
    const entry = log.find(e => String(e.path).includes('/api/openExternal'))
    expect(entry, 'expected openExternal request to have been sent').toBeDefined()
    expect(entry?.status, 'expected non-200 (failed) response for openExternal').not.toBe(200)
  }
}
