<!-- markdownlint-disable-file -->
# Phase 10 — Actions System (⌘K) — Requirements

## INTRODUCTION

Phase 10 delivers a keyboard-driven ⌘K action palette that offers context-sensitive
actions for the focused entry. It also implements the `pasteInTerminal` and
`openInEditor` App methods (currently stubs) using configurable shell hooks.

This phase implements [V1-8](https://github.com/roalcantara/kodexb/blob/main/assets/docs/archive/foundation/requirements.md#requirement-v1-8-actions-k-palette)
from the foundation requirements.

---

## REQUIREMENT SYNTAX (EARS)

### REQ-ACT-1: ⌘K palette opens and closes

**User story:** As a user, I want to press ⌘K to open a command palette.

1. WHEN the user presses `⌘K` (macOS) or `Ctrl+K` (Linux) with the list page
   focused, THEN the action palette SHALL open, scoped to the currently
   selected entry.

2. WHEN the palette opens, THEN the search input SHALL be focused and the
   first action SHALL be selected.

3. WHEN the user presses Escape or clicks the backdrop, THEN the palette
   SHALL close without executing any action.

4. The palette SHALL open in under 80 ms from keypress.

---

### REQ-ACT-2: Action list — type-specific primary action

**User story:** As a user, I want the palette to show the most relevant action
for the focused entry type.

1. WHEN the focused entry is a **Bookmark**, THEN the primary action SHALL
   be "Open URL" (calls `rpc.openExternal` with the entry URL).

2. WHEN the focused entry is a **Command**, THEN the primary action SHALL
   be "Paste in Terminal" (calls `rpc.pasteInTerminal`).

3. WHEN the focused entry is a **Cheat**, THEN the primary action SHALL
   be "Copy to Clipboard" (copies `entry.doc` via `navigator.clipboard.writeText`).

4. WHEN the focused entry is a **Task**, THEN the primary action SHALL
   be "Edit Task" (opens the existing TaskSheet modal in edit mode).

5. WHEN no entry is focused (nothing selected in the list), THEN the palette
   SHALL show only universal actions (Open in Editor, Copy Title — both no-op
   with no target).

---

### REQ-ACT-3: Copy submenu

**User story:** As a user, I want to copy entry fields from the palette.

1. THE palette SHALL include "Copy Title", "Copy Description", "Copy Tags"
   actions for the focused entry.

2. WHEN the user selects a Copy action, THEN the respective field SHALL be
   copied to the system clipboard via `navigator.clipboard.writeText`.

---

### REQ-ACT-4: Universal actions

**User story:** As a user, I want editor access and task management from the palette.

1. "Open in Editor" SHALL call `rpc.openInEditor(entry.source)` and be
   available for all entry types.

2. FOR task entries, "Cycle Status" and "Cycle Priority" SHALL be available
   (same behavior as V1-7 §5–6).

---

### REQ-ACT-5: Filter by typing

**User story:** As a user, I want to filter the action list by typing.

1. WHEN the user types in the palette's search input, THEN the action list
   SHALL filter to show only actions whose labels contain the typed text
   (case-insensitive).

2. WHEN no actions match the filter, THEN "No matching actions" SHALL
   be displayed.

3. Filtering SHALL reset the selection to the first matching action.

---

### REQ-ACT-6: Keyboard navigation

**User story:** As a user, I want to navigate the palette with the keyboard.

1. `ArrowDown` / `ArrowUp` SHALL move the selection down/up, wrapping at
   both ends.

2. `Enter` SHALL execute the selected action and close the palette.

3. `Escape` SHALL close the palette without executing.

---

### REQ-ACT-7: Terminal and editor integration

**User story:** As a user, I want "Paste in Terminal" and "Open in Editor"
to use my configured apps.

1. `App.pasteInTerminal(cmd)` SHALL copy the command to the clipboard and
   open the user's configured terminal app (from Settings → Apps).

2. `App.openInEditor(filePath)` SHALL open the file path in the user's
   configured editor app. If no editor is configured, it SHALL open using
   the OS default file handler.

3. Both methods SHALL use `AppShellHooks` wired through `main.ts` for
   desktop operation and SHALL be no-ops in the preview server.

---

### REQ-ACT-8: Renderer RPC wrappers

**User story:** As a developer, I want typed wrapper functions for the new RPC methods.

1. `pasteInTerminal(cmd)`, `openInEditor(filePath)`, and `suggestTags(entryId)`
   SHALL be exported from `src/shell/renderer/rpc/client.ts`.

---

## OUT OF SCOPE

- AI-powered tag suggestions (`rpc.suggestTags`) — deferred to a future phase
- Deep linking from palette (e.g., URL schemes)
- Palette action customization/configuration
- Analytics on palette usage
