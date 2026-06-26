import { appendFileSync, writeFileSync } from 'node:fs'

import type { Display } from 'electrobun/bun'

import type { WindowFrame } from './placement.util'

export const LAUNCHER_PROBE_PATH = '/tmp/kb-probe.ndjson'

export type LauncherProbePayload = {
  ts: string
  event: 'present'
  cursor: { x: number; y: number }
  displays: Array<{ id: number; bounds: Display['bounds']; workArea: Display['workArea'] }>
  targetId: number
  primaryId: number
  screenFrame: WindowFrame
  setFrameArgs: WindowFrame
  setSizeBefore?: { width: number; height: number }
  setSizeAfter?: { width: number; height: number }
  readback: WindowFrame | null
}

export function isLauncherProbeEnabled(): boolean {
  return (
    process.env.KB_WINDOW_PROBE === '1' || process.env.KB_PLACEMENT_PROBE === '1' || process.env.LOG_LEVEL === 'debug'
  )
}

export function clearLauncherProbeFile(path = LAUNCHER_PROBE_PATH): void {
  if (!isLauncherProbeEnabled()) return
  try {
    writeFileSync(path, '', 'utf8')
  } catch {
    // probe file is best-effort
  }
}

export function appendLauncherProbe(payload: LauncherProbePayload, path = LAUNCHER_PROBE_PATH): void {
  if (!isLauncherProbeEnabled()) return
  try {
    appendFileSync(path, `${JSON.stringify(payload)}\n`, 'utf8')
  } catch {
    // probe file is best-effort
  }
}
