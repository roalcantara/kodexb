import type { RpcKnowledge } from '@shared/rpc'
import { formatEnGbDate } from '../../utils/shared/format_en_gb_date.util'

function Field({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div className="cmp-metadata-field">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function formatTime(ms: number): string {
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return String(ms)
  return d.toLocaleString()
}

export type MetadataSidebarProps = {
  entry: RpcKnowledge
}

export function MetadataSidebar({ entry }: MetadataSidebarProps) {
  const due = entry.type === 'task' ? formatEnGbDate(entry.dueDate, 'withYear') : undefined
  const taskOrder = entry.type === 'task' ? entry.taskOrder : undefined

  return (
    <aside className="cmp-metadata-sidebar" aria-label="Entry metadata">
      <h2>Metadata</h2>
      <dl>
        <Field label="Type" value={entry.type} />
        <Field label="Source" value={entry.source} />
        <Field label="Created" value={formatTime(entry.createdAt)} />
        <Field label="Updated" value={formatTime(entry.updatedAt)} />
        <Field label="Tags" value={entry.tags.join(', ')} />
        {entry.type === 'task' ? (
          <>
            <Field label="Status" value={entry.status} />
            <Field label="Priority" value={entry.priority} />
            <Field label="Due" value={due} />
            <Field label="Task order" value={taskOrder} />
          </>
        ) : null}
      </dl>
    </aside>
  )
}
