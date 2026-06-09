import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { FIXTURE_PATHS_FILE } from './fixtures.support'

export type FixturePaths = {
  root: string
  configPath: string
  dbPath: string
  sourcesPath: string
}

const TODAY = new Date().toISOString().slice(0, 10)
const OVERDUE = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)

const BOOKMARKS_YAML = `bookmarks:
  Release Bookmark:
    desc: Primary release bookmark for e2e smoke testing
    tags: [regression, release]
    links:
      - https://kb.example.dev/release-bookmark
    notes:
      - md: |
          ## Release Bookmark Notes
          This entry validates open/copy actions and detail rendering.

  Release Docs Link:
    desc: Secondary bookmark for multi-row search and filter assertions
    tags: [release]
    links:
      - https://kb.example.dev/release-docs
`

const COMMANDS_YAML = `commands:
  echo "release command executed":
    desc: Release Command
    tags: [regression, release]
    notes:
      - sh: |
          #!/bin/bash
          echo "release command executed"
      - md: |
          Terminal command for primary-action feedback scenarios.
`

const CHEATS_YAML = `cheats:
  Release Cheat:
    desc: Release cheat sheet for detail and copy scenarios
    tags: [regression, release]
    notes:
      - md: |
          ## Release Cheat Notes
          Markdown body used for detail rendering and copy action tests.
          - Step 1: verify detail panel
          - Step 2: verify copy feedback
`

const TASKS_YAML = `tasks:
  Release Todo Task:
    desc: A todo-priority task with no due date
    tags: [release]
    status: todo
    priority: mid
    task_order: 1

  Release Doing Task:
    desc: A high-priority task due today
    tags: [release]
    status: doing
    priority: high
    due: "${TODAY}"
    task_order: 0

  Release Done Task:
    desc: An urgent task that is overdue and depends on Release Todo Task
    tags: [release]
    status: done
    priority: urgent
    due: "${OVERDUE}"
    depends_on: [1]

  Release Overdue Task:
    desc: An overdue task that should be done
    tags: [release]
    status: todo
    priority: high
    due: "${OVERDUE}"
`

const SHORTCUTS_YAML = `shortcuts:
  release-macos:
    desc: Release macOS
    tags: [regression, release]
    bindings:
      - chord: cmd+space
        action: Release Spotlight
        scope: global
        group: system

  release-amethyst:
    desc: Release Amethyst
    tags: [regression, release]
    bindings:
      - chord: cmd+space
        action: Release Spotlight
        scope: global
        group: system

  release-vscode:
    desc: Release VS Code
    tags: [regression, release]
    bindings:
      - chord: cmd+p
        action: Release Go To File
        scope: local
        group: navigation
      - chord: cmd+shift+p
        action: Release Show All Commands
        scope: local
        group: navigation
      - chord: cmd+b
        action: Release Toggle Sidebar
        scope: local
        group: view

  release-browser:
    desc: Release Browser
    tags: [release]
    bindings:
      - chord: cmd+p
        action: Release Print
        scope: local
        group: app
`

function configYaml(dbPath: string, sourcesPath: string): string {
  return `database:
  path: "${dbPath}"
sources:
  path: "${sourcesPath}"
display:
  pageSize: "50"
`
}

async function ensureReleaseSourceDirs(sourcesPath: string): Promise<void> {
  await Promise.all([
    mkdir(path.join(sourcesPath, 'bookmarks'), { recursive: true }),
    mkdir(path.join(sourcesPath, 'commands'), { recursive: true }),
    mkdir(path.join(sourcesPath, 'cheats'), { recursive: true }),
    mkdir(path.join(sourcesPath, 'tasks'), { recursive: true }),
    mkdir(path.join(sourcesPath, 'shortcuts'), { recursive: true })
  ])
}

async function writeReleaseFixtureSources(sourcesPath: string): Promise<void> {
  await ensureReleaseSourceDirs(sourcesPath)
  await Promise.all([
    writeFile(path.join(sourcesPath, 'bookmarks', 'release.yml'), BOOKMARKS_YAML),
    writeFile(path.join(sourcesPath, 'commands', 'release.yml'), COMMANDS_YAML),
    writeFile(path.join(sourcesPath, 'cheats', 'release.yml'), CHEATS_YAML),
    writeFile(path.join(sourcesPath, 'tasks', 'release.yml'), TASKS_YAML),
    writeFile(path.join(sourcesPath, 'tasks', 'spec-008-atomicity.yml'), ATOMICITY_TASKS_YAML),
    writeFile(path.join(sourcesPath, 'shortcuts', 'release.yml'), SHORTCUTS_YAML)
  ])
}

const ATOMICITY_TASKS_YAML = `tasks:
  Atomicity conflict probe:
    desc: Feature-local task for atomicity update-conflict scenarios
    tags: [spec-008]
    status: todo
    priority: low
    task_order: 10

  Atomicity diagnostic probe:
    desc: Feature-local task for atomicity diagnostic scenarios
    tags: [spec-008]
    status: todo
    priority: low
    task_order: 11
`

/** E2e scenarios may add these under the shared preview sources tree. */
const RESTORE_REMOVE_PATHS = [
  'sync',
  'invalid',
  'tasks.yml',
  'bookmarks/synced.yml',
  'shortcuts/clash_e2e.yml'
] as const

export async function createFixture(): Promise<FixturePaths> {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-e2e-'))
  const sourcesPath = path.join(root, 'sources')
  const dbPath = path.join(root, 'knowledge.sqlite')
  const configPath = path.join(root, 'config.yaml')

  await writeFile(configPath, configYaml(dbPath, sourcesPath))
  await writeReleaseFixtureSources(sourcesPath)

  return { root, configPath, dbPath, sourcesPath }
}

/** Soft reset: same temp root + preview App; drop cross-scenario source mutations. */
export async function restoreReleaseFixtureSources(): Promise<FixturePaths> {
  const raw = await readFile(FIXTURE_PATHS_FILE, 'utf-8')
  const paths: FixturePaths = JSON.parse(raw)
  await Promise.all(
    RESTORE_REMOVE_PATHS.map(rel => rm(path.join(paths.sourcesPath, rel), { recursive: true, force: true }))
  )
  await writeReleaseFixtureSources(paths.sourcesPath)
  return paths
}

export async function destroyFixture(paths: FixturePaths): Promise<void> {
  if (process.env.E2E_PRESERVE_ARTIFACTS) return
  await rm(paths.root, { recursive: true, force: true })
}

export async function pruneFixture(): Promise<void> {
  try {
    const raw = await readFile(FIXTURE_PATHS_FILE, 'utf-8')
    const paths: FixturePaths = JSON.parse(raw)
    await destroyFixture(paths)
  } catch {
    // fixture may already be cleaned or file missing
  } finally {
    await rm(FIXTURE_PATHS_FILE, { force: true })
  }
}
