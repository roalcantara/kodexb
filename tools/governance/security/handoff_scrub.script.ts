#!/usr/bin/env bun
import { HandoffScrubError, scrubPrompt } from '@kb/workflow-runtime'
import { appendSecurityRunEvent } from './run_writer.script.ts'

export { HandoffScrubError, scrubPrompt }

type HandoffScrubArgs = {
  body: string
  featureDir: string | null
}

function parseArgs(argv: string[]): HandoffScrubArgs {
  let featureDir: string | null = null
  const bodyParts: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg) continue
    if (arg === '--feature') {
      const next = argv[i + 1]
      if (!next || next.startsWith('-')) {
        throw new Error('--feature requires a non-flag argument')
      }
      featureDir = next
      i += 1
      continue
    }
    bodyParts.push(arg)
  }

  const body = bodyParts.join(' ').trim()
  return { body, featureDir }
}

function main(): number {
  const args = parseArgs(process.argv.slice(2))
  let exitCode = 0
  let severityMax: 'high' | null = null
  const emitRunEvent = (findingsCount: number) => {
    appendSecurityRunEvent(process.cwd(), `scrub-${Date.now()}`, {
      ts: new Date().toISOString(),
      phase: 'handoff-scrub',
      trigger: 'handoff-emit',
      findingsCount,
      severityMax,
      exitCode,
      durationMs: 0,
      feature: process.env.SPEC_FEATURE_SLUG ?? args.featureDir
    })
  }

  try {
    scrubPrompt(args.body, args.featureDir)
  } catch (error) {
    exitCode = 1
    severityMax = 'high'
    emitRunEvent(1)
    throw error
  }

  emitRunEvent(0)
  return 0
}

if (import.meta.main) process.exit(main())
