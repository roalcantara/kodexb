/**
 * Shared gum styling for Bun-backed mise task scripts.
 * Andromeda Void palette — use from any `tools/<task>/*.script.ts` CLI.
 *
 * Bun note: `Bun.spawnSync` always pipes gum stdout, so lipgloss sees a non-TTY
 * and strips ANSI unless the child env sets `CLICOLOR_FORCE=1`. We honor
 * `NO_COLOR` when the caller has opted out of color.
 */

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
  const flat = rows.flat()
  if (flat.length === 0) return ''
  return (
    runGum([
      'table',
      '--border',
      'rounded',
      '--border-foreground',
      GUM.accent,
      '--separator',
      '─',
      '--columns',
      ...columns,
      ...flat
    ]) ?? rows.map(r => `  ${r.join('  ')}`).join('\n')
  )
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
