# Tasks — gate-ready-fixture

## Phase A — Exec derive

- [x] **T101** Add pure derive module — *gate:* AC1 — *commit:* `feat(exec): Add workflow progress derivation`
- [x] **T102** Task + commit parsing helpers — *gate:* AC1
- [x] **T103** Six-column builder + debt + catalog enrichment — *gate:* AC2
- [x] **T104** Gum / raw / JSON renderers — *gate:* AC4
- [x] **T105** HTML renderer — *gate:* AC7
- [x] **T106** CLI entry script — *gate:* AC1
- [x] **T107** Mise + spec_plan wiring — *gate:* AC1
- [x] **T108** Fixtures + tests — *gate:* AC10
- [x] **T109** Export + index — *gate:* AC9
- [x] **T110** SDD guide subsection — *gate:* AC10

## Commit plan

Incremental: `mise run spec ready --phase C1 --commit`

### C1 — Exec derive pipeline
- **Phase:** A
- **Tasks:** T101 T102 T103 T109
- **Paths:** `packages/exec/src/workflow_progress.script.ts`
- **Subject:** `feat(exec): Add workflow progress derivation`
- **Body:**
  Adds pure six-column SDD pipeline derivation in @kb/exec.

## Closeout

- [x] **T199** Run `mise run spec closeout` — *gate:* DoD
