import { existsSync, readFileSync } from 'node:fs'
import { type Envelope, EnvelopeSchema } from '@kb/workflow-core'
import { Value } from '@sinclair/typebox/value'

export type EnvelopeOutcome = {
  envelope: Envelope | null
  outcome: 'present_valid' | 'absent' | 'malformed'
  diagnostics: string[]
}

export function captureEnvelope(envelopePath: string): EnvelopeOutcome {
  if (!existsSync(envelopePath)) {
    return {
      envelope: null,
      outcome: 'absent',
      diagnostics: ['envelope file not found']
    }
  }

  let raw: unknown
  try {
    const content = readFileSync(envelopePath, 'utf-8')
    raw = JSON.parse(content)
  } catch (err) {
    return {
      envelope: null,
      outcome: 'malformed',
      diagnostics: [`failed to parse envelope JSON: ${err}`]
    }
  }

  if (!Value.Check(EnvelopeSchema, raw)) {
    const errors = [...Value.Errors(EnvelopeSchema, raw)]
    return {
      envelope: null,
      outcome: 'malformed',
      diagnostics: errors.map(e => `${e.path}: ${e.message}`)
    }
  }

  return {
    envelope: raw as Envelope,
    outcome: 'present_valid',
    diagnostics: []
  }
}
