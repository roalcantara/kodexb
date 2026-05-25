<!-- markdownlint-disable-file -->
# Phase 10 — Actions System (⌘K) — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ⌘K stub with a working command palette and implement `pasteInTerminal`/`openInEditor` App methods via configurable shell hooks.

**Architecture:** Two independent streams: backend (AppShellHooks wiring + App method implementations + RPC client wrappers) and frontend (CmdKPalette component + useCmdKPalette hook + integration into existing list page shell). Actions are context-sensitive based on focused entry type.

**Primary verification:** `bun test && bun run lint && bun run build` are green. ⌘K opens a working palette in the preview server.

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/specs/actions-system/design.md`
- [ ] Read `assets/docs/specs/actions-system/requirements.md`
- [ ] Read `assets/docs/specs/foundation/requirements.md` — V1-8 section
- [ ] Read `.agents/skills/kb-context/SKILL.md`, `.agents/skills/kb-testing/SKILL.md`

---

## Task 1: AppShellHooks + App methods

**Files:** Modify `src/shell/app/app.ts`

- [ ] **Step 1: Add hook types to `AppShellHooks`**

```ts
export type AppShellHooks = {
  resizeWindow?: (width: number, height: number) => void
  openExternal?: (url: string) => void
  showOpenDialog?: (opts?: OpenDialogOpts) => Promise<string | null>
  pasteInTerminal?: (cmd: string, terminalApp?: string) => void
  openInEditor?: (filePath: string, editorApp?: string) => void
}
```

- [ ] **Step 2: Replace `pasteInTerminal` stub**

```ts
pasteInTerminal(cmd: string): Promise<void> {
  const app = this.loaded.display.terminalApp
  this.shellHooks.pasteInTerminal?.(cmd, app)
  return Promise.resolve()
}
```

- [ ] **Step 3: Replace `openInEditor` stub**

```ts
openInEditor(filePath: string): Promise<void> {
  const app = this.loaded.display.editorApp
  this.shellHooks.openInEditor?.(filePath, app)
  return Promise.resolve()
}
```

- [ ] **Step 4: Verify typecheck + run app spec**

```bash
bun run typecheck
bun test src/shell/app/app.spec.ts
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/shell/app/app.ts
git commit -m "feat(app): implement pasteInTerminal and openInEditor shell hooks"
```

---

## Task 2: Main process wiring

**Files:** Modify `src/shell/main/main.ts`

- [ ] **Step 1: Wire `pasteInTerminal` hook**

```ts
pasteInTerminal: (cmd, terminalApp) => {
  if (terminalApp) Utils.openExternal(terminalApp)
},
```

- [ ] **Step 2: Wire `openInEditor` hook**

```ts
openInEditor: (filePath, editorApp) => {
  if (editorApp) {
    Utils.openExternal(`${editorApp} ${filePath}`)
  } else {
    Utils.openExternal(filePath)
  }
}
```

- [ ] **Step 3: Verify typecheck + build**

```bash
bun run typecheck
bun run build
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/shell/main/main.ts
git commit -m "feat(main): wire pasteInTerminal and openInEditor shell hooks"
```

---

## Task 3: Renderer client wrappers

**Files:** Modify `src/shell/renderer/rpc/client.ts`

- [ ] **Step 1: Add 3 new wrapper functions**

```ts
export function pasteInTerminal(cmd: string): Promise<void> {
  return rpc.api.pasteInTerminal.post({ cmd }).then(unwrap) as Promise<void>
}

export function openInEditor(filePath: string): Promise<void> {
  return rpc.api.openInEditor.post({ filePath }).then(unwrap) as Promise<void>
}

export function suggestTags(entryId: number): Promise<string[]> {
  return rpc.api.suggestTags.post({ entryId }).then(unwrap) as Promise<string[]>
}
```

- [ ] **Step 2: Verify typecheck + run client spec**

```bash
bun run typecheck
bun test src/shell/renderer/rpc/client.spec.tsx
```

Expected: green.

- [ ] **Step 3: Commit**

```bash
git add src/shell/renderer/rpc/client.ts
git commit -m "feat(renderer): add pasteInTerminal openInEditor suggestTags wrappers"
```

---

## Task 4: CmdKPalette component

**Files:** Create `src/shell/renderer/components/actions/cmdk_palette.component.tsx`

- [ ] **Step 1: Create the component**

```tsx
type CmdKAction = {
  id: string
  label: string
  shortcut?: string
  handler: () => void
}

type CmdKPaletteProps = {
  open: boolean
  actions: CmdKAction[]
  onClose: () => void
}

export function CmdKPalette({ open, actions, onClose }: CmdKPaletteProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return actions
    const q = search.toLowerCase()
    return actions.filter(a => a.label.toLowerCase().includes(q))
  }, [actions, search])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  useEffect(() => {
    if (open) {
      setSearch('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const action = filtered[selectedIndex]
      if (action) { action.handler(); onClose() }
      return
    }
  }

  if (!open) return null

  return (
    <div className="kb-modal" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="kb-cmdk" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="kb-cmdk-search"
          type="text"
          placeholder="Type an action..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="kb-cmdk-list">
          {filtered.length === 0 ? (
            <div className="kb-cmdk-empty">No matching actions</div>
          ) : (
            filtered.map((action, i) => (
              <div
                key={action.id}
                className={`kb-cmdk-action${i === selectedIndex ? ' kb-cmdk-action--selected' : ''}`}
                onClick={() => { action.handler(); onClose() }}
              >
                <span>{action.label}</span>
                {action.shortcut ? <span className="kb-cmdk-shortcut">{action.shortcut}</span> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
```

Imports needed: `useState`, `useRef`, `useEffect`, `useMemo` from 'react'.

- [ ] **Step 2: Commit**

```bash
git add src/shell/renderer/components/actions/cmdk_palette.component.tsx
git commit -m "feat(renderer): add CmdKPalette component"
```

---

## Task 5: useCmdKPalette hook

**Files:** Create `src/shell/renderer/hooks/list/use_cmdk_palette.hook.ts`

- [ ] **Step 1: Create the hook with action builder**

```ts
import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import type { RpcKnowledge } from '@shared/rpc'
import { openExternal, pasteInTerminal, openInEditor, cycleStatus, cyclePriority } from '../../rpc/client'
import type { CmdKAction } from '../../components/actions/cmdk_palette.component'

type CmdKPaletteDeps = {
  selectedEntry: RpcKnowledge | null
  onEditTask: (entry: RpcKnowledge) => void
}

function buildActions(
  entry: RpcKnowledge | null,
  onEditTask: (entry: RpcKnowledge) => void
): CmdKAction[] {
  if (!entry) return []

  const actions: CmdKAction[] = []

  // Primary action per type
  switch (entry.type) {
    case 'bookmark':
      actions.push({ id: 'open-url', label: 'Open URL', handler: () => openExternal(entry.key) })
      break
    case 'command':
      actions.push({ id: 'paste-terminal', label: 'Paste in Terminal', handler: () => pasteInTerminal(entry.key) })
      break
    case 'cheat':
      actions.push({ id: 'copy-doc', label: 'Copy to Clipboard', handler: () => navigator.clipboard.writeText(entry.doc ?? '') })
      break
    case 'task':
      actions.push({ id: 'edit-task', label: 'Edit Task', handler: () => onEditTask(entry) })
      break
  }

  // Common actions
  actions.push(
    { id: 'copy-title', label: 'Copy Title', handler: () => navigator.clipboard.writeText(entry.key) },
    { id: 'copy-desc', label: 'Copy Description', handler: () => navigator.clipboard.writeText(entry.desc ?? '') },
    { id: 'copy-tags', label: 'Copy Tags', handler: () => navigator.clipboard.writeText(entry.tags.join(', ')) },
    { id: 'open-editor', label: 'Open in Editor', handler: () => openInEditor(entry.source) },
  )

  // Task-specific
  if (entry.type === 'task') {
    actions.push(
      { id: 'cycle-status', label: 'Cycle Status', handler: () => cycleStatus(entry.id, 'forward') },
      { id: 'cycle-priority', label: 'Cycle Priority', handler: () => cyclePriority(entry.id, 'forward') },
    )
  }

  return actions
}

export function useCmdKPalette({ selectedEntry, onEditTask }: CmdKPaletteDeps) {
  const [open, setOpen] = useState(false)
  const depsRef = useRef({ selectedEntry, onEditTask })
  depsRef.current = { selectedEntry, onEditTask }

  const actions = useMemo(
    () => buildActions(selectedEntry, onEditTask),
    [selectedEntry, onEditTask]
  )

  const openPalette = useCallback(() => setOpen(true), [])
  const closePalette = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        openPalette()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPalette])

  return { open, actions, openPalette, closePalette }
}
```

Note: Export `CmdKAction` type from `cmdk_palette.component.tsx` so the hook can import it. Or define `CmdKAction` in a shared types file and re-export.

- [ ] **Step 2: Commit**

```bash
git add src/shell/renderer/hooks/list/use_cmdk_palette.hook.ts
git commit -m "feat(renderer): add useCmdKPalette hook with action builder"
```

---

## Task 6: Integration — shell hook, list_main, toolbar

**Files:** Modify `use_list_page_shell.hook.ts`, `list_main.component.tsx`, `toolbar.component.tsx`

- [ ] **Step 1: Integrate into `use_list_page_shell.hook.ts`**

Remove `useListPageCmdKeyStub` import and call. Add:
```ts
import { useCmdKPalette } from './use_cmdk_palette.hook'

const palette = useCmdKPalette({
  selectedEntry: selection.detailEntry,
  onEditTask: (entry) => {
    selection.setDetailEntry(entry)
    // The TaskSheet will be handled by the existing selection hook
  }
})
```

Add `palette` to the returned shell object:
```ts
return { /* ...existing... */, palette }
```

Update the `ListPageShell` type to include `palette`.

- [ ] **Step 2: Wire into `list_main.component.tsx`**

Import `CmdKPalette`:
```tsx
import { CmdKPalette } from '../actions/cmdk_palette.component'
```

Render when open:
```tsx
{p.palette.open && (
  <CmdKPalette open={p.palette.open} actions={p.palette.actions} onClose={p.palette.closePalette} />
)}
```

- [ ] **Step 3: Make ⌘K button clickable in `toolbar.component.tsx`**

Add `onCmdK?: () => void` to `ToolbarProps`.
Change the static `<span>` to a `<button>`:
```tsx
<button type="button" className="kb-toolbar-hint" onClick={onCmdK} title="Action palette (⌘K)">
  ⌘K
</button>
```

Pass `onCmdK={p.palette.openPalette}` from `list_main`.

- [ ] **Step 4: Add CSS to `styles/list.css`**

```css
.kb-cmdk { background: var(--kb-surface); border-radius: 6px; width: 480px; max-height: 400px; overflow: hidden; display: flex; flex-direction: column; }
.kb-cmdk-search { padding: 12px 16px; border-bottom: 1px solid var(--kb-border); font-size: 1rem; background: transparent; color: var(--kb-text); border: none; outline: none; width: 100%; }
.kb-cmdk-list { overflow-y: auto; padding: 4px 0; }
.kb-cmdk-action { padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; color: var(--kb-text); }
.kb-cmdk-action--selected { background: color-mix(in srgb, var(--kb-accent) 20%, transparent); }
.kb-cmdk-shortcut { font-size: 0.75rem; color: var(--kb-muted); }
.kb-cmdk-empty { padding: 16px; color: var(--kb-muted); text-align: center; }
```

- [ ] **Step 5: Verify typecheck**

```bash
bun run typecheck
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add src/shell/renderer/hooks/list/use_list_page_shell.hook.ts src/shell/renderer/components/list/list_main.component.tsx src/shell/renderer/components/list/toolbar.component.tsx src/shell/renderer/styles/list.css
git commit -m "feat(renderer): integrate CmdKPalette into list page"
```

---

## Task 7: CmdKPalette spec

**Files:** Create `src/shell/renderer/components/actions/cmdk_palette.component.spec.tsx`

- [ ] **Step 1: Create spec with 6 test cases**

```tsx

import { expect, mock, test } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CmdKPalette, type CmdKAction } from './cmdk_palette.component'

function makeAction(id: string, label: string): CmdKAction {
  return { id, label, handler: mock(() => {}) }
}

test('renders nothing when closed', () => {
  render(<CmdKPalette open={false} actions={[]} onClose={() => {}} />)
  expect(screen.queryByPlaceholderText('Type an action...')).toBeNull()
})

test('renders actions when open', () => {
  const actions = [makeAction('a', 'Action A'), makeAction('b', 'Action B')]
  render(<CmdKPalette open={true} actions={actions} onClose={() => {}} />)
  expect(screen.getByText('Action A')).toBeTruthy()
  expect(screen.getByText('Action B')).toBeTruthy()
})

test('filters actions by search text', async () => {
  const actions = [makeAction('open', 'Open URL'), makeAction('copy', 'Copy Title')]
  render(<CmdKPalette open={true} actions={actions} onClose={() => {}} />)
  const input = screen.getByPlaceholderText('Type an action...')
  await userEvent.type(input, 'copy')
  expect(screen.queryByText('Open URL')).toBeNull()
  expect(screen.getByText('Copy Title')).toBeTruthy()
})

test('shows empty state when no actions match', async () => {
  render(<CmdKPalette open={true} actions={[makeAction('a', 'Action')]} onClose={() => {}} />)
  const input = screen.getByPlaceholderText('Type an action...')
  await userEvent.type(input, 'zzz')
  expect(screen.getByText('No matching actions')).toBeTruthy()
})

test('calls handler and closes on Enter', () => {
  const handler = mock(() => {})
  const onClose = mock(() => {})
  const actions = [{ id: 'test', label: 'Test', handler }]
  render(<CmdKPalette open={true} actions={actions} onClose={onClose} />)
  fireEvent.keyDown(screen.getByPlaceholderText('Type an action...'), { key: 'Enter' })
  expect(handler).toHaveBeenCalledTimes(1)
  expect(onClose).toHaveBeenCalledTimes(1)
})

test('closes on Escape', () => {
  const onClose = mock(() => {})
  render(<CmdKPalette open={true} actions={[]} onClose={onClose} />)
  fireEvent.keyDown(screen.getByPlaceholderText('Type an action...'), { key: 'Escape' })
  expect(onClose).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the spec**

```bash
bun test src/shell/renderer/components/actions/cmdk_palette.component.spec.tsx
```

Expected: 6 pass, 0 fail.

- [ ] **Step 3: Commit**

```bash
git add src/shell/renderer/components/actions/cmdk_palette.component.spec.tsx
git commit -m "test(renderer): add CmdKPalette spec"
```

---

## Task 8: App + client specs update

**Files:** Modify `src/shell/app/app.spec.ts`, `src/shell/renderer/rpc/client.spec.tsx`

- [ ] **Step 1: Add App test for `pasteInTerminal`**

```ts
test('pasteInTerminal calls shell hook with terminal app from config', async () => {
  const calls: Array<{ cmd: string; app?: string }> = []
  const cfg = factoryFor('loadedConfig', { overrides: { display: { terminalApp: 'Terminal.app', pageSize: '50' } } })
  const app = new App(cfg, {}, false, {
    pasteInTerminal: (cmd, termApp) => calls.push({ cmd, app: termApp })
  })
  await app.pasteInTerminal('git log')
  expect(calls).toEqual([{ cmd: 'git log', app: 'Terminal.app' }])
})
```

- [ ] **Step 2: Add App test for `openInEditor`**

```ts
test('openInEditor calls shell hook with editor app from config', async () => {
  const calls: Array<{ filePath: string; app?: string }> = []
  const cfg = factoryFor('loadedConfig', { overrides: { display: { editorApp: 'code', pageSize: '50' } } })
  const app = new App(cfg, {}, false, {
    openInEditor: (filePath, editorApp) => calls.push({ filePath, app: editorApp })
  })
  await app.openInEditor('/tmp/test.yaml')
  expect(calls).toEqual([{ filePath: '/tmp/test.yaml', app: 'code' }])
})
```

- [ ] **Step 3: Add client test for `pasteInTerminal`**

```ts
it('forwards cmd to /api/pasteInTerminal', async () => {
  rpcCallMock.mockImplementation(() => okResponse(undefined))
  await pasteInTerminal('git log')
  const call = rpcCallMock.mock.calls[0]?.[0] as { path: string; body: string }
  expect(call.path).toBe('/api/pasteInTerminal')
  expect(JSON.parse(call.body)).toEqual({ cmd: 'git log' })
})
```

- [ ] **Step 4: Run specs**

```bash
bun test src/shell/app/app.spec.ts src/shell/renderer/rpc/client.spec.tsx
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/shell/app/app.spec.ts src/shell/renderer/rpc/client.spec.tsx
git commit -m "test: add pasteInTerminal and openInEditor specs"
```

---

## Task 9: Full test suite + quality gate

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: all green.

- [ ] **Step 2: Run lint**

```bash
bun run lint
```

Expected: zero errors.

- [ ] **Step 3: Run build**

```bash
bun run build
```

Expected: success.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: Phase 10 verification — all tests green, lint clean"
```

---

## Task 10: Mark Phase 10 complete in roadmap

**Files:** Modify `assets/docs/specs/foundation/roadmap.md`

- [ ] **Step 1: Update Phase 10 status**

```diff
- |  10   | Actions System (⌘K)            | V1-8         | ⬜ pending |
+ |  10   | Actions System (⌘K)            | V1-8         | ✔ done    |
```

- [ ] **Step 2: Commit**

```bash
git add assets/docs/specs/foundation/roadmap.md
git commit -m "docs(roadmap): Mark Phase 10 Actions System as done"
```
