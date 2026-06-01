import { copyTextForEntry } from '@core'
import type { EntryActionId } from '@core/helpers/entry_action/entry_action_ids.const'
import type { RpcKnowledge } from '@shared/rpc'
import type { EntryAction, EntryActionContext } from './entry_action_panel.types'
import type { EntryActionPanelDeps } from './entry_action_panel_deps.util'
import { actionRankForEntry } from './entry_action_panel_resolve.util'

function action(
  entry: RpcKnowledge,
  id: EntryActionId,
  label: string,
  section: EntryAction['section'],
  run: EntryAction['run'],
  shortcut?: string
): EntryAction {
  return {
    id,
    label,
    section,
    rank: actionRankForEntry(entry, id),
    shortcut,
    run
  }
}

function libraryActions(ctx: EntryActionContext): EntryAction[] {
  return [
    {
      id: 'sync',
      label: 'Sync',
      section: 'library',
      run: () => ctx.onSync()
    },
    {
      id: 'new-task',
      label: 'New Task',
      section: 'library',
      run: () => ctx.onNewTask()
    },
    {
      id: 'settings',
      label: 'Settings',
      section: 'library',
      run: () => ctx.onOpenSettings()
    }
  ]
}

function quitShortcut(): string {
  return '⌘Q'
}

function quitAction(ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction {
  return {
    id: 'quit',
    label: 'Quit kb',
    section: 'app',
    shortcut: quitShortcut(),
    run: () => {
      deps.quitApp().catch(() => ctx.pushToast('Failed to quit', 'error'))
    }
  }
}

function copyDescAction(entry: RpcKnowledge, ctx: EntryActionContext): EntryAction {
  return action(entry, 'copy-desc', 'Copy Description', 'clipboard', () =>
    navigator.clipboard.writeText(entry.desc).then(
      () => {
        ctx.pushToast('Description copied', 'success')
      },
      () => {
        ctx.pushToast('Copy description failed', 'error')
        throw new Error('copy desc failed')
      }
    )
  )
}

function copyAction(entry: RpcKnowledge, ctx: EntryActionContext): EntryAction {
  return action(entry, 'copy', 'Copy', 'clipboard', () =>
    navigator.clipboard.writeText(copyTextForEntry(entry)).then(
      () => {
        ctx.pushToast('Title copied', 'success')
      },
      () => {
        ctx.pushToast('Copy failed', 'error')
        throw new Error('copy failed')
      }
    )
  )
}

function openEditorAction(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction {
  return action(entry, 'open-editor', 'Open in Editor', 'source', () =>
    deps.openInEditor(entry.source).then(
      () => {
        ctx.pushToast('Opened in editor', 'success')
      },
      () => {
        ctx.pushToast('Failed to open editor', 'error')
        throw new Error('editor failed')
      }
    )
  )
}

function pasteDocAction(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction {
  return action(entry, 'paste-doc', 'Paste Doc', 'entry', () =>
    deps.pasteDoc(entry.desc).then(
      () => {
        ctx.pushToast('Doc pasted', 'success')
      },
      () => {
        ctx.pushToast('Failed to paste doc', 'error')
        throw new Error('paste doc failed')
      }
    )
  )
}

function runTerminalAction(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction {
  return action(entry, 'run-terminal', 'Run in Terminal', 'entry', () =>
    deps.runInTerminal(entry.key).then(
      () => {
        ctx.pushToast('Running in terminal', 'success')
      },
      () => {
        ctx.pushToast('Failed to run in terminal', 'error')
        throw new Error('run terminal failed')
      }
    )
  )
}

function bookmarkTypeActions(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  return [
    action(entry, 'open-url', 'Open In Browser', 'entry', () => {
      const targetUrl = (entry.links?.[0] ?? entry.key) as string
      return deps.openExternal(targetUrl).then(
        () => {
          ctx.pushToast('Opened in browser', 'success')
        },
        () => {
          ctx.pushToast('Failed to open', 'error')
          throw new Error('open failed')
        }
      )
    }),
    copyAction(entry, ctx),
    copyDescAction(entry, ctx),
    openEditorAction(entry, ctx, deps)
  ]
}

function commandTypeActions(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  return [
    action(entry, 'paste-terminal', 'Paste in Terminal', 'entry', () =>
      deps.pasteInTerminal(entry.key).then(
        () => {
          ctx.pushToast('Command pasted', 'success')
        },
        () => {
          ctx.pushToast('Failed to paste command', 'error')
          throw new Error('paste failed')
        }
      )
    ),
    runTerminalAction(entry, ctx, deps),
    copyAction(entry, ctx),
    copyDescAction(entry, ctx),
    openEditorAction(entry, ctx, deps)
  ]
}

function cheatTypeActions(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  return [
    pasteDocAction(entry, ctx, deps),
    copyAction(entry, ctx),
    copyDescAction(entry, ctx),
    openEditorAction(entry, ctx, deps)
  ]
}

function taskTypeActions(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  return [
    action(entry, 'edit-task', 'Edit Task', 'entry', () => ctx.onEditTask(entry)),
    action(entry, 'cycle-status', 'Cycle Status', 'entry', () =>
      deps
        .cycleStatus(entry.id, 'forward')
        .then(() => undefined)
        .catch(() => {
          ctx.pushToast('Status cycle failed', 'error')
          throw new Error('cycle status failed')
        })
    ),
    action(entry, 'cycle-priority', 'Cycle Priority', 'entry', () =>
      deps
        .cyclePriority(entry.id, 'forward')
        .then(() => undefined)
        .catch(() => {
          ctx.pushToast('Priority cycle failed', 'error')
          throw new Error('cycle priority failed')
        })
    ),
    copyAction(entry, ctx),
    copyDescAction(entry, ctx),
    openEditorAction(entry, ctx, deps)
  ]
}

function entryTypeActions(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  switch (entry.type) {
    case 'bookmark':
      return bookmarkTypeActions(entry, ctx, deps)
    case 'command':
      return commandTypeActions(entry, ctx, deps)
    case 'cheat':
      return cheatTypeActions(entry, ctx, deps)
    case 'task':
      return taskTypeActions(entry, ctx, deps)
    case 'shortcut':
      return [copyAction(entry, ctx), copyDescAction(entry, ctx), openEditorAction(entry, ctx, deps)]
  }
}

export function buildEntryActionPanel(ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  const lib = libraryActions(ctx)
  const quit = quitAction(ctx, deps)
  if (!ctx.entry) return [...lib, quit]
  return [...entryTypeActions(ctx.entry, ctx, deps), ...lib, quit]
}
