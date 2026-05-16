import type { RpcKnowledge } from '@shared/rpc'
import type { EntryActionId } from '../../../core/helpers/entry_action/entry_action_ids.const'
import { copyTextForEntry } from '../../../core/index.ts'
import { clipboardCopiedToastMessage } from '../utils/list/clipboard_copy_toast.util'
import type { EntryAction, EntryActionContext } from './entry_action_panel.types'
import type { EntryActionPanelDeps } from './entry_action_panel_deps.util'
import { actionRankForEntry } from './entry_action_panel_resolve.util'

const APPLE_UA_PATTERN = /Mac|iPhone|iPod|iPad/i

function paletteQuitShortcut(): string {
  if (typeof navigator === 'undefined') return '⌘Q'
  return APPLE_UA_PATTERN.test(navigator.userAgent) ? '⌘Q' : 'Ctrl+Q'
}

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
    }
  ]
}

function quitAction(ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction {
  return {
    id: 'quit',
    label: 'Quit kb',
    section: 'app',
    shortcut: paletteQuitShortcut(),
    run: () => {
      deps.quitApp().catch(() => ctx.pushToast('Failed to quit', 'error'))
    }
  }
}

function copyAction(entry: RpcKnowledge, ctx: EntryActionContext): EntryAction {
  return action(entry, 'copy', 'Copy', 'clipboard', () => {
    const text = copyTextForEntry(entry)
    const msg = clipboardCopiedToastMessage(text)
    return navigator.clipboard.writeText(text).then(
      () => {
        ctx.pushToast(msg, 'success')
      },
      () => {
        ctx.pushToast('Copy failed', 'error')
        throw new Error('copy failed')
      }
    )
  })
}

function openEditorAction(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction {
  return action(entry, 'open-editor', 'Open in Editor', 'source', () => {
    deps.openInEditor(entry.source).catch(() => {
      ctx.pushToast('Failed to open editor', 'error')
      throw new Error('editor failed')
    })
  })
}

function entryTypeActions(entry: RpcKnowledge, ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  switch (entry.type) {
    case 'bookmark':
      return [
        action(entry, 'open-url', 'Open URL', 'entry', () => {
          deps.openExternal(entry.key).catch(() => {
            ctx.pushToast('Failed to open URL', 'error')
            throw new Error('open failed')
          })
        }),
        copyAction(entry, ctx),
        openEditorAction(entry, ctx, deps)
      ]
    case 'command':
      return [
        action(entry, 'paste-terminal', 'Paste in Terminal', 'entry', () =>
          navigator.clipboard.writeText(entry.key).then(
            () => {
              ctx.pushToast('Command copied', 'success')
            },
            () => {
              ctx.pushToast('Command copy failed', 'error')
              throw new Error('paste failed')
            }
          )
        ),
        copyAction(entry, ctx),
        openEditorAction(entry, ctx, deps)
      ]
    case 'cheat':
      return [copyAction(entry, ctx), openEditorAction(entry, ctx, deps)]
    case 'task':
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
        openEditorAction(entry, ctx, deps)
      ]
  }
}

export function buildEntryActionPanel(ctx: EntryActionContext, deps: EntryActionPanelDeps): EntryAction[] {
  const lib = libraryActions(ctx)
  const quit = quitAction(ctx, deps)
  if (!ctx.entry) return [...lib, quit]
  return [...entryTypeActions(ctx.entry, ctx, deps), ...lib, quit]
}
