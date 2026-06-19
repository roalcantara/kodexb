#!/usr/bin/env bun
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { getLogger } from '@logtape/logtape'
import {
  formatTagListJson,
  formatTagListText,
  layerFilter,
  resolveAllCatalogTags,
  resolveTagKey,
  runTaggedTests
} from '../governance/registries/catalog/tag.script'
import { runSpecAudit } from '../governance/specs/spec_audit.script'
import { runSpecStyle } from '../governance/specs/spec_style.script'
import { runBinMain } from '../support/lib/cli/dispatch.script'
import { parseTagCli, runE2e } from '../support/lib/cli/test_cli.script'
import { usageCmd, usageFlags, usageStrings } from '../support/lib/cli/usage_env.script'
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script'
import { spawnInherit } from '../support/lib/shared/spawn_inherit.script'

async function runTagSubcommand(root: string): Promise<void> {
  const { list, e2e, unit, json, catalogKeys, acTag } = parseTagCli()
  const filter = layerFilter(e2e, unit)
  if (list) {
    const resolutions =
      catalogKeys.length === 0
        ? await resolveAllCatalogTags()
        : await Promise.all(catalogKeys.map(k => resolveTagKey(k)))
    const filtered = resolutions.map(r => ({
      ...r,
      features: filter.e2e ? r.features : [],
      units: filter.unit ? r.units : []
    }))
    if (json) {
      console.log(JSON.stringify(formatTagListJson(filtered, filter), null, 2))
      return
    }
    console.log(formatTagListText(filtered, filter))
    if (acTag) console.log(`\nAC slice: ${acTag}`)
    return
  }
  if (catalogKeys.length === 0 && !acTag) {
    getLogger(['kb', 'ops', 'test']).error(
      'test tag: specify at least one catalog key or an AC tag to run, or use --list'
    )
    process.exit(2)
  }
  const resolutions = await Promise.all(catalogKeys.map(k => resolveTagKey(k)))
  if (!json) {
    for (const res of resolutions) {
      console.log(formatTagListText([res], { e2e: true, unit: true }))
      console.log('')
    }
    if (acTag) console.log(`AC slice: ${acTag}\n`)
  }
  runTaggedTests(resolutions, filter, root, acTag)
}

runBinMain(() => {
  const ROOT = chdirToRepoRoot()
  const ACTION = usageCmd(process.env, 'unit')
  const { strict } = usageFlags(process.env, ['strict'])
  const { format } = usageStrings(process.env, ['format'])

  const actionMap: Record<string, () => undefined | number | Promise<undefined | number>> = {
    unit: () => {
      spawnInherit(['bun', 'test', '--pass-with-no-tests'], ROOT)
      // biome-ignore lint/complexity/noUselessUndefined: needed for () => undefined contract
      return undefined
    },
    ci: () => {
      mkdirSync(path.join(ROOT, 'tmp/reports/tests'), { recursive: true })
      spawnInherit(
        [
          'bun',
          'test',
          '--pass-with-no-tests',
          '--reporter=junit',
          '--reporter-outfile=tmp/reports/tests/junit.xml',
          '--coverage',
          '--coverage-dir=tmp/reports/tests/coverage'
        ],
        ROOT
      )
      // biome-ignore lint/complexity/noUselessUndefined: needed for () => undefined contract
      return undefined
    },
    'spec-audit': () => {
      runSpecAudit(ROOT, strict)
      // biome-ignore lint/complexity/noUselessUndefined: needed for () => undefined type contract
      return undefined
    },
    'spec-style': () =>
      runSpecStyle(ROOT, strict, format ?? 'text')
        .then(() => undefined)
        .catch(() => undefined),
    'e2e-preview': () => {
      spawnInherit(['bun', 'run', 'e2e:preview'], ROOT)
      // biome-ignore lint/complexity/noUselessUndefined: needed for () => undefined type contract
      return undefined
    },
    e2e: () => {
      runE2e(ROOT)
      // biome-ignore lint/complexity/noUselessUndefined: needed for () => undefined type contract
      return undefined
    },
    tag: () => runTagSubcommand(ROOT).then(() => undefined)
  }

  const handler = actionMap[ACTION]
  if (!handler) {
    getLogger(['kb', 'ops', 'test']).error(`test: unknown action ${ACTION}`)
    process.exit(2)
  }
  return handler()
})
