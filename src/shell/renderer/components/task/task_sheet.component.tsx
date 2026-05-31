import type { RpcKnowledge } from '@shared/rpc'
import type { TaskSheetFormState } from '../../hooks/list/use_task_sheet.hook'
import { useTaskSheet } from '../../hooks/list/use_task_sheet.hook'

const STATUS_CLASS: Record<string, string> = {
  todo: 'cmp-pill cmp-pill--todo',
  doing: 'cmp-pill cmp-pill--doing',
  done: 'cmp-pill cmp-pill--done'
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'cmp-pill cmp-pill--urgent',
  high: 'cmp-pill cmp-pill--high',
  mid: 'cmp-pill cmp-pill--mid',
  low: 'cmp-pill cmp-pill--low'
}

export type TaskSheetInnerProps = {
  entry?: RpcKnowledge
  form: TaskSheetFormState
  dirty: boolean
  onSet: <K extends keyof TaskSheetFormState>(key: K, value: TaskSheetFormState[K]) => void
  onSave: () => void
  onCancel: () => void
  onCycleStatus: () => void
  onCyclePriority: () => void
}

function StatusPriorityRow({
  status,
  priority,
  onCycleStatus,
  onCyclePriority,
  disabled
}: {
  status: string
  priority: string
  onCycleStatus: () => void
  onCyclePriority: () => void
  disabled: boolean
}) {
  return (
    <div className="cmp-task-sheet--row">
      <div className="cmp-task-sheet--field">
        <label htmlFor="task-sheet-status">Status</label>
        <button
          id="task-sheet-status"
          type="button"
          className={STATUS_CLASS[status] ?? 'cmp-pill'}
          onClick={onCycleStatus}
          disabled={disabled}
          style={{
            cursor: disabled ? 'default' : 'pointer',
            border: '1px solid var(--cmp-border)',
            background: 'transparent',
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem'
          }}
        >
          {status}
        </button>
      </div>
      <div className="cmp-task-sheet--field">
        <label htmlFor="task-sheet-priority">Priority</label>
        <button
          id="task-sheet-priority"
          type="button"
          className={PRIORITY_CLASS[priority] ?? 'cmp-pill'}
          onClick={onCyclePriority}
          disabled={disabled}
          style={{
            cursor: disabled ? 'default' : 'pointer',
            border: '1px solid var(--cmp-border)',
            background: 'transparent',
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem'
          }}
        >
          {priority}
        </button>
      </div>
    </div>
  )
}

function DependsOnPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="cmp-task-sheet--field">
      <label htmlFor="ts-deps">Depends on (IDs)</label>
      <input
        id="ts-deps"
        className="cmp-task-sheet--input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="1, 2, 3"
      />
    </div>
  )
}

function TaskSheetInner({
  entry,
  form,
  dirty: _dirty,
  onSet,
  onSave,
  onCancel,
  onCycleStatus,
  onCyclePriority
}: TaskSheetInnerProps) {
  return (
    <div
      className="cmp-modal cmp-overlay-backdrop cmp-overlay-backdrop--centered"
      role="dialog"
      aria-label={entry ? 'Edit task' : 'New task'}
    >
      <div className="cmp-overlay-shell cmp-task-sheet">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{entry ? 'Edit task' : 'New task'}</h2>

        {form.error ? (
          <div style={{ color: 'var(--cmp-danger)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{form.error}</div>
        ) : null}

        <div className="cmp-task-sheet--field">
          <label htmlFor="ts-key">Key</label>
          <input
            id="ts-key"
            className="cmp-task-sheet--input"
            type="text"
            value={form.key}
            onChange={e => onSet('key', e.target.value)}
            placeholder="Task key"
            required
          />
        </div>

        <div className="cmp-task-sheet--field">
          <label htmlFor="ts-desc">Description</label>
          <textarea
            id="ts-desc"
            className="cmp-task-sheet--textarea"
            value={form.desc}
            onChange={e => onSet('desc', e.target.value)}
            placeholder="Task description"
            rows={3}
          />
        </div>

        <StatusPriorityRow
          status={form.status}
          priority={form.priority}
          onCycleStatus={onCycleStatus}
          onCyclePriority={onCyclePriority}
          disabled={!entry}
        />

        <div className="cmp-task-sheet--field">
          <label htmlFor="ts-due">Due date</label>
          <input
            id="ts-due"
            className="cmp-task-sheet--input"
            type="date"
            value={form.dueDateStr}
            onChange={e => onSet('dueDateStr', e.target.value)}
          />
        </div>

        <div className="cmp-task-sheet--field">
          <label htmlFor="ts-tags">Tags</label>
          <input
            id="ts-tags"
            className="cmp-task-sheet--input"
            type="text"
            value={form.tags}
            onChange={e => onSet('tags', e.target.value)}
            placeholder="comma, separated, tags"
          />
        </div>

        <DependsOnPicker value={form.dependsOn} onChange={v => onSet('dependsOn', v)} />

        <div className="cmp-task-sheet--actions">
          <button
            type="button"
            className="cmp-task-sheet--btn cmp-task-sheet--btn-primary"
            onClick={onSave}
            disabled={form.saving || !form.key.trim()}
          >
            {form.saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="cmp-task-sheet--btn" onClick={onCancel} disabled={form.saving}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export type TaskSheetProps = {
  entry: RpcKnowledge | null
  onClose: () => void
}

export function TaskSheet({ entry, onClose }: TaskSheetProps) {
  const sheet = useTaskSheet(entry ?? undefined, onClose)
  return (
    <TaskSheetInner
      entry={entry ?? undefined}
      form={sheet.form}
      dirty={sheet.dirty}
      onSet={sheet.set}
      onSave={sheet.handleSave}
      onCancel={sheet.handleCancel}
      onCycleStatus={sheet.handleCycleStatus}
      onCyclePriority={sheet.handleCyclePriority}
    />
  )
}
