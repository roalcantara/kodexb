import type { MarkdownLang } from '../../constants'

/** Normalised slice of source `notes` for Markdown assembly (not the DB JSON shape). */
export type NoteFragment = { format: MarkdownLang | (string & {}); payload: string }

/** Raw-ish `notes` before or alongside normalised `NoteBlock[]` (e.g. doc assembly). */
export type RawNotes = string | Record<string, string> | Record<string, string>[]
