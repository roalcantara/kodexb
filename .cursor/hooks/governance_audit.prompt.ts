#!/usr/bin/env bun
/**
 * Cursor beforeSubmitPrompt hook: scan user prompts for threat signals and optionally block.
 */
import {
  appendAuditEvent,
  extractPromptFromInput,
  extractSessionId,
  loadConfig,
  maxSeverity,
  readHookInput,
  readSessionState,
  scanPrompt,
  shouldBlockThreats,
  utcTimestamp,
  writeSessionState,
} from './governance_audit.core.ts'

const config = loadConfig()

function allowResponse(): void {
  console.log(JSON.stringify({ continue: true }))
}

if (config.skip) {
  allowResponse()
  process.exit(0)
}

const input = await readHookInput()

const prompt = extractPromptFromInput(input)
const sessionId = extractSessionId(input)
const timestamp = utcTimestamp()
const threats = scanPrompt(prompt)

if (sessionId) {
  const state = readSessionState(config, sessionId)
  if (state) {
    state.eventCount += 1
    if (threats.length > 0) {
      state.threatCount += threats.length
    }
    writeSessionState(config, state)
  }
}

if (threats.length === 0) {
  appendAuditEvent(config, {
    timestamp,
    event: 'prompt_scanned',
    session_id: sessionId,
    governance_level: config.level,
    status: 'clean',
  })
  allowResponse()
  process.exit(0)
}

appendAuditEvent(config, {
  timestamp,
  event: 'threat_detected',
  session_id: sessionId,
  governance_level: config.level,
  threat_count: threats.length,
  max_severity: maxSeverity(threats),
  threats,
})

if (shouldBlockThreats(config, threats.length)) {
  console.log(
    JSON.stringify({
      continue: false,
      user_message: `Prompt blocked by governance policy (level: ${config.level}). ${threats.length} threat signal(s) detected.`,
    }),
  )
  process.exit(0)
}

allowResponse()
process.exit(0)
