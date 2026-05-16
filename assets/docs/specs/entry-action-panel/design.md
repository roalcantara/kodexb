<!-- markdownlint-disable-file -->

# Entry Action Panel — design

Normative technical contract. Requirements: [requirements.md](requirements.md).

## Architecture

| Layer                 | Artifact                           | Role                                    |
| --------------------- | ---------------------------------- | --------------------------------------- |
| `renderer/actions`    | `build_entry_action_panel.util.ts` | Ordered actions + `rank` + `section`    |
| `renderer/actions`    | `execute_entry_action.util.ts`     | Run handler; frecency on success        |
| `renderer/actions`    | `entry_action_shortcuts.util.ts`   | Match Return / mod+Return; focus guards |
| `renderer/hooks/list` | `use_entry_action_keys.hook.ts`    | Wire list-surface keydown               |
| `renderer/hooks/list` | `use_record_detail_visit.hook.ts`  | Visit when detail entry id shown        |
| `renderer/hooks/list` | `use_command_palette.hook.ts`      | Thin wrapper over panel + executor      |
| `renderer`            | `record_entry_visit.util.ts`       | Unchanged fire-and-forget RPC           |
| `shell`               | `recordEntryVisit` RPC             | Unchanged; see list-frecency-sort       |

```text
buildEntryActionPanel(ctx) → EntryAction[]
        ↓
executeEntryAction(entry, actionId, ctx) → Promise<void>
        ↓ (success, recordsFrecency)
recordEntryVisitFireAndForget(entry.id)
```

## Types

```ts
type EntryActionSection = 'entry' | 'clipboard' | 'source' | 'library' | 'app'

type EntryActionRank = 'primary' | 'secondary'

type EntryAction = {
  id: string
  label: string
  section: EntryActionSection
  rank?: EntryActionRank
  recordsFrecency: boolean
  shortcut?: string
  run: (ctx: EntryActionContext) => void | Promise<void>
}

type EntryActionContext = {
  entry: RpcKnowledge | null
  pushToast: (msg: string, type: 'success' | 'error') => void
  onEditTask: (entry: RpcKnowledge) => void
  onNewTask: () => void
  onSync: () => void
}
```

**Resolution helpers** (pure, tested):

- `primaryAction(actions): EntryAction | undefined` — first with `rank === 'primary'`.
- `secondaryAction(actions): EntryAction | undefined` — first with `rank === 'secondary'`.
- `actionById(actions, id): EntryAction | undefined`.

## Action catalog (normative)

When `ctx.entry === null`, panel **shall** be library + app only: `sync`, `new-task`, `quit` (same as today).

When `ctx.entry` is set, **shall** append in order:

### `bookmark`

| id            | label          | section   | rank      | recordsFrecency |
| ------------- | -------------- | --------- | --------- | --------------- |
| `open-url`    | Open URL       | entry     | primary   | true            |
| `copy`        | Copy           | clipboard | secondary | true            |
| `open-editor` | Open in Editor | source    | —         | true            |

Handler notes:

- `open-url`: `openExternal(entry.key)`; toast on error.
- `copy`: `copyTextForEntry` + `clipboardCopiedToastMessage` (same as palette spec).
- `open-editor`: `openInEditor(entry.source)`.

### `command`

| id               | label             | section   | rank      | recordsFrecency |
| ---------------- | ----------------- | --------- | --------- | --------------- |
| `paste-terminal` | Paste in Terminal | entry     | primary   | true            |
| `copy`           | Copy              | clipboard | secondary | true            |
| `open-editor`    | Open in Editor    | source    | —         | true            |

`paste-terminal`: `navigator.clipboard.writeText(entry.key)` then success toast **`Command copied`** (v1 keeps current palette behavior; does not shell out to Terminal).

### `cheat`

| id            | label          | section   | rank      | recordsFrecency |
| ------------- | -------------- | --------- | --------- | --------------- |
| `copy`        | Copy           | clipboard | primary   | true            |
| `open-editor` | Open in Editor | source    | secondary | true            |

No `entry`-section row (matches palette: cheat uses Clipboard first).

### `task`

| id               | label          | section   | rank      | recordsFrecency |
| ---------------- | -------------- | --------- | --------- | --------------- |
| `edit-task`      | Edit Task      | entry     | primary   | true            |
| `cycle-status`   | Cycle Status   | entry     | secondary | true            |
| `cycle-priority` | Cycle Priority | entry     | —         | true            |
| `copy`           | Copy           | clipboard | —         | true            |
| `open-editor`    | Open in Editor | source    | —         | true            |

`edit-task`: `ctx.onEditTask(entry)` (opens task sheet via existing shell wiring).

`cycle-status` / `cycle-priority`: `cycleStatus` / `cyclePriority` with `forward`; error toasts unchanged.

### Library + App (always last)

| id         | label    | section | recordsFrecency |
| ---------- | -------- | ------- | --------------- |
| `sync`     | Sync     | library | false           |
| `new-task` | New Task | library | false           |
| `quit`     | Quit kb  | app     | false           |

`quit` shortcut: `⌘Q` on Apple UA, else `Ctrl+Q` (existing `paletteQuitShortcut` logic).

## Row hints (derived)

| type     | hint string (selected row, compact list)                            |
| -------- | ------------------------------------------------------------------- |
| bookmark | `↵ Open` · secondary not shown on row v1 (optional `⌘↵ Copy` later) |
| command  | `↵ Paste`                                                           |
| cheat    | `↵ Copy`                                                            |
| task     | `↵ Edit`                                                            |

Implementation **shall** use `primaryAction(panel).label` with a fixed prefix `↵ ` for display, or a small `hintForEntry(entry)` built from panel ranks.

## Keyboard contract

### List, Split, and Detail (decision A)

Predicate **`entryActionShortcutsAllowed(e, focusState)`** returns true only when:

1. `viewState` is **`list`**, **`split`**, or **`detail`**.
2. **Current entry** resolved: `detailEntry` when `viewState === 'detail'`; otherwise `rows.find(selectedId)`; in **split**, if detail panel has focus and `detailEntry` is set, use `detailEntry`.
3. `shortcutsBlocked === false` (settings / task sheet).
4. Focus is **not** inside an excluded text control (search, filter overlay search, palette input, task sheet fields, settings fields, `contenteditable`).
5. Key is **Enter** without modifiers (primary) or **Enter** with `metaKey || ctrlKey` (secondary), and not `altKey` / `shiftKey` (unless explicitly added later).

**Window capture:** handle on `window` (same pattern as `use_window_view_nav_keys`) so **Return** works when the **detail panel** has focus, not only the list scrollport.

On match:

```ts
const panel = buildEntryActionPanel(ctx)
const action = mod ? secondaryAction(panel) : primaryAction(panel)
if (action && entry) await executeEntryAction(entry, action.id, ctx)
e.preventDefault()
```

### Unchanged navigation

| Input               | Behavior                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| ArrowRight          | `advance()` — open split/detail (from list)                                                                   |
| ArrowLeft           | `retreat()`                                                                                                   |
| Return / ⌘Return    | primary/secondary on current entry in **list / split / detail** when R3 allows                                |
| ⌘C (window capture) | copy payload; **should** call `executeEntryAction(..., 'copy', ctx)` or shared copy helper that records visit |

### Command palette

Enter on highlighted action: `executeEntryAction(entry, action.id, ctx)` then close palette.

## Executor

```ts
async function executeEntryAction(
  entry: RpcKnowledge,
  actionId: string,
  ctx: EntryActionContext
): Promise<void> {
  const panel = buildEntryActionPanel(ctx)
  const action = actionById(panel, actionId)
  if (!action) return
  await action.run(ctx)
  if (entryActionRecordsVisit(action.id)) recordEntryVisitFireAndForget(entry.id)
}
```

**Copy path consolidation:** `use_view_navigation` copy success **shall** call `executeEntryAction(entry, 'copy', ctx)` instead of bare `recordEntryVisitFireAndForget` to avoid double visits.

**Debounce (optional v1):** renderer may ignore duplicate `recordEntryVisit` for the same `entry.id` within **300 ms** (in-memory); not required for merge.

## Detail visit hook (§6)

**`useRecordDetailVisit(detailEntry: RpcKnowledge | null)`**

- When `detailEntry?.id` changes to a non-null id, call `recordEntryVisitFireAndForget(id)` once per id per “session” OR on every id change (v1: **on every id change** when entering detail/split, matching current `advance` behavior).
- **Shall** remove duplicate visit calls from `advance` / `selectDetailEntry` once this hook owns the signal (single call site).

## File layout

| File                                                                  | Action                                                  |
| --------------------------------------------------------------------- | ------------------------------------------------------- |
| `src/shell/renderer/actions/entry_action_panel.types.ts`              | Create — types + exports                                |
| `src/shell/renderer/actions/build_entry_action_panel.util.ts`         | Create — catalog                                        |
| `src/shell/renderer/actions/build_entry_action_panel.util.spec.ts`    | Create                                                  |
| `src/shell/renderer/actions/execute_entry_action.util.ts`             | Create                                                  |
| `src/shell/renderer/actions/execute_entry_action.util.spec.ts`        | Create                                                  |
| `src/shell/renderer/actions/entry_action_shortcuts.util.ts`           | Create                                                  |
| `src/shell/renderer/actions/entry_action_shortcuts.util.spec.ts`      | Create                                                  |
| `src/shell/renderer/hooks/list/use_entry_action_keys.hook.ts`         | Create                                                  |
| `src/shell/renderer/hooks/list/use_record_detail_visit.hook.ts`       | Create                                                  |
| `src/shell/renderer/hooks/list/use_command_palette.hook.ts`           | Modify — delegate to panel                              |
| `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts`           | Modify — wire hooks                                     |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts`           | Modify — copy → executor; remove duplicate detail visit |
| `src/shell/renderer/components/list/entry_row.component.tsx`          | Modify — hints from panel                               |
| `src/shell/renderer/components/actions/command_palette.component.tsx` | No shape change                                         |

**Forbidden:** renderer imports from `shell/app`; actions use `@rpc/client` and `core` copy helpers only.

## Palette mapping

`CommandPaletteAction` remains UI type; map:

```ts
{ id, label, section, shortcut, handler: () => executeEntryAction(entry!, id, ctx) }
```

Library actions when `entry === null`: `handler` runs `action.run(ctx)` without `executeEntryAction` entry id check.

## Relationship to list-frecency-sort

- Ordering SQL and `entry_frecency` table: **unchanged**.
- Visit **sources** expand per [requirements R6](requirements.md#r6--visit-signals-app-wide-via-executor).
- List row indicator (`frecencyScore`, bars): **unchanged**.

## Manual QA matrix

| type     | Return               | ⌘Return       | ⌘P copy | ArrowRight |
| -------- | -------------------- | ------------- | ------- | ---------- |
| bookmark | opens URL            | copies        | copies  | detail     |
| command  | clipboard+copy toast | copies        | copies  | detail     |
| cheat    | copies doc           | opens editor  | copies  | detail     |
| task     | opens edit sheet     | cycles status | copies  | detail     |

Run in list, split, and detail (click list or detail panel, not search).
