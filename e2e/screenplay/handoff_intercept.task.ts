import type { Actor, Performable } from './actor.ability'

type HandoffLogEntry = {
  method: string
  path: string
  body: unknown
  status: number
}

export class HandoffIntercept implements Performable {
  private constructor(private readonly fail: boolean) {}

  static activate(): HandoffIntercept {
    return new HandoffIntercept(false)
  }

  static stubFailure(): HandoffIntercept {
    return new HandoffIntercept(true)
  }

  async performAs(actor: Actor): Promise<void> {
    const log: HandoffLogEntry[] = []
    actor.remember('handoffInterceptLog', log)

    await actor.page.route(/\/api\/(openExternal|pasteInTerminal|runInTerminal|pasteDoc|openInEditor)/, async route => {
      const body = route.request().postDataJSON()
      const status = this.fail ? 422 : 200
      log.push({ method: route.request().method(), path: route.request().url(), body, status })

      if (this.fail) {
        await route.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'e2e stub' })
        })
      } else {
        await route.fulfill({ status, contentType: 'application/json', body: 'null' })
      }
    })
  }
}
