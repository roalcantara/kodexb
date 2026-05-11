import type { RpcKnowledge } from '@shared/rpc'
import type { TaskSheetFormState } from '../../hooks/list/use_task_sheet.hook'
import { useTaskSheet } from '../../hooks/list/use_task_sheet.hook'

const STATUS_CLASS: Record<string, string> = {
  todo: 'kb-pill kb-pill--todo',
  doing: 'kb-pill kb-pill--doing',
  done: 'kb-pill kb-pill--done'
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'kb-pill kb-pill--urgent',
  high: 'kb-pill kb-pill--high',
  mid: 'kb-pill kb-pill--mid',
  low: 'kb-pill kb-pill--low'
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
    <div className="kb-taskSheet--row">
      <div className="kb-taskSheet--field">
        <label htmlFor="task-sheet-status">Status</label>
        <button
          id="task-sheet-status"
          type="button"
          className={STATUS_CLASS[status] ?? 'kb-pill'}
          onClick={onCycleStatus}
          disabled={disabled}
          style={{
            cursor: disabled ? 'default' : 'pointer',
            border: '1px solid var(--kb-border)',
            background: 'transparent',
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem'
          }}
        >
          {status}
        </button>
      </div>
      <div className="kb-taskSheet--field">
        <label htmlFor="task-sheet-priority">Priority</label>
        <button
          id="task-sheet-priority"
          type="button"
          className={PRIORITY_CLASS[priority] ?? 'kb-pill'}
          onClick={onCyclePriority}
          disabled={disabled}
          style={{
            cursor: disabled ? 'default' : 'pointer',
            border: '1px solid var(--kb-border)',
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
    <div className="kb-taskSheet--field">
      <label htmlFor="ts-deps">Depends on (IDs)</label>
      <input
        id="ts-deps"
        className="kb-taskSheet--input"
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
    <div className="kb-modal" role="dialog" aria-label={entry ? 'Edit task' : 'New task'}>
      <div className="kb-taskSheet">
        <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>{entry ? 'Edit task' : 'New task'}</h2>

        {form.error ? (
          <div style={{ color: 'var(--kb-danger)', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{form.error}</div>
        ) : null}

        <div className="kb-taskSheet--field">
          <label htmlFor="ts-key">Key</label>
          <input
            id="ts-key"
            className="kb-taskSheet--input"
            type="text"
            value={form.key}
            onChange={e => onSet('key', e.target.value)}
            placeholder="Task key"
            required
          />
        </div>

        <div className="kb-taskSheet--field">
          <label htmlFor="ts-desc">Description</label>
          <textarea
            id="ts-desc"
            className="kb-taskSheet--textarea"
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

        <div className="kb-taskSheet--field">
          <label htmlFor="ts-due">Due date</label>
          <input
            id="ts-due"
            className="kb-taskSheet--input"
            type="date"
            value={form.dueDateStr}
            onChange={e => onSet('dueDateStr', e.target.value)}
          />
        </div>

        <div className="kb-taskSheet--field">
          <label htmlFor="ts-tags">Tags</label>
          <input
            id="ts-tags"
            className="kb-taskSheet--input"
            type="text"
            value={form.tags}
            onChange={e => onSet('tags', e.target.value)}
            placeholder="comma, separated, tags"
          />
        </div>

        <DependsOnPicker value={form.dependsOn} onChange={v => onSet('dependsOn', v)} />

        <div className="kb-taskSheet--actions">
          <button
            type="button"
            className="kb-taskSheet--btn kb-taskSheet--btnPrimary"
            onClick={onSave}
            disabled={form.saving || !form.key.trim()}
          >
            {form.saving ? 'Saving…' : 'Save'}
          </button>
          <button type="button" className="kb-taskSheet--btn" onClick={onCancel} disabled={form.saving}>
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
