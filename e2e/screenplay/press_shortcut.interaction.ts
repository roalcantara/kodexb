import type { Actor, Performable } from './actor.ability'

export class PressShortcut implements Performable {
  private constructor(private readonly key: string) {}

  static named(key: string): PressShortcut {
    return new PressShortcut(key)
  }

  async performAs(actor: Actor): Promise<void> {
    await actor.page.keyboard.press(this.key)
  }
}
