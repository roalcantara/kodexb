import path from 'node:path'
import { $, Glob } from 'bun'

/**
 * Enrich the hand-curated tools file inventory with auto-derived classification
 * columns, to expose natural groupings under tools/.
 *
 * Input : tools/inventory/tools_file_inventory_source.csv
 *         (human-authored: path + judgment columns)
 * Output: tools/inventory/tools_file_inventory.csv
 * Judgment columns (lifecycle_stage, disposition, confidence) passthrough from source when present.
 */

const SRC = 'tools/inventory/tools_file_inventory_source.csv'
const OUT = 'tools/inventory/tools_file_inventory.csv'

const CONFIG_FILES = ['mise.toml', 'package.json', 'hk.pkl', 'electrobun.config.ts', 'sgconfig.yml', '.ls-lint.yml']

// ── tiny CSV parse/emit ──────────────────────────────────────────────────────

function parseCsv(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split('\n').filter(l => l.trim().length > 0)
  const parseLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQuotes = !inQuotes
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim())
        cur = ''
      } else cur += ch
    }
    out.push(cur.trim())
    return out.map(c => c.replace(/^"|"$/g, '').trim())
  }
  const head = lines[0]
  if (!head) return { header: [], rows: [] }
  const rest = lines.slice(1)
  return { header: parseLine(head), rows: rest.map(parseLine) }
}

function csvField(v: string): string {
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function csvLine(cells: string[]): string {
  return cells.map(csvField).join(',')
}

// ── repo facts ───────────────────────────────────────────────────────────────

const trackedFiles = new Set((await $`git ls-files tools`.text()).split('\n').filter(Boolean))

const configText: Record<string, string> = {}
for (const f of CONFIG_FILES) {
  configText[f] = (await Bun.file(f).exists()) ? await Bun.file(f).text() : ''
}
const workflowFiles = await Array.fromAsync(new Glob('.github/workflows/*.yml').scan('.'))
const workflowText = (await Promise.all(workflowFiles.map(f => Bun.file(f).text()))).join('\n')

const lsLintText = configText['.ls-lint.yml'] || ''

// ── import graph over tools/*.ts(x) (excludes graphify-out) ──────────────────

const tsFiles = (await Array.fromAsync(new Glob('tools/**/*.{ts,tsx}').scan('.'))).filter(
  f => !f.startsWith('tools/graphify-out/')
)

const topFolderOf = (p: string): string => {
  const seg = p.split('/')
  if (seg.length >= 3) return seg[1] ?? ''
  return p.replace('tools/', '')
}

const SRC_ALIAS_RE = /^(@core|@shared|@shell|@rpc|@testing)\b/
const fileText: Record<string, string> = {}
const importsOf: Record<string, string[]> = {} // file -> resolved tool files it imports
const importsSrc: Record<string, boolean> = {}

for (const f of tsFiles) {
  const text = await Bun.file(f).text()
  fileText[f] = text
  const specs = [...text.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)]
    .map(m => m[1])
    .filter((s): s is string => typeof s === 'string')
  const toolImports: string[] = []
  let touchesSrc = false
  for (const spec of specs) {
    if (SRC_ALIAS_RE.test(spec) || spec.includes('/src/') || /(^|\/)src\//.test(spec)) {
      touchesSrc = true
      continue
    }
    if (spec.startsWith('.')) {
      const resolved = path.normalize(path.join(path.dirname(f), spec))
      if (resolved.startsWith('tools/')) toolImports.push(resolved)
    }
  }
  importsOf[f] = [...new Set(toolImports)]
  importsSrc[f] = touchesSrc
}

// reverse edges: file -> set of importing files
const importedByFiles: Record<string, Set<string>> = {}
for (const [importer, targets] of Object.entries(importsOf)) {
  for (const t of targets) {
    if (!importedByFiles[t]) importedByFiles[t] = new Set()
    importedByFiles[t].add(importer)
  }
}

// ── per-path derivations ─────────────────────────────────────────────────────

function gitTracked(p: string): string {
  return trackedFiles.has(p) ? 'tracked' : 'ignored'
}

function isGenerated(p: string, artifact: string, role: string): string {
  if (p.startsWith('tools/graphify-out/') || p.includes('/cache/') || p.includes('/results/')) return 'generated'
  if (topFolderOf(p) === 'tmp') return 'scratch'
  if (artifact.startsWith('fixture') || role === 'fixture_static' || artifact.endsWith('_fixture')) return 'fixture'
  return 'source'
}

function hasSpec(p: string): string {
  if (!/\.(ts|tsx)$/.test(p) || p.endsWith('.spec.ts') || p.endsWith('.spec.tsx')) return 'na'
  const base = p.replace(/\.(ts|tsx)$/, '')
  return trackedFiles.has(`${base}.spec.ts`) || trackedFiles.has(`${base}.spec.tsx`) ? 'yes' : 'no'
}

function hasMainGuard(p: string): string {
  const text = fileText[p]
  if (text === undefined) return 'na'
  return text.includes('import.meta.main') ? 'yes' : 'no'
}

function importsToolsCol(p: string): { list: string; fanOut: number } {
  const targets = importsOf[p]
  if (!targets) return { list: 'na', fanOut: 0 }
  const folders = [...new Set(targets.map(topFolderOf))].filter(f => f !== topFolderOf(p)).sort()
  return { list: folders.length ? folders.join('|') : '—', fanOut: targets.length }
}

function importedByCol(p: string): {
  list: string
  fanIn: number
  shared: string
} {
  const importers = importedByFiles[p]
  if (!importers || importers.size === 0)
    return { list: p in fileText ? '—' : 'na', fanIn: 0, shared: p in fileText ? 'no' : 'na' }
  const ownFolder = topFolderOf(p)
  const folders = [...new Set([...importers].map(topFolderOf))].sort()
  const external = folders.filter(f => f !== ownFolder)
  return {
    list: folders.join('|'),
    fanIn: importers.size,
    shared: external.length > 1 ? 'yes' : 'no'
  }
}

function sideEffects(p: string): string {
  const t = fileText[p]
  if (t === undefined) return 'na'
  const tags: string[] = []
  if (/Bun\.serve|WebSocket|\bfetch\(|Bun\.connect/.test(t)) tags.push('network')
  if (/Bun\.spawn|spawnSync|execSync|Bun\.\$|spawnInherit/.test(t)) tags.push('process')
  if (/Bun\.file|Bun\.write|node:fs|readFileSync|writeFileSync|existsSync|mkdirSync/.test(t)) tags.push('fs')
  return tags.length ? tags.join('+') : 'pure'
}

function operatesOn(p: string): string {
  const text = fileText[p]
  if (text === undefined) return 'na'
  const hits = [...text.matchAll(/['"](assets\/[A-Za-z0-9_./-]+)['"]/g)]
    .map(m => m[1])
    .filter((s): s is string => typeof s === 'string')
  const distinct = [...new Set(hits)]
  if (!distinct.length) return '—'
  return distinct.slice(0, 2).join('|') + (distinct.length > 2 ? '…' : '')
}

function configRefs(p: string, artifact: string): { refs: string; invokedBy: string[] } {
  const folderPath = `tools/${topFolderOf(p)}`
  const isFolderInvoked = artifact === 'ast_grep_rule' // ast-grep invokes the rules DIR, not files
  const refs: string[] = []
  const invokedBy: string[] = []
  // invoked_by uses EXACT file match (a config that runs *this* file); migration
  // refs (blast radius) also count folder mentions. Folder-invoked artifacts
  // (ast-grep rules) attribute the invoker at folder granularity.
  // configs may reference a script without its extension and/or with a ./ prefix
  // (e.g. electrobun.config.ts: `./tools/build/x.script`). Match all variants.
  const noExt = p.replace(/\.(ts|tsx)$/, '')
  const fileVariants = [p, `./${p}`, noExt, `./${noExt}`]
  const mentions = (text: string, needles: string[]) => needles.some(n => text.includes(n))
  const check = (name: string, text: string, invoker: string) => {
    const fileHit = mentions(text, fileVariants)
    const folderHit = text.includes(folderPath)
    if (fileHit || folderHit) refs.push(name)
    if ((fileHit || (isFolderInvoked && folderHit)) && !invokedBy.includes(invoker)) {
      invokedBy.push(invoker)
    }
  }
  check('mise.toml', configText['mise.toml'] || '', 'mise')
  check('package.json', configText['package.json'] || '', 'package_json')
  check('hk.pkl', configText['hk.pkl'] || '', 'hk')
  check('electrobun.config.ts', configText['electrobun.config.ts'] || '', 'electrobun_config')
  check('sgconfig.yml', configText['sgconfig.yml'] || '', 'ast_grep')
  const wfFile = mentions(workflowText, fileVariants)
  const wfFolder = workflowText.includes(folderPath)
  if (wfFile || wfFolder) refs.push('github_workflows')
  if (wfFile && !invokedBy.includes('github_actions')) invokedBy.push('github_actions')
  return { refs: refs.length ? refs.join('|') : '—', invokedBy }
}

function lsLintEntry(p: string): string {
  return new RegExp(`(^|\\n)\\s*tools/${topFolderOf(p)}\\s*:`).test(lsLintText) ? 'yes' : 'no'
}

// ── assemble ─────────────────────────────────────────────────────────────────

const { header, rows } = parseCsv(await Bun.file(SRC).text())
const idx = (name: string) => header.indexOf(name)
const PASSTHROUGH = [
  'path',
  'current_top_folder',
  'current_subpath',
  'artifact_type',
  'role_candidate',
  'domain_area',
  'purpose_family',
  'proposed_home',
  'coupling_role',
  'one_line_purpose',
  'grouping_question'
]

const DERIVED = [
  'invoked_by',
  'imported_by',
  'imports_tools',
  'fan_in',
  'fan_out',
  'imports_src',
  'has_main_guard',
  'git_tracked',
  'is_generated',
  'has_spec',
  'shared_across_domains',
  'side_effect_profile',
  'operates_on',
  'config_refs',
  'lslint_entry'
]
const JUDGMENT = ['lifecycle_stage', 'disposition', 'confidence']

const outHeader = [...PASSTHROUGH, ...DERIVED, ...JUDGMENT]
const outRows: string[][] = []

for (const row of rows) {
  const p = row[idx('path')]
  if (!p) continue
  const artifact = row[idx('artifact_type')] ?? ''
  const role = row[idx('role_candidate')] ?? ''

  const impTools = importsToolsCol(p)
  const impBy = importedByCol(p)
  const cfg = configRefs(p, artifact)

  // invoked_by: config-derived invokers; libraries/none otherwise
  let invokedBy = cfg.invokedBy.join('|')
  if (!invokedBy) invokedBy = impBy.fanIn > 0 ? 'none(library)' : 'none'

  const derived: Record<string, string> = {
    invoked_by: invokedBy,
    imported_by: impBy.list,
    imports_tools: impTools.list,
    fan_in: String(impBy.fanIn),
    fan_out: String(impTools.fanOut),
    imports_src: p in fileText ? (importsSrc[p] ? 'yes' : 'no') : 'na',
    has_main_guard: hasMainGuard(p),
    git_tracked: gitTracked(p),
    is_generated: isGenerated(p, artifact, role),
    has_spec: hasSpec(p),
    shared_across_domains: impBy.shared,
    side_effect_profile: sideEffects(p),
    operates_on: operatesOn(p),
    config_refs: cfg.refs,
    lslint_entry: lsLintEntry(p)
  }

  const cells = [
    ...PASSTHROUGH.map(c => row[idx(c)] ?? ''),
    ...DERIVED.map(c => derived[c] ?? ''),
    ...JUDGMENT.map(c => row[idx(c)] ?? '')
  ]
  outRows.push(cells)
}

await Bun.write(OUT, `${[csvLine(outHeader), ...outRows.map(csvLine)].join('\n')}\n`)
console.log(`wrote ${OUT}: ${outRows.length} rows, ${outHeader.length} columns`)
