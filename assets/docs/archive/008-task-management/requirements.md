<!-- markdownlint-disable-file -->
<!-- Shipped: catalog key @task_management. Normative behaviour: Gherkin + unit specs. -->
# Phase 9 — Task Management — Requirements

## INTRODUCTION

Phase 9 delivers full task lifecycle management from the desktop UI. Users can
create, edit, delete, reorder, and cycle status/priority on tasks without editing
YAML files directly. Mutations persist to both SQLite and YAML sources.

This phase implements [V1-7](https://github.com/roalcantara/kodexb/blob/main/assets/docs/archive/foundation/requirements.md#requirement-v1-7-task-management)
from the foundation requirements. The read path (list badges, detail view, dep
graph) already exists — this phase builds the write path.

---

## REQUIREMENT SYNTAX (EARS)

### REQ-TM-1: Task creation

**User story:** As a user, I want to create new tasks from the keyboard so that
I can add tasks without leaving the app.

1. WHEN the user presses `⌘N` (macOS) or `Ctrl+N` (Linux), THEN a task creation
   modal SHALL open with keyboard focus on the key field.

2. THE modal SHALL display fields: key (required), description, status
   (default `todo`), priority (default `mid`), due date (optional), tags
   (multi-select), depends-on (task picker).

3. WHEN the user fills required fields and presses `⌘Enter` or clicks Save, THEN
   the system SHALL create the task in SQLite and write it to the configured
   write-target YAML file.

4. WHEN the user presses Escape or clicks Cancel, THEN the modal SHALL close
   without saving.

5. AFTER a successful create, THEN the list view SHALL refresh automatically.

---

### REQ-TM-2: Task editing

**User story:** As a user, I want to edit existing tasks so that I can update
their details.

1. WHEN the user triggers "Edit Task" on a focused task entry (via `⌘E` or
   context action), THEN the task sheet modal SHALL open pre-populated with
   the task's current values.

2. WHEN the user modifies fields and saves, THEN the system SHALL update the
   task in SQLite and write the changes back to the task's YAML source file.

---

### REQ-TM-3: Task deletion

**User story:** As a user, I want to delete tasks I no longer need.

1. WHEN the user triggers "Delete Task" (via `Delete` key or context action) on
   a focused task, THEN a confirmation dialog SHALL appear.

2. WHEN the user confirms, THEN the system SHALL remove the task from SQLite
   and from its YAML source file. The list SHALL refresh automatically.

3. WHEN the user cancels, THEN no changes SHALL be made.

---

### REQ-TM-4: Status cycling

**User story:** As a user, I want to cycle task status without opening a form.

1. WHEN the user presses `S` on a focused task row, THEN the status SHALL cycle
   `todo → doing → done → todo` (forward). With `Shift+S`, cycle backward.

2. WHEN the user clicks the status badge on a task row, THEN the status SHALL
   cycle forward.

3. THE update SHALL persist immediately to SQLite and the YAML source file.
   The row SHALL re-render in-place.

---

### REQ-TM-5: Priority cycling

**User story:** As a user, I want to cycle task priority without opening a form.

1. WHEN the user presses `P` on a focused task row, THEN the priority SHALL
   cycle `low → mid → high → urgent → low` (forward). `Shift+P` reverses.

2. WHEN the user clicks the priority badge on a task row, THEN the priority
   SHALL cycle forward.

3. THE update SHALL persist immediately to SQLite and the YAML source file.

---

### REQ-TM-6: Task reorder

**User story:** As a user, I want to reorder tasks in the list.

1. WHEN the user presses `Cmd+↑` (macOS) / `Ctrl+↑` (Linux) on a focused
   task row, THEN the task SHALL move up one position.

2. WHEN the user presses `Cmd+↓` / `Ctrl+↓`, THEN the task SHALL move down.

3. WHEN the user drags a task row and drops it on another task row, THEN
   the dragged task SHALL be inserted at the drop position.

4. THE reorder SHALL persist to SQLite (`task_order` column) and YAML source
   for both affected entries.

---

### REQ-TM-7: Dependency management

**User story:** As a user, I want to define task dependencies and be warned
about circular references.

1. WHEN the user adds a depends-on link in the task sheet, THEN the selected
   task SHALL be added to the `dependsOn` field.

2. WHEN the user saves and the new dependency would create a cycle (BFS up to
   depth 3), THEN the system SHALL reject the save with a clear error message.

3. WHEN a task has blocking dependencies that are not `done`, THEN the task
   row SHALL display a `blocked` badge and the detail view SHALL list the
   blocking entries.

---

### REQ-TM-8: YAML write-back

**User story:** As a user, I want task mutations to persist to YAML source files
so that my knowledge base remains the source of truth.

1. WHEN a task is created, edited, deleted, or reordered, THEN the system SHALL
   write the change to the task's YAML source file (or the write-target for
   new tasks).

2. IF YAML write-back fails, THEN the system SHALL log the error and continue
   (the SQLite mutation has already succeeded). The entry exists in the
   database but the YAML source may be stale.

3. WHEN the write-target file does not exist, THEN the system SHALL create it
   with a `tasks:` header.

4. WHEN a task is deleted and its source file becomes empty (no remaining
   entries), THEN the file SHALL be deleted.

---

### REQ-TM-9: Core type promotion

**User story:** As a developer, I want task fields to be first-class typed
properties rather than opaque `meta` JSON values.

1. `TaskKnowledge` SHALL include `dueDate?: number`, `taskOrder?: number`,
   and `dependsOn?: number[]` as first-class fields.

2. `rowToKnowledge` and `rowToParams` SHALL map these fields to the
   corresponding DB columns (`due_date`, `task_order`, `depends_on`).

3. The entry factory SHALL extract `due_date`, `task_order`, and `depends_on`
   from YAML source and set them on the `TaskEntry` object.

4. Renderer components (`MetadataSidebar`, `BadgeAccessory`, `DependencyGraph`,
   `task_state.util`) SHALL read from the first-class fields instead of
   `entry.meta`.

---

## OUT OF SCOPE

- AI-suggested tags during task creation (Phase 10 — `⌘K` palette)
- Opening task from `⌘K` palette (Phase 10)
- Batch task operations (backlog)
- Task templates (backlog)
- Task comments / activity log (backlog)
