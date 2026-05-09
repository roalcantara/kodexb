const SPECIAL_CHARS_RE = /[.*+?^${}()|[\]\\]/g
const TOP_LEVEL_SECTION_RE = /^[A-Za-z0-9_-]+\s*:\s*(?:#.*)?$/
const INDENT_RE = /^[ \t]/
const NEWLINE_RE = /\r?\n/

/** Escape a string for safe use inside `RegExp`. */
export function escapeRegex(s: string): string {
  return s.replace(SPECIAL_CHARS_RE, '\\$&')
}

/**
 * Index of the next top-level mapping key (`section:` at column 0),
 * starting after `afterIndex`.
 */
function nextTopLevelSectionLine(lines: readonly string[], afterIndex: number): number {
  for (let i = afterIndex + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!line.trim()) continue
    if (INDENT_RE.test(line)) continue
    const t = line.trimEnd()
    if (TOP_LEVEL_SECTION_RE.test(t)) {
      return i
    }
  }
  return lines.length
}

/**
 * Best-effort 1-based line number for an entry's key under `section`.
 */
export function approxEntryKeyLine(content: string, section: string, key: string): number | undefined {
  const lines = content.split(NEWLINE_RE)
  let sectionIdx = -1
  const sectionRe = new RegExp(`^${escapeRegex(section)}\\s*:\\s*(?:#.*)?$`, 'i')

  for (let i = 0; i < lines.length; i++) {
    const t = (lines[i] ?? '').trimEnd()
    if (sectionRe.test(t)) {
      sectionIdx = i
      break
    }
  }
  if (sectionIdx < 0) return

  const end = nextTopLevelSectionLine(lines, sectionIdx)
  const patterns = [
    new RegExp(`^\\s*${escapeRegex(key)}\\s*:\\s*(?:#.*)?$`),
    new RegExp(`^\\s*"${escapeRegex(key)}"\\s*:\\s*(?:#.*)?$`),
    new RegExp(`^\\s*'${escapeRegex(key)}'\\s*:\\s*(?:#.*)?$`)
  ]

  for (let i = sectionIdx + 1; i < end; i++) {
    const line = lines[i] ?? ''
    if (patterns.some(re => re.test(line))) {
      return i + 1
    }
  }
}
