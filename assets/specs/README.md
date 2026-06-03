<!-- markdownlint-disable-file -->

# kb program specs (`assets/specs/`)

Active feature specs live at **`assets/specs/<NNN>-<slug>/`** with Spec Kit filenames
(`spec.md`, `plan.md`, `tasks.md`, `handoff.md`). Created **greenfield** via intake →
Create Spec → `/speckit-specify` — not copied from legacy folders.

Workflow guide: [`assets/guides/SDD_WORKFLOW_GUIDE.md`](../guides/SDD_WORKFLOW_GUIDE.md)

## Backlog (M02 pilots)

| **#** | **STATUS** | **PTS** | **SUMMARY**                                  | **SPEC**                                                               | **RELEASE** |
| :---: | :--------: | ------- | -------------------------------------------- | ---------------------------------------------------------------------- | :---------: |
|   1   |    [~]     | 8       | Preserve frecency across sync                | [001-sync-frecency-persistence](001-sync-frecency-persistence/spec.md) |   v0.10.0   |
|   2   |    [ ]     | 8       | Task writes: YAML-first or fail RPC          | [002-task-source-truthfulness](002-task-source-truthfulness/)          |   v0.10.0   |
|   3   |    [ ]     | 5       | Tag facets: single SQL `json_each` aggregate | [003-list-tag-facet-performance](003-list-tag-facet-performance/)      |   v0.10.0   |

Legacy M02 detail rows remain in
[`assets/docs/specs/MILESTONE_02/README.md`](../docs/specs/MILESTONE_02/README.md)
until reevaluated.

## Layout

```text
assets/specs/
├── README.md                 # this backlog
├── _templates/               # intake + examples (not Companion specs)
├── 001-sync-frecency-persistence/
├── 002-task-source-truthfulness/   # after 001 merged
├── 003-list-tag-facet-performance/
└── archive/
    ├── milestone_01/         # frozen M01 reference
    └── (completed specs)
```

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
| 1   | kb-full pilot — workflow scaffold validated (`spec lint` + `trace` + `import-legacy`)   |
| 2   | kb-slice after 001 merged; `mise run spec worktree-add -- 002-task-source-truthfulness` |
| 3   | kb-slice after 001 merged; CRG impact-radius before parallel implement with 002         |

## Legacy paths (read-only)

| Legacy        | Location                                                                     |
| ------------- | ---------------------------------------------------------------------------- |
| M01 specs     | `assets/specs/archive/milestone_01/` (see archive README)                    |
| M02 drafts    | `assets/docs/specs/MILESTONE_02/` (parity via `mise run spec import-legacy`) |
| E2e contracts | `assets/docs/specs/e2e/` (fixture-manifest, step-catalog — unchanged)        |
