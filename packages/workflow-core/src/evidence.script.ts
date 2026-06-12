import type { Static } from '@sinclair/typebox'
import type { Envelope, EvidenceEntry } from './schemas/envelope.schema'

type EvidenceEntryType = Static<typeof EvidenceEntry>
type MarkerEntry = EvidenceEntryType & { kind: 'marker' }
type ArtifactEntry = EvidenceEntryType & { kind: 'artifact' }
type CommandEntry = EvidenceEntryType & { kind: 'command' }

export type EvidenceResult = {
  kind: 'command' | 'artifact' | 'marker'
  ref: string
  passed: boolean
  diagnostic?: string
}

export type EvidenceContext = {
  fileExists: (path: string) => boolean
  readFile?: (path: string) => string | null
  contentHash?: (content: string) => string
}

function evaluateMarkerEntry(entry: MarkerEntry, ctx: EvidenceContext): EvidenceResult {
  const exists = ctx.fileExists(entry.ref)
  return {
    kind: 'marker',
    ref: entry.ref,
    passed: exists,
    diagnostic: exists ? undefined : `marker not found: ${entry.ref}`
  }
}

function evaluateArtifactEntry(entry: ArtifactEntry, ctx: EvidenceContext): EvidenceResult {
  if (!ctx.fileExists(entry.ref)) {
    return { kind: 'artifact', ref: entry.ref, passed: false, diagnostic: `artifact not found: ${entry.ref}` }
  }
  if (entry.expected && ctx.readFile && ctx.contentHash) {
    const content = ctx.readFile(entry.ref)
    if (content === null) {
      return { kind: 'artifact', ref: entry.ref, passed: false, diagnostic: `cannot read artifact: ${entry.ref}` }
    }
    const hash = ctx.contentHash(content)
    const passed = hash === entry.expected
    return {
      kind: 'artifact',
      ref: entry.ref,
      passed,
      diagnostic: passed ? undefined : `hash mismatch for ${entry.ref}`
    }
  }
  return { kind: 'artifact', ref: entry.ref, passed: true }
}

function evaluateCommandEntry(entry: CommandEntry): EvidenceResult {
  return { kind: 'command', ref: entry.ref, passed: true, diagnostic: 'deferred to L2 Executor adapter' }
}

export function evaluateEvidence(envelope: Envelope, ctx: EvidenceContext): EvidenceResult[] {
  return envelope.evidence.map(entry => {
    switch (entry.kind) {
      case 'marker':
        return evaluateMarkerEntry(entry as MarkerEntry, ctx)
      case 'artifact':
        return evaluateArtifactEntry(entry as ArtifactEntry, ctx)
      case 'command':
        return evaluateCommandEntry(entry as CommandEntry)
      default:
        return { kind: 'command', ref: entry.ref, passed: false, diagnostic: `unknown evidence kind: ${entry.kind}` }
    }
  })
}
