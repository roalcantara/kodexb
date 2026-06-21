# Architecture role-taxonomy — Tasks

Dependency-ordered index. Full steps/code/gates in [`plan.md`](./plan.md);
requirements in [`spec.md`](./spec.md). Check a box only when the task's
**Acceptance gate** passes.

## Phase A — ROLE-1 role-conformance harness
- [X] **T101** Pure classification core (`role_conformance_core.script.ts`) — *gate:* ROLE-1 AC1/AC2 core
- [X] **T102** IO runner: scan + `buildReport` + report.md — *gate:* ROLE-1 AC1
- [X] **T103** `mise run audit roles` wiring + commit first `baseline.json` (`totalUtil==100`) — *gate:* ROLE-1 AC2/AC3/AC4

## Phase B — ROLE-2 vocabulary + ADR
- [X] **T104** Add `.resolver` + single-word doctrine + `.util` purity rule in CODESTYLE; seed `assets/guides/adr/0001` — *gate:* ROLE-2 AC1–4

## Phase C — ROLE-3 roadmap + TODO
- [X] **T105** `migration-roadmap.md` (PR slices from the report) + rewrite `TODO.md` P3 — *gate:* ROLE-3 AC1–3

## Phase D — ROLE-4 conformant locks
- [X] **T106** Additive ls-lint rules for conformant dirs only (0 new failures) — *gate:* ROLE-4 AC1–3

## Phase E — ROLE-5 handoff pilot
- [X] **T107** `git mv` handoff → single-word layout (`frontmost/`, `terminal/`) + rewrite imports, behaviour-frozen — *gate:* ROLE-5 AC1/AC3
- [X] **T108** Lock handoff dir+subdirs; `compare` shows `mislabeledUtilCount −7` — *gate:* ROLE-5 AC2/AC3

## Phase F — ROLE-6 drift-sync
- [X] **T109** Document `role-conformance` series in TOOLS_GUIDE; reconcile CLAUDE.md/AGENTS.md — *gate:* ROLE-6 AC1–3

## Phase G — Closeout
- [X] **T110** Closeout metrics + register `arch_role_taxonomy` + full `mise run spec ready` — *gate:* DoD 1–7

**Hard invariants:** behaviour frozen (harness is tooling; only the pilot touches
product code, baselined green → green); merges/moves via `git mv`, no logic edits;
no edits to `biome.jsonc`/`.dependency-cruiser.cjs`/`knip.jsonc`; `.ls-lint.yml`
only in T106/T108, `mise.toml` only in T103; commit after each green task.

---

## Commit plan

Author one `### C#` chunk per logical phase before implement. Incremental:
`mise run spec ready --phase C1 --commit`. Closeout flush: `mise run spec ready --commit`.

### C1 — ROLE-1 harness
- **Phase:** A
- **Tasks:** T101, T102, T103
- **Paths:** `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.ts`, `packages/ops/src/metrics/harnesses/role-conformance/role_conformance_core.script.spec.ts`, `packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.ts`, `packages/ops/src/metrics/harnesses/role-conformance/role_conformance.script.spec.ts`, `tools/metrics/baselines/role-conformance/baseline.json`, `mise.toml`
- **Subject:** `chore(ops): Implement role-conformance harness`
- **Body:**
  Implement the role-conformance metric harness to scan util
  files, establish first baseline, and compare against it.

  Changes:
  - Add classification core and test runner under packages/ops
  - Wire mise audit roles task and seed first baseline.json

### C2 — ROLE-2 vocabulary + ADR
- **Phase:** B
- **Tasks:** T104
- **Paths:** `assets/guides/CODESTYLE_GUIDE.md`, `assets/guides/adr/0001-role-suffix-taxonomy.md`
- **Subject:** `docs(style): Finalize role suffix vocabulary`
- **Body:**
  Add .resolver suffix definition and state single-word naming
  doctrine in CODESTYLE_GUIDE.md and record in ADR.

  Changes:
  - Update CODESTYLE_GUIDE.md suffix table and add single-word doctrine
  - Seed assets/guides/adr/0001-role-suffix-taxonomy.md

### C3 — ROLE-3 roadmap
- **Phase:** C
- **Tasks:** T105
- **Paths:** `assets/specs/018-architecture-role-taxonomy/migration-roadmap.md`, `TODO.md`
- **Subject:** `docs(backlog): Reconcile TODO and roadmap`
- **Body:**
  Write multi-PR role migration roadmap and update TODO.md P3
  backlog order.

  Changes:
  - Add migration-roadmap.md with PR slices and target suffixes
  - Update TODO.md P3 backlog order and annotations

### C4 — ROLE-4 conformant locks
- **Phase:** D
- **Tasks:** T106
- **Paths:** `.ls-lint.yml`
- **Subject:** `chore(style): Lock conformant dirs`
- **Body:**
  Add rules in .ls-lint.yml to lock already-conformant
  directories and the new harness directory.

  Changes:
  - Modify .ls-lint.yml to enforce suffixes for clean folders

### C5 — ROLE-5 pilot handoff rename
- **Phase:** E
- **Tasks:** T107, T108
- **Paths:** `.ls-lint.yml`, `src/shell/main/handoff/*`
- **Subject:** `ref(handoff): Migrate handoff pilot`
- **Body:**
  Convert handoff directory structure to single-word layout and
  update imports, verifying behavior.

  Changes:
  - Rename and move handoff files to single-word names and subfolders
  - Add ls-lint rules locking handoff directories and verify compare

### C6 — ROLE-6 drift-sync + Closeout
- **Phase:** F
- **Tasks:** T109, T110
- **Paths:** `assets/guides/TOOLS_GUIDE.md`, `CLAUDE.md`, `AGENTS.md`, `assets/specs/018-architecture-role-taxonomy/closeout-metrics.txt`, `assets/catalog/catalog.yaml`
- **Subject:** `chore(docs): Sync guides and closeout`
- **Body:**
  Document new metrics in TOOLS_GUIDE.md, update agent
  instruction files, and record actual metrics in closeout.

  Changes:
  - Add role-conformance series in TOOLS_GUIDE.md
  - Update CLAUDE.md/AGENTS.md and record metrics in closeout
