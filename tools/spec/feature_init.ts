#!/usr/bin/env bun
/**
 * spec feature-init — scaffold assets/specs/<NNN>-<slug>/ from kb templates.
 *
 * Usage:
 *   bun tools/spec/feature_init.ts --id 001 --slug sync-frecency-persistence
 */
import { mkdir } from 'node:fs/promises'
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
    console.error('usage: bun tools/spec/feature_init.ts --id 001 --slug my-feature')
    process.exit(2)
  }

  const folder = `${id.padStart(ID_WIDTH, '0')}-${slug}`
  const dir = path.join('assets/specs', folder)
  const specPath = path.join(dir, 'spec.md')
  if (await Bun.file(specPath).exists()) {
    console.log(`feature-init: ${specPath} already exists — skipping`)
    process.exit(0)
  }

  await mkdir(path.join(dir, 'artifacts/spec/checklists'), { recursive: true })
  await mkdir(path.join(dir, 'artifacts/plan/contracts'), { recursive: true })
  await mkdir(path.join(dir, 'artifacts/tasks'), { recursive: true })

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
  await Bun.write(path.join(dir, 'tasks.md'), `# Tasks — ${slug}\n\n## Phase 1\n\n- [ ] Task 1\n`)
  await Bun.write(
    path.join(dir, 'artifacts/tasks/handoff.md'),
    `# Handoff — \`${folder}\`\n\n**Spec:** \`assets/specs/${folder}/\`\n\n## Agent prompt\n\n\`\`\`text\nImplement spec \`${folder}\`. Read spec.md, plan.md, tasks.md, artifacts/tasks/handoff.md.\nRun mise run spec gate assets/specs/${folder} before done.\n\`\`\`\n`
  )
  await Bun.write(
    path.join(dir, 'READ_ORDER.md'),
    `# Read order — \`${folder}\`\n\n1. [spec.md](./spec.md)\n2. [plan.md](./plan.md)\n3. [tasks.md](./tasks.md)\n4. [artifacts/tasks/handoff.md](./artifacts/tasks/handoff.md)\n`
  )
  await Bun.write(
    path.join(dir, '.spec-context.json'),
    `${JSON.stringify({ feature_directory: `assets/specs/${folder}`, status: 'specified' }, null, 2)}\n`
  )

  console.log(`✓ created ${dir}`)
}

await main().catch(err => {
  console.error(err)
  process.exit(1)
})
