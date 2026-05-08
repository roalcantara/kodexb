import { ok, type Result } from 'neverthrow'

import type { Knowledge } from '../schemas/knowledge.schema'
import { buildBookmarkPreamble } from './doc.bookmark.parser'
import { buildCheatPreamble } from './doc.cheat.parser'
import { buildCommandPreamble } from './doc.command.parser'
import { buildTaskPreamble } from './doc.task.parser'
import { parseNotes } from './notes.parser'

export type AssemblyError = { message: string; fragmentIndex: number }

const toBase64 = (s: string) => Buffer.from(s).toString('base64')

const renderFragment = (format: string, payload: string) => {
  if (format === 'md' || format === 'markdown') {
    return payload
  }
  if (format === 'mermaid') {
    const b64 = toBase64(payload)
    return `![](https://mermaid.ink/img/${b64}?type=png&bgColor=fff "mermaid")`
  }
  if (format === 'svg') {
    const b64 = toBase64(payload)
    return `![](data:image/svg+xml;base64,${b64})`
  }
  if (format === 'img') {
    return `![](${payload})`
  }
  return `\`\`\`${format}\n${payload}\n\`\`\``
}

const buildPreamble = (knowledge: Knowledge, now: Date, previewImageUrl?: string) => {
  switch (knowledge.type) {
    case 'command':
      return buildCommandPreamble(knowledge)
    case 'cheat':
      return buildCheatPreamble(knowledge)
    case 'bookmark':
      return buildBookmarkPreamble(knowledge, previewImageUrl)
    case 'task':
      return buildTaskPreamble(knowledge, now)
  }
}

function renderNoteFragments(knowledge: Knowledge): string[] {
  const fragments = parseNotes(knowledge.notes as Parameters<typeof parseNotes>[0])
  const renderedParts: string[] = []
  for (const frag of fragments) {
    try {
      renderedParts.push(renderFragment(frag.format, frag.payload))
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      renderedParts.push(`\`\`\`error\n${message}\n\`\`\``)
    }
  }
  return renderedParts
}

/** Notes / fragments only — no type preamble. */
export const assembleNotesDoc = (knowledge: Knowledge): Result<string, AssemblyError> => {
  const renderedParts = renderNoteFragments(knowledge)
  return ok(renderedParts.join('\n\n'))
}

/**
 * Assembles the full detail Markdown document for an entry.
 * Pure — accepts `now` as a parameter so tests remain deterministic.
 */
export const assembleDoc = (
  knowledge: Knowledge,
  opts: { now: Date; previewImageUrl?: string }
): Result<string, AssemblyError> => {
  const { now, previewImageUrl } = opts
  const preamble = buildPreamble(knowledge, now, previewImageUrl)
  const renderedParts = renderNoteFragments(knowledge)

  const allParts = preamble ? [preamble, ...renderedParts] : renderedParts
  return ok(allParts.join('\n\n'))
}
