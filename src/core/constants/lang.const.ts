import markdownSupportedLangsData from './markdown_supported_langs.json' with { type: 'json' }

export const MARKDOWN_SUPPORTED_LANGS = markdownSupportedLangsData as readonly string[]
export type MarkdownLang = (typeof MARKDOWN_SUPPORTED_LANGS)[number] | string
