/**
 * spec lint — deterministic EARS structural check for kb `spec.md` files.
 *
 * Usage:
 *   bun packages/ops/src/governance/specs/lint.script.ts <feature-dir-or-spec.md> [--strict]
 *   bun packages/ops/src/governance/specs/lint.script.ts --all [--root assets/specs] [--strict]
 */
import path from 'node:path'

type Finding = {
  file: string
  line: number
  rule: string
  level: 'error' | 'warn'
  message: string
}

const EARS_ID = /^##\s+REQUIREMENT\s+([A-Z]{2,}-\d+)\s*:/
const ANY_REQUIREMENT = /^##\s+REQUIREMENT\b/
const STOCK_HEADINGS = [
  /^##\s+User Scenarios?\s*&\s*Testing\b/i,
  /^##\s+Success Criteria\b/i,
  /^###\s+Functional Requirements\b/i,
  /^###\s+Measurable Outcomes\b/i
]
const STOCK_PLAIN_REQUIREMENTS = /^##\s+Requirements\b/i
const STOCK_IDS = /\b(FR|SC)-\d{2,}\b/
const GHERKIN_LINE = /^\s*(Feature:|Scenario:|Scenario Outline:)/
const AC_LINE = /^\s*\d+\.\s+WHEN\b/i
const USER_STORY = /\*\*User story:\*\*/i
const MEASURE = /\*\*Measure:\*\*/i
const EVIDENCE = /\*\*Evidence:\*\*/i
const AC_CONTEXT_LINES = 6

function requirementBlocks(lines: string[]): { id: string | null; start: number; body: string[] }[] {
  const blocks: { id: string | null; start: number; body: string[] }[] = []
  let current: { id: string | null; start: number; body: string[] } | null = null
  lines.forEach((raw, i) => {
    const m = raw.match(EARS_ID)
    if (ANY_REQUIREMENT.test(raw)) {
      if (current) blocks.push(current)
      current = { id: m?.[1] ?? null, start: i + 1, body: [] }
      return
    }
    if (current) current.body.push(raw)
  })
  if (current) blocks.push(current)
  return blocks
}

function lintStockHeadings(file: string, lines: string[]): Finding[] {
  const findings: Finding[] = []
  lines.forEach((raw, i) => {
    if (STOCK_HEADINGS.some(re => re.test(raw)))
      findings.push({
        file,
        line: i + 1,
        rule: 'no-stock-headings',
        level: 'error',
        message: `stock heading not allowed in EARS spec.md: "${raw.trim()}"`
      })
    if (STOCK_PLAIN_REQUIREMENTS.test(raw))
      findings.push({
        file,
        line: i + 1,
        rule: 'no-stock-headings',
        level: 'error',
        message: '"## Requirements" (FR container) not allowed; use "## REQUIREMENT <ID>:"'
      })
    if (STOCK_IDS.test(raw))
      findings.push({
        file,
        line: i + 1,
        rule: 'no-fr-sc-ids',
        level: 'error',
        message: `FR-/SC- numbering not allowed: "${raw.trim()}"`
      })
    if (GHERKIN_LINE.test(raw))
      findings.push({
        file,
        line: i + 1,
        rule: 'no-gherkin-in-spec',
        level: 'error',
        message: `Gherkin belongs in assets/features/e2e/*.feature, not spec.md: "${raw.trim()}"`
      })
  })
  return findings
}

function lintRequirementBlocks(
  file: string,
  blocks: { id: string | null; start: number; body: string[] }[]
): Finding[] {
  const findings: Finding[] = []
  const earsBlocks = blocks.filter(b => b.id !== null)
  if (earsBlocks.length === 0)
    findings.push({
      file,
      line: 1,
      rule: 'require-ears',
      level: 'error',
      message: 'no "## REQUIREMENT <ID>:" block with an EARS id (e.g. SF-1) found'
    })

  for (const block of blocks) {
    if (block.id === null) {
      findings.push({
        file,
        line: block.start,
        rule: 'ears-id',
        level: 'error',
        message: '"## REQUIREMENT" heading missing an EARS id like SF-1'
      })
      continue
    }
    const blockText = block.body.join('\n')
    if (!USER_STORY.test(blockText))
      findings.push({
        file,
        line: block.start,
        rule: 'require-user-story',
        level: 'error',
        message: `${block.id}: missing "**User story:**" line`
      })

    block.body.forEach((raw, j) => {
      if (!AC_LINE.test(raw)) return
      const window = block.body.slice(j, j + AC_CONTEXT_LINES).join('\n')
      const lineNo = block.start + j + 1
      if (!MEASURE.test(window))
        findings.push({
          file,
          line: lineNo,
          rule: 'require-measure',
          level: 'error',
          message: `${block.id}: acceptance criterion missing "**Measure:**"`
        })
      if (!EVIDENCE.test(window))
        findings.push({
          file,
          line: lineNo,
          rule: 'require-evidence',
          level: 'error',
          message: `${block.id}: acceptance criterion missing "**Evidence:**"`
        })
    })
  }
  return findings
}

function lintSpec(file: string, text: string): Finding[] {
  const lines = text.split('\n')
  return [...lintStockHeadings(file, lines), ...lintRequirementBlocks(file, requirementBlocks(lines))]
}

async function resolveSpecFiles(target: string, all: boolean, root: string): Promise<string[]> {
  if (all) {
    const glob = new Bun.Glob(`${root}/[0-9][0-9][0-9]-*/spec.md`)
    return (await Array.fromAsync(glob.scan({ onlyFiles: true }))).sort()
  }
  if (await Bun.file(target).exists()) return target.endsWith('.md') ? [target] : [path.join(target, 'spec.md')]
  const candidate = path.join(target, 'spec.md')
  if (await Bun.file(candidate).exists()) return [candidate]
  return []
}

function reportFindings(file: string, findings: Finding[]): number {
  if (findings.length === 0) {
    console.log(`✓ ${file}`)
    return 0
  }
  console.log(`✗ ${file}`)
  let errors = 0
  for (const f of findings) {
    if (f.level === 'error') errors++
    console.log(`  ${f.level === 'error' ? 'ERROR' : 'warn '} ${file}:${f.line}  [${f.rule}] ${f.message}`)
  }
  return errors
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const all = args.includes('--all')
  const rootIdx = args.indexOf('--root')
  const root = rootIdx >= 0 ? (args[rootIdx + 1] ?? 'assets/specs') : 'assets/specs'
  const target = args.find(a => !a.startsWith('--') && a !== root) ?? '.'

  const files = await resolveSpecFiles(target, all, root)
  if (files.length === 0) {
    console.error(`spec lint: no spec.md found for "${all ? root : target}"`)
    process.exit(strict ? 1 : 0)
  }

  const texts = await Promise.all(files.map(file => Bun.file(file).text()))
  const errors = files.reduce((sum, file, i) => sum + reportFindings(file, lintSpec(file, texts[i] ?? '')), 0)

  console.log(`\nspec lint: ${files.length} file(s), ${errors} error(s)`)
  process.exit(strict && errors > 0 ? 1 : 0)
}

await main().catch(err => {
  console.error(err)
  process.exit(1)
})
