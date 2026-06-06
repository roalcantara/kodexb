<!-- markdownlint-disable-file -->

# Source sync resilience — Implementation handoff

## Status

**Phase 1–6 (SY-1–SY-6):** ✅ Implemented (resilient import pipeline).

**Phase 7 (SY-7):** 🔲 Not started — sync modal error UX. See
[handoff-phase-7-modal-errors.md](handoff-phase-7-modal-errors.md).

**Original pipeline handoff (Phases 1–6):** archived below for reference.

## Required reading (in order)

1. `AGENTS.md` — FCIS, naming, quality gate, prototype N/A (approved feature).
2. `assets/docs/archive/sync/requirements.md`
3. `assets/docs/archive/sync/design.md`
4. `assets/docs/archive/sync/tasks.md`
5. `assets/docs/archive/sync-ui/design.md` — UI consumption only
6. `src/shell/app/db/import.service.ts`
7. `src/shell/app/lib/app_sync.util.ts`
8. `src/core/domain/models/entries/parsers/source_document.parser.ts`

## Skills to load

- `app-context` (always)
- `app-testing` (fixtures, `bun:test`, no inappropriate mocks)
- `app-rpc` (if sync error HTTP shape changes)
- `app-quality-gate` (before done)

## Non-negotiable rules

- Do **not** add automatic retry of failed files or sync sessions (SY-6).
- Do **not** weaken Biome, knip, dependency-cruiser, or gate thresholds.
- Every new `src/` file needs co-located `.spec.ts`.
- Use `getLogger` in `src/` — no `console.*`.
- Map specs to `assets/docs/archive/` — never `docs/superpowers/`.

## Acceptance criteria (release checklist)

Copy into PR description; all must pass:

| ID   | Criterion                                                                         | Verification                   |
| ---- | --------------------------------------------------------------------------------- | ------------------------------ |
| AC-1 | Sync always returns `RpcImportResult` within 120 s on e2e fixture                 | E2e + unit timeout test        |
| AC-2 | Unreadable / malformed YAML files skipped; error lists **path**                   | Unit `malformed_yaml`          |
| AC-3 | Partial file import: valid rows in `partial_valid.yml` in DB; bad key in `errors` | Unit + e2e                     |
| AC-4 | `devbox_like.yml` reproduces tag/key error message; sync still completes          | Unit                           |
| AC-5 | No second DB writer during sync (`SyncDatabaseBusyError` or equivalent)           | `app_sync_concurrency.spec.ts` |
| AC-6 | `onProgress` once per file; `syncComplete` once per user sync                     | Unit + hook spec               |
| AC-7 | Modal phase `done` with failed files inspectable                                  | E2e `@spec:sync`               |
| AC-8 | Valid entries from other files remain after partial failure                       | E2e settings + sync_resilience |
| AC-9 | `bash .agents/skills/app-quality-gate/scripts/gate.sh` green                      | Gate log                       |

## Quality gate (mandatory)

```sh
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

Phase shortcuts (optional during development):

```sh
bun test src/core/domain/models/entries/parsers/parse_source_file_resilient.spec.ts
bun test src/shell/app/db/import.service.spec.ts
bun test src/shell/app/app_sync_concurrency.spec.ts
mise run test e2e --smoke
```

## Suggested commit strategy

Atomic commits (examples — adjust to actual chunks):

1. `feat(core): add resilient YAML source parse with per-entry errors`
2. `feat(app): wire import sync to tolerant parse and partial file success`
3. `fix(app): block db access during source sync`
4. `test(app): sync resilience fixtures and import completion tests`
5. `test(e2e): add @spec:sync resilience scenarios`
6. `docs(specs): align data-layer mixed_invalid with entry-level import`

### Single squash commit message (if one PR)

```txt
feat(sync): resilient import completes despite file and entry errors

Sync no longer aborts whole files on the first bad YAML key, blocks
concurrent list/stats during rebuild, and always emits syncComplete with
actionable per-file and per-entry errors. Adds sync fixture corpus and
@spec:sync e2e coverage.
```

HK subject ≤ 50 chars — split body across lines if needed:

```txt
feat(sync): resilient import always completes

Parse and import valid rows when siblings fail; guard DB during rebuild.
Add fixtures, unit tests, and @spec:sync e2e scenarios.
```

## Agent execution prompt (paste to next session)

```txt
Implement assets/docs/archive/sync/ (requirements SY-1–SY-6, design, tasks).

Goal: Source sync must ALWAYS finish and return RpcImportResult with errors[]
listing file paths and messages. Import valid rows per file; skip file only on
document-level YAML/read failures or transaction rollback. No retry loops.

Start with Task 1.1–1.2 (fixtures + parseSourceFileResilient), then 2.1–2.3
(ImportService), then 3.1–3.2 (syncInFlight / onComplete dedupe), then 4.x e2e.

Verify devbox_like fixture matches: tag regex ^[a-z0-9_]+$ failure.

Run app-quality-gate before claiming done. Do not edit user ~/.config/kodexb
sources unless asked.

Read handoff: assets/docs/archive/sync/handoff.md
```

---

## Phase 7 — next agent

**Use:** [handoff-phase-7-modal-errors.md](handoff-phase-7-modal-errors.md) and
the **Agent execution prompt** there (modal accordion + stats strip, SY-7).

```txt
Implement Phase 7 (SY-7) sync modal error UX per assets/docs/archive/sync/.
Read handoff-phase-7-modal-errors.md first. Do not change import pipeline.
```

## Open questions (defaults chosen in spec)

| Question                            | Spec default                                                           |
| ----------------------------------- | ---------------------------------------------------------------------- |
| Entry-level vs skip whole file?     | Entry-level when document parses; file-level on YAML/read/txn failure. |
| Change `parseSourceFile` signature? | Add `parseSourceFileResilient`; ImportService uses new API.            |
| HTTP code for busy DB?              | 503 preferred; 500 acceptable v1 if documented.                        |
| Intra-file progress?                | Out of scope; yield between files only.                                |

## Evidence block (implementer fills)

```txt
Gate: [paste]
Unit: [paste bun test paths]
E2e: [paste mise run test e2e --smoke]
Notes: [any deviation from spec]
```
