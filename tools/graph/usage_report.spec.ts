import { describe, expect, it } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(import.meta.dir, '..', '..')
const GRAPH_DIR = join(REPO, '.code-review-graph')

describe('usage_report', () => {
  it('runs without error when logs are empty', async () => {
    mkdirSync(GRAPH_DIR, { recursive: true })
    const mcp = join(GRAPH_DIR, 'usage.jsonl')
    const hk = join(GRAPH_DIR, 'hk-usage.jsonl')
    writeFileSync(mcp, '')
    writeFileSync(hk, '')
    const proc = Bun.spawn({
      cmd: ['bun', 'tools/graph/usage_report.ts', '--days', '1'],
      cwd: REPO,
      stdout: 'pipe'
    })
    expect(await proc.exited).toBe(0)
    const out = await new Response(proc.stdout).text()
    expect(out).toContain('MCP agent calls: 0')
    rmSync(mcp, { force: true })
    rmSync(hk, { force: true })
  })
})
