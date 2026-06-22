import type { RpcKnowledge } from '@shared/rpc'
import { memo } from 'react'

import { formatEnGbDate } from '../../../utils/shared/format_en_gb_date.util'
import { isTaskKnowledge, taskIsBlocked, taskIsOverdue } from '../../../utils/shared/task_state.util'

export type BadgeAccessoryProps = {
  entry: RpcKnowledge
  allEntries?: RpcKnowledge[]
  onCycleStatus?: (id: number) => void
  onCyclePriority?: (id: number) => void
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'cmp-pill cmp-pill--urgent',
  high: 'cmp-pill cmp-pill--high',
  mid: 'cmp-pill cmp-pill--mid',
  low: 'cmp-pill cmp-pill--low'
}

const STATUS_CLASS: Record<string, string> = {
  todo: 'cmp-pill cmp-pill--todo',
  doing: 'cmp-pill cmp-pill--doing',
  done: 'cmp-pill cmp-pill--done'
}

function bookmarkPill(hasUrl: boolean) {
  if (!hasUrl) return null
  return (
    <span className="cmp-pill cmp-pill--muted" title="Has URL">
      ↗
    </span>
  )
}

function commandPill() {
  return (
    <span className="cmp-pill cmp-pill--muted" title="Command">
      &gt;_
    </span>
  )
}

function cheatPill() {
  return (
    <span className="cmp-pill cmp-pill--muted" title="Cheat">
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
  const dueStr = typeof dueDate === 'number' ? formatEnGbDate(dueDate) : ''

  const statusCls = `${STATUS_CLASS[status] ?? 'cmp-pill'}${onCycleStatus ? ' cmp-pill--clickable' : ''}`
  const priCls =
    pri === undefined ? '' : `${PRIORITY_CLASS[pri] ?? 'cmp-pill'}${onCyclePriority ? ' cmp-pill--clickable' : ''}`

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
      {overdue ? <span className="cmp-pill cmp-pill--overdue">overdue</span> : null}
      {blocked ? <span className="cmp-pill cmp-pill--blocked">blocked</span> : null}
      {dueStr === '' ? null : <span className="cmp-pill cmp-pill--due">{dueStr}</span>}
    </>
  )
}

function BadgeAccessoryComponent({ entry, allEntries = [], onCycleStatus, onCyclePriority }: BadgeAccessoryProps) {
  if (entry.type === 'bookmark') {
    const hasUrl = entry.key.startsWith('http://') || entry.key.startsWith('https://')
    return <span className="cmp-badge-row">{bookmarkPill(hasUrl)}</span>
  }
  if (entry.type === 'command') {
    return <span className="cmp-badge-row">{commandPill()}</span>
  }
  if (entry.type === 'cheat') {
    return <span className="cmp-badge-row">{cheatPill()}</span>
  }
  if (isTaskKnowledge(entry)) {
    return <span className="cmp-badge-row">{taskPills(entry, allEntries, onCycleStatus, onCyclePriority)}</span>
  }
  return null
}

export const BadgeAccessory = memo(BadgeAccessoryComponent)
