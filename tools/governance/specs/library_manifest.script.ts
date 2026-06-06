/**
 * Part II — build / verify library.yaml index for assets/docs/archive/.
 *
 *   bun tools/governance/specs/library_manifest.script.ts           # write index + print plan
 *   bun tools/governance/specs/library_manifest.script.ts --dry-run # print only
 *   bun tools/governance/specs/library_manifest.script.ts --verify  # validate YAML ↔ disk
 *
 * Exports for spec tests:
 *   buildManifest() — scan numbered dirs on disk
 *   verifyManifest(yaml, onDisk) — bidirectional check
 */
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const REPO_ROOT = path.resolve(import.meta.dir, '../../..')
const SPECS_ROOT = path.join(REPO_ROOT, 'assets/docs/archive')
const MANIFEST_PATH = path.join(REPO_ROOT, 'assets/catalog/library.yaml')
const ROOT_FILE_NAMES = new Set([
  'README.md',
  'ARCHIVE_PROPOSAL.md',
  'PROJECT_CONTEXT.md',
  'REFERENCE_FIX_LIST.csv',
  'v0.10.0-scope.md',
  'PRODUCT_DESIGN.md',
  'PRODUCT_REQUIREMENTS.md'
])
const NUMBERED_DIR_RE = /^(\d{3})-(.+)$/

export type ManifestEntry = {
  nnn: string
  slug: string
  folder: string
  birth_iso: string
}

export type Manifest = {
  generated_at: string
  archive_root: string
  entries: ManifestEntry[]
}

function isRootOrMilestone(name: string): boolean {
  const MILESTONE_RE = /^MILESTONE_/i
  return ROOT_FILE_NAMES.has(name) || MILESTONE_RE.test(name)
}

export function isNumberedDir(name: string): boolean {
  if (isRootOrMilestone(name)) return false
  if (!NUMBERED_DIR_RE.test(name)) return false
  const full = path.join(SPECS_ROOT, name)
  try {
    return statSync(full).isDirectory()
  } catch {
    return false
  }
}

export function isUnnumberedSlugDir(name: string): boolean {
  if (isRootOrMilestone(name)) return false
  if (NUMBERED_DIR_RE.test(name)) return false
  const full = path.join(SPECS_ROOT, name)
  try {
    return statSync(full).isDirectory()
  } catch {
    return false
  }
}

export function parseNumberedDir(name: string): { nnn: string; slug: string } | null {
  const m = NUMBERED_DIR_RE.exec(name)
  if (!m) return null
  return { nnn: String(m[1]), slug: String(m[2]) }
}

function listNumberedDirs(): string[] {
  return readdirSync(SPECS_ROOT).filter(isNumberedDir).sort()
}

export function listUnnumberedSlugDirs(): string[] {
  return readdirSync(SPECS_ROOT).filter(isUnnumberedSlugDir).sort()
}

function gitBirthIso(folderName: string): string | null {
  const rel = `assets/docs/archive/${folderName}/`
  const r = spawnSync('git', ['log', '--diff-filter=A', '--format=%ai', '--reverse', '--', rel], {
    cwd: REPO_ROOT,
    encoding: 'utf8'
  })
  const line = r.stdout.trim().split('\n')[0]
  return line || null
}

function mtimeFallbackIso(folderName: string): string {
  const dir = path.join(SPECS_ROOT, folderName)
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

function birthIso(folderName: string): string {
  return gitBirthIso(folderName) ?? mtimeFallbackIso(folderName)
}

export function buildManifest(): Manifest {
  const folders = listNumberedDirs()
  const entries: ManifestEntry[] = []

  for (const folder of folders) {
    const parsed = parseNumberedDir(folder)
    if (!parsed) continue
    entries.push({
      nnn: parsed.nnn,
      slug: parsed.slug,
      folder,
      birth_iso: birthIso(folder)
    })
  }

  return {
    generated_at: new Date().toISOString(),
    archive_root: 'assets/docs/archive',
    entries
  }
}

function printPlan(plan: Manifest): void {
  console.log(`# library index (${plan.entries.length} folders)\n`)
  for (const e of plan.entries) {
    console.log(`${e.nnn}  ${e.birth_iso.slice(0, 10)}  ${e.folder}/`)
  }
}

async function writeManifest(plan: Manifest): Promise<void> {
  const yaml = [
    '# Legacy SDD archive index — script-generated; do not hand-edit.',
    '# Shipped features: assets/catalog/catalog.yaml (different registry).',
    Bun.YAML.stringify(plan).trimEnd(),
    ''
  ].join('\n')
  await Bun.write(MANIFEST_PATH, yaml)
  console.log(`wrote ${path.relative(REPO_ROOT, MANIFEST_PATH)}`)
}

export function verifyManifest(yamlManifest: Manifest, onDiskFolders: string[]): string[] {
  const errors: string[] = []

  for (const e of yamlManifest.entries) {
    if (!onDiskFolders.includes(e.folder)) {
      errors.push(`YAML entry ${e.nnn}-${e.slug}: folder "${e.folder}" not found on disk`)
    }
  }

  const yamlFolders = new Set(yamlManifest.entries.map(e => e.folder))
  for (const folder of onDiskFolders) {
    if (!yamlFolders.has(folder)) {
      errors.push(`Disk folder "${folder}" missing from YAML entries`)
    }
  }

  const unnumbered = listUnnumberedSlugDirs()
  if (unnumbered.length > 0) {
    errors.push(`Unnumbered slug directories still present: ${unnumbered.join(', ')}`)
  }

  return errors
}

function verify(): void {
  let yamlManifest: Manifest
  try {
    const yaml = readFileSync(MANIFEST_PATH, 'utf8')
    yamlManifest = Bun.YAML.parse(yaml) as Manifest
  } catch {
    console.error(`verify: cannot read ${path.relative(REPO_ROOT, MANIFEST_PATH)}`)
    process.exit(1)
  }

  const onDiskFolders = listNumberedDirs()
  const errors = verifyManifest(yamlManifest, onDiskFolders)

  if (errors.length === 0) {
    console.log(`verify: ok (${yamlManifest.entries.length} entries, ${onDiskFolders.length} on-disk folders)`)
    return
  }

  console.error('verify: errors:')
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const apply = args.includes('--legacy-apply')
const verifyOnly = args.includes('--verify')

if (verifyOnly) {
  verify()
  process.exit(0)
}

const manifest = buildManifest()
printPlan(manifest)

if (dryRun) {
  console.log('\n(dry-run: no manifest write)')
  process.exit(0)
}

if (apply) {
  console.error('--legacy-apply: rename migration is complete; remove this flag and use --dry-run + manual write')
  process.exit(1)
}

await writeManifest(manifest)
