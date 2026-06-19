/**
 * spec audit output — gum pretty, raw, and JSON renderers.
 *
 * Pretty mode uses gum_theme.script.ts for Andromeda Void styling.
 * Raw mode emits plain text with ✓/✗ glyphs.
 * JSON mode dumps structured AuditResult.
 */
import {
  gumFail,
  gumInfo,
  gumMuted,
  gumNextSteps,
  gumOk,
  gumSection,
  gumSubtitle,
  gumTable,
  gumTitle,
  gumWarn
} from '../../support/lib/cli/gum_theme.script'
import { chooseRenderer, type RenderMode } from '../../support/lib/cli/render_mode.script'
import type { AuditResult } from './audit_core.script'

export type { RenderMode } from '../../support/lib/cli/render_mode.script'
export { chooseRenderer } from '../../support/lib/cli/render_mode.script'

function severityLabel(level: string): string {
  switch (level) {
    case 'error':
      return 'ERROR'
    case 'warn':
      return 'WARN'
    case 'info':
      return 'info'
    default:
      return '????'
  }
}

function slugFromDir(featureDir: string): string {
  return featureDir.replace(/\/$/, '').split('/').pop() ?? featureDir
}

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/')
}

export function renderAudit(result: AuditResult, mode: RenderMode): void {
  if (mode === 'json') {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (mode === 'raw') {
    const dir = result.featureDir
    const s = result.summary
    console.log(`Spec audit · ${slugFromDir(dir)}`)
    console.log(`  ${s.errors}/${s.warns}/${s.infos}  errors/warns/info  (${s.total} checks)`)
    console.log(`  Phase: ${result.phase.name}`)
    if (result.findings.length > 0) {
      const sep = '  |  '
      console.log(`  ${'Severity'.padEnd(7)}${sep}Rule${sep}File${sep}Message`)
      for (const f of result.findings) {
        const sev = severityLabel(f.level).padEnd(7)
        const loc = pathShort(f.line ? `${f.file}:${f.line}` : f.file, result.featureDir)
        console.log(`  ${sev}${sep}${f.rule}${sep}${loc}${sep}${f.message}`)
      }
    }
    if (s.errors === 0 && s.warns === 0) {
      console.log('  OK — spec audit clean')
    } else if (s.errors === 0 && s.warns > 0) {
      console.log(`  ${s.warns} warning${s.warns === 1 ? '' : 's'} — review findings`)
    }
    return
  }

  const dir = slugFromDir(result.featureDir)
  const s = result.summary

  console.log(gumTitle(`Spec audit · ${dir}`))
  console.log(gumSubtitle(result.featureDir))
  console.log('')

  const clean = s.errors === 0 && s.warns === 0

  const summaryBadge = clean
    ? gumOk(`✓ ${s.total} checks`)
    : `${s.errors > 0 ? gumFail(`✗ ${s.errors} error${s.errors === 1 ? '' : 's'}`) : gumOk('✓ 0 errors')}  ${s.warns > 0 ? gumWarn(`${s.warns} warning${s.warns === 1 ? '' : 's'}`) : ''}  ${gumMuted(`${s.total} checks`)}`

  if (clean) {
    console.log(gumOk(`✓ Spec audit clean — ${dir}`))
    console.log('')
    return
  }

  console.log(gumSection('Summary'))
  console.log(`  ${summaryBadge}`)
  console.log('')

  console.log(gumSection('Phase'))
  console.log(`  ${gumInfo(result.phase.name)}`)
  console.log('')

  if (result.findings.length > 0) {
    console.log(gumSection('Findings'))
    const rows = result.findings.map(f => {
      const sev = f.level === 'error' ? gumFail('error') : f.level === 'warn' ? gumWarn('warn') : gumMuted('info')
      const loc = f.line ? `${pathShort(f.file, result.featureDir)}:${f.line}` : pathShort(f.file, result.featureDir)
      return [sev, gumInfo(f.rule), gumMuted(loc), f.message]
    })
    const tbl = gumTable(['Sev', 'Rule', 'File', 'Message'], rows)
    if (tbl) console.log(tbl)
    console.log('')
  }

  const steps: string[] = []
  if (s.errors > 0) steps.push(`fix ${s.errors} error${s.errors === 1 ? '' : 's'} and re-run`)
  steps.push(`mise run spec audit ${result.featureDir} --strict`)
  if (result.phase.name && result.phase.name !== 'gate') {
    steps.push(`${result.phase.name.includes('analyze') ? '/speckit-analyze' : '/speckit-tasks'}  (tasks pass)`)
  }
  gumNextSteps(steps)
}

function pathShort(fullPath: string, featureDir: string): string {
  const full = normalizePath(fullPath)
  const feature = normalizePath(featureDir).replace(/\/$/, '')
  const featureIdx = full.indexOf(feature)
  if (featureIdx >= 0) return full.slice(featureIdx)

  const governanceIdx = full.indexOf('packages/ops/src/governance/')
  if (governanceIdx >= 0) return full.slice(governanceIdx)

  return full
}

export function rendererForFlags(opts: { json: boolean; raw: boolean; isTty: boolean }): RenderMode {
  return chooseRenderer(opts)
}
