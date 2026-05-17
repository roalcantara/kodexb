import path from 'node:path'
import type { BookmarkKnowledge, CheatKnowledge, CommandKnowledge, TaskKnowledge } from '@core'
import type { Env } from '@shared/types'
import type { LoadedConfig } from '@shell/app/config/config.loader'
import { DEFAULT_CONFIG_BODY, type RawConfig } from '@shell/app/config/config.schema'
import { Factory } from 'fishery'
import { createFactoryFor } from '../helpers/testing.factory'
import { minimalEntriesYml, testingPaths } from '../paths'

const processHomeKey = 'HOME' as const

const envFactory = Factory.define<Env>(() => ({
  [processHomeKey]: '/home/tester'
}))

const rawConfigFactory = Factory.define<RawConfig>(() => ({
  ...DEFAULT_CONFIG_BODY
}))

const loadedConfigFactory = Factory.define<LoadedConfig>(() => ({
  configPath: '/tmp/kb-test/config.yaml',
  database: { path: ':memory:' },
  sources: { path: testingPaths.minimal },
  display: { pageSize: '50' },
  writeTarget: path.join(testingPaths.minimal, 'tasks.yml')
}))

const bookmarkFactory = Factory.define<BookmarkKnowledge>(({ sequence }) => ({
  id: 1_000_000_000 + sequence,
  type: 'bookmark',
  key: `https://example.com/${sequence}`,
  source: minimalEntriesYml,
  desc: 'Example bookmark',
  tags: ['example'],
  doc: `# Example bookmark ${sequence}\n\nFactory-generated bookmark content.`,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const commandFactory = Factory.define<CommandKnowledge>(({ sequence }) => ({
  id: 2_000_000_000 + sequence,
  type: 'command',
  key: `git status ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Show working tree status',
  tags: ['git'],
  doc: `# Command ${sequence}\n\n\`\`\`sh\ngit status ${sequence}\n\`\`\``,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const cheatFactory = Factory.define<CheatKnowledge>(({ sequence }) => ({
  id: 3_000_000_000 + sequence,
  type: 'cheat',
  key: `Cheat title ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Math cheat',
  tags: ['math'],
  doc: `# Cheat ${sequence}\n\nSome notes.`,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const taskFactory = Factory.define<TaskKnowledge>(({ sequence }) => ({
  id: 4_000_000_000 + sequence,
  type: 'task',
  key: `Task title ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Build kb',
  tags: ['dev', 'kb'],
  priority: 'high',
  status: 'doing',
  dueDate: undefined,
  taskOrder: sequence,
  dependsOn: undefined,
  doc: `# Task ${sequence}\n\n> Build kb`,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const knowledgeFtsWeakerFactory = Factory.define<BookmarkKnowledge>(() => ({
  id: 1,
  type: 'bookmark',
  key: 'https://k3d.io',
  source: 'kb:spec:knowledge/fts:weaker',
  desc: 'Run k3s in Docker. For automation use brew install k3d.',
  tags: ['coding'],
  doc: '',
  createdAt: 1,
  updatedAt: 1
}))

const knowledgeFtsStrongerFactory = Factory.define<CommandKnowledge>(() => ({
  id: 2,
  type: 'command',
  key: 'brew autoremove && brew update && brew upgrade',
  source: 'kb:spec:knowledge/fts:stronger',
  desc: 'brew autoremove && brew update && brew upgrade && brew upgrade --cask',
  tags: ['brew', 'macos', 'maintenance'],
  doc: '',
  createdAt: 1,
  updatedAt: 1
}))

const rectangleFactory = Factory.define<{ x: number; y: number; width: number; height: number }>(() => ({
  x: 0,
  y: 0,
  width: 1920,
  height: 1080
}))

const windowSizeFactory = Factory.define<{ width: number; height: number }>(() => ({
  width: 680,
  height: 420
}))

const factories = {
  env: envFactory,
  rawConfig: rawConfigFactory,
  loadedConfig: loadedConfigFactory,
  bookmark: bookmarkFactory,
  command: commandFactory,
  cheat: cheatFactory,
  task: taskFactory,
  'knowledge:weaker': knowledgeFtsWeakerFactory,
  'knowledge:stronger': knowledgeFtsStrongerFactory,
  rectangle: rectangleFactory,
  windowSize: windowSizeFactory
} as const

/**
 * Typed Fishery registry for kb shell/core shapes.
 * @example factoryFor('bookmark', { overrides: { desc: 'hello' } })
 */
export const factoryFor = createFactoryFor(factories)
