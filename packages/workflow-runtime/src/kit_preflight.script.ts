export type PreflightResult = {
  allowed: boolean
  reason?: string
  resumeHint?: string
}

const ALLOWED_VERBS = new Set([
  'specify',
  'clarify',
  'checklist',
  'plan',
  'analyze',
  'tasks',
  'handoff-generate',
  'implement',
  'pr-prep',
  'review',
  'gate',
  'pr-open',
  'pr-check'
])

export function preflightCheck(
  verb: string,
  _featureDir: string,
  _runId: string,
  _options: { approve?: boolean } = {}
): PreflightResult {
  if (!ALLOWED_VERBS.has(verb)) {
    return { allowed: false, reason: `verb "${verb}" is not in the execution allowlist` }
  }

  return { allowed: true }
}
