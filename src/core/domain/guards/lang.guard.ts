import { MARKDOWN_SUPPORTED_LANGS, type MarkdownLang } from '../../constants'

export const isNoteLang = (lang: unknown): lang is MarkdownLang =>
  typeof lang === 'string' && lang.trim().length > 0 && (MARKDOWN_SUPPORTED_LANGS as unknown as string[]).includes(lang)
