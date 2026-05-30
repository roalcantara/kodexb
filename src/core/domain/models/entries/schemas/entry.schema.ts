import { type Static, Type } from '@sinclair/typebox'
import type { Simplify, UnknownRecord } from 'type-fest'
import { ENTRY_TYPE_VALUES } from '../../../constants'
import { TASK_PRIORITY_VALUES, TASK_STATUS_VALUES } from '../../../constants/entry.const'
import type { EntryType } from '../../../types'
import { sourceBaseEntryRowObjectSchema } from './base.schema'
import { shortcutEntrySchema } from './shortcut.schema'

/** Re-export so downstream modules can import schemas from this barrel. */
export { shortcutEntrySchema } from './shortcut.schema'

/** Entry / knowledge row discriminant (`bookmark` | `command` | `cheat` | `task` | `shortcut`). */
export const entryTypeSchema = Type.Union(ENTRY_TYPE_VALUES.map(value => Type.Literal(value)))

const row = sourceBaseEntryRowObjectSchema

export const bookmarkEntrySchema = Type.Composite([row, Type.Object({ type: Type.Literal('bookmark') })])

export const commandEntrySchema = Type.Composite([row, Type.Object({ type: Type.Literal('command') })])

export const cheatEntrySchema = Type.Composite([row, Type.Object({ type: Type.Literal('cheat') })])

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

export const entrySchema = Type.Union([
  bookmarkEntrySchema,
  commandEntrySchema,
  cheatEntrySchema,
  taskEntrySchema,
  shortcutEntrySchema
])

export type Entry = Simplify<Static<typeof entrySchema>>
export type BookmarkEntry = Simplify<Static<typeof bookmarkEntrySchema>>
export type CommandEntry = Simplify<Static<typeof commandEntrySchema>>
export type CheatEntry = Simplify<Static<typeof cheatEntrySchema>>
export type TaskEntry = Simplify<Static<typeof taskEntrySchema>>
/**
 * Re-exported from shortcut.schema.ts. Import directly from there or via
 * the schemas barrel to avoid `export *` ambiguity.
 */
export type { ShortcutEntry } from './shortcut.schema'

/** Common source-derived fields plus discriminant (before task-only fields narrow). */
export type BaseEntry = Simplify<Static<typeof sourceBaseEntryRowObjectSchema> & { type: EntryType }>

export type SourceRow = UnknownRecord
