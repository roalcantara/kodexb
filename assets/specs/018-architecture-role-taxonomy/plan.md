# Architecture role-taxonomy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development`
> (recommended) or `executing-plans`. Steps use checkbox (`- [ ]`) syntax. This
> plan is the authority for *how*; [`spec.md`](./spec.md) is the authority for
> *what*/*why*. Every task ends with an **Acceptance gate** (spec criterion +
> command + expected). Do not exceed a task's gate.

**Goal:** Stand up a repeatable `role-conformance` metric harness (the audit),
finalize the role vocabulary + ADR, write a multi-PR roadmap that rewrites
`TODO.md` P3, lock already-conformant dirs with ls-lint, and convert the
`src/shell/main/handoff` pilot — behaviour-frozen.

**Architecture:** The harness follows the `perf`/`e2e-quality` precedent: a pure
`*_core.script.ts` (classify + metrics, unit-tested) + an IO runner
(`*.script.ts`) that scans `src/`, writes the baseline, and compares. Only the
pilot changes product code; the harness is tooling in `packages/ops`; ls-lint
rules are additive.

**Tech Stack:** Bun (`bun test`, `Bun.Glob`, `Bun.write`), mise tasks (usage_cmd
dispatch per the 014 ops-cli kernel), ls-lint, Biome.

**Conventions:**
- Tests: `bun:test`, `it(...)`, co-located. Harness files use the `.script.ts` / `.script.spec.ts` suffix (ls-lint requires it under `packages/ops/src/metrics/harnesses/**`).
- Commits: Conventional Commits, **capitalized** ≤ 50-char subject, `chore` for tooling. Commit after each green task.
- **Never** edit `biome.jsonc`, `.dependency-cruiser.cjs`, `knip.jsonc`. `.ls-lint.yml` only in Tasks 6 & 8 (additive).
- Pilot moves use `git mv` + import rewrites; **no logic edits**.

---

## File Structure

**ROLE-1 harness (tooling):**
- Create `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts` — pure classify + metrics.
- Create `…/role-conformance/role_conformance_core.script.spec.ts`.
- Create `…/role-conformance/role_conformance.script.ts` — IO runner (scan/baseline/compare/report), `usage_cmd` dispatch.
- Create `…/role-conformance/role_conformance.script.spec.ts`.
- Create `tools/metrics/baselines/role-conformance/baseline.json` — committed baseline (first run).
- Modify `mise.toml` — add `audit` task (`roles` → baseline/compare).

**ROLE-2 / ROLE-6 docs:** modify `assets/guides/CODESTYLE_GUIDE.md`, `assets/guides/TOOLS_GUIDE.md`, `CLAUDE.md`, `AGENTS.md`; create `assets/guides/adr/0001-role-suffix-taxonomy.md`.

**ROLE-3:** create `assets/specs/018-architecture-role-taxonomy/migration-roadmap.md`; modify `TODO.md`.

**ROLE-4 / ROLE-5:** modify `.ls-lint.yml`; `git mv` the handoff files + update `src/shell/main/handoff/handoff_registry.service.ts` (and other importers).

**Closeout:** create `closeout-metrics.txt`; modify `assets/catalog/catalog.yaml`.

**Phase order:** A (harness) → B (vocab/ADR) → C (roadmap/TODO) → D (locks) → E (pilot) → F (doc-sync) → G (closeout).

---

## Phase A — ROLE-1 role-conformance harness

### Task 1: Pure classification core

**Files:**
- Create: `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts`
- Create: `…/role_conformance_core.script.spec.ts`

- [ ] **Step 1: Write the failing test**

`role_conformance_core.script.spec.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { classifyUtil, computeMetrics, isPureUtil } from './role_conformance_core.script'

describe('role_conformance_core', () => {
  it('flags a util importing node: as not pure', () => {
    expect(isPureUtil("import fs from 'node:fs'\nexport const x = 1")).toBe(false)
  })
  it('treats a side-effect-free helper as pure', () => {
    expect(isPureUtil('export const add = (a: number, b: number) => a + b')).toBe(true)
  })
  it('flags Bun.$ / electrobun / bun:sqlite / fetch as not pure', () => {
    expect(isPureUtil('await Bun.$`ls`')).toBe(false)
    expect(isPureUtil("import { x } from 'electrobun/bun'")).toBe(false)
    expect(isPureUtil("import { Database } from 'bun:sqlite'")).toBe(false)
    expect(isPureUtil('const r = await fetch(url)')).toBe(false)
  })
  it('classifyUtil verdicts pure→keep-util, impure→rename', () => {
    expect(classifyUtil('a.util.ts', 'export const a=1').verdict).toBe('keep-util')
    expect(classifyUtil('b.util.ts', "import 'node:os'").verdict).toBe('rename')
  })
  it('computeMetrics derives ratios', () => {
    const rows = [
      classifyUtil('a.util.ts', 'export const a=1'),
      classifyUtil('b.util.ts', "import 'node:os'")
    ]
    const m = computeMetrics(rows, { locked: 1, roleDirs: 4 })
    expect(m).toEqual({
      totalUtil: 2,
      mislabeledUtilCount: 1,
      utilPurityRatio: 0.5,
      enforcedDirRatio: 0.25,
      suffixViolations: 1
    })
  })
})
```

- [ ] **Step 2: Run, verify it fails**

Run: `bun test packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the core**

`role_conformance_core.script.ts`:

```ts
export type UtilVerdict = 'keep-util' | 'rename' | 'move'
export type UtilRow = { path: string; importsIO: boolean; verdict: UtilVerdict; suggestedSuffix?: string }
export type RoleMetrics = {
  totalUtil: number
  mislabeledUtilCount: number
  utilPurityRatio: number
  enforcedDirRatio: number
  suffixViolations: number
}

/** A `.util.ts` is not pure if it imports an I/O module or uses a side-effecting API. */
const IO_RE = /from\s+['"](?:node:|bun:sqlite|electrobun)|Bun\.\$|\bfetch\s*\(/

export function isPureUtil(source: string): boolean {
  return !IO_RE.test(source)
}

export function classifyUtil(path: string, source: string): UtilRow {
  if (isPureUtil(source)) return { path, importsIO: false, verdict: 'keep-util' }
  return { path, importsIO: true, verdict: 'rename', suggestedSuffix: '.adapter' }
}

export function computeMetrics(rows: UtilRow[], enforced: { locked: number; roleDirs: number }): RoleMetrics {
  const totalUtil = rows.length
  const mislabeledUtilCount = rows.filter(r => r.verdict !== 'keep-util').length
  const ratio = (n: number, d: number) => (d === 0 ? 1 : +(n / d).toFixed(3))
  return {
    totalUtil,
    mislabeledUtilCount,
    utilPurityRatio: ratio(totalUtil - mislabeledUtilCount, totalUtil),
    enforcedDirRatio: ratio(enforced.locked, enforced.roleDirs),
    suffixViolations: mislabeledUtilCount
  }
}
```

- [ ] **Step 4: Run, verify it passes**

Run: `bun test packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts
git commit -m "Add role-conformance classification core"
```

**Acceptance gate (ROLE-1 AC1/AC2 core):** core spec green; metrics shape = `{ totalUtil, mislabeledUtilCount, utilPurityRatio, enforcedDirRatio, suffixViolations }`.

---

### Task 2: IO runner — scan, report, baseline

**Files:**
- Create: `packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.ts`
- Create: `…/role_conformance.script.spec.ts`

- [ ] **Step 1: Write the failing test (scan + report over a fixture tree)**

`role_conformance.script.spec.ts`:

```ts
import { describe, expect, it } from 'bun:test'
import { buildReport } from './role_conformance.script'

describe('role_conformance runner', () => {
  it('builds rows + metrics from in-memory files', () => {
    const files = [
      { path: 'src/core/a.util.ts', source: 'export const a=1' },
      { path: 'src/shell/main/b.util.ts', source: "import 'node:os'" }
    ]
    const report = buildReport(files, { lockedDirs: 1, roleDirs: 2 })
    expect(report.results.totalUtil).toBe(2)
    expect(report.results.mislabeledUtilCount).toBe(1)
    expect(report.rows.find(r => r.path.endsWith('b.util.ts'))?.verdict).toBe('rename')
    expect(report.summary).toBe('PASS') // first run has no baseline to regress against
  })
})
```

- [ ] **Step 2: Run, verify it fails**

Run: `bun test packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts`
Expected: FAIL — `buildReport` not exported.

- [ ] **Step 3: Implement the runner (pure `buildReport` + IO `main`)**

`role_conformance.script.ts`:

```ts
import path from 'node:path'
import { classifyUtil, computeMetrics, type RoleMetrics, type UtilRow } from './role_conformance_core.script'

const ROOT = path.resolve(import.meta.dir, '../../../../../..')
const BASELINE_PATH = path.join(ROOT, 'tools/metrics/baselines/role-conformance/baseline.json')

export type RoleReport = {
  timestamp: string
  git_sha: string
  bun_version: string
  results: RoleMetrics
  rows: UtilRow[]
  violations: Array<{ metric: string; value: number; baseline: number }>
  summary: 'PASS' | 'FAIL'
}

/** Pure: classify files + compute metrics; flag regression vs an optional baseline. */
export function buildReport(
  files: Array<{ path: string; source: string }>,
  dirs: { lockedDirs: number; roleDirs: number },
  baseline?: RoleMetrics
): RoleReport {
  const rows = files.map(f => classifyUtil(f.path, f.source))
  const results = computeMetrics(rows, { locked: dirs.lockedDirs, roleDirs: dirs.roleDirs })
  const violations: RoleReport['violations'] = []
  if (baseline) {
    if (results.mislabeledUtilCount > baseline.mislabeledUtilCount)
      violations.push({ metric: 'mislabeledUtilCount', value: results.mislabeledUtilCount, baseline: baseline.mislabeledUtilCount })
    if (results.utilPurityRatio < baseline.utilPurityRatio)
      violations.push({ metric: 'utilPurityRatio', value: results.utilPurityRatio, baseline: baseline.utilPurityRatio })
  }
  return {
    timestamp: new Date().toISOString(),
    git_sha: process.env.GIT_SHA ?? 'unknown',
    bun_version: Bun.version,
    results,
    rows,
    violations,
    summary: violations.length === 0 ? 'PASS' : 'FAIL'
  }
}

async function scanUtilFiles(): Promise<Array<{ path: string; source: string }>> {
  const glob = new Bun.Glob('src/**/*.util.ts')
  const out: Array<{ path: string; source: string }> = []
  for await (const rel of glob.scan({ cwd: ROOT })) {
    if (rel.endsWith('.spec.ts')) continue
    out.push({ path: rel, source: await Bun.file(path.join(ROOT, rel)).text() })
  }
  return out
}

async function loadBaseline(): Promise<RoleMetrics | undefined> {
  const f = Bun.file(BASELINE_PATH)
  return (await f.exists()) ? (JSON.parse(await f.text()).results as RoleMetrics) : undefined
}

if (import.meta.main) {
  const rawAction = process.env.usage_cmd ?? process.argv[2] ?? 'compare'
  const action = rawAction.includes(' ') ? rawAction.split(' ').pop()! : rawAction
  const files = await scanUtilFiles()
  // lockedDirs/roleDirs are derived from .ls-lint.yml + the scan; see Step 4.
  const dirs = await deriveDirCoverage(files)
  const baseline = action === 'baseline' ? undefined : await loadBaseline()
  const report = buildReport(files, dirs, baseline)

  const runDir = path.join(ROOT, 'tmp/metrics/role-conformance')
  await Bun.write(path.join(runDir, 'latest.json'), JSON.stringify(report, null, 2))
  await Bun.write(path.join(runDir, 'report.md'), renderReportMd(report))

  if (action === 'baseline' || process.env.usage_write_baseline === 'true') {
    await Bun.write(BASELINE_PATH, JSON.stringify(toBaseline(report), null, 2))
  }
  console.log(`${report.summary} mislabeled=${report.results.mislabeledUtilCount} purity=${report.results.utilPurityRatio}`)
  if (report.summary === 'FAIL') process.exitCode = 1
}
```

> Implement the three small helpers in the same file: `deriveDirCoverage(files)` (count dirs that already have an `.ls-lint.yml` rule = `lockedDirs`; count distinct dirs containing role-suffixed `src` files = `roleDirs`), `renderReportMd(report)` (a markdown table of `rows` + a metrics summary), and `toBaseline(report)` (strip `rows`, keep `timestamp/git_sha/bun_version/results/violations/summary`). Each is pure and gets a one-line spec assertion appended to the spec file.

- [ ] **Step 4: Run, verify it passes**

Run: `bun test packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.ts packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts
git commit -m "Add role-conformance runner and report"
```

**Acceptance gate (ROLE-1 AC1):** runner spec green; `buildReport` covers all scanned `.util.ts`; ls-lint accepts the `.script.ts` filenames (`bun run lint:ls`).

---

### Task 3: mise wiring + commit first baseline

**Files:**
- Modify: `mise.toml`
- Create: `tools/metrics/baselines/role-conformance/baseline.json`

- [ ] **Step 1: Add the `audit` task**

In `mise.toml`, add (mirroring the `perf` task shape):

```toml
"audit" = { description = "Repo conformance audits (role-conformance metric)", usage = '''
    cmd "roles" {
      cmd "baseline" {}
      cmd "compare" {}
      flag "--write-baseline" help="Refresh the committed baseline"
    }
  ''', run = "bun packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.ts" }
```

> The harness reads the subcommand from `process.env.usage_cmd` (014 ops-cli kernel convention) — `roles baseline` / `roles compare`. Follow `usage_env` from `packages/ops/src/support/lib` if a flattened `usage_cmd` is needed.

- [ ] **Step 2: Generate and commit the first baseline**

Run: `mise run audit roles baseline`
Expected: prints `PASS mislabeled=<N> purity=<r>`; writes `tools/metrics/baselines/role-conformance/baseline.json`.

- [ ] **Step 3: Sanity-check the baseline**

Run: `cat tools/metrics/baselines/role-conformance/baseline.json`
Expected: JSON with `results.totalUtil == 100` (matches `find src -name '*.util.ts' ! -name '*.spec.*' | wc -l`) and the four metric keys.

- [ ] **Step 4: Verify compare is a no-op on the just-written baseline**

Run: `mise run audit roles compare`
Expected: `PASS` (0 violations), exit 0.

- [ ] **Step 5: Commit**

```bash
git add mise.toml tools/metrics/baselines/role-conformance/baseline.json
git commit -m "Wire audit roles task and seed baseline"
```

**Acceptance gate (ROLE-1 AC2/AC3/AC4):** `baseline.json` committed with `totalUtil == 100`; `mise run audit roles compare` exits 0; the rows/report drive ROLE-2/3/4.

---

## Phase B — ROLE-2 vocabulary + ADR

### Task 4: Finalize vocabulary, doctrine, and seed the ADR

**Files:**
- Modify: `assets/guides/CODESTYLE_GUIDE.md`
- Create: `assets/guides/adr/0001-role-suffix-taxonomy.md`

- [ ] **Step 1: Add `.resolver` + any audit-justified suffix to the table**

In `CODESTYLE_GUIDE.md` § File Naming suffix table, add a row:
`| `.resolver.ts` | Resolves an identifier/value from a lookup or the environment | `frontmost_app.resolver.ts` |`
Add any other suffix the Task 3 report's `rename→` verdicts require (review `tmp/metrics/role-conformance/report.md`).

- [ ] **Step 2: Tighten the `.util` definition**

Change the `.util.ts` row description to: "Pure, **stateless, side-effect-free** helper functions (no I/O imports — `node:*`, `bun:sqlite`, `electrobun`, `Bun.$`, `fetch`). Shell I/O artifacts use a role suffix." (Matches the harness detector.)

- [ ] **Step 3: Add the single-word doctrine subsection**

Under § File Naming add "### Single-word names & subfolders": prefer single-word filenames licensed by the suffix; carry a shared qualifier in a subfolder (e.g. `handoff/frontmost/app.resolver.ts`, `handoff/terminal/command.adapter.ts`); merge only if one abstraction; compound names last resort. Link the ADR.

- [ ] **Step 4: Seed the ADR**

`assets/guides/adr/0001-role-suffix-taxonomy.md` — Context (100 `.util` files, drift, 017 ls-lint mechanism), Decision (the finalized vocabulary + single-word doctrine + `.util` purity rule + the `role-conformance` metric), Consequences (renames staged via roadmap; ls-lint enforces; metric tracks). One page.

- [ ] **Step 5: Verify links + gate**

Run: `rg -n 'adr/0001-role-suffix-taxonomy' assets/guides/CODESTYLE_GUIDE.md` (expect a cross-link) and `bun run lint:ls` (green — `assets/**` unaffected).

- [ ] **Step 6: Commit**

```bash
git add assets/guides/CODESTYLE_GUIDE.md assets/guides/adr/0001-role-suffix-taxonomy.md
git commit -m "Finalize role suffix vocabulary and ADR"
```

**Acceptance gate (ROLE-2 AC1–4):** `.resolver` + doctrine + `.util` purity rule in `CODESTYLE_GUIDE`; ADR committed under `assets/guides/adr/` and cross-linked.

---

## Phase C — ROLE-3 roadmap + TODO

### Task 5: Write the roadmap and rewrite `TODO.md` P3

**Files:**
- Create: `assets/specs/018-architecture-role-taxonomy/migration-roadmap.md`
- Modify: `TODO.md`

- [ ] **Step 1: Derive PR slices from the harness report**

From `tmp/metrics/role-conformance/report.md` (Task 3), group the has-violations dirs into dependency-ordered PR slices (one dir/cluster each, ≤ ~12 files/PR), pilot = PR-0, conformant locks = foundation. Write `migration-roadmap.md` with, per PR: dir, files, target suffixes/subfolders, gate command (`bun test <dir>` + `bun run lint:ls`), and the P-item(s) it satisfies.

- [ ] **Step 2: Add the reconciliation table**

In the roadmap, a table mapping each PR → `TODO.md` P-items: subsume **P3-7** + naming half of **P2-9**; sequence ahead of **P3-1**, **P3-16**; cross-ref **P3-12/P3-13/P3-15/P3-5**.

- [ ] **Step 3: Rewrite `TODO.md` P3 ordering**

Annotate the affected P3 items with "→ 018 roadmap PR-N" / "subsumed by 018"; reorder so the role-naming PRs precede P3-1/P3-16. Drop no P-item.

- [ ] **Step 4: Verify coverage**

Run: `rg -c '^\| ' assets/specs/018-architecture-role-taxonomy/migration-roadmap.md` (PR rows present); cross-check every has-violations dir from the report appears.

- [ ] **Step 5: Commit**

```bash
git add assets/specs/018-architecture-role-taxonomy/migration-roadmap.md TODO.md
git commit -m "Add role migration roadmap and reconcile TODO"
```

**Acceptance gate (ROLE-3 AC1–3):** every has-violations dir assigned to one PR; `TODO.md` P3 reordered/annotated, no item dropped; dependencies noted.

---

## Phase D — ROLE-4 conformant-dir locks

### Task 6: Lock the already-conformant dirs

**Files:**
- Modify: `.ls-lint.yml`

- [ ] **Step 1: Identify conformant dirs**

From the harness report, list dirs where every file's verdict is `keep-util` (or already role-suffixed) — i.e. 0 `rename→`.

- [ ] **Step 2: Add basename-regex rules (017 COH-3 style)**

For each conformant dir, add a rule permitting exactly the suffixes its files carry, e.g.:

```yaml
  src/core/helpers:
    .ts: regex:^([a-z][a-z0-9_]*\.(helper|util)(\.spec)?|index)$
```

Also add a rule to register the new harness directory to prevent ls-lint failures on it:

```yaml
  packages/ops/src/metrics/harnesses/role-conformance:
    .ts: regex:^[a-z][a-z0-9_]*\.script(\.spec)?$
```

Do **not** add rules for any has-violations dir.

- [ ] **Step 3: Verify 0 new failures**

Run: `bun run lint:ls`
Expected: exit 0 (these dirs are already conformant).

- [ ] **Step 4: Confirm has-violations dirs untouched + other configs frozen**

Run: `git diff .ls-lint.yml` (only conformant-dir additions) and `git diff biome.jsonc .dependency-cruiser.cjs knip.jsonc` (empty).

- [ ] **Step 5: Commit**

```bash
git add .ls-lint.yml
git commit -m "Lock conformant dirs with ls-lint rules"
```

**Acceptance gate (ROLE-4 AC1–3):** conformant dirs locked, `bun run lint:ls` green, 0 has-violations rules added, sibling configs unchanged.

---

## Phase E — ROLE-5 handoff pilot

### Task 7: Rename + relocate the handoff files

**Files:**
- `git mv` 7 files (3 into subfolders); Modify: `src/shell/main/handoff/handoff_registry.service.ts` + any other importer.

- [ ] **Step 1: Baseline the handoff suite**

Run: `bun test src/shell/main/handoff`
Expected: PASS.

- [ ] **Step 2: `git mv` to the single-word layout**

```bash
cd src/shell/main/handoff
git mv handoff_registry.service.ts registry.service.ts
git mv electrobun_clipboard.port.ts clipboard.port.ts
git mv browser_handoff.util.ts browser.adapter.ts
git mv editor_handoff.util.ts editor.adapter.ts
git mv xdotool_available.util.ts xdotool.adapter.ts
mkdir -p frontmost terminal
git mv resolve_frontmost_app.util.ts frontmost/app.resolver.ts
git mv paste_frontmost_handoff.util.ts frontmost/paste.adapter.ts
git mv resolve_terminal_app_name.util.ts terminal/app.resolver.ts
git mv terminal_handoff.util.ts terminal/command.adapter.ts
```
Rename each co-located `*.spec.ts` to match (e.g. `git mv browser_handoff.util.spec.ts browser.adapter.spec.ts`, `… terminal/command.adapter.spec.ts`).

- [ ] **Step 3: Rewrite the registry imports**

In `registry.service.ts`, replace the import block with:

```ts
import { type BrowserHandoffResult, openInBrowser } from './browser.adapter'
import { type EditorHandoffResult, openInEditor as openInEditorUtil } from './editor.adapter'
import { readSystemClipboard, writeSystemClipboard } from './clipboard.port'
import { type PasteFrontmostResult, pasteIntoFrontmostApp } from './frontmost/paste.adapter'
import { resolveTerminalAppName } from './terminal/app.resolver'
import { pasteInTerminal, runInTerminal, type TerminalHandoffResult } from './terminal/command.adapter'
```

Update each moved file's own internal relative imports (e.g. a file now under `frontmost/` importing `../resolve_frontmost_app` → `./app.resolver`, or importing siblings — adjust the `../` depth). Do **not** change any function body.

- [ ] **Step 4: Fix remaining importers across src**

Run: `rg -rln 'handoff_registry|electrobun_clipboard|browser_handoff|editor_handoff|terminal_handoff|paste_frontmost_handoff|resolve_frontmost_app|resolve_terminal_app_name|xdotool_available' src`
Update every hit to the new path (e.g. main process wiring importing `handoff_registry.service`).

- [ ] **Step 5: Verify behaviour-frozen**

Run: `rg -rn 'handoff_registry|electrobun_clipboard|browser_handoff|editor_handoff|terminal_handoff|paste_frontmost_handoff|resolve_frontmost_app|resolve_terminal_app_name|xdotool_available' src` → 0.
Run: `bun test src/shell/main/handoff && bun run typecheck`
Expected: PASS, no assertion edits.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Convert handoff folder to role suffixes"
```

**Acceptance gate (ROLE-5 AC1/AC3):** handoff matches the single-word layout; 0 stale imports; suite + typecheck green; behaviour unchanged.

---

### Task 8: Lock the pilot dir + verify metric delta

**Files:**
- Modify: `.ls-lint.yml`

- [ ] **Step 1: Add handoff dir + subdir rules**

```yaml
  src/shell/main/handoff:
    .ts: regex:^([a-z][a-z0-9_]*\.(service|port|adapter)(\.spec)?|index)$
  src/shell/main/handoff/frontmost:
    .ts: regex:^([a-z][a-z0-9_]*\.(adapter|resolver)(\.spec)?)$
  src/shell/main/handoff/terminal:
    .ts: regex:^([a-z][a-z0-9_]*\.(adapter|resolver)(\.spec)?)$
```

- [ ] **Step 2: Verify lint green**

Run: `bun run lint:ls`
Expected: exit 0.

- [ ] **Step 3: Re-run the metric and confirm −7**

Run: `mise run audit roles compare`
Expected: `mislabeledUtilCount` is **7 lower** than the Task 3 baseline (the 7 handoff `.util` files are gone); `compare` reports PASS (improvement is not a regression).

- [ ] **Step 4: Commit**

```bash
git add .ls-lint.yml
git commit -m "Lock handoff pilot dirs and verify metric"
```

**Acceptance gate (ROLE-5 AC2/AC3):** handoff dir + subdirs locked; `bun run lint:ls` green; `compare` shows `mislabeledUtilCount −7`.

---

## Phase F — ROLE-6 drift-sync

### Task 9: Sync TOOLS_GUIDE + agent files

**Files:**
- Modify: `assets/guides/TOOLS_GUIDE.md`, `CLAUDE.md`, `AGENTS.md`

- [ ] **Step 1: Document the `role-conformance` series**

In `TOOLS_GUIDE.md` metrics taxonomy, add a `role-conformance` row/section: harness `packages/ops/src/metrics/harnesses/role-conformance/`, baseline `tools/metrics/baselines/role-conformance/baseline.json`, `mise run audit roles baseline|compare`, the four metrics, cadence (on-demand + at release/`spec ready`).

- [ ] **Step 2: Reconcile agent naming guidance**

In `CLAUDE.md` and `AGENTS.md`, ensure any naming/`.util` guidance points at `CODESTYLE_GUIDE` § File Naming (no divergent restated vocabulary).

- [ ] **Step 3: Verify doc-only + no contradiction**

Run: `git diff --name-only` (only `.md` files in this task) and `rg -n 'util|suffix' CLAUDE.md AGENTS.md` (references the guide).

- [ ] **Step 4: Commit**

```bash
git add assets/guides/TOOLS_GUIDE.md CLAUDE.md AGENTS.md
git commit -m "Document role-conformance metric and naming"
```

**Acceptance gate (ROLE-6 AC1–3):** `TOOLS_GUIDE` has the series; agent files reference the guide; doc-only diff.

---

## Phase G — closeout

### Task 10: Closeout metrics, catalog key, gate

**Files:**
- Create: `assets/specs/018-architecture-role-taxonomy/closeout-metrics.txt`
- Modify: `assets/catalog/catalog.yaml`

- [ ] **Step 1: Record actuals**

Write `closeout-metrics.txt`: the committed `baseline.json` metrics, the post-pilot `compare` delta (−7), conformant-dir count locked, and the `.util` total.

- [ ] **Step 2: Register catalog key**

Add `arch_role_taxonomy:` to `assets/catalog/catalog.yaml` mirroring `src_cohesion:` / `ops_cli_dry:`, pointed at `assets/specs/018-architecture-role-taxonomy`.

- [ ] **Step 3: Full gate**

Run: `mise run spec ready assets/specs/018-architecture-role-taxonomy --key arch_role_taxonomy`
Expected: PASS (`bun test`, typecheck, depcruise, ls-lint, biome, knip + catalog validation).

- [ ] **Step 4: Confirm frozen configs**

Run: `git diff --name-only biome.jsonc .dependency-cruiser.cjs knip.jsonc`
Expected: empty.

- [ ] **Step 5: Commit**

```bash
git add assets/specs/018-architecture-role-taxonomy/closeout-metrics.txt assets/catalog/catalog.yaml
git commit -m "Record 018 closeout metrics and catalog key"
```

**Acceptance gate (DoD 1–7):** closeout recorded; `mise run spec ready … --key arch_role_taxonomy` green; biome/depcruise/knip unchanged.

---

## Self-review checklist (run before handoff)

- [ ] Every ROLE-1…ROLE-6 criterion maps to a task gate.
- [ ] No placeholders: harness code is real; doc tasks name exact sections; pilot uses concrete `git mv` + import blocks.
- [ ] Name consistency: `role_conformance_core.script.ts`, `buildReport`, `mislabeledUtilCount`, `mise run audit roles`, `registry.service.ts`, `frontmost/app.resolver.ts`, `terminal/command.adapter.ts` used identically across tasks.
- [ ] Behaviour frozen: harness is tooling; only the pilot touches product code, baselined green then re-verified.
- [ ] Only `.ls-lint.yml` (Tasks 6,8) + `mise.toml` (Task 3) change config; biome/depcruise/knip never.
