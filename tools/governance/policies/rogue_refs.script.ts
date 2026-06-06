/**
 * Inventory inbound references to assets/docs/ from permanent documentation surfaces.
 * Diagnostic only — writes tmp/audit/rogue_refs.{json,md}; not a merge gate.
 */
import type { Stats } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chdirToRepoRoot } from '../../support/lib/shared/repo_root.script.ts'

const REF_RE = /assets\/docs\/[^\s)\]"'`]+/g

/** Surfaces agents and onboarding docs should not link from (except policy prose). */
export const SCAN_TARGETS = [
  'assets/guides',
  '.agents/skills',
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  '.cursor/rules',
  '.cursor/electrobun-skill-routing.md'
] as const

/** Files that may mention legacy paths when describing authority (not navigation). */
export const POLICY_EXCEPTION_FILES = new Set([
  'assets/guides/DOC_AUTHORITY.md',
  'assets/docs/specs/SPEC_SYSTEM_BACKLOG.md'
])

export type RogueHit = {
  file: string
  line: number
  match: string
  policyException: boolean
}

export function extractMatches(lineText: string): string[] {
  return [...lineText.matchAll(REF_RE)].map(m => m[0])
}

export function scanLine(file: string, lineNumber: number, lineText: string): RogueHit[] {
  const policyException = POLICY_EXCEPTION_FILES.has(file)
  return extractMatches(lineText).map(match => ({
    file,
    line: lineNumber,
    match,
    policyException
  }))
}

export function scanText(file: string, text: string): RogueHit[] {
  const hits: RogueHit[] = []
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line) hits.push(...scanLine(file, i + 1, line))
  }
  return hits
}

async function collectMarkdownFiles(root: string, relDir: string): Promise<string[]> {
  const abs = path.join(root, relDir)
  const out: string[] = []
  async function walk(dir: string, prefix: string): Promise<void> {
    let entries: { name: string; isDirectory: () => boolean }[]
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const ent of entries) {
      const rel = prefix ? `${prefix}/${ent.name}` : ent.name
      if (ent.isDirectory()) {
        await walk(path.join(dir, ent.name), rel)
        continue
      }
      if (ent.name.endsWith('.md') || ent.name.endsWith('.mdc')) {
        out.push(path.join(relDir, rel))
      }
    }
  }
  await walk(abs, '')
  return out.sort()
}

export async function scanTargets(root: string): Promise<RogueHit[]> {
  const hits: RogueHit[] = []
  for (const target of SCAN_TARGETS) {
    const abs = path.join(root, target)
    let st: Stats | undefined
    try {
      st = await stat(abs)
    } catch {
      continue
    }
    if (st.isFile()) {
      const text = await readFile(abs, 'utf8')
      hits.push(...scanText(target, text))
      continue
    }
    if (!st?.isDirectory()) continue
    const files = await collectMarkdownFiles(root, target)
    for (const file of files) {
      const text = await readFile(path.join(root, file), 'utf8')
      hits.push(...scanText(file, text))
    }
  }
  return hits
}

export function summarize(hits: RogueHit[]): {
  total: number
  actionable: number
  byFile: Map<string, RogueHit[]>
} {
  const actionable = hits.filter(h => !h.policyException)
  const byFile = new Map<string, RogueHit[]>()
  for (const hit of actionable) {
    const list = byFile.get(hit.file) ?? []
    list.push(hit)
    byFile.set(hit.file, list)
  }
  return { total: hits.length, actionable: actionable.length, byFile }
}

function formatMarkdownReport(hits: RogueHit[]): string {
  const { actionable: actionableCount, byFile } = summarize(hits)
  const lines = [
    '# Rogue reference inventory',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Total matches: ${hits.length} (${actionableCount} actionable outside policy exceptions)`,
    ''
  ]
  if (actionableCount === 0) {
    lines.push('No actionable inbound links to `assets/docs/` on scanned surfaces.')
    return `${lines.join('\n')}\n`
  }
  for (const [file, fileHits] of [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`## ${file}`, '')
    for (const hit of fileHits) {
      lines.push(`- L${hit.line}: \`${hit.match}\``)
    }
    lines.push('')
  }
  return `${lines.join('\n')}\n`
}

async function main(): Promise<void> {
  const root = chdirToRepoRoot()
  const hits = await scanTargets(root)
  const outDir = path.join(root, 'tmp/audit')
  await mkdir(outDir, { recursive: true })
  const jsonPath = path.join(outDir, 'rogue_refs.json')
  const mdPath = path.join(outDir, 'rogue_refs.md')
  await writeFile(jsonPath, `${JSON.stringify(hits, null, 2)}\n`)
  await writeFile(mdPath, formatMarkdownReport(hits))
  const { actionable } = summarize(hits)
  console.log(`rogue-refs: wrote ${path.relative(root, jsonPath)} (${actionable} actionable hits)`)
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
