<!-- markdownlint-disable-file -->

# Role-suffix conformance migration (all remaining P1)

**Feature Branch**: `019-role-suffix-migration`
**Release**: v0.x
**Status**: Draft

**Input**: Execute the remaining `TODO.md` **P1** taxonomy-conformance work in one
spec: rename every genuinely mis-roled `.util` file across the five flagged dirs
to its **true** role suffix (per `CODESTYLE_GUIDE` + `ADR-0001`), add per-dir
ls-lint locks in lockstep, harden the `role-conformance` detector so the metric
is trustworthy, drive `mislabeledUtilCount` to **0** honestly, raise
`enforcedDirRatio`, and complete the P1-2 guide drift cross-check — all
behaviour-frozen. Built for an implementer (GLM 5.2) to execute with zero drift.

## Introduction

018 shipped the `role-conformance` metric, the handoff pilot, and conformant-dir
locks, and deferred the bulk renames to a roadmap. 019 executes that roadmap **as
one spec**, but a live re-audit (2026-06-21) of the 14 flagged files exposed a
detector defect that makes a naive "rename all 14" **wrong**:

> The detector's `IO_RE` flags **type-only imports** (`import type … from
> 'electrobun'`) and **pure Node modules** (`import path from 'node:path'`) as
> I/O. Confirmed: `import type { Display } from 'electrobun/bun'` and
> `import path from 'node:path'` both test IMPURE. So ~6 of the 14 flagged files
> are **pure** (`placement`, `display_at_cursor`, `darwin_window_frame`,
> `load_window_state`, and likely `launcher_window`, `shell_hooks`) and are
> **correctly** named `.util`. Renaming them would be a regression.
>
> Conversely, `import_bundle_persist` and `frecency_snapshot` perform real
> persistence on a `Database` **passed as a parameter** while importing
> `bun:sqlite` only as a *type* — so the detector cannot see their I/O at all.

Therefore 019 (1) **hardens the detector** (ignore `import type`; treat pure Node
modules as non-I/O) so the metric stops over-counting and `mislabeledUtilCount`
can reach 0 legitimately, and (2) renames by **true role** decided via per-file
review — not raw detector verdicts. This is the central lesson carried from the
016–018 reviews: the import heuristic is a proxy, not ground truth.

## Clarifications

## Out of scope

- **Splitting** large files (`shell_hooks.util.ts` 235 LOC, `placement.util.ts` 232 LOC) or the `App`/`shell/app/lib` decomposition — those are P3-1/P3-11/P3-12, separate specs. 019 is rename + detector-hardening only.
- Reclassifying files in **already-conformant** dirs (018 locked those) or `__tests__` beyond the one flagged helper.
- New role suffixes — 019 uses only the **existing** `CODESTYLE_GUIDE` vocabulary (`.service`, `.repository`, `.adapter`, `.client`, `.port`, `.resolver`, `.helper`, `.util`, …). No vocabulary additions.
- Detecting **param-based I/O** automatically in the harness (a deeper static-analysis enhancement) — 019 handles those two files by human role review and records the limitation.
- Any behavioural change: every rename is move + import-path update only.

## Glossary

| Term | Meaning |
| ---- | ------- |
| **mis-roled `.util`** | A `.util.ts` whose true role is not "pure stateless helper" — it performs runtime I/O or persistence and should carry a role suffix. |
| **false-positive flag** | A `.util.ts` the current detector marks impure solely via a `import type` line or a pure Node module (`node:path`); it is genuinely pure and stays `.util`. |
| **true role** | The role determined by reading the file (per `CODESTYLE_GUIDE` definitions), not by the import heuristic. |
| **behaviour-frozen** | Renames/relocations only; function bodies, exports' signatures, and runtime behaviour unchanged; pre-existing specs pass with mechanical edits only. |

---

## REQUIREMENT MIGR-1: Harden the role-conformance detector

**User story:** As a maintainer, I want the role-conformance detector to count only runtime I/O and not type-only imports or pure Node modules.

### Acceptance criteria
1. WHEN a file contains `import type … from '…'`, THEN `isPureUtil` SHALL NOT treat that line as I/O (strip/ignore `import type` lines before matching).
   - **Measure:** `isPureUtil("import type { Display } from 'electrobun/bun'\nexport const x=1")` returns `true`.
   - **Evidence:** New cases in `role_conformance_core.script.spec.ts`; `bun test ./packages/ops/src/metrics/harnesses/role-conformance/…` green.
2. WHEN a file imports a **pure** Node module (`node:path`, `node:url`, `node:querystring`, `node:util`, `node:assert`), THEN it SHALL NOT be flagged; runtime I/O modules (`node:fs`, `node:fs/promises`, `node:child_process`, `node:os`, `node:net`, `node:http(s)`), value imports of `bun:sqlite`/`electrobun`, `Bun.$`/`Bun.spawn`, and `fetch(` SHALL still flag.
   - **Measure:** `isPureUtil("import path from 'node:path'")` → `true`; `isPureUtil("import fs from 'node:fs/promises'")` → `false`; `isPureUtil("const r = await fetch(u)")` → `false`.
   - **Evidence:** Co-located spec cases for each; green.
3. WHEN the detector is hardened, THEN the baseline SHALL be regenerated and the resulting `mislabeledUtilCount` SHALL drop to reflect removal of the false positives (expected: only the genuine-I/O files remain flagged).
   - **Measure:** `mise run audit roles baseline` then `mise run audit roles compare` PASS; recorded `mislabeledUtilCount` < 14.
   - **Evidence:** `tools/metrics/baselines/role-conformance/baseline.json` diff + closeout.

---

## REQUIREMENT MIGR-2: Authoritative per-file dispositions

**User story:** As a developer, I want to follow a predefined disposition table of true roles when re-classifying `.util` files to prevent semantic drift.

### Disposition table (the contract — GLM follows exactly)

| # | File | Runtime I/O? | True role | Action |
|---|------|--------------|-----------|--------|
| 1 | `src/__tests__/helpers/rpc_route.spec.util.ts` | yes (`node:fs/promises`, Elysia, App) | test harness helper | **rename → `rpc_route.helper.ts`** (drops `.spec`+`.util`; no longer a util **and** no longer auto-run as a test) |
| 2 | `src/shell/app/db/import_bundle_persist.util.ts` | persistence via injected `Database` | data persistence | **rename → `import_bundle_persist.repository.ts`** |
| 3 | `src/shell/app/lib/app_preview_fetch.util.ts` | yes (`fetch`) | external HTTP fetch | **rename → `app_preview_fetch.client.ts`** |
| 4 | `src/shell/app/lib/app_sync.util.ts` | yes (`node:fs/promises`, DB) | sync/import orchestration | **rename → `app_sync.service.ts`** |
| 5 | `src/shell/app/lib/app_task_mutation.util.ts` | persistence orchestration (repositories) | task-mutation orchestration | **rename → `app_task_mutation.service.ts`** |
| 6 | `src/shell/app/lib/app_task_source.util.ts` | yes (`node:fs/promises`) | YAML source write-back | **rename → `app_task_source.service.ts`** |
| 7 | `src/shell/app/lib/frecency_snapshot.util.ts` | persistence via injected `Database` | db snapshot persistence | **rename → `frecency_snapshot.repository.ts`** |
| 8 | `src/shell/main/window/launcher_frame_probe.util.ts` | yes (`node:fs` writes) | fs diagnostic sink | **rename → `launcher_frame_probe.adapter.ts`** |
| 9 | `src/shell/main/window/placement.util.ts` | no (type-only `electrobun`) | pure geometry | **keep `.util`** (false positive) |
| 10 | `src/shell/main/window/display_at_cursor.util.ts` | no (type-only) | pure geometry | **keep `.util`** (false positive) |
| 11 | `src/shell/main/window/darwin_window_frame.util.ts` | no (type-only) | pure geometry | **keep `.util`** (false positive) |
| 12 | `src/shell/main/window/load_window_state.util.ts` | no (`node:path` is pure) | pure path compute | **keep `.util`** (false positive) |
| 13 | `src/shell/main/window/launcher_window.util.ts` | no (type-only; side-effects via injected window ports) | launcher orchestration over injected ports | **keep `.util`** (false positive; split is P3, out of scope) |
| 14 | `src/shell/main/utils/shell_hooks.util.ts` | no (type-only; injected hooks) | shell-hook wiring/factories | **keep `.util`** (false positive; split is P3, out of scope) |

### Acceptance criteria
1. WHEN the table is applied, THEN exactly the 8 `rename` rows SHALL be renamed and the 6 `keep` rows SHALL remain `.util`.
   - **Measure:** `find src -name '*.util.ts' ! -name '*.spec.*'` no longer lists the 8 renamed basenames; still lists the 6 kept ones.
   - **Evidence:** Diff + the regenerated harness report flags **0** files after MIGR-1.
2. WHEN a renamed file's suffix is chosen, THEN it SHALL match a `CODESTYLE_GUIDE` role definition (reviewer-verifiable) and SHALL NOT introduce a new suffix.
   - **Measure:** Every new suffix ∈ {`.helper`,`.repository`,`.client`,`.service`,`.adapter`}; all already in the guide.
   - **Evidence:** Reviewer cross-check vs `CODESTYLE_GUIDE` § File Naming.

---

## REQUIREMENT MIGR-3: Execute renames (behaviour-frozen)

**User story:** As a developer, I want renames to be move-only operations without body modifications, ensuring existing tests continue to pass.

### Acceptance criteria
1. WHEN each of the 8 renames lands, THEN its co-located spec SHALL be renamed to match (e.g. `app_sync.util.spec.ts` → `app_sync.service.spec.ts`) and all importers updated.
   - **Measure:** `rg -rn '<old_basename>' src` → **0** for each old basename (e.g. `app_sync\.util`, `import_bundle_persist\.util`, `rpc_route\.spec\.util`, …).
   - **Evidence:** `bun test` for each touched dir green with no behavioural assertion edits; `bun run typecheck` green.
2. WHEN renames are complete, THEN no function body, export name, or signature SHALL change (rename/move only).
   - **Measure:** `git diff --stat` shows renames + import-line edits; no logic diffs.
   - **Evidence:** Pre-existing specs pass unchanged (besides import/filename edits).

---

## REQUIREMENT MIGR-4: ls-lint locks per touched dir

**User story:** As a maintainer, I want ls-lint rules updated for renamed directories to lock naming conventions.

### Acceptance criteria
1. WHEN `src/shell/app/lib`, `src/shell/app/db`, `src/shell/main/window`, `src/shell/main/utils`, `src/__tests__/helpers` settle, THEN each SHALL have an `.ls-lint.yml` rule allowing exactly the suffixes its files now carry (including the retained `.util` for the kept-pure files), and `bun run lint:ls` SHALL be green.
   - **Measure:** `bun run lint:ls` exit 0; each rule lists only present suffixes (e.g. `app/lib` → `service|client|repository|util|const|types`).
   - **Evidence:** `.ls-lint.yml` diff (additive only); green lint.
2. WHEN rules are added, THEN Biome/dependency-cruiser/knip configs SHALL be unchanged.
   - **Measure:** `git diff biome.jsonc .dependency-cruiser.cjs knip.jsonc` empty.
   - **Evidence:** Diff.

---

## REQUIREMENT MIGR-5: Metric reaches 0 honestly + baseline ratcheted

**User story:** As a maintainer, I want the regenerated role conformance metrics baseline to reach 0 honestly to lock in the target.

### Acceptance criteria
1. WHEN the harness re-runs after hardening + renames, THEN `mislabeledUtilCount` SHALL be **0**.
   - **Measure:** `mise run audit roles compare` prints `mislabeled=0`.
   - **Evidence:** baseline.json `results.mislabeledUtilCount == 0`.
2. WHEN the baseline is committed, THEN it SHALL be regenerated at the final state (real `git_sha`) so future `compare` guards 0 and the current `enforcedDirRatio`.
   - **Measure:** `GIT_SHA=$(git rev-parse --short HEAD) mise run audit roles baseline`; `compare` PASS afterward.
   - **Evidence:** Committed baseline.json + closeout-metrics.txt recording before/after.
3. WHEN any genuinely-pure file from the keep-list is inspected, THEN it SHALL still be `.util`.
   - **Measure:** All 6 keep-list basenames still end `.util.ts`.
   - **Evidence:** `find src -name "*.util.ts" ! -name "*.spec.*"`

---

## REQUIREMENT MIGR-6: Guide drift cross-check (P1-2)

**User story:** As a developer, I want updated guides to sync with renamed files, ensuring no documentation drift occurs.

### Acceptance criteria
1. WHEN naming/suffix rules, FCIS import boundaries, and stack decisions (TypeBox, `bun:sqlite`, no Drizzle) are cross-checked against `src/`, THEN any mismatch SHALL be fixed in the guides (guides win over stale agent entrypoints).
   - **Measure:** Cross-check notes recorded; fixes are doc-only.
   - **Evidence:** Guide diffs; `mise run app gates` green.
2. WHEN MIGR-6 lands, THEN `TODO.md` P1 SHALL be updated to mark the rename slices and the guide cross-check `[x]`.
   - **Measure:** `TODO.md` P1 rename items + "Guide drift cross-check" checked.
   - **Evidence:** `TODO.md` diff.

---

## Cross-requirement rules

- **Behaviour frozen.** Only renames/relocations + the detector regex + additive ls-lint + doc edits. Every pre-existing spec passes without behavioural edits.
- **Additive ls-lint only.** No rule removed/loosened; biome/depcruise/knip frozen.
- **Commit policy.** Conventional Commits: capitalized subject ≤ 50 chars, body ≥ 20 non-ws chars with **every body line ≤ 72 chars**, no trailing period, `chore`/`fix`/`docs`/`ref` types, end with `Co-Authored-By: …`. Dry-run via `bun packages/ops/src/governance/policies/hooks/commit_message.script.ts <file>`.
- **Verify against live data.** Re-run the harness after each phase; never act on stale numbers (016–018 archaeology lesson).
- **Tests for packages.** `bun test` root is `src/`; pass packages spec files with a `./` prefix.

---

## Definition of Done (gate)

1. `mislabeledUtilCount` is **0** after detector hardening + the 8 renames (no pure file renamed).
2. **0** stale import references for any renamed basename (`rg` clean across `src/`).
3. The 6 false-positive files remain `.util`; the 8 renamed files carry an existing role suffix matching their true role.
4. `bun run lint:ls` green with additive per-dir rules; biome/depcruise/knip diff empty.
5. Baseline regenerated at the final state (real `git_sha`); `mise run audit roles compare` PASS.
6. `mise run spec ready assets/specs/019-role-suffix-migration --key role_suffix_migration` green (5 steps, 0 failed).
7. `TODO.md` P1 rename slices + guide cross-check marked `[x]`; no behavioural diff anywhere.

## Assumptions

- The two param-I/O persistence files (`import_bundle_persist`, `frecency_snapshot`) are renamed by role even though the (import-based) detector cannot flag them; the detector's param-I/O blindness is recorded as a known limitation, not a 019 blocker.
- Leaf suffix choices in the disposition table are authoritative; `/speckit-plan` confirms each against the file's content but does not change a suffix without recording rationale.
- `__tests__/helpers` is not ls-lint-pinned today; 019 may add a rule for it permitting `.helper`/`.util`/spec markers.

## Dependencies

- 018 merged (or this branch based on it): the `role-conformance` harness, `ADR-0001`, and the conformant-dir locks must be present.
- Catalog key `role_suffix_migration` registered in `assets/catalog/catalog.yaml` for the gate.
