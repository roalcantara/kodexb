export type PrefixMatch = {
  matched: boolean
  matchedPrefix?: string
  diagnostic?: string
}

export type ExecutionPolicyValidation = {
  command: string
  allowed_prefixes: string[]
  match: PrefixMatch
  overall: 'allowed' | 'rejected'
  diagnostic?: string
}

function normalizeWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

export function validateCommandPrefix(command: string, allowedPrefixes: string[]): PrefixMatch {
  const normalized = normalizeWhitespace(command)

  for (const rawPrefix of allowedPrefixes) {
    const prefix = normalizeWhitespace(rawPrefix)
    if (normalized.startsWith(prefix) && (normalized.length === prefix.length || normalized[prefix.length] === ' ')) {
      return { matched: true, matchedPrefix: rawPrefix }
    }
  }

  return {
    matched: false,
    diagnostic: `command prefix not in allowed list: ${allowedPrefixes.join(', ')}`
  }
}

export function validateExecutionPolicy(commands: string[], allowedPrefixes: string[]): ExecutionPolicyValidation[] {
  return commands.map(command => {
    const match = validateCommandPrefix(command, allowedPrefixes)
    const overall = match.matched ? 'allowed' : 'rejected'
    return {
      command,
      allowed_prefixes: allowedPrefixes,
      match,
      overall,
      diagnostic: overall === 'rejected' ? `command rejected: ${command}` : undefined
    }
  })
}
