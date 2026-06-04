import { describe, expect, it } from 'bun:test'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(import.meta.dir, '..', '..')

describe('log_mcp_usage', () => {
  it('appends a line for code-review-graph MCP calls', async () => {
    const logFile = join(REPO, '.code-review-graph', 'usage.test.jsonl')
    rmSync(logFile, { force: true })
    const proc = Bun.spawn({
      cmd: ['bun', 'tools/graph/log_mcp_usage.ts'],
      cwd: REPO,
      env: {
        ...process.env,
        CRG_REPO_ROOT: REPO
      },
      stdin: new Response(JSON.stringify({ tool_name: 'graph_stats', server: 'code-review-graph' }))
    })
    expect(await proc.exited).toBe(0)
    const script = await Bun.file(join(REPO, 'tools/graph/log_mcp_usage.ts')).text()
    expect(script.includes('usage.jsonl')).toBe(true)
  })
})
