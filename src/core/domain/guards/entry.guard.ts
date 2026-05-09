import { ENTRY_TYPE_VALUES } from '../constants'
import type { EntryType } from '../types'

export const isEntryType = (v: unknown): v is EntryType => ENTRY_TYPE_VALUES.includes(v as EntryType)
