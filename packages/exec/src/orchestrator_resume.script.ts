import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { type Envelope, EnvelopeSchema } from '@kb/flow'
import { Value } from '@sinclair/typebox/value'

export function readEnvelopeFile(envPath: string): Envelope | null {
  if (!existsSync(envPath)) return null
  try {
    const raw = JSON.parse(readFileSync(envPath, 'utf-8'))
    if (!Value.Check(EnvelopeSchema, raw)) return null
    return raw as Envelope
  } catch {
    return null
  }
}

export function seedDispatchedKeys(
  runDir: string,
  runId: string,
  stageCommands: Record<string, string>,
  addKey: (key: string) => void
): void {
  const pattern = new RegExp(`${runId}\\.envelope\\.(.+)\\.json$`)
  try {
    for (const file of readdirSync(runDir)) {
      const match = file.match(pattern)
      if (match === null) continue
      const stage = match[1] ?? ''
      const envPath = path.join(runDir, file)
      const envelope = readEnvelopeFile(envPath)
      if (envelope) {
        const command = stageCommands[stage] ?? ''
        addKey(envelope.idempotency_key ?? `${runId}:${stage}:${command}`)
      }
    }
  } catch {
    // runDir may not exist yet
  }
}
