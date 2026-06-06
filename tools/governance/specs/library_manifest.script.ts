/**
 * Part I — build ordered NNN-slug rename manifest for assets/docs/archive/.
 *
 *   bun tools/governance/specs/library_manifest.script.ts           # write manifest + print plan
 *   bun tools/governance/specs/library_manifest.script.ts --dry-run # print only
 *   bun tools/governance/specs/library_manifest.script.ts --apply   # git mv per manifest
 *   bun tools/governance/specs/library_manifest.script.ts --verify  # fail if unnumbered slug dirs remain
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')
const SPECS_ROOT = path.join(REPO_ROOT, 'assets/docs/archive')
const MANIFEST_PATH = path.join(SPECS_ROOT, 'library_manifest.json')
const MILESTONE_DIR = /^MILESTONE_/i
const NUMBERED_SLUG_DIR = /^\d{3}-/
const NNN_WIDTH = 3

const ROOT_FILE_NAMES = new Set([
  'README.md',
  'ARCHIVE_PROPOSAL.md',
  'PROJECT_CONTEXT.md',
  'REFERENCE_FIX_LIST.csv',
  'v0.10.0-scope.md',
  'library_manifest.json',
  'PRODUCT_DESIGN.md',
  'PRODUCT_REQUIREMENTS.md',
  'SPEC_SYSTEM_BACKLOG.md'
])

type ManifestEntry = {
  nnn: string
  slug: string
  birth_iso: string
  from: string
  to: string
}

type Manifest = {
  generated_at: string
  specs_root: string
  entries: ManifestEntry[]
}

function isSlugDir(name: string): boolean {
  if (ROOT_FILE_NAMES.has(name)) return false
  if (MILESTONE_DIR.test(name)) return false
  if (NUMBERED_SLUG_DIR.test(name)) return false
  const full = path.join(SPECS_ROOT, name)
  try {
    return statSync(full).isDirectory()
  } catch {
    return false
  }
}

function gitBirthIso(slug: string): string | null {
  const rel = `assets/docs/archive/${slug}/`
  const r = spawnSync('git', ['log', '--diff-filter=A', '--format=%ai', '--reverse', '--', rel], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  })
  const line = r.stdout.trim().split('\n')[0]
  return line || null
}

function mtimeFallbackIso(slug: string): string {
  const dir = path.join(SPECS_ROOT, slug)
  const candidates = ['design.md', 'requirements.md', 'tasks.md', 'handoff.md']
  let oldest = Number.POSITIVE_INFINITY
  for (const file of candidates) {
    const p = path.join(dir, file)
    try {
      const t = statSync(p).mtimeMs
      if (t < oldest) oldest = t
    } catch {
      /* skip */
    }
  }
  if (oldest === Number.POSITIVE_INFINITY) {
    try {
      oldest = statSync(dir).mtimeMs
    } catch {
      oldest = Date.now()
    }
  }
  return new Date(oldest).toISOString()
}

function birthIso(slug: string): string {
  return gitBirthIso(slug) ?? mtimeFallbackIso(slug)
}

function listSlugDirs(): string[] {
  return readdirSync(SPECS_ROOT).filter(isSlugDir).sort()
}

const FOUNDATION_SLUG = 'foundation'

function buildManifest(): Manifest {
  const slugs = listSlugDirs()
  const foundation = slugs.includes(FOUNDATION_SLUG) ? FOUNDATION_SLUG : null
  const rest = slugs.filter(s => s !== FOUNDATION_SLUG)
  const ranked = rest.map(slug => ({ slug, birth_iso: birthIso(slug) }))
  ranked.sort((a, b) => a.birth_iso.localeCompare(b.birth_iso) || a.slug.localeCompare(b.slug))

  const ordered: { slug: string; birth_iso: string }[] = []
  if (foundation) {
    ordered.push({ slug: foundation, birth_iso: birthIso(foundation) })
  }
  ordered.push(...ranked)

  const entries: ManifestEntry[] = ordered.map((row, i) => {
    const nnn = String(i + 1).padStart(NNN_WIDTH, '0')
    const from = row.slug
    const to = `${nnn}-${row.slug}`
    return {
      nnn,
      slug: row.slug,
      birth_iso: row.birth_iso,
      from,
      to
    }
  })

  return {
    generated_at: new Date().toISOString(),
    specs_root: 'assets/docs/archive',
    entries
  }
}

function printPlan(plan: Manifest): void {
  console.log(`# library manifest (${plan.entries.length} folders)\n`)
  for (const e of plan.entries) {
    console.log(`${e.nnn}  ${e.birth_iso.slice(0, 10)}  ${e.from}/  →  ${e.to}/`)
  }
}

async function writeManifest(plan: Manifest): Promise<void> {
  await Bun.write(MANIFEST_PATH, `${JSON.stringify(plan, null, 2)}\n`)
  console.log(`wrote ${path.relative(REPO_ROOT, MANIFEST_PATH)}`)
}

function applyRenames(plan: Manifest): void {
  for (const e of plan.entries) {
    const fromPath = path.join(SPECS_ROOT, e.from)
    const toPath = path.join(SPECS_ROOT, e.to)
    if (!statSync(fromPath).isDirectory()) {
      console.error(`missing source: ${e.from}`)
      process.exit(1)
    }
    if (fromPath === toPath) continue
    try {
      statSync(toPath)
      console.error(`target exists: ${e.to}`)
      process.exit(1)
    } catch {
      /* ok */
    }
    const relFrom = path.relative(REPO_ROOT, fromPath)
    const relTo = path.relative(REPO_ROOT, toPath)
    const r = spawnSync('git', ['mv', relFrom, relTo], { cwd: REPO_ROOT, stdio: 'inherit' })
    if (r.status !== 0) process.exit(r.status ?? 1)
    console.log(`mv ${e.from} → ${e.to}`)
  }
}

function verify(): void {
  const bad = listSlugDirs()
  if (bad.length === 0) {
    console.log('verify: ok (no unnumbered slug directories)')
    return
  }
  console.error('verify: unnumbered directories still present:')
  for (const d of bad) console.error(`  - ${d}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const apply = args.includes('--apply')
const verifyOnly = args.includes('--verify')

if (verifyOnly) {
  verify()
  process.exit(0)
}

const manifest = buildManifest()
printPlan(manifest)

if (dryRun) {
  console.log('\n(dry-run: no manifest write, no git mv)')
  process.exit(0)
}

await writeManifest(manifest)

if (apply) {
  applyRenames(manifest)
  verify()
}
