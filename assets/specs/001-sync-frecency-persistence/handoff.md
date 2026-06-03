<!-- markdownlint-disable-file -->

# Handoff — `001-sync-frecency-persistence`

**Spec:** `assets/specs/001-sync-frecency-persistence/`
**Target release:** v0.10.0
**Branch:** `001-sync-frecency-persistence`

## Agent prompt

```text
Implement spec `001-sync-frecency-persistence`.

Read IN ORDER:
1. assets/specs/001-sync-frecency-persistence/handoff.md
2. spec.md, plan.md, tasks.md in the same folder
3. src/shell/app/lib/app_sync.util.ts
4. src/shell/app/db/schema.ts

GOAL: Full sync rebuilds YAML projection but PRESERVES learned local state.

SKILLS: app-context, app-testing, app-quality-gate.
Run `mise run spec gate -- assets/specs/001-sync-frecency-persistence` before done.
```

## Acceptance criteria tracker

| ID       | Done when                          | Evidence                    |
| -------- | ---------------------------------- | --------------------------- |
| SF-1 AC1 | Frecency sort unchanged after sync | `app_sync_frecency.spec.ts` |
| SF-1 AC2 | Orphan rows removed                | same                        |
| SF-2 AC1 | Binding frecency persists          | same                        |
| SF-3 AC1 | Sync completion compatible         | `bun test src/shell/app`    |

## Legacy parity

M02 draft: `assets/docs/specs/MILESTONE_02/01_sync-frecency-persistence/`
