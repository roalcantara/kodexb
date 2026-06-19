import { err, ok, type Result } from 'neverthrow'
import { readTextFile } from '../../support/lib/shared/text_file.script'
import { type HandoffAllowlist, validateAllowlistShape } from './allowlist.schema.script'

export class HandoffAllowlistError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'HandoffAllowlistError'
  }
}

export async function loadAllowlist(filePath: string): Promise<Result<HandoffAllowlist, HandoffAllowlistError>> {
  const fileResult = await readTextFile(filePath)
  return fileResult
    .mapErr(cause => new HandoffAllowlistError(cause.message, { cause }))
    .andThen(text => {
      try {
        const parsed = Bun.YAML.parse(text) as unknown
        return ok(validateAllowlistShape(parsed))
      } catch (error) {
        return err(new HandoffAllowlistError(error instanceof Error ? error.message : String(error), { cause: error }))
      }
    })
}
