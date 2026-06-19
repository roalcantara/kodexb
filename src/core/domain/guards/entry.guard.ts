import { IsNull, IsUndefined } from '@sinclair/typebox/value'
import { MARKDOWN_SUPPORTED_LANGS, type MarkdownLang } from '../../constants'
import { ENTRY_TYPE_VALUES, SECTION_ENTRY_TYPE_VALUES } from '../constants'
import type { EntryType, SectionEntryType } from '../types'

export const isBlank = (v: unknown): v is null | undefined | '' =>
  IsNull(v) || IsUndefined(v) || (typeof v === 'string' && v.trim() === '')

export const isEntryType = (v: unknown): v is EntryType => ENTRY_TYPE_VALUES.includes(v as EntryType)

export const isEntryTypeSection = (v: unknown): v is SectionEntryType =>
  SECTION_ENTRY_TYPE_VALUES.includes(v as SectionEntryType)

export const isNoteLang = (lang: unknown): lang is MarkdownLang =>
  typeof lang === 'string' && lang.trim().length > 0 && (MARKDOWN_SUPPORTED_LANGS as unknown as string[]).includes(lang)
