/**
 * Shared HK commit-message policy validation (used by hook CLI and commit-plan apply).
 */

export const ALLOWED_COMMIT_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'ref',
  'test',
  'revert',
  'chore',
  'ci',
  'build'
] as const

const SUBJECT_REGEX = /^(feat|fix|docs|style|ref|test|revert|chore|ci|build)(\([^)]*\))?(!)?: [A-Z].*/

const GENERATED_GIT_PREFIXES = ['Merge ', 'Revert ', 'fixup! ', 'squash! '] as const

const WIP_WORD_REGEX = /\bwip\b/i

const PERIOD_END_REGEX = /\.$/

export type CommitMessageValidationResult = { ok: true; skipped?: string } | { ok: false; failures: string[] }

export function isCommitTemplateTrailerLine(line: string): boolean {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('#')) return true
  if (trimmed.startsWith('diff --git ')) return true
  if (trimmed.startsWith('diff --cc ')) return true
  if (trimmed.startsWith('diff --combined ')) return true
  return false
}

export function bodyLinesFromMessage(allLines: string[]): string[] {
  const body: string[] = []
  for (const line of allLines.slice(2)) {
    if (isCommitTemplateTrailerLine(line)) break
    body.push(line)
  }
  return body
}

export function validateCommitMessage(
  contents: string,
  opts: { authorName?: string } = {}
): CommitMessageValidationResult {
  const lines = contents.split('\n')
  const subject = lines[0] ?? ''

  for (const prefix of GENERATED_GIT_PREFIXES) {
    if (subject.startsWith(prefix)) {
      return { ok: true, skipped: 'generated git subject' }
    }
  }

  const authorName = opts.authorName ?? ''
  if (authorName && /dependabot/i.test(authorName)) {
    return { ok: true, skipped: 'dependabot author' }
  }

  const failures: string[] = []

  const typeMatch = subject.match(/^([a-z]+)/)
  const type = typeMatch?.[1]
  if (!type || !(ALLOWED_COMMIT_TYPES as readonly string[]).includes(type)) {
    failures.push('- subject must match type(scope): Description with an allowed type and capitalized description')
  } else if (!SUBJECT_REGEX.test(subject)) {
    failures.push('- subject must match type(scope): Description with an allowed type and capitalized description')
  }

  const isRelease = subject.startsWith('Release ')
  if (isRelease) {
    if (subject.length < 5) failures.push('- subject must be at least 5 characters')
  } else if (subject.length < 5 || subject.length > 50) {
    failures.push('- subject must be 5-50 characters')
  }

  if (WIP_WORD_REGEX.test(subject)) failures.push('- subject must not contain wip')
  if (PERIOD_END_REGEX.test(subject)) failures.push('- subject must not end with a period')

  const bodyLines = bodyLinesFromMessage(lines)
  const body = bodyLines.join('\n')
  const bodyNonWhitespace = body.replace(/\s/g, '').length
  if (bodyNonWhitespace < 20) {
    failures.push('- body is required and must contain at least 20 characters')
  }

  for (const bl of bodyLines) {
    if (bl.length > 72) {
      failures.push(`- body lines must be 72 characters or less: '${bl}' (${bl.length})`)
      break
    }
  }

  if (failures.length > 0) return { ok: false, failures }
  return { ok: true }
}
