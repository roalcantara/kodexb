import { ENVELOPE_SCHEMA_VERSION, type Envelope } from './envelope.schema'

export function makeEnvelope(overrides?: Partial<Envelope>): Envelope {
  return {
    schema_version: ENVELOPE_SCHEMA_VERSION,
    stage: 'specify',
    status: 'DONE',
    artifacts_created: [],
    evidence: [],
    diagnostics: [],
    retry_count: 0,
    elapsed_ms: 100,
    ...overrides
  } as Envelope
}
