import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { type Envelope, EnvelopeSchema } from '@kb/workflow-core'
import { Value } from '@sinclair/typebox/value'

export type EnvelopeInput = {
  runId: string
  stage: string
  status: Envelope['status']
  artifactsCreated: Envelope['artifacts_created']
  evidence: Envelope['evidence']
  diagnostics: Envelope['diagnostics']
  retryCount: Envelope['retry_count']
  elapsedMs: Envelope['elapsed_ms']
  featureDir?: string
}

export function writeEnvelope(input: EnvelopeInput): void {
  const envelope: Envelope = {
    schema_version: '009.1.0' as const,
    idempotency_key: `${input.runId}:${input.stage}`,
    stage: input.stage,
    status: input.status,
    artifacts_created: input.artifactsCreated,
    evidence: input.evidence,
    diagnostics: input.diagnostics,
    retry_count: input.retryCount,
    elapsed_ms: input.elapsedMs
  }

  if (!Value.Check(EnvelopeSchema, envelope)) {
    throw new Error(`kit envelope: invalid envelope for stage "${input.stage}"`)
  }

  const today = new Date().toISOString().slice(0, 10)
  const dir = path.resolve('tmp/workflow-runs', today, input.runId)
  mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, `${input.runId}.envelope.${input.stage}.json`)
  writeFileSync(filePath, JSON.stringify(envelope, null, 2))
}

export function readEnvelope(runId: string, stage: string): Envelope | null {
  const today = new Date().toISOString().slice(0, 10)
  const filePath = path.resolve('tmp/workflow-runs', today, runId, `${runId}.envelope.${stage}.json`)
  if (!existsSync(filePath)) return null
  try {
    const raw = readFileSync(filePath, 'utf-8')
    const parsed: unknown = JSON.parse(raw)
    if (!Value.Check(EnvelopeSchema, parsed)) return null
    return parsed
  } catch {
    return null
  }
}
