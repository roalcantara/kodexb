#!/usr/bin/env bun
/**
 * Cursor sessionEnd hook: log session_end summary and remove session state file.
 */
import {
  appendAuditEvent,
  deleteSessionState,
  extractSessionId,
  loadConfig,
  readHookInput,
  readSessionState,
  utcTimestamp,
} from './governance_audit.core.ts'

const config = loadConfig()
if (config.skip) {
  process.exit(0)
}

const input = (await readHookInput()) as Record<string, unknown>

const sessionId = extractSessionId(input)
const state = sessionId ? readSessionState(config, sessionId) : undefined
const timestamp = utcTimestamp()

appendAuditEvent(config, {
  timestamp,
  event: 'session_end',
  session_id: sessionId,
  governance_level: config.level,
  total_events: state?.eventCount ?? 0,
  threats_detected: state?.threatCount ?? 0,
  reason: typeof input.reason === 'string' ? input.reason : undefined,
  duration_ms: typeof input.duration_ms === 'number' ? input.duration_ms : undefined,
})

if (sessionId) {
  deleteSessionState(config, sessionId)
}

process.exit(0)
