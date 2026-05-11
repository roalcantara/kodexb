import type { RpcKnowledge } from '@shared/rpc'
import { memo } from 'react'

import { isTaskKnowledge, taskIsBlocked, taskIsOverdue } from '../../utils/shared/task_state.util'

export type BadgeAccessoryProps = {
  entry: RpcKnowledge
  allEntries?: RpcKnowledge[]
}

const PRIORITY_CLASS: Record<string, string> = {
  urgent: 'kb-pill kb-pill--urgent',
  high: 'kb-pill kb-pill--high',
  mid: 'kb-pill kb-pill--mid',
  low: 'kb-pill kb-pill--low'
}

const STATUS_CLASS: Record<string, string> = {
  todo: 'kb-pill kb-pill--todo',
  doing: 'kb-pill kb-pill--doing',
  done: 'kb-pill kb-pill--done'
}

function formatDueShort(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d)
}

function bookmarkPill(hasUrl: boolean) {
  if (!hasUrl) return null
  return (
    <span className="kb-pill kb-pill--muted" title="Has URL">
      ↗
    </span>
  )
}

function commandPill() {
  return (
    <span className="kb-pill kb-pill--muted" title="Command">
      &gt;_
    </span>
  )
}

function cheatPill() {
  return (
    <span className="kb-pill kb-pill--muted" title="Cheat">
      ~
    </span>
  )
}

function taskPills(entry: Extract<RpcKnowledge, { type: 'task' }>, all: RpcKnowledge[]) {
  const overdue = taskIsOverdue(entry)
  const blocked = taskIsBlocked(entry, all)
  const pri = entry.priority
  const status = entry.status
  const dueRaw = entry.meta?.due
  const dueStr = typeof dueRaw === 'string' && dueRaw.trim() !== '' ? formatDueShort(dueRaw) : ''

  return (
    <>
      {pri === undefined ? null : <span className={PRIORITY_CLASS[pri] ?? 'kb-pill'}>{pri}</span>}
      <span className={STATUS_CLASS[status] ?? 'kb-pill'}>{status}</span>
      {overdue ? <span className="kb-pill kb-pill--overdue">overdue</span> : null}
      {blocked ? <span className="kb-pill kb-pill--blocked">blocked</span> : null}
      {dueStr === '' ? null : <span className="kb-pill kb-pill--due">{dueStr}</span>}
    </>
  )
}

function BadgeAccessoryComponent({ entry, allEntries = [] }: BadgeAccessoryProps) {
  if (entry.type === 'bookmark') {
    const hasUrl = entry.key.startsWith('http://') || entry.key.startsWith('https://')
    return <span className="kb-badgeRow">{bookmarkPill(hasUrl)}</span>
  }
  if (entry.type === 'command') {
    return <span className="kb-badgeRow">{commandPill()}</span>
  }
  if (entry.type === 'cheat') {
    return <span className="kb-badgeRow">{cheatPill()}</span>
  }
  if (isTaskKnowledge(entry)) {
    return <span className="kb-badgeRow">{taskPills(entry, allEntries)}</span>
  }
  return null
}

export const BadgeAccessory = memo(BadgeAccessoryComponent)
