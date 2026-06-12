#!/usr/bin/env bun
import { existsSync } from 'node:fs'
import path from 'node:path'
import { writeEnvelope } from '../kit_envelope.script'
import { generateRunId, slugFromFeatureDir } from '../workflow_run.script'

function parseArgs(argv: string[]): { feature?: string } {
  const args: { feature?: string } = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--feature' && argv[i + 1]) args.feature = argv[++i]
  }
  return args
}

export function run(argv: string[]): number {
  const { feature } = parseArgs(argv)
  const featureDir = feature ?? process.env.usage_feature ?? ''

  process.stdout.write('kit review: dispatching app-review-handoff\n')

  const reviewPath = featureDir
    ? path.join('tmp', 'handoffs', `review-${path.basename(featureDir)}.md`)
    : 'tmp/handoffs/review.md'

  const verdict = existsSync(reviewPath) ? 'FIX' : 'APPROVE'

  if (verdict === 'APPROVE') {
    process.stdout.write('Review verdict: APPROVE\n')
  } else {
    process.stdout.write(`Review verdict: FIX — see ${reviewPath}\n`)
  }

  const slug = featureDir ? slugFromFeatureDir(featureDir) : 'review'
  const runId = generateRunId(slug)
  writeEnvelope({
    runId,
    stage: 'review',
    status: verdict === 'APPROVE' ? 'DONE' : 'RETRYABLE_FAILURE',
    artifactsCreated: verdict === 'FIX' ? [reviewPath] : [],
    evidence: verdict === 'FIX' ? [{ kind: 'artifact', ref: reviewPath }] : [],
    diagnostics:
      verdict === 'APPROVE'
        ? [{ code: 'REVIEW_APPROVE', message: 'Review passed', severity: 'info' }]
        : [
            {
              code: 'REVIEW_FIX_REQUIRED',
              message: 'Review found issues requiring fixes',
              severity: 'warn',
              remediation: `See ${reviewPath}`
            }
          ],
    retryCount: 0,
    elapsedMs: 0,
    featureDir
  })

  return verdict === 'APPROVE' ? 0 : 1
}

if (import.meta.main) process.exit(run(process.argv.slice(2)))
