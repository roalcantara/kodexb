import { SECTION_ENTRY_TYPE_VALUES } from '../constants'
import type { SectionEntryType } from '../types'

export const isEntryTypeSection = (v: unknown): v is SectionEntryType =>
  SECTION_ENTRY_TYPE_VALUES.includes(v as SectionEntryType)
