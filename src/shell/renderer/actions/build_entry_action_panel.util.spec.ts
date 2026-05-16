import { describe, expect, mock, test } from 'bun:test'
import type { RpcKnowledge } from '@shared/rpc'
import { factoryFor } from '@testing'
import { buildEntryActionPanel } from './build_entry_action_panel.util'
import type { EntryAction, EntryActionContext } from './entry_action_panel.types'
import type { EntryActionPanelDeps } from './entry_action_panel_deps.util'
import { actionById, primaryAction, secondaryAction } from './entry_action_panel_resolve.util'

const noopDeps: EntryActionPanelDeps = {
  openExternal: mock(() => Promise.resolve()),
  openInEditor: mock(() => Promise.resolve()),
  cycleStatus: mock(() => Promise.resolve()),
  cyclePriority: mock(() => Promise.resolve()),
  quitApp: mock(() => Promise.resolve())
}

const ctxBase: EntryActionContext = {
  entry: null,
  pushToast: () => undefined,
  onEditTask: () => undefined,
  onNewTask: () => undefined,
  onSync: () => undefined
}

function panelFor(type: RpcKnowledge['type']): EntryAction[] {
  const entry = factoryFor(type, { overrides: { id: 1 } }) as RpcKnowledge
  return buildEntryActionPanel({ ...ctxBase, entry }, noopDeps)
}

describe('buildEntryActionPanel()', () => {
  test('null entry returns library and app only', () => {
    const panel = buildEntryActionPanel(ctxBase, noopDeps)
    expect(panel.map(a => a.id)).toEqual(['sync', 'new-task', 'quit'])
  })

  test('bookmark primary and secondary', () => {
    const panel = panelFor('bookmark')
    expect(primaryAction(panel)?.id).toBe('open-url')
    expect(secondaryAction(panel)?.id).toBe('copy')
  })

  test('command primary and secondary', () => {
    const panel = panelFor('command')
    expect(primaryAction(panel)?.id).toBe('paste-terminal')
    expect(secondaryAction(panel)?.id).toBe('copy')
  })

  test('cheat primary and secondary', () => {
    const panel = panelFor('cheat')
    expect(primaryAction(panel)?.id).toBe('copy')
    expect(secondaryAction(panel)?.id).toBe('open-editor')
  })

  test('task primary and secondary', () => {
    const panel = panelFor('task')
    expect(primaryAction(panel)?.id).toBe('edit-task')
    expect(secondaryAction(panel)?.id).toBe('cycle-status')
    expect(actionById(panel, 'cycle-priority')).toBeDefined()
  })

  test('section order ends with library and app', () => {
    const panel = panelFor('bookmark')
    const sections = panel.map(a => a.section)
    expect(sections.indexOf('library')).toBeLessThan(sections.indexOf('app'))
    expect(sections[sections.length - 1]).toBe('app')
  })
})
