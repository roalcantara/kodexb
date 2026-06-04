/**
 * Summarize local CRG usage logs (MCP hook + HK pre-commit).
 *
 * Usage: bun tools/graph/usage_report.ts [--days 7]
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO_ROOT = process.cwd()
const GRAPH_DIR = join(REPO_ROOT, '.code-review-graph')
const MCP_LOG = join(GRAPH_DIR, 'usage.jsonl')
const HK_LOG = join(GRAPH_DIR, 'hk-usage.jsonl')
const DEFAULT_REPORT_DAYS = 7
const MS_PER_DAY = 86_400_000

type Line = { ts?: string; source?: string; tool?: string }

function parseDays(argv: string[]): number {
  const i = argv.indexOf('--days')
  if (i < 0 || !argv[i + 1]) return DEFAULT_REPORT_DAYS
  return Number.parseInt(argv[i + 1] ?? String(DEFAULT_REPORT_DAYS), 10)
}

function readJsonl(path: string): Line[] {
  if (!existsSync(path)) return []
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as Line)
}

function sinceDays(days: number): number {
  return Date.now() - days * MS_PER_DAY
}

function filterRecent(lines: Line[], days: number): Line[] {
  const cutoff = sinceDays(days)
  return lines.filter(l => {
    if (!l.ts) return true
    return Date.parse(l.ts) >= cutoff
  })
}

function countByTool(lines: Line[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const l of lines) {
    const key = l.tool ?? l.source ?? 'unknown'
    m.set(key, (m.get(key) ?? 0) + 1)
  }
  return m
}

function main(): void {
  const days = parseDays(process.argv.slice(2))
  const mcp = filterRecent(readJsonl(MCP_LOG), days)
  const hk = filterRecent(readJsonl(HK_LOG), days)

  console.log(`CRG usage report (last ${days} days)`)
  console.log('')
  console.log(`MCP agent calls: ${mcp.length}`)
  for (const [tool, n] of [...countByTool(mcp)].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${tool}: ${n}`)
  }
  console.log('')
  console.log(`HK pre-commit scans: ${hk.length}`)
  console.log('')
  console.log(`Logs: ${MCP_LOG}`)
  console.log(`      ${HK_LOG}`)
}

if (import.meta.main) main()
