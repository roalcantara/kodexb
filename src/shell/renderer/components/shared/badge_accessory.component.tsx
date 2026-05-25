import type { RpcKnowledge } from '@shared/rpc'
import { memo } from 'react'

import { isTaskKnowledge, taskIsBlocked, taskIsOverdue } from '../../utils/shared/task_state.util'

export type BadgeAccessoryProps = {
  entry: RpcKnowledge
  allEntries?: RpcKnowledge[]
  onCycleStatus?: (id: number) => void
  onCyclePriority?: (id: number) => void
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'theme-pill theme-pill--urgent',
  high: 'theme-pill theme-pill--high',
  mid: 'theme-pill theme-pill--mid',
  low: 'theme-pill theme-pill--low'
}

const STATUS_CLASS: Record<string, string> = {
  todo: 'theme-pill theme-pill--todo',
  doing: 'theme-pill theme-pill--doing',
  done: 'theme-pill theme-pill--done'
}

function formatDueShort(ms: number | undefined | null): string {
  if (ms === undefined || ms === null) return ''
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d)
}

function bookmarkPill(hasUrl: boolean) {
  if (!hasUrl) return null
  return (
    <span className="theme-pill theme-pill--muted" title="Has URL">
      ↗
    </span>
  )
}

function commandPill() {
  return (
    <span className="theme-pill theme-pill--muted" title="Command">
      &gt;_
    </span>
  )
}

function cheatPill() {
  return (
    <span className="theme-pill theme-pill--muted" title="Cheat">
      ~
    </span>
  )
}

function taskPills(
  entry: Extract<RpcKnowledge, { type: 'task' }>,
  _all: RpcKnowledge[],
  onCycleStatus?: (id: number) => void,
  onCyclePriority?: (id: number) => void
) {
  const overdue = taskIsOverdue(entry)
  const blocked = taskIsBlocked(entry)
  const pri = entry.priority
  const status = entry.status
  const dueDate = entry.dueDate
  const dueStr = typeof dueDate === 'number' ? formatDueShort(dueDate) : ''

  const statusCls = `${STATUS_CLASS[status] ?? 'theme-pill'}${onCycleStatus ? ' theme-pill--clickable' : ''}`
  const priCls =
    pri === undefined ? '' : `${PRIORITY_CLASS[pri] ?? 'theme-pill'}${onCyclePriority ? ' theme-pill--clickable' : ''}`

  return (
    <>
      {pri === undefined ? null : onCyclePriority ? (
        <button
          type="button"
          className={priCls}
          onClick={e => {
            e.stopPropagation()
            onCyclePriority(entry.id)
          }}
        >
          {pri}
        </button>
      ) : (
        <span className={priCls}>{pri}</span>
      )}
      {onCycleStatus ? (
        <button
          type="button"
          className={statusCls}
          onClick={e => {
            e.stopPropagation()
            onCycleStatus(entry.id)
          }}
        >
          {status}
        </button>
      ) : (
        <span className={statusCls}>{status}</span>
      )}
      {overdue ? <span className="theme-pill theme-pill--overdue">overdue</span> : null}
      {blocked ? <span className="theme-pill theme-pill--blocked">blocked</span> : null}
      {dueStr === '' ? null : <span className="theme-pill theme-pill--due">{dueStr}</span>}
    </>
  )
}

function BadgeAccessoryComponent({ entry, allEntries = [], onCycleStatus, onCyclePriority }: BadgeAccessoryProps) {
  if (entry.type === 'bookmark') {
    const hasUrl = entry.key.startsWith('http://') || entry.key.startsWith('https://')
    return <span className="theme-badge-row">{bookmarkPill(hasUrl)}</span>
  }
  if (entry.type === 'command') {
    return <span className="theme-badge-row">{commandPill()}</span>
  }
  if (entry.type === 'cheat') {
    return <span className="theme-badge-row">{cheatPill()}</span>
  }
  if (isTaskKnowledge(entry)) {
    return <span className="theme-badge-row">{taskPills(entry, allEntries, onCycleStatus, onCyclePriority)}</span>
  }
  return null
}

export const BadgeAccessory = memo(BadgeAccessoryComponent)
