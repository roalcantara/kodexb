#!/usr/bin/env bun
/**
 * Run @unit Gherkin acceptance scenarios with Cucumber + Bun (no Playwright).
 */
import { chdirToRepoRoot } from '../../../tools/support/lib/shared/repo_root.script.ts'
import { runUnitBddSpawn, validateUnitBdd } from './unit_bdd.runner.ts'

function parseArgs(argv: string[]): { catalogTags: string[]; acTag?: string; dryRun: boolean; validateOnly: boolean } {
  const catalogTags: string[] = []
  let acTag: string | undefined
  let dryRun = false
  let validateOnly = false

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      dryRun = true
      continue
    }
    if (arg === '--validate') {
      validateOnly = true
      continue
    }
    const tag = consumeTagArg(argv, i)
    if (!tag) continue
    i = tag.i
    if (tag.value.startsWith('@ac:')) acTag = tag.value
    else catalogTags.push(tag.value.startsWith('@') ? tag.value : `@${tag.value}`)
  }

  return { catalogTags, acTag, dryRun, validateOnly }
}

function consumeTagArg(argv: string[], i: number): { i: number; value: string } | undefined {
  if (argv[i] !== '--tags') return
  const val = argv[i + 1]
  if (!val || val.startsWith('--')) return
  return { i: i + 1, value: val }
}

const root = chdirToRepoRoot()
const { catalogTags, acTag, dryRun, validateOnly } = parseArgs(process.argv.slice(2))

if (catalogTags.length === 0 && !acTag) {
  console.error('run_unit_bdd: pass at least one --tags (catalog tag and/or @ac:SF-n_ACm)')
  process.exit(2)
}

const opts = { root, catalogTags, acTag, dryRun }
const code = validateOnly ? await validateUnitBdd(opts) : runUnitBddSpawn(opts, root)
process.exit(code)
