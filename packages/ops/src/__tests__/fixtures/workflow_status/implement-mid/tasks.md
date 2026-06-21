# Tasks — implement-mid-fixture

## Phase A — Exec derive

- [x] **T101** Add pure derive module — *gate:* AC1 — *commit:* `feat(exec): Add workflow progress derivation`
- [x] **T102** Task + commit parsing helpers — *gate:* AC1
- [x] **T103** Six-column builder + debt + catalog enrichment — *gate:* AC2
- [ ] **T104** Gum / raw / JSON renderers — *gate:* AC4
- [ ] **T105** HTML renderer — *gate:* AC7
- [ ] **T106** CLI entry script — *gate:* AC1
- [ ] **T107** Mise + spec_plan wiring — *gate:* AC1
- [ ] **T108** Fixtures + tests — *gate:* AC10
- [ ] **T109** Export + index — *gate:* AC9
- [ ] **T110** SDD guide subsection — *gate:* AC10

## Commit plan

Incremental: `mise run spec ready --phase C1 --commit`

### C1 — Exec derive pipeline
- **Phase:** A
- **Tasks:** T101 T102 T103 T109
- **Paths:** `packages/exec/src/workflow_progress.script.ts` `packages/exec/src/workflow_progress.script.spec.ts` `packages/exec/src/index.ts`
- **Subject:** `feat(exec): Add workflow progress derivation`
- **Body:**
  Adds pure six-column SDD pipeline derivation in @kb/exec.

  Includes task checkbox parsing, artifact debt detection, and
  catalog enrichment inputs (pure — no filesystem I/O).

### C2 — Ops CLI and renderers
- **Phase:** A
- **Tasks:** T104 T105 T106 T108
- **Paths:** `packages/ops/src/governance/specs/workflow_status*.script.ts`
- **Subject:** `feat(spec): Add workflow status command`
- **Body:**
  Adds gum/raw/json/html renderers and the CLI entry for
  `mise run spec workflow status`.

## Closeout

- [ ] **T199** Run `mise run spec closeout` — *gate:* DoD
