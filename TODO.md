<!-- markdownlint-disable-file -->
# KB backlog

Operator backlog for migration hygiene, product correctness, SDD tooling, and
architecture consolidation. **Not** an agent entrypoint — see
[`assets/guides/DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md).

**How to read:** items are ordered **P0 → P3**. Each **shippable chunk** is a
coherent slice you can branch, gate, and merge independently. Check `[x]` only
when Evidence commands in the linked spec or guide pass.

---

## P0 — Bugs & correctness

Fix before the next user-visible release.

| ID   | Item                                                            | Notes                                                                                                                                                                                                  |
| ---- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P0-1 | **Task writes: YAML-first or fail RPC; stop swallowing errors** | Mutations must not report success when source persistence fails silently. Related catalog: `task_source_atomicity` (shipped UX); verify remaining swallow paths in `app_task_source.util.ts` / routes. |
| P0-2 | **Handoff clipboard `finally` restore**                         | `runEntryHandoff` restores clipboard on success/failure paths but **not** in the `catch` block (`handoff_registry.service.ts`).                                                                        |
| P0-3 | **Config contract drift**                                       | `configPath`, `display.advisories` — round-trip or remove from schema/docs.                                                                                                                            |
| P0-4 | **EMPTY tag/array memo bust**                                   | `{}` fallback may bust `EntryRow` memo when tags are empty — audit list query cache keys.                                                                                                              |

---

## P1 — High ROI (shippable chunks)

### Chunk 2 — Rogue reference cleanup *(retired)*

**Handoff:** [`.cursor/plans/todo_p1_chunk2_rogue_refs_handoff.md`](.cursor/plans/todo_p1_chunk2_rogue_refs_handoff.md)

- [x] Retire `rogue_refs.script.ts` + mise/spec wiring (0 actionable hits, scanner deleted)

### Chunk 3 — 008 closeout hygiene *(optional)*

**Handoff:** [`.cursor/plans/todo_p1_chunk3_008_closeout_handoff.md`](.cursor/plans/todo_p1_chunk3_008_closeout_handoff.md)

Catalog `task_source_atomicity` is **shipped**; code paths land in `008-task-mutation-failure-ux`. Residual doc/verify debt only:

- [ ] Supersede `assets/specs/007-task-source-atomicity/quickstart.md` → pointer + commands from 008
- [ ] Run `KB_E2E_FAULT_INJECTION=1 mise run test tag task_source_atomicity --e2e`; close **T200** in 008 `tasks.md`

---

## P2 — Improvements (medium ROI)

| ID   | Item                                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2-1 | **Tag facets:** confirm single SQL `json_each` aggregate is sufficient everywhere (partially addressed in `entry.repository.ts` / `TAG_COUNT_SQL`) |
| P2-2 | **`typeUnion()` + derive RPC literals from core tuples**                                                                                           |
| P2-3 | **Move `TaskView` from `@shared/rpc` to core** (still exported from `desktop_rpc_schema.ts`)                                                       |
| P2-4 | **`BindingRef` in core + drop mappers** (collision handling)                                                                                       |
| P2-5 | **Move task tag normalize + dependency cycles to core task policy**                                                                                |
| P2-6 | **ListStats `byType`** — reduce change amplification when adding entry types                                                                       |
| P2-7 | **11× `asPromise` shell delegate boilerplate** — extract shared helper                                                                             |
| P2-8 | **TypeBox in `shared/rpc` + `Static<>`** (Gemini path — evaluate vs current tuple literals)                                                        |
| P2-9 | **Guides drift from implementation** (CODESTYLE / FCIS / foundation cross-check)                                                                   |

---

## P3 — Architecture & consolidation (backlog)

Large refactors; schedule after P0–P2 unless a feature touches the same files.

| ID    | Item                                                                                  |
| ----- | ------------------------------------------------------------------------------------- |
| P3-1  | **Split `App` into ~5 services** (after P0 correctness)                               |
| P3-2  | **17/27 single-caller list hooks** — lint-driven extraction                           |
| P3-3  | **`ListMain` + `useListPageShell` dual orchestrators; `p` prop bag**                  |
| P3-4  | **Overlay/modal priority via scattered booleans** — central coordinator               |
| P3-5  | **`components/shared/` = primitives + sync feature** — clarify boundary               |
| P3-6  | **kind-first TS vs feature-first CSS** (touches 4–5 roots per change)                 |
| P3-7  | **Misplaced artifacts** (page components, hook-shaped utils, false `use_*`)           |
| P3-8  | **`task_state` in renderer** — overdue/blocked rules may belong in core               |
| P3-9  | **DB lifecycle:** disposable vs durable state undocumented (migrations + sync policy) |
| P3-10 | **Renderer `rpc/client.ts` size** (~314 LOC — transport vs endpoint facade)           |
| P3-11 | **Shortcut keymap duplicate derivation** (component vs hook overlap)                  |
| P3-12 | **`App` hub + `shell/app/lib/` bucket** (31 methods)                                  |
| P3-13 | **Types imported from `.component.tsx`** (sync modal state)                           |
| P3-14 | **No shared overlay primitives** — modal chrome duplicated                            |
| P3-15 | **Micro-dirs** (`core/handoff`, `core/validation`, …) — navigation noise              |
| P3-16 | **Full `features/` tree migration** — high value, not urgent                          |

---

## Completed

### Doc migration & authority (2025–2026)

- [x] **P0-e2e-contracts** — promoted step-catalog + fixture-manifest to `assets/features/e2e/contracts/`
- [x] **P0-fcis-architecture** — FCIS rules live in guides; no legacy foundation links in agent entrypoints
- [x] **P1-logging** — LOGGING_GUIDE self-contained
- [x] **P1-styling** — STYLING_GUIDE self-contained
- [x] **P1-crg** — CRG.md self-contained
- [x] **P1-ci** — CI_GUIDE self-contained
- [x] **P2-archive-rename** — `assets/docs/specs/` → `assets/docs/archive/`; rogue-refs sweep
- [x] **P1-chunk2-rogue-refs** — retired rogue-ref scanner (0 actionable hits, files deleted, wiring removed)
- [x] **P2-built-layer** — shipped feature records promoted per doc-promotion policy
- [x] **P2-spec-kit-active** — in-flight policy in [`DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md)
- [x] Archive sweep + library_manifest verification

### Product & e2e (`task_source_atomicity` / 008)

Delivered via **`007-task-source-atomicity`** + **`008-task-mutation-failure-ux`** (catalog **shipped**).

- [x] **FP1** Backend-driven fault injection (`/api/e2e/fault-mode`, env-gated routes) — no Playwright route interception for mutations
- [x] **FP2** Renderer `TaskMutationOutcome` failures (`use_task_sheet`, list-level errors, `data-testid="task-sheet-error"`)
- [x] **FP3** Quickstart aligned in 008 (`assets/specs/008-task-mutation-failure-ux/quickstart.md`)
- [x] **FP4** Feature-local atomicity tasks (`Atomicity conflict probe` in seed fixture; scenarios decoupled from `Release Todo Task`)
- [x] **FP5** Atomicity BDD split (`task_source_atomicity.steps.ts`, dedicated screenplay)

### SDD tooling & specs (011–017)

- [x] **011** Mise SDD CLI hub (`spec lint|trace|audit|gate|ready`, workflow run)
- [x] **015** Ops CLI DRY kernel
- [x] **016** src kernel DRY
- [x] **017** src cohesion consolidation — catalog **shipped**
- [x] Commit plan + `mise run spec ready --phase … --commit` / `spec closeout`
- [x] Catalog lifecycle Spec Kit extension + `mise run catalog register`
- [x] `mise run spec conform` (handoff scaffold, T101+ IDs, analyze checklists)
- [x] Agent-context refresh from `.specify/feature.json`
- [x] **017 audit remediations:** `handoff.md`, T101–T110 IDs, analyze checklists, sample-leak avoidance
- [x] **`spec workflow status`** — six-column pipeline CLI (`packages/exec` derive + ops renderers + mise wiring); authority: `.cursor/plans/spec_workflow_status_deepseek_handoff.md`

### Architecture (selected)

- [x] **Preserve frecency across sync** (`app_sync_frecency.spec.ts` — YAML edits preserve entry frecency)
