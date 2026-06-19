import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  appendLauncherProbe,
  clearLauncherProbeFile,
  isLauncherProbeEnabled,
  type LauncherProbePayload
} from './launcher_frame_probe.util'

const basePayload = (): LauncherProbePayload => ({
  ts: '2026-01-01T00:00:00.000Z',
  event: 'present',
  cursor: { x: 100, y: 200 },
  displays: [],
  targetId: 1,
  primaryId: 1,
  screenFrame: { x: 481, y: 275, width: 748, height: 600 },
  setFrameArgs: { x: 481, y: 275, width: 748, height: 600 },
  readback: null
})

function useTempProbeDir() {
  const saved = process.env
  let dir = ''
  let probePath = ''

  afterEach(() => {
    process.env = saved
    if (dir) rmSync(dir, { recursive: true, force: true })
  })

  function createProbeDir() {
    dir = mkdtempSync(join(tmpdir(), 'kb-probe-'))
    probePath = join(dir, 'probe.ndjson')
    return probePath
  }

  return {
    saved,
    createProbeDir,
    get probePath() {
      return probePath
    }
  }
}

describe('isLauncherProbeEnabled()', () => {
  const env = process.env

  afterEach(() => {
    process.env = env
  })

  it('returns true when KB_WINDOW_PROBE is set', () => {
    process.env = { ...env, KB_WINDOW_PROBE: '1', LOG_LEVEL: undefined }
    expect(isLauncherProbeEnabled()).toBe(true)
  })

  it('returns true when LOG_LEVEL is debug', () => {
    process.env = { ...env, KB_WINDOW_PROBE: undefined, LOG_LEVEL: 'debug' }
    expect(isLauncherProbeEnabled()).toBe(true)
  })

  it('returns false when neither flag is set', () => {
    process.env = { ...env, KB_WINDOW_PROBE: undefined, LOG_LEVEL: 'info' }
    expect(isLauncherProbeEnabled()).toBe(false)
  })
})

describe('appendLauncherProbe()', () => {
  const { saved, createProbeDir } = useTempProbeDir()

  it('writes NDJSON when probe is enabled', () => {
    const path = createProbeDir()
    process.env = { ...saved, KB_WINDOW_PROBE: '1' }

    appendLauncherProbe(basePayload(), path)

    const lines = readFileSync(path, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      event: 'present',
      screenFrame: { width: 748, height: 600 }
    })
  })

  it('no-ops when probe is disabled', () => {
    const path = createProbeDir()
    process.env = { ...saved, KB_WINDOW_PROBE: undefined, LOG_LEVEL: 'info' }

    appendLauncherProbe(basePayload(), path)

    expect(() => readFileSync(path, 'utf8')).toThrow()
  })
})

describe('clearLauncherProbeFile()', () => {
  const { saved, createProbeDir } = useTempProbeDir()

  it('truncates the probe file when enabled', () => {
    const path = createProbeDir()
    process.env = { ...saved, KB_WINDOW_PROBE: '1' }
    appendLauncherProbe(basePayload(), path)

    clearLauncherProbeFile(path)

    expect(readFileSync(path, 'utf8')).toBe('')
  })
})
