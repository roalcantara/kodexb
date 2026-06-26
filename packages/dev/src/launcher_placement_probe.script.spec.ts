import { describe, expect, it } from 'bun:test'
import type { LauncherProbePayload } from '../../../src/shell/main/window/launcher_frame_probe.adapter'
import { assertProbe } from './launcher_placement_probe.script'

function payload(overrides: Partial<LauncherProbePayload> = {}): LauncherProbePayload {
  const workArea = { x: 0, y: 32, width: 1920, height: 1048 }
  return {
    ts: '2026-01-01T00:00:00.000Z',
    event: 'present',
    cursor: { x: 960, y: 556 },
    displays: [{ id: 1, bounds: workArea, workArea }],
    targetId: 1,
    primaryId: 1,
    screenFrame: { x: 586, y: 256, width: 748, height: 600 },
    setFrameArgs: { x: 586, y: 256, width: 748, height: 600 },
    readback: null,
    ...overrides
  }
}

describe('assertProbe()', () => {
  it('passes when screenFrame matches centered work area', () => {
    expect(assertProbe(payload())).toEqual([])
  })

  it('reports y drift', () => {
    const errors = assertProbe(
      payload({
        screenFrame: { x: 586, y: 32, width: 748, height: 600 }
      })
    )
    expect(errors.some(e => e.startsWith('y '))).toBe(true)
  })
})
