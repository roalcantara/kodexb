#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../../support/lib/shared/repo_root.script'

type PerfFeatureDataset = {
  slug: string
  files: {
    spec_md: string
    plan_md: string
    tasks_md: string
    handoff_md: string
  }
  checklist_files: string[]
  handoff_emitted_gherkin: boolean
}

const ROOT = chdirToRepoRoot()
const DEFAULT_OUTPUT = path.join(ROOT, 'packages/ops/src/metrics/fixtures/perf/workflow-observability-feature.json')
const ABSOLUTE_PATH_RE = /\/(Users|home|etc|var)\/[A-Za-z0-9_./-]+/g

function usage(): string {
  return 'Usage: bun packages/ops/src/metrics/harnesses/perf/workflow_observability_extract_dataset.script.ts --feature <dir> [--output <path>]'
}

function parseArgs(argv: string[]): { featureDir: string; outputPath: string } {
  let featureDir = ''
  let outputPath = DEFAULT_OUTPUT

  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i]
    if (!flag) continue
    if (flag === '--feature') {
      const next = argv[i + 1]
      if (!next) throw new Error('--feature requires a value')
      featureDir = next
      i += 1
      continue
    }
    if (flag === '--output') {
      const next = argv[i + 1]
      if (!next) throw new Error('--output requires a value')
      outputPath = next
      i += 1
      continue
    }
    if (flag === '--help' || flag === '-h') {
      console.log(usage())
      process.exit(0)
    }
    throw new Error(`unknown flag: ${flag}`)
  }

  if (!featureDir) throw new Error('--feature is required')
  return {
    featureDir: path.isAbsolute(featureDir) ? featureDir : path.join(ROOT, featureDir),
    outputPath: path.isAbsolute(outputPath) ? outputPath : path.join(ROOT, outputPath)
  }
}

function requireFile(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`required file not found: ${filePath}`)
  }
  return readFileSync(filePath, 'utf-8').replace(ABSOLUTE_PATH_RE, '<abs-path>')
}

function buildDataset(featureDir: string): PerfFeatureDataset {
  if (!existsSync(featureDir)) {
    throw new Error(`feature dir not found: ${featureDir}`)
  }

  const basename = path.basename(featureDir)
  const slug = basename.replace(/^\d+-/, '')
  const checklistsDir = path.join(featureDir, 'checklists')
  const checklistFiles = existsSync(checklistsDir)
    ? readdirSync(checklistsDir)
        .filter(name => name.endsWith('.md'))
        .sort((a, b) => a.localeCompare(b))
    : []

  const marker = path.join(ROOT, 'tmp/handoffs', `opencode-${slug}-gherkin.md`)

  return {
    slug,
    files: {
      spec_md: requireFile(path.join(featureDir, 'spec.md')),
      plan_md: requireFile(path.join(featureDir, 'plan.md')),
      tasks_md: requireFile(path.join(featureDir, 'tasks.md')),
      handoff_md: requireFile(path.join(featureDir, 'handoff.md'))
    },
    checklist_files: checklistFiles,
    handoff_emitted_gherkin: existsSync(marker)
  }
}

function main(argv: string[]): number {
  try {
    const { featureDir, outputPath } = parseArgs(argv)
    const dataset = buildDataset(featureDir)
    mkdirSync(path.dirname(outputPath), { recursive: true })
    writeFileSync(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, 'utf-8')
    console.log(`workflow-observability dataset written to ${outputPath}`)
    return 0
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    console.error(usage())
    return 2
  }
}

if (import.meta.main) {
  process.exit(main(process.argv.slice(2)))
}
