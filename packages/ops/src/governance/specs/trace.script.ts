/**
 * spec trace — deterministic cross-file traceability for the kb SDD chain:
 *
 *   spec.md  (REQUIREMENT id + @spec:<slug> pointer in the E2e declaration table)
 *      ⇒ assets/features/e2e/*.feature  (@spec:<slug> tag + Scenario name)
 *
 * Usage:
 *   bun packages/ops/src/governance/specs/trace.script.ts <feature-dir> [--features assets/features/e2e] [--strict]
 */
import path from 'node:path'

type Link = {
  requirement: string
  slug: string
  scenario: string
  line: number
}

type Finding = {
  level: 'error'
  message: string
}

const MIN_TABLE_COLUMNS = 3
const REQ_CELL = /^([A-Z]{2,}-\d+)$/
const TAG_CELL = /@spec:([a-z0-9][a-z0-9-]*)/i
const SCENARIO_LINE = /^\s*Scenario(?: Outline)?:\s*(.+?)\s*$/

function parseE2eTable(specText: string): Link[] {
  const links: Link[] = []
  const lines = specText.split('\n')
  lines.forEach((raw, i) => {
    if (!raw.trim().startsWith('|')) return
    const cells = raw
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
    if (cells.length < MIN_TABLE_COLUMNS) return
    const reqM = cells[0]?.match(REQ_CELL)
    const tagM = cells[1]?.match(TAG_CELL)
    if (!reqM?.[1] || !tagM?.[1]) return
    const scenario = (cells[2] ?? '').replace(/^["“]|["”]$/g, '').trim()
    if (!scenario) return
    links.push({ requirement: reqM[1], slug: tagM[1], scenario, line: i + 1 })
  })
  return links
}

function hasRequirement(specText: string, id: string): boolean {
  return new RegExp(`^##\\s+REQUIREMENT\\s+${id}\\s*:`, 'm').test(specText)
}

function scenarioNames(text: string): Set<string> {
  const names = new Set<string>()
  for (const raw of text.split('\n')) {
    const m = raw.match(SCENARIO_LINE)
    if (m?.[1]) names.add(m[1])
  }
  return names
}

function featureCoversSlug(text: string, slug: string): boolean {
  return new RegExp(`@spec:${slug}\\b`).test(text)
}

function validateLink(
  link: Link,
  specPath: string,
  specText: string,
  featureTexts: { file: string; text: string }[],
  featuresDir: string
): Finding[] {
  const findings: Finding[] = []
  const where = `${specPath}:${link.line} ${link.requirement} (@spec:${link.slug})`

  if (!hasRequirement(specText, link.requirement))
    findings.push({ level: 'error', message: `${where}: pointer references unknown REQUIREMENT ${link.requirement}` })

  const slugFeatures = featureTexts.filter(f => featureCoversSlug(f.text, link.slug))
  if (slugFeatures.length === 0) {
    findings.push({ level: 'error', message: `${where}: no .feature under ${featuresDir} tagged @spec:${link.slug}` })
    return findings
  }

  if (!slugFeatures.some(f => scenarioNames(f.text).has(link.scenario)))
    findings.push({
      level: 'error',
      message: `${where}: scenario "${link.scenario}" not found in any @spec:${link.slug} .feature`
    })

  return findings
}

async function loadFeatureTexts(featuresDir: string): Promise<{ file: string; text: string }[]> {
  const featureTexts: { file: string; text: string }[] = []
  const glob = new Bun.Glob(`${featuresDir}/**/*.feature`)
  for await (const file of glob.scan({ onlyFiles: true }))
    featureTexts.push({ file, text: await Bun.file(file).text() })
  return featureTexts
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const strict = args.includes('--strict')
  const fIdx = args.indexOf('--features')
  const featuresDir = fIdx >= 0 ? (args[fIdx + 1] ?? 'assets/features/e2e') : 'assets/features/e2e'
  const featureDir = args.find(a => !a.startsWith('--') && a !== featuresDir) ?? '.'

  const specPath = path.join(featureDir, 'spec.md')
  if (!(await Bun.file(specPath).exists())) {
    console.error(`spec trace: no spec.md at ${specPath}`)
    process.exit(strict ? 1 : 0)
  }

  const specText = await Bun.file(specPath).text()
  const links = parseE2eTable(specText)

  if (links.length === 0) {
    console.log(`✓ ${featureDir}: no E2e declaration table — nothing to trace`)
    process.exit(0)
  }

  const featureTexts = await loadFeatureTexts(featuresDir)
  const findings = links.flatMap(link => validateLink(link, specPath, specText, featureTexts, featuresDir))

  if (findings.length === 0) {
    console.log(`✓ ${featureDir}: ${links.length} traceability link(s) resolve to ${featuresDir}`)
    process.exit(0)
  }

  console.log(`✗ ${featureDir}`)
  for (const f of findings) console.log(`  ERROR ${f.message}`)
  console.log(`\nspec trace: ${findings.length} broken link(s)`)
  process.exit(strict ? 1 : 0)
}

await main().catch(err => {
  console.error(err)
  process.exit(1)
})
