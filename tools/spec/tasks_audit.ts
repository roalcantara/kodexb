/**
 * spec audit — deterministic checks before LLM /speckit-analyze.
 *
 * Usage: bun tools/spec/tasks_audit.ts <feature-dir> [--strict]
 */
import { existsSync } from 'node:fs'
import path from 'node:path'

type Finding = {
  rule: string
  level: 'error' | 'warn'
  message: string
}

const TASK_LINE = /^- \[[ xX]\] (T\d{3})\b/
const INTEGRATION_TEST = /integration test/i
const HARNESS = /harness|create.*\.spec\.(ts|tsx)|test file.*\.spec/i

function handoffPaths(featureDir: string): string[] {
  return [path.join(featureDir, 'handoff.md'), path.join(featureDir, 'artifacts', 'tasks', 'handoff.md')]
}

function auditTasksOrder(lines: string[]): Finding[] {
  const findings: Finding[] = []
  let harnessLine = -1
  let firstIntegrationLine = -1
  lines.forEach((raw, i) => {
    const m = raw.match(TASK_LINE)
    if (!m) return
    if (HARNESS.test(raw) && harnessLine < 0) harnessLine = i + 1
    if (INTEGRATION_TEST.test(raw) && firstIntegrationLine < 0) firstIntegrationLine = i + 1
  })
  if (firstIntegrationLine > 0 && harnessLine > 0 && firstIntegrationLine < harnessLine) {
    findings.push({
      rule: 'task-order-harness',
      level: 'error',
      message: `integration-test task (line ${firstIntegrationLine}) appears before harness/setup task (line ${harnessLine}); reorder tasks.md`
    })
  }
  return findings
}

export async function auditFeatureDir(featureDir: string): Promise<Finding[]> {
  const findings: Finding[] = []
  const tasksPath = path.join(featureDir, 'tasks.md')
  const specPath = path.join(featureDir, 'spec.md')

  if (!existsSync(specPath)) {
    findings.push({ rule: 'spec-missing', level: 'error', message: 'spec.md missing' })
  }
  if (!existsSync(tasksPath)) {
    findings.push({ rule: 'tasks-missing', level: 'error', message: 'tasks.md missing' })
    return findings
  }

  const handoffs = handoffPaths(featureDir)
  if (!handoffs.some(p => existsSync(p))) {
    findings.push({
      rule: 'handoff-missing',
      level: 'error',
      message: `handoff.md missing (expected ${handoffs.join(' or ')})`
    })
  }

  const tasksText = await Bun.file(tasksPath).text()
  return findings.concat(auditTasksOrder(tasksText.split('\n')))
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const dirArg = args.find(a => !a.startsWith('--'))
  if (!dirArg) {
    console.error('usage: bun tools/spec/tasks_audit.ts <feature-dir> [--strict]')
    process.exit(2)
  }
  const featureDir = path.resolve(dirArg)
  const findings = await auditFeatureDir(featureDir)
  for (const f of findings) {
    console.log(`${f.level === 'error' ? 'ERROR' : 'WARN'} [${f.rule}] ${f.message}`)
  }
  const errors = findings.filter(f => f.level === 'error')
  if (errors.length) {
    console.error(`spec audit: ${errors.length} error(s)`)
    process.exit(strict ? 1 : 1)
  }
  console.log('spec audit: OK')
}

if (import.meta.main) await main()
