import path from 'node:path'
import type {
  BookmarkKnowledge,
  CheatKnowledge,
  CommandKnowledge,
  KeyModifierSet,
  Knowledge,
  ShortcutKnowledge,
  TaskKnowledge
} from '@core'
import type { AuthoringChordStep, Binding, ChordStep } from '@core/domain/models/entries/schemas/shortcut.schema'
import type { BindingRef } from '@shared/rpc'
import type { Env } from '@shared/types'
import type { LoadedConfig } from '@shell/app/config/config.loader'
import { DEFAULT_CONFIG_BODY, type RawConfig } from '@shell/app/config/config.schema'
import { Factory } from 'fishery'
import { createFactoryFor } from '../helpers/testing.factory'
import { minimalEntriesYml, testingPaths } from '../paths'

const envFactory = Factory.define<Env>(() => ({
  HOME: '/home/tester'
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

const knowledgeFactory = Factory.define<Knowledge>(({ sequence }) => ({
  id: 100_000_00 + sequence,
  type: 'bookmark',
  key: `https://example.com/${sequence}`,
  source: minimalEntriesYml,
  desc: 'Example bookmark',
  tags: ['example'],
  doc: `# Example bookmark ${sequence}\n\nFactory-generated bookmark content.`,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const bookmarkFactory = knowledgeFactory.params({
  type: 'bookmark' as const
})

const commandFactory = Factory.define<CommandKnowledge>(({ sequence }) => ({
  id: 2_000_000_000 + sequence,
  type: 'command' as const,
  key: `git status ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Show working tree status',
  tags: ['git'],
  doc: '# Command \n\n```sh\ngit status\n```',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const cheatFactory = Factory.define<CheatKnowledge>(({ sequence }) => ({
  id: 3_000_000_000 + sequence,
  type: 'cheat' as const,
  key: `Cheat title ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Math cheat',
  tags: ['math'],
  doc: '# Cheat \n\nSome notes.',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const taskFactory = Factory.define<TaskKnowledge>(({ sequence }) => ({
  id: 4_000_000_000 + sequence,
  type: 'task' as const,
  key: `Task title ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Build kb',
  tags: ['dev', 'kb'],
  priority: 'high',
  status: 'doing',
  taskOrder: 0,
  doc: '# Task \n\n> Build kb',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))

const shortcutFactory = Factory.define<ShortcutKnowledge>(({ sequence }) => ({
  id: 5_000_000_000 + sequence,
  type: 'shortcut' as const,
  key: 'Shortcut',
  source: minimalEntriesYml,
  desc: 'Example shortcut',
  tags: ['shortcut'],
  doc: '# Shortcut',
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  bindings: [
    {
      chord: [{ modifiers: ['cmd'], key: 's' }],
      scope: 'local',
      action: 'Action'
    }
  ]
}))

const shortcutVscodeKeymapFactory = shortcutFactory.params({
  key: 'vscode',
  desc: 'VS Code keymap',
  platform: 'any',
  bindings: [
    {
      id: 'go-to-file',
      chord: [{ modifiers: ['cmd'], key: 'p' }],
      scope: 'local',
      action: 'Go to File',
      group: 'Navigation'
    },
    {
      id: 'cmd-palette',
      chord: [{ modifiers: ['cmd', 'shift'], key: 'p' }],
      scope: 'local',
      action: 'Show All Commands',
      group: 'Navigation'
    },
    {
      id: 'toggle-terminal',
      chord: [{ modifiers: ['ctrl'], key: '`' }],
      scope: 'local',
      action: 'Toggle Terminal',
      group: 'Editor'
    }
  ]
})

const bindingFactory = Factory.define<Binding>(({ sequence }) => ({
  id: `binding-${sequence}`,
  chord: [{ modifiers: ['cmd'], key: 'p' }],
  scope: 'local',
  action: `Action ${sequence}`
}))

const bindingGoToFileFactory = bindingFactory.params({
  id: 'go-to-file',
  chord: [{ modifiers: ['cmd'], key: 'p' }],
  scope: 'local',
  action: 'Go to File',
  group: 'Navigation'
})

const bindingRefFactory = Factory.define<BindingRef>(({ sequence }) => ({
  bindingId: `app-${sequence}:action-${sequence}`,
  entryKey: `entry-${sequence}`,
  app: `app-${sequence}`,
  platform: 'any',
  scope: 'local',
  chordHash: 'cmd+p',
  chordPrefix: null,
  action: `Action ${sequence}`
}))

const bindingRefGlobalFactory = bindingRefFactory.params({
  scope: 'global',
  chordHash: 'cmd+space',
  platform: 'any'
})

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
  height: 600
}))

const authoringChordStepFactory = Factory.define<AuthoringChordStep>(() => ({
  modifiers: ['cmd'],
  key: 'p'
}))

const authoringChordStepHyperMacFactory = authoringChordStepFactory.params({
  modifiers: ['hyper'],
  key: 'k'
})

const authoringChordStepHyperLinuxFactory = authoringChordStepFactory.params({
  modifiers: ['hyper'],
  key: 'k'
})

const authoringChordStepSuperTabFactory = authoringChordStepFactory.params({
  modifiers: ['super'],
  key: 'tab'
})

const chordStepFactory = Factory.define<ChordStep>(() => ({
  modifiers: ['cmd'],
  key: 'p'
}))

const chordStepSuperTabFactory = chordStepFactory.params({
  modifiers: ['super'],
  key: 'tab'
})

const keyModifierSetFactory = Factory.define<KeyModifierSet>(() => ({
  modifiers: ['cmd']
}))

const keyModifierSetHyperMacFactory = keyModifierSetFactory.params({
  modifiers: ['ctrl', 'alt', 'cmd']
})

const keyModifierSetHyperMacShiftFactory = keyModifierSetFactory.params({
  modifiers: ['ctrl', 'alt', 'cmd', 'shift']
})

const keyModifierSetHyperLinuxFactory = keyModifierSetFactory.params({
  modifiers: ['ctrl', 'alt', 'super']
})

const factories = {
  env: envFactory,
  rawConfig: rawConfigFactory,
  loadedConfig: loadedConfigFactory,
  bookmark: bookmarkFactory,
  command: commandFactory,
  cheat: cheatFactory,
  task: taskFactory,
  shortcut: shortcutFactory,
  'shortcut:vscodeKeymap': shortcutVscodeKeymapFactory,
  binding: bindingFactory,
  'binding:goToFile': bindingGoToFileFactory,
  bindingRef: bindingRefFactory,
  'bindingRef:global': bindingRefGlobalFactory,
  'knowledge:weaker': knowledgeFtsWeakerFactory,
  'knowledge:stronger': knowledgeFtsStrongerFactory,
  rectangle: rectangleFactory,
  windowSize: windowSizeFactory,
  knowledge: knowledgeFactory,
  'knowledge:bookmark': bookmarkFactory,
  'knowledge:command': commandFactory,
  'knowledge:cheat': cheatFactory,
  'knowledge:task': taskFactory,
  'knowledge:shortcut': shortcutFactory,
  authoringChordStep: authoringChordStepFactory,
  'authoringChordStep:hyperMac': authoringChordStepHyperMacFactory,
  'authoringChordStep:hyperLinux': authoringChordStepHyperLinuxFactory,
  'authoringChordStep:superTab': authoringChordStepSuperTabFactory,
  chordStep: chordStepFactory,
  'chordStep:superTab': chordStepSuperTabFactory,
  keyModifierSet: keyModifierSetFactory,
  'keyModifierSet:hyperMac': keyModifierSetHyperMacFactory,
  'keyModifierSet:hyperMacShift': keyModifierSetHyperMacShiftFactory,
  'keyModifierSet:hyperLinux': keyModifierSetHyperLinuxFactory
} as const

/**
 * Typed Fishery registry for kb shell/core shapes.
 * @example factoryFor('bookmark', { overrides: { desc: 'hello' } })
 */
export const factoryFor = createFactoryFor(factories)
