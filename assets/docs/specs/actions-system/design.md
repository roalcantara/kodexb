<!-- markdownlint-disable-file -->
# Phase 10 — Actions System (⌘K) — Design

## OVERVIEW

Phase 10 replaces the ⌘K stub with a working command palette and implements
the `pasteInTerminal` / `openInEditor` App methods using configurable shell hooks.
The palette is a centered overlay with a search input and a filtered, keyboard-
navigable action list. Actions are context-sensitive based on the focused entry
type.

AI tag suggestions (`suggestTags`) remain a stub — deferred to a future phase.

---

## SCOPE DECISIONS

| Decision | Choice | Rationale |
|---|---|---|
| Palette UX | Command palette (centered search + filterable list) | Familiar pattern from VS Code, Spotlight, Raycast |
| AI tags | Deferred | Needs API integration; palette UI is independent |
| Terminal/editor integration | Shell hooks via config | Users already configure terminalApp/editorApp in Settings |
| Action registry | Static (in hook) | Only ~8 actions; YAGNI — extract if count exceeds 15 |
| RPC schemas | No changes | `pasteInTerminalSchema`, `openInEditorSchema`, `suggestTagsSchema` already defined |

---

## ARCHITECTURE

### Data flow: Terminal/Editor actions

```
Renderer (⌘K palette selects action)
  → rpc.pasteInTerminal(cmd) / rpc.openInEditor(filePath)
  → Elysia route (TypeBox validates existing schemas)
  → App.pasteInTerminal / App.openInEditor
  → AppShellHooks (main.ts calls Electrobun Utils)
  → System terminal/editor opens
```

### Data flow: Palette lifecycle

```
List page focused
  → User presses ⌘K
  → useCmdKPalette hook: open=true
  → CmdKPalette renders (centered overlay)
  → User types → actions filtered
  → User navigates (Arrow keys) → selection moves
  → User presses Enter → handler executes (RPC/clipboard/task sheet)
  → Palette closes
```

---

## FILES AND RESPONSIBILITIES

### Backend — AppShellHooks + App methods

**`src/shell/app/app.ts`**

`AppShellHooks` gains two new optional hooks:
```ts
pasteInTerminal?: (cmd: string, terminalApp?: string) => void
openInEditor?: (filePath: string, editorApp?: string) => void
```

`pasteInTerminal(cmd)` and `openInEditor(filePath)` stubs replaced:
```ts
pasteInTerminal(cmd: string): Promise<void> {
  const app = this.loaded.display.terminalApp
  this.shellHooks.pasteInTerminal?.(cmd, app)
  return Promise.resolve()
}

openInEditor(filePath: string): Promise<void> {
  const app = this.loaded.display.editorApp
  this.shellHooks.openInEditor?.(filePath, app)
  return Promise.resolve()
}
```

`suggestTags` remains a stub (deferred).

**`src/shell/main/main.ts`**

Wire the new hooks:
```ts
const shellHooks: AppShellHooks = {
  // ... existing ...
  pasteInTerminal: (cmd, terminalApp) => {
    if (terminalApp) Utils.openExternal(terminalApp)
  },
  openInEditor: (filePath, editorApp) => {
    if (editorApp) {
      Utils.openExternal(`${editorApp} ${filePath}`)
    } else {
      Utils.openExternal(filePath)
    }
  }
}
```

### Backend — RPC client

**`src/shell/renderer/rpc/client.ts`**

Three new wrapper functions:
```ts
export function pasteInTerminal(cmd: string): Promise<void>
export function openInEditor(filePath: string): Promise<void>
export function suggestTags(entryId: number): Promise<string[]>
```

### Frontend — CmdKPalette component

**`src/shell/renderer/components/actions/cmdk_palette.component.tsx`** (new)

Centered modal overlay with backdrop, search input, and action list.
Props: `{ open: boolean, actions: CmdKAction[], onClose: () => void }`
Keyboard handling: Arrow navigation, Enter to execute, Escape to close.

Action type:
```ts
type CmdKAction = {
  id: string
  label: string
  shortcut?: string
  handler: () => void
}
```

### Frontend — useCmdKPalette hook

**`src/shell/renderer/hooks/list/use_cmdk_palette.hook.ts`** (new)

Replaces `useListPageCmdKeyStub`. Manages palette open/close, search text,
selected index, and builds the action list based on the selected entry type.

Deps: `{ selectedEntry, onEditTask }`

Returns: `{ open, search, selectedIndex, filteredActions, openPalette, closePalette, setSearch, setSelectedIndex }`

The `buildActions(entry, onEditTask)` function returns the static action list:
- Primary action per type (Open URL / Paste in Terminal / Copy / Edit Task)
- Copy Title, Copy Description, Copy Tags (all types)
- Open in Editor (all types)
- Cycle Status, Cycle Priority (task only)

### Frontend — existing file changes

**`src/shell/renderer/hooks/list/use_list_page_shell.hook.ts`**: Compose `useCmdKPalette`,
add `palette: { open, actions, openPalette, closePalette }` to returned shell object.
Remove `useListPageCmdKeyStub` call.

**`src/shell/renderer/components/list/list_main.component.tsx`**: Render `<CmdKPalette />`
when `p.palette.open` is true. Pass `onCmdK={p.palette.openPalette}` to Toolbar.

**`src/shell/renderer/components/list/toolbar.component.tsx`**: Make `⌘K` span
a clickable `<button>` with `onCmdK` prop.

### CSS

**`src/shell/renderer/styles/list.css`**: Add `.kb-cmdk`, `.kb-cmdk-search`,
`.kb-cmdk-list`, `.kb-cmdk-action`, `.kb-cmdk-action--selected`, `.kb-cmdk-shortcut`,
`.kb-cmdk-empty` styles. The palette reuses the existing `kb-modal` backdrop class.

---

## TESTING STRATEGY

| Layer | Approach | File |
|---|---|---|
| App methods | Test `pasteInTerminal`/`openInEditor` call shell hooks with config values | `app.spec.ts` (update) |
| RPC client | Mock bridge, assert route + body for new wrappers | `client.spec.tsx` (update) |
| CmdKPalette | Render with actions, simulate typing/arrows/enter, assert handler + close | `cmdk_palette.component.spec.tsx` (new) |
| useCmdKPalette | Hook unit — open/close/filter/select logic | `use_cmdk_palette.hook.spec.tsx` (new) |
| Toolbar | Click ⌘K button, assert callback | `toolbar.component.spec.tsx` (update) |
| Shell integration | Main process hook wiring tested via `server.spec.ts` (routes call App methods) | `server.spec.ts` (update) |
