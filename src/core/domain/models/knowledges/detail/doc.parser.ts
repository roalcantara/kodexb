import type { Binding, ChordStep } from '../../entries/schemas/shortcut.schema'
import type {
  BookmarkKnowledge,
  CheatKnowledge,
  CommandKnowledge,
  Knowledge,
  ShortcutKnowledge,
  TaskKnowledge
} from '../schemas/knowledge.schema'
import { extractYouTubeId, youTubeEmbedUrl, youTubeThumbnailMq } from './youtube.parser'

const buildBookmarkPreamble = (entry: BookmarkKnowledge, previewImageUrl?: string) => {
  const ytId = extractYouTubeId(entry.key)

  if (ytId) {
    const embedUrl = youTubeEmbedUrl(ytId)
    const thumb = youTubeThumbnailMq(ytId)
    return `[${entry.desc}](${embedUrl})\n\n![YouTube Thumbnail](${thumb})`
  }

  if (previewImageUrl) {
    return `![${entry.desc}](${previewImageUrl})`
  }

  return ''
}

const buildCheatPreamble = (_entry: CheatKnowledge) => ''

const buildCommandPreamble = (entry: CommandKnowledge) =>
  `\`\`\`sh\n${entry.key}\n\`\`\`\n\n### DESCRIPTION\n\n> ${entry.desc}`

function chordStepToText(step: ChordStep): string {
  const mods = step.modifiers ?? []
  return [...mods, step.key].filter(Boolean).join('+')
}

function chordToText(chord: ChordStep[]): string {
  return chord.map(chordStepToText).join(' ')
}

function bindingLine(b: Binding): string {
  return `- ${chordToText(b.chord)} — ${b.action}`
}

const buildShortcutPreamble = (entry: ShortcutKnowledge): string => {
  if (!entry.bindings || entry.bindings.length === 0) return ''
  const lines = entry.bindings.map(bindingLine)
  return `### BINDINGS\n\n${lines.join('\n')}`
}

const buildTaskPreamble = (entry: TaskKnowledge, now: Date) => {
  const parts: string[] = [`# ${entry.key}`]

  if (entry.desc) {
    parts.push(`> ${entry.desc}`)
  }

  if (entry.status) {
    parts.push(`### STATUS\n\n${entry.status.toUpperCase()}`)
  }

  if (entry.priority) {
    parts.push(`### PRIORITY\n\n${entry.priority.toUpperCase()}`)
  }

  const due = entry.meta?.due
  if (due) {
    const dueDate = new Date(due)
    const isOverdue = !Number.isNaN(dueDate.getTime()) && dueDate < now && entry.status !== 'done'
    const suffix = isOverdue ? ' ⚠ OVERDUE' : ''
    parts.push(`### DUE DATE\n\n${due}${suffix}`)
  }

  return parts.join('\n\n')
}

/** Build the type-specific document preamble for a knowledge entry. */
export function buildPreamble(knowledge: Knowledge, now: Date, previewImageUrl?: string): string {
  if (knowledge.type === 'command') return buildCommandPreamble(knowledge)
  if (knowledge.type === 'cheat') return buildCheatPreamble(knowledge)
  if (knowledge.type === 'bookmark') return buildBookmarkPreamble(knowledge, previewImageUrl)
  if (knowledge.type === 'task') return buildTaskPreamble(knowledge, now)
  return buildShortcutPreamble(knowledge)
}
