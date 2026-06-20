#!/usr/bin/env bun
/**
 * spec feature-init — scaffold assets/specs/<NNN>-<slug>/ from kb templates.
 *
 * Usage:
 *   bun packages/ops/src/governance/specs/feature_init.script.ts --id 001 --slug sync-frecency-persistence
 */
import path from 'node:path'

const ID_WIDTH = 3

async function copyTemplate(src: string, dest: string, replacements: Record<string, string>) {
  let text = await Bun.file(src).text()
  for (const [k, v] of Object.entries(replacements)) text = text.replaceAll(k, v)
  await Bun.write(dest, text)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const idIdx = args.indexOf('--id')
  const slugIdx = args.indexOf('--slug')
  const id = idIdx >= 0 ? args[idIdx + 1] : undefined
  const slug = slugIdx >= 0 ? args[slugIdx + 1] : undefined
  if (!id || !slug) {
    console.error('usage: bun packages/ops/src/governance/specs/feature_init.script.ts --id 001 --slug my-feature')
    process.exit(2)
  }

  const folder = `${id.padStart(ID_WIDTH, '0')}-${slug}`
  const dir = path.join('assets/specs', folder)
  await Bun.write(path.join(dir, '.gitkeep'), '')
  const specPath = path.join(dir, 'spec.md')
  if (await Bun.file(specPath).exists()) {
    console.log(`feature-init: ${specPath} already exists — skipping`)
    process.exit(0)
  }

  const replacements: Record<string, string> = {
    '[FEATURE NAME]': slug.replace(/-/g, ' '),
    '[###-feature-name]': folder,
    'v0.x': 'v0.10.0',
    '[PREFIX]': 'SF',
    '[PREFIX]-1': 'SF-1',
    '@spec:<slug>': `@spec:${slug}`,
    '[Scenario title]': 'Primary scenario'
  }
  replacements.$ARGUMENTS = '(intake prompt)'

  await copyTemplate('.specify/templates/spec-template.md', specPath, replacements)

  await Bun.write(
    path.join(dir, 'plan.md'),
    `# Implementation Plan: ${slug}\n\n**Branch**: \`${folder}\` | **Spec**: [spec.md](./spec.md)\n\n## E2e traceability\n\n| Requirement | Feature file | Scenario | Notes |\n| --- | --- | --- | --- |\n| SF-1 | \`assets/features/e2e/${slug.replace(/-/g, '_')}.feature\` | TBD | \`@spec:${slug}\` |\n`
  )
  await Bun.write(
    path.join(dir, 'tasks.md'),
    `# Tasks — ${slug}

## Phase 1

- [ ] **T101** First task — *gate:* SF-1 AC1
`
  )
  await Bun.write(
    path.join(dir, 'handoff.md'),
    `# Handoff — \`${folder}\`

**Spec:** [spec.md](./spec.md)

| ID | Done when | Evidence |
| --- | --- | --- |
`
  )
  await Bun.write(path.join(dir, 'checklists/.gitkeep'), '')
  await Bun.write(
    path.join(dir, '.spec-context.json'),
    `${JSON.stringify({ feature_directory: `assets/specs/${folder}` }, null, 2)}\n`
  )

  console.log(`✓ created ${dir}`)
}

await main().catch(err => {
  console.error(err)
  process.exit(1)
})
