<!-- markdownlint-disable-file -->
# Phase 9 — Task Management — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full task mutation write-path: create, edit, delete, status/priority cycling, reorder, and dependency management — persisting to both SQLite and YAML sources.

**Architecture:** Core types gain `dueDate`, `taskOrder`, `dependsOn` as first-class fields. DB row mapping is fixed. A new `task.repository.ts` provides `maxTaskOrder`, `wouldCreateCycle`, and `updateTaskOrder`. All six `App` stubs are replaced. RPC schemas expand. The renderer gains a `TaskSheet` modal, inline badge cycling, keyboard shortcuts, and drag-and-drop reorder.

**Primary verification:** `bun test && bun run lint && bun run build` are green. Task creation/editing/deletion works end-to-end in the preview server.

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/archive/task-management/design.md`
- [ ] Read `assets/docs/archive/task-management/requirements.md`
- [ ] Read `assets/docs/archive/foundation/requirements.md` — V1-7 section
- [ ] Read `.agents/skills/app-context/SKILL.md`, `.agents/skills/app-testing/SKILL.md`, `.agents/skills/app-rpc/SKILL.md`

---

## Task 1: Core type changes — add `dueDate`, `taskOrder`, `dependsOn`

**Files:** Modify `src/core/domain/models/entries/schemas/entry.schema.ts`, `src/core/domain/models/knowledges/schemas/knowledge.schema.ts`

- [ ] **Step 1: Add fields to `taskEntrySchema` in `entry.schema.ts`**

```ts
export const taskEntrySchema = Type.Composite([
  row,
  Type.Object({
    type: Type.Literal('task'),
    priority: Type.Optional(Type.Union(TASK_PRIORITY_VALUES.map(value => Type.Literal(value)))),
    status: Type.Union(TASK_STATUS_VALUES.map(value => Type.Literal(value))),
    dueDate: Type.Optional(Type.Number()),
    taskOrder: Type.Optional(Type.Integer()),
    dependsOn: Type.Optional(Type.Array(Type.Integer()))
  })
])
```

- [ ] **Step 2: Add same three fields to `taskKnowledgeSchema` in `knowledge.schema.ts`**

```ts
export const taskKnowledgeSchema = Type.Composite([
  taskEntrySchema,
  persistFieldsSchema
])
```

Note: `taskKnowledgeSchema` already composites `taskEntrySchema` + `persistFieldsSchema`, so the fields propagate automatically. Verify the composite is correct — it may currently use `row` instead of `taskEntrySchema`.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
bun run typecheck
```

Expected: zero errors from these files. Many downstream errors expected (rowToKnowledge, factories, etc. will need `dueDate`/`taskOrder`/`dependsOn`).

- [ ] **Step 4: Commit**

```bash
git add src/core/domain/models/entries/schemas/entry.schema.ts src/core/domain/models/knowledges/schemas/knowledge.schema.ts
git commit -m "feat(core): add dueDate taskOrder dependsOn to task schemas"
```

---

## Task 2: DB layer — fix `rowToKnowledge` and `rowToParams`

**Files:** Modify `src/shell/app/db/entry.repository.ts`

- [ ] **Step 1: Add fields to `rowToKnowledge` task branch**

In `rowToKnowledge()`, update the task return:

```ts
if (row.type === 'task') {
  return {
    ...base,
    type: 'task',
    priority: row.priority as Knowledge extends { priority?: infer P } ? P : never,
    status: row.status as Knowledge extends { status?: infer S } ? S : never,
    dueDate: row.due_date ?? undefined,
    taskOrder: row.task_order ?? undefined,
    dependsOn: parseJson<number[]>(row.depends_on, [])
  }
}
```

- [ ] **Step 2: Fix `rowToParams` hardcoded values**

Replace three hardcoded values:

```ts
// Before:
null,
null,
JSON.stringify([]),

// After:
'dueDate' in row ? (row.dueDate ?? null) : null,
'taskOrder' in row ? (row.taskOrder ?? null) : null,
'dependsOn' in row ? JSON.stringify(row.dependsOn ?? []) : JSON.stringify([]),
```

- [ ] **Step 3: Add `deleteById` exported function**

```ts
export function deleteById(db: Database, id: number): boolean {
  const result = db.query('DELETE FROM knowledges WHERE id = ?').run(id)
  return result.changes > 0
}
```

- [ ] **Step 4: Run existing entry repository tests**

```bash
bun test src/shell/app/db/entry.repository.spec.ts
```

Expected: all green. The round-trip should now preserve task fields.

- [ ] **Step 5: Commit**

```bash
git add src/shell/app/db/entry.repository.ts
git commit -m "feat(db): map dueDate taskOrder dependsOn in row mapping"
```

---

## Task 3: Task repository — new file

**Files:** Create `src/shell/app/db/task.repository.ts`

- [ ] **Step 1: Implement `maxTaskOrder`**

```ts
import type { Database } from 'bun:sqlite'

const MAX_TASK_ORDER_SQL =
  'SELECT COALESCE(MAX(task_order), -1) AS max_order FROM knowledges WHERE type = ?'

export function maxTaskOrder(db: Database): number {
  const row = db.query<{ max_order: number }, [string]>(MAX_TASK_ORDER_SQL).get('task')
  return row ? row.max_order + 1 : 0
}
```

- [ ] **Step 2: Implement `wouldCreateCycle` (BFS, max depth 3)**

```ts
const FIND_DEPS_SQL = 'SELECT depends_on FROM knowledges WHERE id = ? AND type = ?'

export function wouldCreateCycle(
  db: Database,
  taskId: number,
  newDepId: number,
  maxDepth: number = 3
): boolean {
  if (taskId === newDepId) return true
  const visited = new Set<number>([taskId])
  const queue: Array<{ id: number; depth: number }> = [{ id: newDepId, depth: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current.depth >= maxDepth) continue
    if (visited.has(current.id)) continue
    visited.add(current.id)

    const row = db.query<{ depends_on: string | null }, [number, string]>(
      FIND_DEPS_SQL
    ).get(current.id, 'task')
    if (!row?.depends_on) continue

    let deps: number[] = []
    try { deps = JSON.parse(row.depends_on) as number[] } catch { continue }
    if (!Array.isArray(deps)) continue

    for (const depId of deps) {
      if (depId === taskId) return true
      queue.push({ id: depId, depth: current.depth + 1 })
    }
  }
  return false
}
```

- [ ] **Step 3: Implement `updateTaskOrder`**

```ts
const FIND_TASK_ORDER_SQL =
  'SELECT task_order FROM knowledges WHERE id = ? AND type = ?'
const FIND_NEIGHBOR_SQL = `SELECT id, task_order FROM knowledges
  WHERE type = ? AND task_order IS NOT NULL AND task_order $OP ? AND id != ?
  ORDER BY task_order $DIR LIMIT 1`
const SET_TASK_ORDER_SQL =
  'UPDATE knowledges SET task_order = ? WHERE id = ? AND type = ?'

export function updateTaskOrder(
  db: Database,
  taskId: number,
  dir: 'up' | 'down'
): Array<{ id: number; taskOrder: number }> {
  const current = db.query<{ task_order: number | null }, [number, string]>(
    FIND_TASK_ORDER_SQL
  ).get(taskId, 'task')
  if (current?.task_order == null) return []

  const op = dir === 'up' ? '<' : '>'
  const orderDir = dir === 'up' ? 'DESC' : 'ASC'
  const neighbor = db.query<{ id: number; task_order: number }, [string, number, number]>(
    FIND_NEIGHBOR_SQL.replace('$OP', op).replace('$DIR', orderDir)
  ).get('task', current.task_order, taskId)
  if (!neighbor) return []

  db.transaction(() => {
    db.query(SET_TASK_ORDER_SQL).run(neighbor.task_order, taskId, 'task')
    db.query(SET_TASK_ORDER_SQL).run(current.task_order, neighbor.id, 'task')
  })()

  return [
    { id: taskId, taskOrder: neighbor.task_order },
    { id: neighbor.id, taskOrder: current.task_order }
  ]
}
```

- [ ] **Step 4: Implement `findDependents` and `findDependencies`**

```ts
const FIND_BY_IDS_SQL = 'SELECT * FROM knowledges WHERE id IN ($PLACEHOLDERS)'

export function findDependents(
  db: Database,
  taskId: number
): Knowledge[] { /* query all tasks whose depends_on JSON array contains taskId */ }

export function findDependencies(
  db: Database,
  dependsOn: number[]
): Knowledge[] {
  if (!dependsOn || dependsOn.length === 0) return []
  const placeholders = dependsOn.map(() => '?').join(',')
  const sql = FIND_BY_IDS_SQL.replace('$PLACEHOLDERS', placeholders)
  const rows = db.query<KnowledgeRow, number[]>(sql).all(...dependsOn)
  return rows.map(row => rowToKnowledge(row))
}
```

- [ ] **Step 5: Write task.repository.spec.ts**

```bash
bun test src/shell/app/db/task.repository.spec.ts
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/shell/app/db/task.repository.ts src/shell/app/db/task.repository.spec.ts
git commit -m "feat(db): add task repository with cycle detection and reorder"
```

---

## Task 4: Fishery factory update

**Files:** Modify `src/__tests__/factories/factories.builder.ts`

- [ ] **Step 1: Add new fields to `taskFactory`**

```ts
const taskFactory = Factory.define<TaskKnowledge>(({ sequence }) => ({
  id: 4_000_000_000 + sequence,
  type: 'task',
  key: `Task title ${sequence}`,
  source: minimalEntriesYml,
  desc: 'Build app',
  tags: ['dev', 'app'],
  priority: 'high',
  status: 'doing',
  doc: `# Task ${sequence}\n\n> Build app`,
  dueDate: undefined,
  taskOrder: sequence,
  dependsOn: undefined,
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000
}))
```

- [ ] **Step 2: Run factory spec**

```bash
bun test src/__tests__/factories/factories.builder.spec.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/factories/factories.builder.ts
git commit -m "feat(test): add dueDate taskOrder dependsOn to task factory"
```

---

## Task 5: App layer — implement all 6 task mutations + YAML write-back

**Files:** Modify `src/shell/app/app.ts`

- [ ] **Step 1: Add write-target to `LoadedConfig` and write-back helpers**

In `src/shell/app/config/config.loader.ts`, add `writeTarget` to `LoadedConfig`:

```ts
export type LoadedConfig = ResolvedConfig & {
  configPath: string
  database: { path: string }
  sources: { path: string }
  writeTarget: string  // ← added
}
```

Default: `path.join(sources.path, 'tasks.yml')`.

- [ ] **Step 2: Implement `createTask`**

```ts
async createTask(input: TaskCreateInput): Promise<Knowledge> {
  const { raw } = this.getDb()
  const order = maxTaskOrder(raw)
  const now = Date.now()
  const entry: Entry = {
    type: 'task',
    key: input.key,
    source: this.loaded.writeTarget,
    desc: input.desc ?? '',
    tags: input.tags ?? [],
    priority: input.priority ?? 'mid',
    status: 'todo',
    dueDate: input.dueDate,
    dependsOn: input.dependsOn
  } as Entry
  const knowledge = toKnowledge(entry, now)
  upsert(raw, knowledge)
  await writeTaskToYaml(knowledge, this.loaded.writeTarget)
  this.invalidateListCache()
  return knowledge
}
```

- [ ] **Step 3: Implement `updateTask`**

```ts
async updateTask(id: number, patch: TaskUpdateInput): Promise<Knowledge> {
  const existing = await this.getEntry(id)
  if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
  const merged = { ...existing, ...patch, updatedAt: Date.now() }
  const { raw } = this.getDb()
  upsert(raw, merged)
  await writeTaskToYaml(merged, merged.source)
  this.invalidateListCache()
  return merged
}
```

- [ ] **Step 4: Implement `deleteTask`**

```ts
async deleteTask(id: number): Promise<void> {
  const existing = await this.getEntry(id)
  if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
  const { raw } = this.getDb()
  deleteById(raw, id)
  await removeTaskFromYaml(existing.key, existing.source)
  this.invalidateListCache()
}
```

- [ ] **Step 5: Implement `cycleStatus`**

```ts
async cycleStatus(id: number, dir: 'forward' | 'backward'): Promise<Knowledge> {
  const values: TaskStatus[] = ['todo', 'doing', 'done']
  const existing = await this.getEntry(id)
  if (!existing || existing.type !== 'task') throw new Error(`Task ${id} not found`)
  const idx = values.indexOf(existing.status)
  const delta = dir === 'forward' ? 1 : -1
  const next = values[(idx + delta + values.length) % values.length]
  return this.updateTask(id, { status: next })
}
```

- [ ] **Step 6: Implement `cyclePriority`**

Same pattern with `['low', 'mid', 'high', 'urgent']`.

- [ ] **Step 7: Implement `reorderTask`**

```ts
async reorderTask(id: number, dir: 'up' | 'down'): Promise<Knowledge[]> {
  const { raw } = this.getDb()
  const affected = updateTaskOrder(raw, id, dir)
  if (affected.length === 0) return []
  const results: Knowledge[] = []
  for (const { id: affectedId } of affected) {
    const entry = findById(raw, affectedId)
    if (entry) {
      await writeTaskToYaml(entry, entry.source)
      results.push(entry)
    }
  }
  this.invalidateListCache()
  return results
}
```

- [ ] **Step 8: Implement YAML write-back helpers**

```ts
private async writeTaskToYaml(task: Knowledge, filePath: string): Promise<void> {
  try {
    let doc: Record<string, unknown> = {}
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      doc = Bun.YAML.parse(content) as Record<string, unknown>
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    }
    const tasks = (doc.tasks ?? {}) as Record<string, unknown>
    tasks[task.key] = taskToYamlShape(task)
    doc.tasks = tasks
    const tmpPath = filePath + '.tmp'
    await fs.writeFile(tmpPath, Bun.YAML.stringify(doc), 'utf-8')
    await fs.rename(tmpPath, filePath)
  } catch (err) {
    this.log.error(['YAML write-back failed', task.key, filePath, err])
  }
}

private async removeTaskFromYaml(key: string, filePath: string): Promise<void> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const doc = Bun.YAML.parse(content) as Record<string, unknown>
    const tasks = (doc.tasks ?? {}) as Record<string, unknown>
    delete tasks[key]
    if (Object.keys(tasks).length === 0) {
      await fs.unlink(filePath)
    } else {
      doc.tasks = tasks
      const tmpPath = filePath + '.tmp'
      await fs.writeFile(tmpPath, Bun.YAML.stringify(doc), 'utf-8')
      await fs.rename(tmpPath, filePath)
    }
  } catch (err) {
    this.log.error(['YAML remove failed', key, filePath, err])
  }
}

private taskToYamlShape(task: Knowledge): Record<string, unknown> {
  const shape: Record<string, unknown> = {}
  if (task.desc) shape.desc = task.desc
  if (task.tags.length > 0) shape.tags = task.tags
  if (task.type === 'task') {
    shape.status = task.status
    if (task.priority) shape.priority = task.priority
    if (task.dueDate) shape.due = new Date(task.dueDate).toISOString().split('T')[0]
    if (task.taskOrder != null) shape.task_order = task.taskOrder
    if (task.dependsOn?.length) shape.depends_on = task.dependsOn.map(String)
  }
  return shape
}
```

- [ ] **Step 9: Run app spec**

```bash
bun test src/shell/app/app.spec.ts
```

- [ ] **Step 10: Commit**

```bash
git add src/shell/app/app.ts src/shell/app/config/config.loader.ts
git commit -m "feat(app): implement task mutations and YAML write-back"
```

---

## Task 6: RPC schema expansion

**Files:** Modify `src/shell/main/rpc/schemas.ts`

- [ ] **Step 1: Replace `taskCreateSchema`**

```ts
export const taskCreateSchema = Type.Object({
  key: Type.String({ minLength: 1 }),
  desc: Type.Optional(Type.String()),
  tags: Type.Optional(Type.Array(Type.String())),
  priority: Type.Optional(Type.Union([
    Type.Literal('low'), Type.Literal('mid'), Type.Literal('high'), Type.Literal('urgent')
  ])),
  dueDate: Type.Optional(Type.Number()),
  dependsOn: Type.Optional(Type.Array(Type.Integer()))
}, { additionalProperties: false })
```

- [ ] **Step 2: Replace `taskUpdateSchema`**

```ts
export const taskUpdateSchema = Type.Object({
  id: Type.Integer(),
  patch: Type.Object({
    key: Type.Optional(Type.String({ minLength: 1 })),
    desc: Type.Optional(Type.String()),
    tags: Type.Optional(Type.Array(Type.String())),
    priority: Type.Optional(Type.Union([
      Type.Literal('low'), Type.Literal('mid'), Type.Literal('high'), Type.Literal('urgent')
    ])),
    status: Type.Optional(Type.Union([
      Type.Literal('todo'), Type.Literal('doing'), Type.Literal('done')
    ])),
    dueDate: Type.Optional(Type.Number()),
    dependsOn: Type.Optional(Type.Array(Type.Integer()))
  }, { additionalProperties: false })
}, { additionalProperties: false })
```

- [ ] **Step 3: Update `createTask` route in `server.ts`**

Change from passing just `body` key to passing the full body:
```ts
.post('/createTask', ({ body }) => appInstance.createTask(body), { body: taskCreateSchema })
```

If it already passes full body, no change needed.

- [ ] **Step 4: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 5: Run RPC server tests**

```bash
bun test src/shell/main/rpc/server.spec.ts
```

- [ ] **Step 6: Commit**

```bash
git add src/shell/main/rpc/schemas.ts
git commit -m "feat(rpc): expand task create/update schemas"
```

---

## Task 7: Renderer client wrappers

**Files:** Modify `src/shell/renderer/rpc/client.ts`

- [ ] **Step 1: Add 6 new wrapper functions**

```ts
import type { TaskCreateInput, TaskUpdateInput } from '@shared/rpc'

export function createTask(input: TaskCreateInput): Promise<RpcKnowledge> {
  return rpc.api.createTask.post(input).then(unwrap) as Promise<RpcKnowledge>
}

export function updateTask(id: number, patch: TaskUpdateInput): Promise<RpcKnowledge> {
  return rpc.api.updateTask.post({ id, patch }).then(unwrap) as Promise<RpcKnowledge>
}

export function deleteTask(id: number): Promise<void> {
  return rpc.api.deleteTask.post({ id }).then(unwrap) as Promise<void>
}

export function cycleStatus(id: number, dir: 'forward' | 'backward'): Promise<RpcKnowledge> {
  return rpc.api.cycleStatus.post({ id, dir }).then(unwrap) as Promise<RpcKnowledge>
}

export function cyclePriority(id: number, dir: 'forward' | 'backward'): Promise<RpcKnowledge> {
  return rpc.api.cyclePriority.post({ id, dir }).then(unwrap) as Promise<RpcKnowledge>
}

export function reorderTask(id: number, dir: 'up' | 'down'): Promise<RpcKnowledge[]> {
  return rpc.api.reorderTask.post({ id, dir }).then(unwrap) as Promise<RpcKnowledge[]>
}
```

- [ ] **Step 2: Verify typecheck**

```bash
bun run typecheck
```

- [ ] **Step 3: Run client spec**

```bash
bun test src/shell/renderer/rpc/client.spec.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/shell/renderer/rpc/client.ts
git commit -m "feat(renderer): add task mutation client wrappers"
```

---

## Task 8: Entry factory — extract new fields from YAML source

**Files:** Modify `src/core/domain/models/entries/parsers/base_fields.parser.ts` (or the entry factory file)

- [ ] **Step 1: Extract `dueDate`, `taskOrder`, `dependsOn` from YAML source**

Read the file to find how `parseBaseEntryFields` or `toEntry` builds the entry object. Add extraction logic:
- `due_date` string → parse ISO date → epoch ms → `dueDate`
- `task_order` integer → `taskOrder`
- `depends_on` string array → resolve entry keys to IDs → `dependsOn`

```ts
// Pseudocode for the extraction (adjust to match actual parser structure):
if (raw.due_date !== undefined) {
  const d = new Date(raw.due_date as string)
  if (!isNaN(d.getTime())) result.dueDate = d.getTime()
}
if (raw.task_order !== undefined) {
  result.taskOrder = Number(raw.task_order)
}
// depends_on key-to-ID resolution happens at the app layer, not in core
if (raw.depends_on !== undefined && Array.isArray(raw.depends_on)) {
  result.dependsOn = raw.depends_on.map(Number).filter(n => !isNaN(n))
}
```

- [ ] **Step 2: Run core parser tests**

```bash
bun test src/core/domain/models/entries/
```

- [ ] **Step 3: Run import service tests**

```bash
bun test src/shell/app/db/import.service.spec.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/core/domain/models/entries/parsers/
git commit -m "feat(core): extract dueDate taskOrder dependsOn from source"
```

---

## Task 9: Renderer field migration — meta → first-class

**Files:** Modify `task_state.util.ts`, `metadata_sidebar.component.tsx`, `badge_accessory.component.tsx`, `dependency_graph.component.tsx`, `task_views.util.ts`

- [ ] **Step 1: Fix `task_state.util.ts`**

```ts
// Before:
export function taskIsOverdue(task: TaskKnowledge): boolean {
  const due = task.meta?.due as string | undefined
  // ...
}

// After:
export function taskIsOverdue(task: TaskKnowledge): boolean {
  const due = task.dueDate
  if (!due) return false
  return due < Date.now()
}

// Before:
export function taskIsBlocked(_task: TaskKnowledge, _all: Knowledge[]): boolean {
  return false // stub
}

// After:
export function taskIsBlocked(task: TaskKnowledge): boolean {
  return (task.dependsOn?.length ?? 0) > 0
}
```

- [ ] **Step 2: Update `MetadataSidebar`**

Switch from `entry.meta?.due` to `entry.dueDate` and `entry.meta?.task_order` to `entry.taskOrder`.

- [ ] **Step 3: Update `BadgeAccessory`**

Switch overdue detection and due date display from `meta.due` to `entry.dueDate`.

- [ ] **Step 4: Update `DependencyGraph`**

Switch from `meta.dependsOn`/`meta.depends` parsing to `entry.dependsOn` (array of IDs).

- [ ] **Step 5: Update `task_views.util.ts`**

Switch date-based task view filters from `meta.due` to `entry.dueDate`.

- [ ] **Step 6: Run affected renderer tests**

```bash
bun test src/shell/renderer/components/detail/ src/shell/renderer/components/shared/ src/shell/renderer/utils/
```

- [ ] **Step 7: Commit**

```bash
git add src/shell/renderer/
git commit -m "feat(renderer): switch task fields from meta to first-class"
```

---

## Task 10: TaskSheet modal component

**Files:** Create `src/shell/renderer/components/task/task_sheet.component.tsx`, `src/shell/renderer/components/task/task_sheet.component.spec.tsx`

- [ ] **Step 1: Create `TaskSheet` component**

Modal overlay: key input (required), description textarea, status cycle button (shows current pill), priority cycle button, due date input (`type="date"`), tags chip input, depends-on picker (dropdown calling `listEntries`), Save/Cancel buttons.

Props: `{ entry?: RpcKnowledge; onClose: () => void }`

- [ ] **Step 2: Create `use_task_sheet.hook.ts`**

```ts
// src/shell/renderer/hooks/list/use_task_sheet.hook.ts
export function useTaskSheet(entry?: RpcKnowledge) {
  const [key, setKey] = useState(entry?.key ?? '')
  const [desc, setDesc] = useState(entry?.desc ?? '')
  const [status, setStatus] = useState(entry?.status ?? 'todo')
  const [priority, setPriority] = useState(entry?.priority ?? 'mid')
  const [dueDate, setDueDate] = useState(entry?.dueDate)
  const [tags, setTags] = useState(entry?.tags ?? [])
  const [dependsOn, setDependsOn] = useState(entry?.dependsOn ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ... save, cycleStatus, cyclePriority, addTag, removeTag, addDep, removeDep
}
```

- [ ] **Step 3: Run TaskSheet spec**

```bash
bun test src/shell/renderer/components/task/task_sheet.component.spec.tsx
```

- [ ] **Step 4: Add CSS for `.app-modal`, `.app-taskSheet` in `styles/list.css`**

- [ ] **Step 5: Commit**

```bash
git add src/shell/renderer/components/task/ src/shell/renderer/hooks/list/use_task_sheet.hook.ts src/shell/renderer/styles/list.css
git commit -m "feat(renderer): add TaskSheet modal for create/edit"
```

---

## Task 11: Inline badge cycling, keyboard shortcuts, toolbar button

**Files:** Modify `badge_accessory.component.tsx`, `toolbar.component.tsx`, `entry_row.component.tsx`, `use_list_page_shell.hook.ts`

- [ ] **Step 1: Add `onClick` to status/priority pills in `BadgeAccessory`**

For task entries, the status and priority pills become clickable. On click, call `cycleStatus(id, 'forward')` or `cyclePriority(id, 'forward')`.

- [ ] **Step 2: Add "+ New Task" button to `Toolbar`**

```tsx
<button type="button" className="app-toolbar-btn" onClick={onNewTask} title="New Task (⌘N)">
  + <span className="app-toolbar-hint">⌘N</span>
</button>
```

- [ ] **Step 3: Create `use_task_keyboard.hook.ts`**

```ts
// src/shell/renderer/hooks/list/use_task_keyboard.hook.ts
export function useTaskKeyboard({
  selectedId, onNewTask, onCycleStatus, onCyclePriority, onReorder, onDelete
}: { ... }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === 'n') { e.preventDefault(); onNewTask() }
      // ... S, P, Cmd+ArrowUp, Cmd+ArrowDown, Delete
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedId])
}
```

- [ ] **Step 4: Wire into `useListPageShell`**

Compose `useTaskSheet` and `useTaskKeyboard` into the shell hook. Add `showTaskSheet`, `setShowTaskSheet`, `editingTask` to the shell state.

- [ ] **Step 5: Run affected tests**

```bash
bun test src/shell/renderer/components/shared/badge_accessory.component.spec.tsx src/shell/renderer/components/list/toolbar.component.spec.tsx
```

- [ ] **Step 6: Commit**

```bash
git add src/shell/renderer/
git commit -m "feat(renderer): add inline badge cycling, keyboard shortcuts, toolbar button"
```

---

## Task 12: Drag-and-drop reorder + confirm dialog

**Files:** Create `use_task_drag_drop.hook.ts`, `confirm_dialog.component.tsx`

- [ ] **Step 1: Create `use_task_drag_drop.hook.ts`**

```ts
export function useTaskDragDrop({ rows, onReorder }: {
  rows: RpcKnowledge[]
  onReorder: (id: number, dir: 'up' | 'down') => void
}) {
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const getDragHandlers = (entry: RpcKnowledge) => ({
    draggable: entry.type === 'task',
    onDragStart: (e: DragEvent) => {
      e.dataTransfer?.setData('text/plain', String(entry.id))
    },
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      if (entry.type === 'task') setDragOverId(entry.id)
    },
    onDragLeave: () => setDragOverId(null),
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      setDragOverId(null)
      const draggedId = Number(e.dataTransfer?.getData('text/plain'))
      if (draggedId && draggedId !== entry.id) {
        const draggedIdx = rows.findIndex(r => r.id === draggedId)
        const dropIdx = rows.findIndex(r => r.id === entry.id)
        const dir = draggedIdx < dropIdx ? 'down' : 'up'
        onReorder(draggedId, dir)
      }
    }
  })

  return { dragOverId, getDragHandlers }
}
```

- [ ] **Step 2: Wire drag handlers into `EntryRow`**

Add `{...getDragHandlers(entry)}` to the `<article>` element in `EntryRow`.

- [ ] **Step 3: Create `ConfirmDialog` component**

Simple overlay: `"Delete task 'X'?"` with Cancel (Escape) and Delete (Enter) buttons.

- [ ] **Step 4: Run affected tests**

- [ ] **Step 5: Commit**

```bash
git add src/shell/renderer/
git commit -m "feat(renderer): add drag-and-drop reorder and confirm dialog"
```

---

## Task 13: Full test suite + quality gate

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite**

```bash
bun test
```

Expected: all tests green.

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

- [ ] **Step 4: Commit final verification**

```bash
git add -A
git commit -m "chore: Phase 9 verification — all tests green, lint clean"
```

---

## Task 14: Mark Phase 9 complete in roadmap

**Files:** Modify `assets/docs/archive/foundation/roadmap.md`

- [ ] **Step 1: Update Phase 9 status**

```diff
- |   9   | Task Management                | V1-7         | ⬜ pending |
+ |   9   | Task Management                | V1-7         | ✔ done    |
```

- [ ] **Step 2: Commit**

```bash
git add assets/docs/archive/foundation/roadmap.md
git commit -m "docs(roadmap): mark Phase 9 Task Management as done"
```
