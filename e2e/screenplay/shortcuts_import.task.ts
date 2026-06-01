import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { Actor, Performable } from './actor.ability'

export const E2E_CLASH_BINDING_ACTION = 'Release Clash E2E'

function loadFixturePaths() {
  return JSON.parse(readFileSync(path.join(import.meta.dirname, '..', '.fixture-paths.json'), 'utf-8')) as {
    sourcesPath: string
  }
}

export class WriteClashingGlobalBinding implements Performable {
  static now(): WriteClashingGlobalBinding {
    return new WriteClashingGlobalBinding()
  }

  async performAs(_actor: Actor): Promise<void> {
    const { sourcesPath } = loadFixturePaths()
    const yaml = `shortcuts:
  release-clash-e2e:
    desc: Release clash e2e
    tags: [regression, e2e]
    bindings:
      - chord: cmd+space
        action: ${E2E_CLASH_BINDING_ACTION}
        scope: global
        group: system
`
    const filePath = path.join(sourcesPath, 'shortcuts', 'clash_e2e.yml')
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, yaml, 'utf-8')
  }
}
