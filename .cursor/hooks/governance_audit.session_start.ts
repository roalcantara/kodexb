#!/usr/bin/env bun
/**
 * Cursor sessionStart hook: initialize governance audit session state and log session_start.
 */
import {
  appendAuditEvent,
  extractSessionId,
  loadConfig,
  readHookInput,
  utcTimestamp,
  writeSessionState,
} from './governance_audit.core'

const config = loadConfig()
if (config.skip) {
  process.exit(0)
}

const input = await readHookInput()

const sessionId = extractSessionId(input) ?? `anonymous-${utcTimestamp()}`
const startedAt = utcTimestamp()

writeSessionState(config, {
  sessionId,
  startedAt,
  governanceLevel: config.level,
  cwd: process.cwd(),
  eventCount: 1,
  threatCount: 0,
})

appendAuditEvent(config, {
  timestamp: startedAt,
  event: 'session_start',
  session_id: sessionId,
  governance_level: config.level,
  cwd: process.cwd(),
})

process.exit(0)
