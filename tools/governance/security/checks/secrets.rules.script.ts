export const ENTROPY_MIN_BITS = 4.5
export const ENTROPY_MIN_LENGTH = 32

export const SECRETS_REGEX_RULES: Array<{ id: string; pattern: RegExp }> = [
  { id: 'generic-api-key', pattern: /(?:api[_-]?key|token|secret)\s*[:=]\s*["']?[A-Za-z0-9_-]{16,}["']?/gi },
  { id: 'github-pat', pattern: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { id: 'aws-access-key-id', pattern: /AKIA[0-9A-Z]{16}/g }
]

export function shannonEntropy(input: string): number {
  if (!input.length) return 0
  const frequencies = new Map<string, number>()
  for (const ch of input) {
    frequencies.set(ch, (frequencies.get(ch) ?? 0) + 1)
  }

  let entropy = 0
  for (const count of frequencies.values()) {
    const p = count / input.length
    entropy -= p * Math.log2(p)
  }
  return entropy
}
