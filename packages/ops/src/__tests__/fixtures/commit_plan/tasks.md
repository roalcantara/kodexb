# Tasks — commit-plan-fixture

## Phase A

- [ ] **T101** Example task — *gate:* AC1 — *commit:* `ref(core): Merge example module`

## Commit plan

Incremental: `mise run spec ready --phase C1 --commit`

### C1 — Example merge
- **Phase:** A
- **Tasks:** T101
- **Paths:** `src/example.ts` `src/example.spec.ts`
- **Subject:** `ref(core): Merge example module`
- **Body:**
  Consolidate example modules into one file per the plan.

  Changes:
  - Merge example.ts and co-located spec

## Closeout

- [ ] **T199** Run `mise run spec closeout assets/specs/000-commit-plan-fixture` — *gate:* DoD
