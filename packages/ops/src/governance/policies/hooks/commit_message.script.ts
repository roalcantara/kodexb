#!/usr/bin/env bun

const ALLOWED_TYPES = ['feat', 'fix', 'docs', 'style', 'ref', 'test', 'revert', 'chore', 'ci', 'build'] as const

const SUBJECT_REGEX = /^(feat|fix|docs|style|ref|test|revert|chore|ci|build)(\([^)]*\))?(!)?: [A-Z].*/

const GENERATED_GIT_PREFIXES = ['Merge ', 'Revert ', 'fixup! ', 'squash! '] as const

const WIP_WORD_REGEX = /\bwip\b/i

const PERIOD_END_REGEX = /\.$/

/**
 * Git strips `#` comment lines from COMMIT_EDITMSG before recording the message.
 * With `commit.verbose=true`, Git also appends a full unified diff after the `#`
 * hints — those diff lines are not comments and must not be validated as body text.
 */
function isCommitTemplateTrailerLine(line: string): boolean {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('#')) return true
  if (trimmed.startsWith('diff --git ')) return true
  if (trimmed.startsWith('diff --cc ')) return true
  if (trimmed.startsWith('diff --combined ')) return true
  return false
}

function bodyLinesFromMessage(allLines: string[]): string[] {
  const body: string[] = []
  for (const line of allLines.slice(2)) {
    if (isCommitTemplateTrailerLine(line)) break
    body.push(line)
  }
  return body
}

const messageFile = process.argv[2]

if (!messageFile) {
  console.log('commit message policy: missing message file')
  process.exit(1)
}

const file = Bun.file(messageFile)
if (!(await file.exists())) {
  console.log('commit message policy: missing message file')
  process.exit(1)
}

const contents = await file.text()
const lines = contents.split('\n')
const subject = lines[0] ?? ''

// Skip generated Git subjects
for (const prefix of GENERATED_GIT_PREFIXES) {
  if (subject.startsWith(prefix)) {
    console.log('commit message policy: skipped generated git subject')
    process.exit(0)
  }
}

// Skip Dependabot authors
const authorName =
  process.env.GIT_HOOK_AUTHOR_NAME ??
  process.env.GIT_AUTHOR_NAME ??
  (() => {
    try {
      const child = Bun.spawnSync(['git', 'var', 'GIT_AUTHOR_IDENT'])
      return child.stdout?.toString().trim() ?? ''
    } catch {
      return ''
    }
  })()
if (authorName && /dependabot/i.test(authorName)) {
  console.log('commit message policy: skipped dependabot author')
  process.exit(0)
}

// Collect failures
const failures: string[] = []

// Check type validity
const typeMatch = subject.match(/^([a-z]+)/)
const type = typeMatch?.[1]
if (!type || !(ALLOWED_TYPES as readonly string[]).includes(type)) {
  failures.push('- subject must match type(scope): Description with an allowed type and capitalized description')
} else {
  // Only check regex if type is valid (to avoid misleading duplicate message)
  if (!SUBJECT_REGEX.test(subject)) {
    failures.push('- subject must match type(scope): Description with an allowed type and capitalized description')
  }
}

// Subject length — Release subjects relax only the 50-char rule
const isRelease = subject.startsWith('Release ')
if (isRelease) {
  if (subject.length < 5) {
    failures.push('- subject must be at least 5 characters')
  }
} else {
  if (subject.length < 5 || subject.length > 50) {
    failures.push('- subject must be 5-50 characters')
  }
}

// WIP check
if (WIP_WORD_REGEX.test(subject)) {
  failures.push('- subject must not contain wip')
}

// Period at end of subject
if (PERIOD_END_REGEX.test(subject)) {
  failures.push('- subject must not end with a period')
}

// Body required and >= 20 non-whitespace chars (stop before Git template / verbose diff)
const bodyLines = bodyLinesFromMessage(lines)
const body = bodyLines.join('\n')
const bodyNonWhitespace = body.replace(/\s/g, '').length
if (bodyNonWhitespace < 20) {
  failures.push('- body is required and must contain at least 20 characters')
}

// Body line length <= 72
for (const bl of bodyLines) {
  if (bl.length > 72) {
    failures.push(`- body lines must be 72 characters or less: '${bl}' (${bl.length})`)
    break
  }
}

if (failures.length > 0) {
  console.log('commit message policy: failed')
  for (const f of failures) {
    console.log(f)
  }
  process.exit(1)
}

console.log('commit message policy: ok')
