// @entry_action_panel
import { describe, expect, it, mock } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { buildEntryActionPanel } from './action_builder.service'
import type { EntryActionPanelDeps } from './deps.service'
import type { EntryAction, EntryActionContext } from './panel.types'
import { actionById, primaryAction, secondaryAction } from './resolve.resolver'

const noopDeps: EntryActionPanelDeps = {
  openExternal: mock(() => Promise.resolve()),
  openInEditor: mock(() => Promise.resolve()),
  cycleStatus: mock(() => Promise.resolve()),
  cyclePriority: mock(() => Promise.resolve()),
  runInTerminal: mock(() => Promise.resolve()),
  pasteInTerminal: mock(() => Promise.resolve()),
  pasteDoc: mock(() => Promise.resolve()),
  quitApp: mock(() => Promise.resolve())
}

const ctxBase: EntryActionContext = {
  entry: null,
  pushToast: () => undefined,
  onEditTask: () => undefined,
  onNewTask: () => undefined,
  onSync: () => undefined,
  onOpenSettings: () => undefined
}

function panelFor(type: RpcKnowledge['type']): EntryAction[] {
  const entry = factoryFor(type, { overrides: { id: 1 } }) as RpcKnowledge
  return buildEntryActionPanel({ ...ctxBase, entry }, noopDeps)
}

describe('buildEntryActionPanel()', () => {
  describe('when entry is null', () => {
    it('returns library and app actions', () => {
      const panel = buildEntryActionPanel(ctxBase, noopDeps)
      expect(panel.map(a => a.id)).toEqual(['sync', 'new-task', 'settings', 'quit'])
    })
  })

  describe('with a bookmark entry', () => {
    it('has open-url primary and no secondary', () => {
      const panel = panelFor('bookmark')
      expect(primaryAction(panel)?.id).toBe('open-url')
      expect(secondaryAction(panel)).toBeUndefined()
    })

    it('orders sections library then app', () => {
      const panel = panelFor('bookmark')
      const sections = panel.map(a => a.section)
      expect(sections.indexOf('library')).toBeLessThan(sections.indexOf('app'))
      expect(sections[sections.length - 1]).toBe('app')
    })
  })

  describe('with a command entry', () => {
    it('has paste-terminal primary and run-terminal secondary', () => {
      const panel = panelFor('command')
      expect(primaryAction(panel)?.id).toBe('paste-terminal')
      expect(secondaryAction(panel)?.id).toBe('run-terminal')
    })
  })

  describe('with a cheat entry', () => {
    it('has paste-doc primary and no secondary', () => {
      const panel = panelFor('cheat')
      expect(primaryAction(panel)?.id).toBe('paste-doc')
      expect(secondaryAction(panel)).toBeUndefined()
    })
  })

  describe('with a task entry', () => {
    it('has edit-task primary, status and priority actions', () => {
      const panel = panelFor('task')
      expect(primaryAction(panel)?.id).toBe('edit-task')
      expect(secondaryAction(panel)?.id).toBe('cycle-status')
      expect(actionById(panel, 'cycle-priority')).toBeDefined()
    })
  })
})
