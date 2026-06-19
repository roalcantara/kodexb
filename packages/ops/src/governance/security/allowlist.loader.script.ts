import { readFileSync } from 'node:fs'
import { parse } from 'yaml'
import { type HandoffAllowlist, validateAllowlistShape } from './allowlist.schema.script'

export class HandoffAllowlistError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HandoffAllowlistError'
  }
}

export function loadAllowlist(filePath: string): HandoffAllowlist {
  try {
    const text = readFileSync(filePath, 'utf8')
    const parsed = parse(text)
    return validateAllowlistShape(parsed)
  } catch (error) {
    if (error instanceof HandoffAllowlistError) throw error
    throw new HandoffAllowlistError(error instanceof Error ? error.message : String(error), { cause: error })
  }
}
