/**
 * Shared gum styling for Bun-backed mise task scripts.
 * Andromeda Void palette — use from any `packages/ops/src/<task>/*.script.ts` CLI.
 *
 * Bun note: `Bun.spawnSync` always pipes gum stdout, so lipgloss sees a non-TTY
 * and strips ANSI unless the child env sets `CLICOLOR_FORCE=1`. We honor
 * `NO_COLOR` when the caller has opted out of color.
 */

import { unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const GUM = {
  success: '#5ecfbe',
  error: '#ef4444',
  warn: '#f59e0b',
  info: '#3399ff',
  accent: '#ddb7ff',
  muted: '#8892a4',
  label: '#e2e9f5',
  rationale: '#f5f5f5',
  badge_bg: '#252733'
} as const

/** Env for gum subprocesses — force ANSI when capturing styled output via pipe. */
export function gumSubprocessEnv(): Record<string, string | undefined> {
  const env = { ...process.env }
  if (env.NO_COLOR) return env
  env.CLICOLOR_FORCE = '1'
  return env
}

export function gumAvailable(): boolean {
  const which = Bun.spawnSync(['sh', '-c', 'command -v gum'], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: gumSubprocessEnv()
  })
  return which.exitCode === 0
}

function runGum(args: string[]): string | null {
  if (!gumAvailable()) return null
  const child = Bun.spawnSync(['gum', ...args], {
    stdout: 'pipe',
    stderr: 'pipe',
    env: gumSubprocessEnv()
  })
  if (child.exitCode !== 0) return null
  return new TextDecoder().decode(child.stdout).trimEnd()
}

export function gumStyle(text: string, flags: string[]): string {
  return runGum(['style', ...flags, text]) ?? text
}

export function gumFore(text: string, color: string): string {
  return gumStyle(text, ['--foreground', color])
}

export function gumTitle(text: string): string {
  return (
    runGum([
      'style',
      '--border',
      'double',
      '--border-foreground',
      GUM.accent,
      '--foreground',
      GUM.label,
      '--bold',
      '--padding',
      '0 2',
      '--margin',
      '1 0',
      text
    ]) ?? text
  )
}

export function gumSubtitle(text: string): string {
  return gumStyle(text, ['--foreground', GUM.muted, '--italic'])
}

export function gumBold(text: string, color: string = GUM.label): string {
  return gumStyle(text, ['--bold', '--foreground', color])
}

export function gumOk(text: string): string {
  return gumStyle(text, ['--foreground', GUM.success, '--bold'])
}

export function gumFail(text: string): string {
  return gumStyle(text, ['--foreground', GUM.error, '--bold'])
}

export function gumWarn(text: string): string {
  return gumStyle(text, ['--foreground', GUM.warn])
}

export function gumInfo(text: string): string {
  return gumStyle(text, ['--foreground', GUM.info])
}

export function gumMuted(text: string): string {
  return gumStyle(text, ['--foreground', GUM.muted])
}

/** Skill rationale and other secondary prose — whitesmoke, regular weight. */
export function gumRationale(text: string): string {
  return gumStyle(text, ['--foreground', GUM.rationale])
}

export function gumAccent(text: string): string {
  return gumStyle(text, ['--foreground', GUM.accent, '--bold'])
}

export function gumBadge(label: string, fg: string, bg: string = GUM.badge_bg): string {
  return gumStyle(` ${label} `, ['--foreground', fg, '--background', bg, '--bold'])
}

/** Section heading with filled background (full-width bar). */
export function gumSectionBanner(title: string, bg: string, fg: string = GUM.label): string {
  return gumStyle(` ▸ ${title} `, [
    '--background',
    bg,
    '--foreground',
    fg,
    '--bold',
    '--padding',
    '0 1',
    '--margin',
    '1 0'
  ])
}

export function gumTable(columns: string[], rows: string[][]): string {
  if (rows.length === 0) return ''
  if (!gumAvailable()) return rows.map(r => `  ${r.join('  ')}`).join('\n')

  const sep = '|'
  const header = columns.join(sep)
  const dataLines = rows.map(r => r.join(sep))
  const csv = [header, ...dataLines].join('\n')
  const tmp = join(tmpdir(), `gum-table-${process.pid}-${Math.random().toString(36).slice(2, 8)}`)
  writeFileSync(tmp, csv)

  const child = Bun.spawnSync(
    [
      'gum',
      'table',
      '--border',
      'rounded',
      '--border.foreground',
      GUM.accent,
      '--separator',
      sep,
      '--print',
      '--file',
      tmp
    ],
    { stdout: 'pipe', stderr: 'pipe', env: gumSubprocessEnv() }
  )

  try {
    unlinkSync(tmp)
  } catch {
    /* ignore */
  }

  if (child.exitCode !== 0) return rows.map(r => `  ${r.join('  ')}`).join('\n')
  return new TextDecoder().decode(child.stdout).trimEnd()
}

export function gumJoinHorizontal(cells: string[]): string {
  return runGum(['join', '--horizontal', ...cells]) ?? cells.join(' · ')
}

export function gumJoinVertical(lines: string[]): string {
  if (lines.length === 0) return ''
  return runGum(['join', '--vertical', ...lines]) ?? lines.join('\n')
}

export function gumSection(title: string): string {
  return gumBold(`▸ ${title}`, GUM.accent)
}

export function gumNextSteps(lines: string[]): void {
  console.log('')
  console.log(gumAccent('Next steps'))
  for (const line of lines) console.log(`  ${gumInfo('→')} ${line}`)
}

export function statusGlyph(ok: boolean, okChar = '✔', failChar = '✗'): string {
  return ok ? gumOk(okChar) : gumFail(failChar)
}

/**
 * Run `argv` under `gum spin` with a titled spinner (TTY multi-step UX). Output
 * is shown only on error (`--show-error`) so a passing run stays a clean
 * spinner line. Falls back to a direct spawn (inherited stdio) when gum is
 * unavailable. Returns the child exit code.
 */
export function gumSpinRun(title: string, argv: string[]): number {
  if (!gumAvailable()) {
    return Bun.spawnSync(argv, { stdio: ['inherit', 'inherit', 'inherit'] }).exitCode ?? 1
  }
  const child = Bun.spawnSync(['gum', 'spin', '--spinner', 'line', '--title', title, '--show-error', '--', ...argv], {
    stdio: ['inherit', 'inherit', 'inherit'],
    env: gumSubprocessEnv()
  })
  return child.exitCode ?? 1
}
