<!-- markdownlint-disable-file -->
# Phase 9 — Task Management — Design

## OVERVIEW

Phase 9 implements the full task mutation write path: create, edit, delete,
status/priority cycling, reorder, and dependency management. Mutations persist
to both SQLite and YAML sources. New tasks are written to a configurable
write-target file.

The read path (list badges, detail view, dependency graph, metadata sidebar)
already exists — this phase adds the write-path and promotes `due_date`,
`task_order`, and `depends_on` from opaque `meta` JSON to first-class typed
fields on `TaskKnowledge`.

---

## SCOPE DECISIONS

| Decision                               | Choice                                                          | Rationale                                                            |
| -------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- |
| New task destination                   | Configurable write-target (default: `sources/tasks.yml`)        | Predictable, single-file; no tag→file mapping complexity             |
| Task sheet UI                          | Centered modal overlay                                          | Single component for create+edit; matches existing backdrop pattern  |
| Reorder                                | Keyboard (Cmd+↑/↓) + HTML5 drag-and-drop                        | Full V1-7 spec coverage; no library needed for drag-and-drop         |
| Dependency storage                     | First-class `dependsOn: number[]` field, `depends_on` DB column | Queryable, fixable; enables `wouldCreateCycle` BFS                   |
| Task fields (`due_date`, `task_order`) | Promoted to first-class on `TaskKnowledge`                      | Consistent with `priority`/`status`; removes `meta` JSON indirection |
| YAML write-back on failure             | Log error, keep DB change                                       | DB is the working index; YAML can be rebuilt                         |

---

## ARCHITECTURE

### Data flow: Create/Edit/Delete

```
Renderer (TaskSheet modal / ConfirmDialog)
  → rpc.createTask(input) / rpc.updateTask(id, patch) / rpc.deleteTask(id)
  → Elysia route (TypeBox validates)
  → App.createTask / updateTask / deleteTask
  → task.repository → entry.repository (SQLite upsert/delete)
  → YAML write-back (read → mutate → write)
  → Response → renderer refreshes list
```

### Data flow: Status/Priority cycling

```
Renderer (click badge or press S/P)
  → rpc.cycleStatus(id, dir) / rpc.cyclePriority(id, dir)
  → App.cycleStatus / cyclePriority
  → entry.repository (read current → compute next → upsert)
  → YAML write-back
  → Response with updated Knowledge → row re-renders in-place
```

### Data flow: Reorder

```
Renderer (Cmd+↑/↓ or drag-and-drop)
  → rpc.reorderTask(id, dir)
  → App.reorderTask
  → task.repository.updateTaskOrder (swap task_order with neighbor)
  → YAML write-back (both affected entries)
  → Response with [updated, updated] → renderer re-sorts
```

---

## FILES AND RESPONSIBILITIES

### Core — type changes

**`src/core/domain/models/entries/schemas/entry.schema.ts`**
Add `dueDate`, `taskOrder`, `dependsOn` to `taskEntrySchema`:

```ts
export const taskEntrySchema = Type.Composite([
  row,
  Type.Object({
    type: Type.Literal('task'),
    priority: Type.Optional(Type.Union(TASK_PRIORITY_VALUES.map(v => Type.Literal(v)))),
    status: Type.Union(TASK_STATUS_VALUES.map(v => Type.Literal(v))),
    dueDate: Type.Optional(Type.Number()),
    taskOrder: Type.Optional(Type.Integer()),
    dependsOn: Type.Optional(Type.Array(Type.Integer()))
  })
])
```

**`src/core/domain/models/knowledges/schemas/knowledge.schema.ts`**
Same three fields added to `taskKnowledgeSchema`.

**`src/core/domain/models/entries/parsers/base_fields.parser.ts`**
Extract `dueDate` (ISO string → epoch ms), `taskOrder` (integer), `dependsOn` (string array of keys → resolve to IDs) from YAML source row. Fall back to existing `meta` extraction if the field is in `meta` but not as a first-class key.

**`src/core/domain/models/knowledges/factories/knowledge.factory.ts`**
`toKnowledge()` already spreads `...entry` — if the entry has `dueDate`, `taskOrder`, `dependsOn`, they pass through via schema parse. No code change needed.

### Core — Fishery factories

**`src/__tests__/factories/factories.builder.ts`**
`taskFactory` gains `dueDate`, `taskOrder`, `dependsOn` defaults:

```ts
const taskFactory = Factory.define<TaskKnowledge>(({ sequence }) => ({
  // ... existing fields ...
  dueDate: undefined,
  taskOrder: sequence,
  dependsOn: undefined
}))
```

### DB layer — row mapping fixes

**`src/shell/app/db/entry.repository.ts`**

`rowToKnowledge` — add three fields to the task branch:
- `dueDate: row.due_date ?? undefined`
- `taskOrder: row.task_order ?? undefined`
- `dependsOn: parseJson<number[]>(row.depends_on, [])`

`rowToParams` — replace three hardcoded values:
- `null` (due_date) → `'dueDate' in row ? (row.dueDate ?? null) : null`
- `null` (task_order) → `'taskOrder' in row ? (row.taskOrder ?? null) : null`
- `JSON.stringify([])` (depends_on) → `'dependsOn' in row ? JSON.stringify(row.dependsOn ?? []) : JSON.stringify([])`

New exported function `deleteById(db, id): boolean` — deletes a row by id, returns whether a row was affected.

### DB layer — new task repository

**`src/shell/app/db/task.repository.ts`** (new file)

| Function           | Signature                                                                                    | Purpose                                     |
| ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `maxTaskOrder`     | `(db: Database) => number`                                                                   | Highest `task_order` for new task insertion |
| `wouldCreateCycle` | `(db: Database, taskId: number, newDepId: number, maxDepth?: number) => boolean`             | BFS up to depth 3 to detect circular deps   |
| `updateTaskOrder`  | `(db: Database, taskId: number, dir: 'up' \| 'down') => { id: number; taskOrder: number }[]` | Swap order with neighbor, return both rows  |
| `findDependents`   | `(db: Database, taskId: number) => Knowledge[]`                                              | Tasks that depend on this task              |
| `findDependencies` | `(db: Database, dependsOn: number[]) => Knowledge[]`                                         | Tasks this task depends on                  |

`wouldCreateCycle` uses BFS starting from `newDepId`, following `depends_on` chains. If `taskId` is found within 3 levels, return true. A task depending on itself is always rejected.

`updateTaskOrder` finds the current task's `task_order`, finds the neighbor (next higher for 'down', next lower for 'up'), swaps their `task_order` values in a transaction.

### App layer — task mutations

**`src/shell/app/app.ts`**

All six stub methods are replaced with full implementations:

- `createTask(input)` — compute `taskOrder`, build Knowledge, upsert, write to write-target YAML, invalidate caches
- `updateTask(id, patch)` — get existing, merge patch, upsert, write to source YAML, invalidate caches
- `deleteTask(id)` — get existing, `deleteById`, remove from source YAML, invalidate caches
- `cycleStatus(id, dir)` — get task, compute next status, upsert, write YAML, invalidate
- `cyclePriority(id, dir)` — same pattern with priority chain
- `reorderTask(id, dir)` — `updateTaskOrder`, write YAML for both affected entries, invalidate

**YAML write-back helpers (private):**

- `writeTaskToYaml(task, filePath)` — read file, parse, find/replace by key in `tasks:` section, write atomically (temp file + rename)
- `removeTaskFromYaml(key, filePath)` — read file, remove entry by key, delete file if empty, write back

**Write target:** New `writeTarget` field on `LoadedConfig`. Defaults to `{sourcesDir}/tasks.yml`. Exposed via `getConfig`/`saveConfig`.

**Error handling:** DB errors throw (caught by `rpcErrorContract` → 500). YAML write-back failures are logged — the DB commit is not rolled back. SQLite is the working index; YAML can be rebuilt.

### RPC schemas

**`src/shell/main/rpc/schemas.ts`**

`taskCreateSchema` expanded from `{ key }` to include `desc`, `tags`, `priority`, `dueDate`, `dependsOn`.

`taskUpdateSchema` expanded from `{ id, patch: { desc } }` to include all mutable task fields in the patch.

### Renderer client

**`src/shell/renderer/rpc/client.ts`**

Six new wrapper functions: `createTask`, `updateTask`, `deleteTask`, `cycleStatus`, `cyclePriority`, `reorderTask`. Each follows the existing `rpc.api.<route>.post(...).then(unwrap)` pattern.

### Renderer UI — new components

**`src/shell/renderer/components/task/task_sheet.component.tsx`** (new)

Centered modal overlay with backdrop. Fields: key (text), description (textarea), status (cycle button), priority (cycle button), due date (date input), tags (chip input), depends-on (entry picker). Save/Cancel buttons. Same component for create (empty) and edit (pre-populated) modes.

Props: `{ entry?: RpcKnowledge, onClose: () => void, onSave: (result: RpcKnowledge) => void }`

**`src/shell/renderer/components/task/confirm_dialog.component.tsx`** (new)

Small confirmation overlay: "Delete task 'X'?" with Cancel/Delete buttons.

### Renderer UI — new hooks

**`src/shell/renderer/hooks/list/use_task_sheet.hook.ts`** (new)

Form state management for TaskSheet: `{ key, desc, status, priority, dueDate, tags, dependsOn, isDirty, isSaving, error, save, setters }`.

**`src/shell/renderer/hooks/list/use_task_keyboard.hook.ts`** (new)

Keyboard shortcut handler: `⌘N` (create), `S` (cycle status), `P` (cycle priority), `Cmd+↑/↓` (reorder), `Delete` (confirm delete). Uses `useEffect` + `keydown` listener on the list surface.

**`src/shell/renderer/hooks/list/use_task_drag_drop.hook.ts`** (new)

HTML5 drag-and-drop state: `onDragStart(id)`, `onDragOver(id)`, `onDrop(id)`, `dragOverId`. No external library — uses native HTML5 DnD API.

### Renderer UI — existing file changes

| File                             | Change                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| `entry_row.component.tsx`        | Add `draggable={type === 'task'}`, drag event handlers           |
| `badge_accessory.component.tsx`  | Add `onClick` handlers to status/priority pills for task entries |
| `toolbar.component.tsx`          | Add "+ New Task" button                                          |
| `use_list_page_shell.hook.ts`    | Compose new task hooks                                           |
| `styles/list.css`                | Add `.app-modal`, `.app-taskSheet`, drag-and-drop styles         |
| `task_state.util.ts`             | Fix `taskIsBlocked` to check `dependsOn` field                   |
| `metadata_sidebar.component.tsx` | Switch from `meta.due` to `entry.dueDate`                        |
| `dependency_graph.component.tsx` | Switch from `meta.dependsOn` to `entry.dependsOn`                |
| `task_views.util.ts`             | Switch from `meta.due` to `entry.dueDate`                        |

---

## YAML WRITE-BACK CONTRACT

### `writeTaskToYaml(task, filePath)`

1. Read `filePath` → parse YAML (if ENOENT, start with `{ tasks: {} }`)
2. Locate `tasks:` section (create if missing)
3. Convert task to YAML shape: `{ [key]: { desc, tags, status, priority, due, task_order, depends_on } }`
4. Insert/replace by key
5. Write to temp file → `fs.rename` (atomic)
6. On error: log and return (no throw)

### `removeTaskFromYaml(key, filePath)`

1. Read file → parse
2. Remove entry by key from `tasks:` section
3. If `tasks:` is empty → delete file
4. Otherwise → write back via temp+rename

---

## TESTING STRATEGY

| Layer           | Approach                                              | File                                     |
| --------------- | ----------------------------------------------------- | ---------------------------------------- |
| Core types      | Parse valid/invalid task entries, assert round-trip   | `knowledge.schema.spec.ts`               |
| Core parser     | YAML string → extracted fields                        | `entry.factory.spec.ts`                  |
| DB row mapping  | Fishery task → upsert → findById → assert fields      | `entry.repository.spec.ts`               |
| Task repository | `maxTaskOrder`, `wouldCreateCycle`, `updateTaskOrder` | `task.repository.spec.ts` (new)          |
| App mutations   | In-memory DB + temp YAML, assert DB + file state      | `app.spec.ts`                            |
| RPC routes      | `rpc.handle(postJson(...))` against in-memory App     | `server.spec.ts`                         |
| RPC schemas     | Valid/invalid bodies for expanded schemas             | `requests.spec.ts`                       |
| Renderer client | Mock bridge, assert route + body                      | `client.spec.tsx`                        |
| TaskSheet       | Render create/edit, simulate input, assert save call  | `task_sheet.component.spec.tsx` (new)    |
| Keyboard hooks  | Simulate key events, assert callbacks                 | `use_task_keyboard.hook.spec.tsx` (new)  |
| Drag-and-drop   | Simulate drag events, assert reorder call             | `use_task_drag_drop.hook.spec.tsx` (new) |
| Badge cycling   | Click status/priority pill on task row, assert RPC    | `badge_accessory.component.spec.tsx`     |
