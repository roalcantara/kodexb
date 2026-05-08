import type { ENTRY_KEYS, ENTRY_TYPE_VALUES, SECTION_ENTRY_TYPE_VALUES } from '../constants'

export type EntryType = (typeof ENTRY_TYPE_VALUES)[number]
export type EntryKey = (typeof ENTRY_KEYS)[number]
export type SectionEntryType = (typeof SECTION_ENTRY_TYPE_VALUES)[number]
