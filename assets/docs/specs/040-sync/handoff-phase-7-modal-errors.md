<!-- markdownlint-disable-file -->

# Sync modal error UX — Phase 7 handoff

## Status

**Phase 1–6 (SY-1–SY-6):** Implemented — resilient import, fixtures, e2e
`@spec:sync`, commit `feat(sync): Resilient import always completes`.

**Phase 7 (SY-7):** Not started — fix sync modal so errors are visible at
default window size without truncated duplicate lists.

## User problem (screenshot 2026-05-30)

After syncing 64 files with 7 errors:

- File log shows only successful files (`N inserted`); failed files scroll out
  of view or never stand out.
- Summary says `Errors: 7 (see log above)` but errors are not in the log.
- Truncated red error paths appear below the fold (`products.yml: entry "Men's…`).
- `Inspect error` link is easy to miss; partial-import files look successful.

## Required reading

1. `assets/docs/specs/sync/requirements.md` — **SY-7**
2. `assets/docs/specs/sync/design.md` — § Follow-up — Sync modal error UX
3. `assets/docs/specs/sync/tasks.md` — **Phase 7** (Tasks 7.1–7.5)
4. `src/shell/renderer/components/shared/sync_modal.component.tsx`
5. `src/shell/renderer/styles/components/sync.css`
6. `assets/docs/specs/sync-ui/design.md` — legacy Phase 11 context only

## Skills

- `app-context` — design tokens, component naming (`*.component.tsx`)
- `react:components` — accordion/disclosure, keyboard
- `app-testing` — component specs, e2e steps
- `app-quality-gate` — before done

## Non-negotiable rules

- **Renderer only** for Task 7.1–7.3 (no import pipeline changes unless 7.4).
- Do **not** reintroduce flat `summary-errors` bullet list at modal bottom.
- Use theme tokens (`var(--color-error)`) — no hardcoded hex in CSS.
- Co-locate specs: `sync_modal_errors.util.spec.ts`, extend
  `sync_modal.component.spec.tsx`.
- Prototype gate: user approved via SY-7 spec — implement directly.

## Acceptance criteria (Phase 7)

| ID     | Criterion                                                               | Verification         |
| ------ | ----------------------------------------------------------------------- | -------------------- |
| AC-7.1 | Summary shows **Files processed**, **Imported**, **With errors**        | Component + e2e      |
| AC-7.2 | Error files show red left bar in list                                   | Component spec + CSS |
| AC-7.3 | Click / tap / Enter / ArrowRight expands accordion with full error text | Component + e2e      |
| AC-7.4 | ArrowLeft / Escape collapses                                            | Component spec       |
| AC-7.5 | No `cmp-sync-modal-summary-errors` duplicate list                       | Component spec       |
| AC-7.6 | First error row visible or expanded on `done`                           | Component or e2e     |
| AC-7.7 | Partial import files (`ok: true` + entry errors) show as error rows     | E2e partial_valid    |
| AC-7.8 | Quality gate green                                                      | `gate.sh`            |

## Implementation order

```txt
7.1 sync_modal_errors.util.ts + spec
7.2 sync_modal.component.tsx + sync.css + component spec
7.3 sync_resilience.feature scenarios + e2e steps
7.5 gate.sh
(Skip 7.4 RPC entryErrors unless grouping fails)
```

## Suggested commit message

```txt
feat(sync): Improve modal error accordion UX

Show processed/imported/error file totals, highlight error rows with a
red bar, and expand full messages in-row. Remove truncated summary error
list. Keyboard: ArrowRight/Enter expand, ArrowLeft/Escape collapse.
```

Validate: `bun tools/hooks/commit_message.script.ts`

## Agent execution prompt

```txt
Implement Phase 7 (SY-7) from assets/docs/specs/sync/.

Read handoff-phase-7-modal-errors.md, requirements SY-7, design § Follow-up,
tasks Phase 7.

Goal: Sync modal must show file totals (processed / imported / with errors),
mark every file with errors using a visible red bar, and use an accordion on
each error row (click, tap, Enter, ArrowRight) to show FULL error text inside
the scrollable log. Remove the bottom summary-errors bullet list. Partial
imports (ok:true + entry errors in summary.errors) must look like error rows.

Start Task 7.1 buildFileLogViews util, then 7.2 component + CSS, then 7.3 e2e.
Do not change ImportService unless Task 7.4 is explicitly needed.

Run bash .agents/skills/app-quality-gate/scripts/gate.sh before done.
Load app-context and app-testing skills first.
```

## Evidence block (implementer fills)

```txt
Gate:
Unit:
E2e:
Notes:
```
