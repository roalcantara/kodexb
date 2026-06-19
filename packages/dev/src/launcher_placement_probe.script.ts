#!/usr/bin/env bun
/**
 * Launcher placement probe (L2 verification).
 *
 * Usage:
 *   bun run build && bun run install:macos
 *   KB_PLACEMENT_PROBE=1 mise run validate-launcher-placement
 *   # or with desktop probe only:
 *   KB_PLACEMENT_PROBE=1 bun packages/dev/src/launcher_placement_probe.script.ts --probe
 *
 * L1: always runs `bun test src/shell/main/window/`.
 * L2: when KB_PLACEMENT_PROBE=1 or --probe — spawns kb, moves cursor, summons, asserts NDJSON.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

import { MAIN_WINDOW_DEFAULT_SIZE } from '../../../../src/shell/main/utils/shell_hooks.util'
import {
  LAUNCHER_PROBE_PATH,
  type LauncherProbePayload
} from '../../../../src/shell/main/window/launcher_frame_probe.util'
import {
  centerBoundsInWorkArea,
  normalizeDisplay,
  resolveDisplayAtCursor
} from '../../../../src/shell/main/window/placement.util'

const KB_APP = '/Applications/kb.app/Contents/MacOS/launcher'
const TOLERANCE_PX = 2
const PROBE_TIMEOUT_MS = 8_000
const POLL_MS = 200

type DisplayLike = ReturnType<typeof normalizeDisplay>

function runUnitTests(): number {
  console.log('validate-launcher-placement: L1 unit specs…')
  const result = Bun.spawnSync(['bun', 'test', 'src/shell/main/window/'], {
    stdout: 'inherit',
    stderr: 'inherit'
  })
  return result.exitCode ?? 1
}

function shouldRunDesktopProbe(): boolean {
  return process.env.KB_PLACEMENT_PROBE === '1' || process.argv.includes('--probe')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function moveCursor(x: number, y: number): boolean {
  const cliclick = Bun.which('cliclick')
  if (cliclick) {
    const r = Bun.spawnSync(['cliclick', `m:${Math.round(x)},${Math.round(y)}`], { stdout: 'pipe', stderr: 'pipe' })
    return r.exitCode === 0
  }

  const swift = Bun.spawnSync(
    [
      'swift',
      '-e',
      `import CoreGraphics; CGWarpMouseCursorPosition(CGPoint(x: ${x}, y: ${y})); CGAssociateMouseAndMouseCursorPosition(1)`
    ],
    { stdout: 'pipe', stderr: 'pipe' }
  )
  return swift.exitCode === 0
}

function displayCenter(workArea: DisplayLike['workArea']): { x: number; y: number } {
  return {
    x: workArea.x + workArea.width / 2,
    y: workArea.y + workArea.height / 2
  }
}

async function loadScreenApi(): Promise<{
  getCursorScreenPoint: () => { x: number; y: number }
  getAllDisplays: () => DisplayLike[]
  getPrimaryDisplay: () => DisplayLike
} | null> {
  try {
    const { Screen } = await import('electrobun/bun')
    return {
      getCursorScreenPoint: () => Screen.getCursorScreenPoint(),
      getAllDisplays: () => Screen.getAllDisplays().map(normalizeDisplay),
      getPrimaryDisplay: () => normalizeDisplay(Screen.getPrimaryDisplay())
    }
  } catch {
    return null
  }
}

async function waitForProbeLine(baselineLines: number): Promise<LauncherProbePayload | null> {
  const deadline = Date.now() + PROBE_TIMEOUT_MS
  while (Date.now() < deadline) {
    if (existsSync(LAUNCHER_PROBE_PATH)) {
      const content = readFileSync(LAUNCHER_PROBE_PATH, 'utf8').trim()
      const lines = content ? content.split('\n') : []
      if (lines.length > baselineLines) {
        const last = lines.at(-1)
        if (last) return JSON.parse(last) as LauncherProbePayload
      }
    }
    await sleep(POLL_MS)
  }
  return null
}

function assertProbe(payload: LauncherProbePayload, expectedTarget: DisplayLike): string[] {
  const errors: string[] = []
  const expected = centerBoundsInWorkArea(expectedTarget.workArea, MAIN_WINDOW_DEFAULT_SIZE)
  const { screenFrame } = payload

  if (screenFrame.width !== MAIN_WINDOW_DEFAULT_SIZE.width || screenFrame.height !== MAIN_WINDOW_DEFAULT_SIZE.height) {
    errors.push(`size ${screenFrame.width}x${screenFrame.height} expected 748x600`)
  }
  if (payload.targetId !== expectedTarget.id) {
    errors.push(`targetId ${payload.targetId} expected ${expectedTarget.id}`)
  }
  if (Math.abs(screenFrame.x - expected.x) > TOLERANCE_PX) {
    errors.push(`x ${screenFrame.x} expected ${expected.x} (±${TOLERANCE_PX})`)
  }
  if (Math.abs(screenFrame.y - expected.y) > TOLERANCE_PX) {
    errors.push(`y ${screenFrame.y} expected ${expected.y} (±${TOLERANCE_PX})`)
  }
  if (payload.readback) {
    console.log(
      `  readback (diagnostic): x=${payload.readback.x} y=${payload.readback.y} ${payload.readback.width}x${payload.readback.height}`
    )
  }
  return errors
}

async function runDesktopProbe(): Promise<number> {
  if (process.platform !== 'darwin') {
    console.log('validate-launcher-placement: L2 skipped (not macOS)')
    return 0
  }
  if (!existsSync(KB_APP)) {
    console.log(`validate-launcher-placement: L2 skipped (${KB_APP} missing — run install:macos)`)
    return 0
  }

  const screen = await loadScreenApi()
  if (!screen) {
    console.error('validate-launcher-placement: L2 failed — could not load electrobun Screen API')
    return 1
  }

  const displays = screen.getAllDisplays()
  if (displays.length < 2) {
    console.log('validate-launcher-placement: L2 skipped (single display — need 2 for multi-monitor probe)')
    return 0
  }

  const primary = screen.getPrimaryDisplay()
  const external = displays.find(d => d.id !== primary.id) ?? displays[1]
  if (!external) {
    console.log('validate-launcher-placement: L2 skipped (no secondary display found)')
    return 0
  }

  const filter = process.argv.find(a => a.startsWith('--display='))?.split('=')[1]
  const targets = filter === 'primary' ? [primary] : filter === 'external' ? [external] : [primary, external]

  writeFileSync(LAUNCHER_PROBE_PATH, '', 'utf8')

  console.log('validate-launcher-placement: L2 spawning kb with KB_WINDOW_PROBE=1…')
  const child = Bun.spawn([KB_APP], {
    env: { ...process.env, KB_WINDOW_PROBE: '1', LOG_LEVEL: 'debug' },
    stdout: 'ignore',
    stderr: 'pipe'
  })

  await sleep(2_500)

  let failures = 0
  for (const target of targets) {
    const center = displayCenter(target.workArea)
    console.log(`  probing display id=${target.id} cursor→ ${Math.round(center.x)},${Math.round(center.y)}`)
    if (!moveCursor(center.x, center.y)) {
      console.error(`  failed to move cursor for display ${target.id}`)
      failures++
      continue
    }
    await sleep(300)

    const baseline = readFileSync(LAUNCHER_PROBE_PATH, 'utf8').trim().split('\n').filter(Boolean).length
    Bun.spawnSync(['open', 'kb://summon'], { stdout: 'ignore', stderr: 'ignore' })

    const payload = await waitForProbeLine(baseline)
    if (!payload) {
      console.error(`  no probe line for display ${target.id} within ${PROBE_TIMEOUT_MS}ms`)
      failures++
      continue
    }

    const atCursor = resolveDisplayAtCursor(screen)
    const errors = assertProbe(payload, atCursor)
    if (errors.length > 0) {
      console.error(`  FAIL display ${target.id}: ${errors.join('; ')}`)
      failures++
    } else {
      console.log(`  PASS display ${target.id}: screen=${payload.screenFrame.x},${payload.screenFrame.y} 748x600`)
    }
  }

  child.kill()
  return failures > 0 ? 1 : 0
}

async function main(): Promise<void> {
  const unitCode = runUnitTests()
  if (unitCode !== 0) process.exit(unitCode)

  if (!shouldRunDesktopProbe()) {
    console.log('validate-launcher-placement: L2 skipped (set KB_PLACEMENT_PROBE=1 or pass --probe)')
    process.exit(0)
  }

  const desktopCode = await runDesktopProbe()
  process.exit(desktopCode)
}

if (import.meta.main) {
  await main()
}
