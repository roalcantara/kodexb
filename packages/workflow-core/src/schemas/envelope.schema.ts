import { type Static, Type } from '@sinclair/typebox'

export const ENVELOPE_SCHEMA_VERSION = '009.1.0' as const

export const StageStatus = Type.Union([
  Type.Literal('DONE'),
  Type.Literal('NEED_INPUT'),
  Type.Literal('BLOCKED'),
  Type.Literal('RETRYABLE_FAILURE')
])

export const EvidenceEntry = Type.Object({
  kind: Type.Union([Type.Literal('command'), Type.Literal('artifact'), Type.Literal('marker')]),
  ref: Type.String({ description: 'opaque command string, file path, or marker id' }),
  expected: Type.Optional(Type.String({ description: 'expected exit code or content hash' }))
})

export const Diagnostic = Type.Object({
  code: Type.String({ description: 'stable diagnostic id, e.g. EVIDENCE_MISSING' }),
  message: Type.String(),
  severity: Type.Union([Type.Literal('info'), Type.Literal('warn'), Type.Literal('error')]),
  remediation: Type.Optional(Type.String())
})

export const Question = Type.Object({
  id: Type.String({ description: 'stable question id' }),
  prompt: Type.String(),
  options: Type.Optional(Type.Array(Type.String())),
  default: Type.Optional(Type.String())
})

export const EnvelopeSchema = Type.Object({
  schema_version: Type.Literal(ENVELOPE_SCHEMA_VERSION),
  stage: Type.String(),
  status: StageStatus,
  artifacts_created: Type.Array(Type.String()),
  evidence: Type.Array(EvidenceEntry),
  diagnostics: Type.Array(Diagnostic),
  retry_count: Type.Integer({ minimum: 0 }),
  elapsed_ms: Type.Integer({ minimum: 0 }),
  questions: Type.Optional(Type.Array(Question)),
  idempotency_key: Type.Optional(Type.String())
})

export type Envelope = Static<typeof EnvelopeSchema>
