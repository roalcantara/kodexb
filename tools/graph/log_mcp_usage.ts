#!/usr/bin/env bun
/**
 * Cursor afterMCPExecution hook: append CRG MCP tool calls to usage.jsonl.
 */
import { appendFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

function repoRoot(): string {
  if (process.env.CRG_REPO_ROOT) return process.env.CRG_REPO_ROOT
  const r = Bun.spawnSync({ cmd: ['git', 'rev-parse', '--show-toplevel'], stdout: 'pipe' })
  if (r.exitCode === 0) return r.stdout.toString().trim()
  return process.cwd()
}
const REPO_ROOT = repoRoot()
const LOG_DIR = join(REPO_ROOT, '.code-review-graph')
const LOG_FILE = join(LOG_DIR, 'usage.jsonl')

type HookInput = {
  tool_name?: string
  toolName?: string
  server?: string
  mcp_server?: string
  session_id?: string
  sessionId?: string
}

function isCrgCall(input: HookInput): boolean {
  const blob = JSON.stringify(input).toLowerCase()
  return blob.includes('code-review-graph') || blob.includes('code_review_graph')
}

async function main(): Promise<void> {
  const raw = await Bun.stdin.text()
  if (!raw.trim()) {
    process.exit(0)
  }
  let input: HookInput
  try {
    input = JSON.parse(raw) as HookInput
  } catch {
    process.exit(0)
  }
  if (!isCrgCall(input)) {
    process.exit(0)
  }
  mkdirSync(LOG_DIR, { recursive: true })
  const line = {
    ts: new Date().toISOString(),
    source: 'mcp',
    tool: input.tool_name ?? input.toolName ?? 'unknown',
    server: input.server ?? input.mcp_server ?? 'unknown',
    session_id: input.session_id ?? input.sessionId ?? null,
    cwd: REPO_ROOT,
    feature_dir: process.env.SPECIFY_FEATURE_DIRECTORY ?? null
  }
  appendFileSync(LOG_FILE, `${JSON.stringify(line)}\n`, 'utf8')
  process.exit(0)
}

await main()
