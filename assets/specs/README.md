<!-- markdownlint-disable-file -->

# kb program specs (`assets/specs/`)

Active feature specs live at **`assets/specs/<NNN>-<slug>/`** with Spec Kit filenames
(`spec.md`, `plan.md`, `tasks.md`) and supporting docs under **`artifacts/`**
(`artifacts/tasks/handoff.md`, `artifacts/plan/*`). Created **greenfield** via intake →
Create Spec → `/speckit-specify` — not copied from legacy folders.

Workflow guide: [`assets/guides/SDD_WORKFLOW_GUIDE.md`](../guides/SDD_WORKFLOW_GUIDE.md)

## Backlog (M02 pilots)

| **#** | **STATUS** | **PTS** | **SUMMARY**                                  | **SPEC**                                                         | **RELEASE** |
| :---: | :--------: | ------- | -------------------------------------------- | ---------------------------------------------------------------- | :---------: |
|   1   |    [~]     | 8       | Preserve frecency across sync                | [003-sync-frecency-preserve](003-sync-frecency-preserve/spec.md) |   v0.10.0   |
|   2   |    [ ]     | 8       | Task writes: YAML-first or fail RPC          |                                                                  |             |
|   3   |    [ ]     | 5       | Tag facets: single SQL `json_each` aggregate |                                                                  |             |

Legacy M02 detail rows remain in
[`assets/docs/specs/README.md`](../docs/specs/README.md)
until reevaluated.

## Cross-cutting backlog (process)

| **ID** | **STATUS** | **SUMMARY**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| :----: | :--------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BDD-1  |    [~]     | **Plain-language Gherkin** — pilot rewritten in [`sync_frecency.feature`](../features/e2e/sync_frecency.feature) (003). **Remaining:** add matching phrases to `step-catalog.md` + fixture manifest when e2e steps are implemented (stretch). Guide: [`BDD_GHERKIN_GUIDE.md`](../guides/BDD_GHERKIN_GUIDE.md#audience-everyone-not-engineers).                                                                                                                                                                                                                                                                                                                                                                                                                        |
| SPEC-1 |    [ ]     | **Empathic requirements** — `spec.md` user stories and AC MUST reflect what the user asked for (symptoms + outcomes), not engineer extrapolation the user never stated. Example anti-pattern in 003: “WHEN sync removes a binding from YAML, THEN frecency data MAY be removed (orphan cleanup)” — no user said that; a good engineer infers the job is *preserve ranking after sync*, not headline DB hygiene. Orphan cleanup, row counts, and “surviving ids” belong in `plan.md` / tasks unless product explicitly asked. Guide: [`SDD_WORKFLOW_GUIDE.md`](../guides/SDD_WORKFLOW_GUIDE.md#empathic-requirements-user-intent-not-engineer-brain). **Pilot trim:** [`003-sync-frecency-preserve/spec.md`](003-sync-frecency-preserve/spec.md) SF-1/SF-2 orphan ACs. |
| SPEC-2 |    [ ]     | **Ask, don’t assume** — if specify (or `/kb`) would add ACs beyond stated user intent (deleted items, new items, edge cases), **at least one clarifying question** MUST be asked before those ACs land in `spec.md`. Empty “Open Questions” with invented orphan/new-item ACs is a process fail (003 pilot). Guide: [`SDD_WORKFLOW_GUIDE.md`](../guides/SDD_WORKFLOW_GUIDE.md#ask-dont-assume-mandatory-clarify). Wire into `/kb` triage + enforce `/speckit-clarify` (not skip with “none”).                                                                                                                                                                                                                                                                         |

## Layout

```text
assets/specs/<NNN-slug>/
├── spec.md, plan.md, tasks.md
└── artifacts/
    ├── spec/checklists/
    ├── plan/                 # research, data-model, contracts, quickstart
    └── tasks/handoff.md

assets/specs/README.md, _templates/, archive/
```

Active: [003-sync-frecency-preserve](003-sync-frecency-preserve/spec.md) (row 1).

## Archive policy

When a numbered spec is **shipped** (gate green, merged, release tagged):

1. Mark the README row `[x]`.
2. Move `assets/specs/<NNN>-<slug>/` → `assets/specs/archive/<NNN>-<slug>/`.
3. Reevaluate remaining backlog rows for workflow tier (kb-full vs kb-slice vs kb-hotfix).

M01 frozen reference: run once to populate archive copy:

```bash
rsync -a --delete assets/docs/specs/MILESTONE_01/ assets/specs/archive/milestone_01/
```

Shared e2e contracts stay at `assets/docs/specs/e2e/` until a dedicated move is scoped.

## Reevaluation (post 001–003)

| Row | Next tier when unblocked                                                                |
| --- | --------------------------------------------------------------------------------------- |
| 1   | kb-full pilot — gate + audit + trace green; operator smoke + `spec pr-draft` when ready |
| 2   | kb-slice after 001 merged; `mise run spec worktree-add -- 002-task-source-truthfulness` |
| 3   | kb-slice after 001 merged; CRG impact-radius before parallel implement with 002         |

## Legacy paths (read-only)

| Legacy        | Location                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| M01 specs     | `assets/specs/archive/milestone_01/` (see archive README)                    |
| M02 drafts    | `assets/docs/specs/MILESTONE_02/` (parity via `mise run spec import-legacy`) |
| E2e contracts | `assets/docs/specs/e2e/` (fixture-manifest, step-catalog — unchanged)        |
