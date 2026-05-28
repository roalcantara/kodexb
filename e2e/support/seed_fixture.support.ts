import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

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

function configYaml(dbPath: string, sourcesPath: string): string {
  return `database:
  path: "${dbPath}"
sources:
  path: "${sourcesPath}"
display:
  pageSize: "50"
`
}

export async function createFixture(): Promise<FixturePaths> {
  const root = await mkdtemp(path.join(tmpdir(), 'kb-e2e-'))
  const sourcesPath = path.join(root, 'sources')
  const dbPath = path.join(root, 'knowledge.sqlite')
  const configPath = path.join(root, 'config.yaml')

  await mkdir(path.join(sourcesPath, 'bookmarks'), { recursive: true })
  await mkdir(path.join(sourcesPath, 'commands'), { recursive: true })
  await mkdir(path.join(sourcesPath, 'cheats'), { recursive: true })
  await mkdir(path.join(sourcesPath, 'tasks'), { recursive: true })

  await Promise.all([
    writeFile(configPath, configYaml(dbPath, sourcesPath)),
    writeFile(path.join(sourcesPath, 'bookmarks', 'release.yml'), BOOKMARKS_YAML),
    writeFile(path.join(sourcesPath, 'commands', 'release.yml'), COMMANDS_YAML),
    writeFile(path.join(sourcesPath, 'cheats', 'release.yml'), CHEATS_YAML),
    writeFile(path.join(sourcesPath, 'tasks', 'release.yml'), TASKS_YAML)
  ])

  return { root, configPath, dbPath, sourcesPath }
}

export async function destroyFixture(paths: FixturePaths): Promise<void> {
  if (process.env.E2E_PRESERVE_ARTIFACTS) return
  await rm(paths.root, { recursive: true, force: true })
}
