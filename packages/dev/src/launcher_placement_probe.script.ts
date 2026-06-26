#!/usr/bin/env bun
/**
 * Launcher placement probe (L2 verification).
 *
 * Usage:
 *   bun run reinstall:macos
 *   KB_PLACEMENT_PROBE=1 mise run validate-launcher-placement
 *
 * L1: always runs `bun test src/shell/main/window/`.
 * L2: when KB_PLACEMENT_PROBE=1 or --probe — spawns kb, moves cursor, summons, asserts NDJSON.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import {
  LAUNCHER_PROBE_PATH,
  type LauncherProbePayload
} from '../../../src/shell/main/window/launcher_frame_probe.adapter'
import {
  centerBoundsInWorkArea,
  normalizeDisplay,
  type WindowFrame
} from '../../../src/shell/main/window/placement.util'
import { MAIN_WINDOW_DEFAULT_SIZE } from '../../../src/shell/main/window/window.const'

const KB_APP = '/Applications/kb.app/Contents/MacOS/launcher'
const KB_APP_KILL_PATTERN = '/Applications/kb.app/Contents/MacOS/launcher'
const TOLERANCE_PX = 2
const PROBE_TIMEOUT_MS = 12_000
const POLL_MS = 200

type ProbeDisplay = {
  id: number
  bounds: WindowFrame
  workArea: WindowFrame
  isPrimary: boolean
}

function runUnitTests(): number {
  console.log('validate-launcher-placement: L1 unit specs…')
  const result = Bun.spawnSync(
    ['bun', 'test', 'src/shell/main/window/', 'packages/dev/src/launcher_placement_probe.script.spec.ts'],
    {
      stdout: 'inherit',
      stderr: 'inherit'
    }
  )
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

/** CoreGraphics display list (top-left global space, same as Electrobun Screen). */
export function listCoreGraphicsDisplays(): ProbeDisplay[] {
  const script = `
import CoreGraphics
var count: UInt32 = 0
CGGetActiveDisplayList(0, nil, &count)
var ids = [CGDirectDisplayID](repeating: 0, count: Int(count))
CGGetActiveDisplayList(count, &ids, &count)
let main = CGMainDisplayID()
for id in ids {
  let b = CGDisplayBounds(id)
  let primary = id == main ? 1 : 0
  print("\\(id)\\t\\(b.origin.x)\\t\\(b.origin.y)\\t\\(b.size.width)\\t\\(b.size.height)\\t\\(primary)")
}
`
  const result = Bun.spawnSync(['swift', '-e', script], { stdout: 'pipe', stderr: 'pipe' })
  if (result.exitCode !== 0) return []

  const text = new TextDecoder().decode(result.stdout).trim()
  if (!text) return []

  return text.split('\n').map(line => {
    const [id, x, y, width, height, isPrimary] = line.split('\t')
    const bounds = {
      x: Number(x),
      y: Number(y),
      width: Number(width),
      height: Number(height)
    }
    const normalized = normalizeDisplay({
      id: Number(id),
      bounds,
      scaleFactor: 1,
      isPrimary: isPrimary === '1'
    })
    return {
      id: normalized.id,
      bounds: normalized.bounds,
      workArea: normalized.workArea,
      isPrimary: isPrimary === '1'
    }
  })
}

function displayCenter(workArea: WindowFrame): { x: number; y: number } {
  return {
    x: workArea.x + workArea.width / 2,
    y: workArea.y + workArea.height / 2
  }
}

function ensureKbNotRunning(): void {
  Bun.spawnSync(['pkill', '-f', KB_APP_KILL_PATTERN], { stdout: 'ignore', stderr: 'ignore' })
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

export function assertProbe(payload: LauncherProbePayload): string[] {
  const errors: string[] = []
  const target = payload.displays.find(d => d.id === payload.targetId)
  if (!target) {
    return [`target display ${payload.targetId} missing from payload`]
  }

  const expected = centerBoundsInWorkArea(target.workArea, MAIN_WINDOW_DEFAULT_SIZE)
  const { screenFrame } = payload

  if (screenFrame.width !== MAIN_WINDOW_DEFAULT_SIZE.width || screenFrame.height !== MAIN_WINDOW_DEFAULT_SIZE.height) {
    errors.push(`size ${screenFrame.width}x${screenFrame.height} expected 748x600`)
  }
  if (payload.targetId !== target.id) {
    errors.push(`targetId ${payload.targetId} unexpected`)
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

function selectProbeTargets(displays: ProbeDisplay[]): ProbeDisplay[] {
  if (displays.length === 0) return []
  const filter = process.argv.find(a => a.startsWith('--display='))?.split('=')[1]
  const primary = displays.find(d => d.isPrimary) ?? displays[0]
  const external = displays.find(d => !d.isPrimary)
  if (filter === 'primary' && primary) return [primary]
  if (filter === 'external' && external) return [external]
  if (external) return [primary, external].filter((d): d is ProbeDisplay => d !== undefined)
  return [primary]
}

async function runDesktopProbe(): Promise<number> {
  if (process.platform !== 'darwin') {
    console.log('validate-launcher-placement: L2 skipped (not macOS)')
    return 0
  }
  if (!existsSync(KB_APP)) {
    console.error(`validate-launcher-placement: L2 failed — ${KB_APP} missing (run reinstall:macos)`)
    return 1
  }

  const displays = listCoreGraphicsDisplays()
  if (displays.length === 0) {
    console.error('validate-launcher-placement: L2 failed — could not enumerate displays')
    return 1
  }

  const targets = selectProbeTargets(displays)
  writeFileSync(LAUNCHER_PROBE_PATH, '', 'utf8')
  ensureKbNotRunning()
  await sleep(500)

  console.log(`validate-launcher-placement: L2 spawning kb (${targets.length} display(s))…`)
  const child = Bun.spawn([KB_APP], {
    env: {
      ...process.env,
      KB_WINDOW_PROBE: '1',
      KB_PLACEMENT_PROBE: '1',
      LOG_LEVEL: 'debug'
    },
    stdout: 'ignore',
    stderr: 'pipe'
  })

  await sleep(2_500)

  let failures = 0
  for (const target of targets) {
    const center = displayCenter(target.workArea)
    console.log(
      `  probing display id=${target.id}${target.isPrimary ? ' (primary)' : ''} cursor→ ${Math.round(center.x)},${Math.round(center.y)}`
    )
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

    const errors = assertProbe(payload)
    if (errors.length > 0) {
      console.error(`  FAIL display ${target.id}: ${errors.join('; ')}`)
      failures++
    } else {
      console.log(`  PASS display ${target.id}: screen=${payload.screenFrame.x},${payload.screenFrame.y} 748x600`)
    }
  }

  child.kill()
  ensureKbNotRunning()
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
