import { type Static, Type } from '@sinclair/typebox'
import { TypeCompiler } from '@sinclair/typebox/compiler'
import type { Simplify } from 'type-fest'

export const prioritySchema = Type.Union([
  Type.Literal('low'),
  Type.Literal('mid'),
  Type.Literal('high'),
  Type.Literal('urgent')
])
export type Priority = Simplify<Static<typeof prioritySchema>>

export const taskStatusSchema = Type.Union([Type.Literal('todo'), Type.Literal('doing'), Type.Literal('done')])
export type TaskStatus = Simplify<Static<typeof taskStatusSchema>>

const priorityChecker = TypeCompiler.Compile(prioritySchema)
const statusChecker = TypeCompiler.Compile(taskStatusSchema)

export const parseTaskPriorityFromSource = (raw: unknown): Priority | undefined =>
  priorityChecker.Check(raw) ? (raw as Priority) : undefined

export const parseTaskStatusFromSource = (raw: unknown): TaskStatus =>
  statusChecker.Check(raw) ? (raw as TaskStatus) : 'todo'

export const parseTaskDueDateFromSource = (raw: unknown): number | undefined => {
  if (typeof raw !== 'string') return
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return
  return d.getTime()
}

export const parseTaskOrderFromSource = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === null) return
  const n = Number(raw)
  if (Number.isNaN(n) || !Number.isInteger(n)) return
  return n
}

export const parseTaskDependsOnFromSource = (raw: unknown): number[] | undefined => {
  if (!Array.isArray(raw)) return
  const nums = raw.map(Number).filter(n => !Number.isNaN(n) && Number.isInteger(n))
  return nums.length > 0 ? nums : undefined
}
