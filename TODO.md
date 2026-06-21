<!-- markdownlint-disable-file -->
# KB backlog

Operator backlog for migration hygiene, product correctness, SDD tooling, and
architecture consolidation. **Not** an agent entrypoint — see
[`assets/guides/DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md).

## How to read this file

This file is a **priority queue**, top to bottom.

- `[x]` — done
- `[ ]` — pending

**Next TODO:** scan from the first `###` heading downward; the next item is the
first line matching `- [ ]`.

- Skip past `[x]` items; do not skip a section that still contains a `[ ]` item.
- Do not use ID numbers or inline **context** lines to pick work — only vertical
  order + checkbox state.

**Context lines** (blockquotes, *italics*, predecessor/spike labels) are notes for
whoever implements that item. They do **not** add queue entries and do **not**
reorder the list.

**Parent items & labels:**

- A parent stays `[ ]` until every nested checkbox under it is `[x]`.
- Labels like `P0`, `P1`, `P2` group related items; they do not override queue
  order.

### Product & e2e (`task_source_atomicity` / 008)

Delivered via **`007-task-source-atomicity`** + **`008-task-mutation-failure-ux`** (catalog **shipped**).

- [x] **FP1** Backend-driven fault injection (`/api/e2e/fault-mode`, env-gated routes) — no Playwright route interception for mutations
- [x] **FP2** Renderer `TaskMutationOutcome` failures (`use_task_sheet`, list-level errors, `data-testid="task-sheet-error"`)
- [x] **FP3** Quickstart aligned in 008 (`assets/specs/008-task-mutation-failure-ux/quickstart.md`)
- [x] **FP4** Feature-local atomicity tasks (`Atomicity conflict probe` in seed fixture; scenarios decoupled from `Release Todo Task`)
- [x] **FP5** Atomicity BDD split (`task_source_atomicity.steps.ts`, dedicated screenplay)
- [x] **P1-chunk3-008-closeout** — 007 quickstart superseded; T200/T208 e2e verified with fault injection (3/3)

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
- [x] **`spec workflow status`** — six-column pipeline CLI (`packages/exec` derive + ops renderers + mise wiring)
- [x] **P1-chunk2-rogue-refs** — retired rogue-ref scanner (0 actionable hits, files deleted, wiring removed)

### Doc migration & authority (2025–2026)

- [x] **P0-e2e-contracts** — promoted step-catalog + fixture-manifest to `assets/features/e2e/contracts/`
- [x] **P0-fcis-architecture** — FCIS rules live in guides; no legacy foundation links in agent entrypoints
- [x] **P1-logging** — LOGGING_GUIDE self-contained
- [x] **P1-styling** — STYLING_GUIDE self-contained
- [x] **P1-crg** — CRG.md self-contained
- [x] **P1-ci** — CI_GUIDE self-contained
- [x] **P2-archive-rename** — `assets/docs/specs/` → `assets/docs/archive/`; rogue-refs sweep
- [x] **P2-built-layer** — shipped feature records promoted per doc-promotion policy
- [x] **P2-spec-kit-active** — in-flight policy in [`DOC_AUTHORITY.md`](assets/guides/DOC_AUTHORITY.md)
- [x] Archive sweep + library_manifest verification

### Architecture

- [x] **Preserve frecency across sync** (`app_sync_frecency.spec.ts` — YAML edits preserve entry frecency)

### P0 — Product correctness (2026-06)

- [x] **P0-1** — Task writes: YAML-first or fail RPC; stop swallowing errors
- [x] **P0-2** — Handoff clipboard `finally` restore
- [x] **P0-3** — Config contract drift (`configPath`, `display.advisories`)
- [x] **P0-4** — EMPTY tag/array memo bust (stable `EMPTY_TAG_COUNTS`)

### P1 — Taxonomy conformance (018)

Sorted by execution order: the handoff pilot and conformant-dir locks shipped in
018; the remaining `.util` rename slices follow (trivial singles first, then
`app/lib` before `app/db`), then the guide drift cross-check.

- [x] **Handoff pilot** — `src/shell/main/handoff` renamed to single-word role suffixes.
- [x] **Conformant-dir locks** — additive `.ls-lint.yml` rules for 16 already-clean directories.
- [ ] **Rename `src/__tests__/helpers`** — `rpc_route.spec.util.ts` to its real role suffix; `bun run lint:ls` green.
- [ ] **Rename `src/shell/main/utils`** — `shell_hooks.util.ts` → `.service`/`.helper` by content.
- [ ] **Rename `src/shell/main/window`** — `display_at_cursor`, `launcher_window`, `darwin_window_frame`, `load_window_state`, `launcher_frame_probe`, `placement` (`.util` → `.service`/`.port`/`.adapter` by FCIS role).
- [ ] **Rename `src/shell/app/lib`** — `app_preview_fetch`, `app_sync`, `app_task_mutation`, `frecency_snapshot`, `app_task_source` (`.util` → `.service`/`.adapter`/`.repository`).
- [ ] **Rename `src/shell/app/db`** — `import_bundle_persist.util.ts` → `.service`/`.repository` (after `app/lib` settles).
- [ ] **Guide drift cross-check** — CODESTYLE/FCIS/foundation match implementation (naming/suffix rules, FCIS import boundaries, stack decisions: TypeBox, `bun:sqlite`, no Drizzle); fixes land in guides; `mise run app gates` green. ADR 0001 + the role vocabulary already shipped in 018.

### P2 — Improvements

- [ ] **P2-1** — WHEN tag facet counts are computed, THE data layer SHALL use a single SQL `json_each` aggregate everywhere (partially addressed):
  - [ ] THE canonical aggregate SHALL remain `TAG_COUNT_SQL` in `entry_repository.const.ts` and flow through `getTagCounts()` / `buildTagFacetCounts()`.
  - [ ] THE tag-filter EXISTS clause in `entry.repository.ts` SHALL remain the only other `json_each` use (no third aggregate path).
  - [ ] `entry.repository.spec.ts` tag-count coverage SHALL stay green after any consolidation.
- [ ] **P2-2** — THE RPC layer SHALL derive literal unions from core tuples via `literalUnion()` (replace hand-maintained tuple literals in `payload_schemas.ts`):
  - [ ] `taskViewValues`, `priorityUnionSchema`, and `entryTypeSchema` SHALL import from core constants (`TASK_VIEW_ORDER`, task priority/status tuples, `ENTRY_TYPE_VALUES`).
  - [ ] THE Elysia route schemas and Eden client types SHALL stay aligned without duplicate `as const` arrays.
- [ ] **P2-3** — THE `TaskView` type SHALL live in core; `@shared/rpc` / `desktop_rpc_schema.ts` MAY re-export until callers migrate:
  - [ ] Core SHALL own the type; renderer/core imports SHALL not depend on `@shared/rpc` for `TaskView` (today: `filter_by_view.util.ts`, `task_view_order.const.ts`, `filter_labels.const.ts`).
  - [ ] `desktop_rpc_schema.ts` MAY keep a deprecated re-export until `rg '@shared/rpc'.*TaskView` in `src/core` is empty.
- [ ] **P2-4** — THE `BindingRef` model SHALL live in core with collision handling; shell mappers that duplicate it SHALL be dropped:
  - [ ] THE duplicate `BindingRef` type in `binding.repository.ts` SHALL be removed in favor of one core definition.
  - [ ] `toBindingRef()` and chord-collision policy SHALL live in core (or core + one shell adapter), not split across RPC schema and repository mappers.
- [ ] **P2-5** — Task tag normalization AND dependency-cycle detection SHALL live in core task policy (move out of shell):
  - [ ] `resolveCreateTaskTags()` in `app_task_source.util.ts` SHALL delegate to core (alongside existing `normalizeKnowledgeTag()` in `tags.parser.ts`).
  - [ ] `wouldCreateCycle()` in `task.repository.ts` SHALL move to pure core policy with shell calling it before writes.
  - [ ] Existing `task.repository.spec.ts` cycle cases SHALL pass unchanged after the move.
- [ ] **P2-6** — WHEN a new entry type is added, THE ListStats `byType` surface SHALL NOT require wide coordinated edits:
  - [ ] `buildListStatsForFilters()` SHALL derive per-type counts from `ENTRY_TYPE_VALUES` (not hand-listed `bookmark`/`command`/… fields).
  - [ ] Renderer stats surfaces (`settings.page.tsx`, filter fixtures) SHALL not hardcode a fixed set of `byType` keys.
- [ ] **P2-7** — THE shell delegate layer SHALL replace duplicated `Promise.resolve` boilerplate in `app.ts` with one shared helper:
  - [ ] THE ~11 synchronous `return Promise.resolve(...)` wrappers in `app.ts` SHALL collapse to one helper or async-native methods.
  - [ ] Public `App` RPC surface behavior SHALL remain unchanged (no semantic drift in route tests).
- [ ] **P2-8** — WHERE RPC payload types are declared in `@shared/rpc`, THE module SHALL use TypeBox schemas with `Static<>` derivation:
  - [ ] Request payloads (`ListOpts`, `ConfigPatch`, task create/update, dialog opts) SHALL remain schema-derived (partially done per `desktop_rpc_schema.ts` contract note).
  - [ ] Response-only types still hand-written (`ListStats`, `BindingRef`, `RpcDbStats`, import/sync shapes) SHALL either gain schemas or documented exceptions.
- [ ] **P2-9** — WHEN `mise run app gates` runs on a TTY without `--raw`/`--json`, THE task runner SHALL render **tree pretty mode** only for that command:
  - [ ] THE runner SHALL show root `[app > gates]` and one child group per 011 rule 07 selection (`quality`, `policy`; `--quality` / `--policy` alone show one branch).
  - [ ] THE `quality` group SHALL expose leaf lines for `gate.sh` stages (autofix, embedded policy, lint+typecheck, tests, preview smoke, build smoke); build skip on non-macOS SHALL appear as an explicit leaf.
  - *Predecessor: **011**. Spike: **013-task-runner-tree-ux**.*
  - [ ] THE `policy` group SHALL expose leaves for `gate_policy.sh` checks (new-suppression diff, config guard, Electrobun R7 reminder block).
  - [ ] `--raw`/`--json`, `spec ready`, `spec gate`, and `catalog validate` SHALL keep 011 flat pretty/raw behavior (TRT-1).
- [ ] **P2-10** — WHEN a leaf runs in tree pretty mode, THE runner SHALL show at most one gum spinner and replace it with one `✔`/`✗` line plus a parsed summary on completion:
  - [ ] THE runner SHALL show at most one active spinner; passing leaves SHALL NOT inherit subprocess stdout on exit 0.
  - [ ] THE runner SHALL fail-fast within a group, mark skipped siblings, and print `<n>/<n> groups passed (<ms>ms)` on full pass.
  - [ ] Leaf summaries SHALL name commands and pass tokens (`lint:fix`, `bun run lint`, `bun test`, preview `200`/`3456`, build skip on non-macOS, policy phrases from `gate_policy.sh`) (TRT-3, TRT-4).
- [ ] **P2-11** — WHEN `mise run app gates` completes on a TTY, stdout SHALL NOT contain the legacy `gate.sh` `Quality Gate` banner block on success:
  - [ ] A passing TTY transcript SHALL lack the `════════════` / `Quality Gate` banner; stages appear only as tree leaves (TRT-5).
  - [ ] Fail paths SHALL still surface actionable error text (full dump, tail, or `--raw` replay — mechanism plan-owned).
  - [ ] Exit codes SHALL match 011 `gate.sh` / `gate_policy.sh` at the same first failing leaf on clean vs injected failure (TRT-6).
- [ ] **P2-12** — WHEN the spike is ready for review, THE author SHALL attach passing and failing TTY transcripts plus confirm standalone `gate.sh` still passes:
  - [ ] THE review bundle SHALL include one passing and one failing `mise run app gates` TTY transcript and `bash .agents/skills/app-quality-gate/scripts/gate.sh` still green standalone (TRT-7).
  - *If reviewers **APPROVE UX**, a follow-on MAY add `plan.md`/`tasks.md` and generalize tree mode to `spec gate` and `spec ready`.*
  - [ ] THE spike SHALL NOT add HK/catalog parsers, `-v`/`-vv`, `gate.sh` Bun rewrite, or CI changes beyond non-TTY parity.
- [ ] **P2-13** — THE metrics / reporting / naming-enforcement conventions SHALL be discoverable from guides alone (surfaced 2026-06-21 while authoring 018's `role-conformance` metric — it took source archaeology across `mise.toml`, `perf.script.ts`, `.ls-lint.yml`, and `tools/metrics/` to reconstruct the pattern):
  - [ ] **Guide↔reality drift:** `TOOLS_GUIDE.md` documents metric harnesses under `tools/metrics/harnesses/`, but the code actually lives in `packages/ops/src/metrics/harnesses/` (perf, e2e-quality); only baselines sit under `tools/metrics/baselines/`. Reconcile the guide with the real split (instance of **P2-9**).
  - [ ] **Recipe gap:** Add a `TOOLS_GUIDE` "Adding a metric series" subsection — harness path, `tools/metrics/baselines/<series>/baseline.json` shape (`timestamp/git_sha/thresholds/results/violations/summary`), `mise run <task> baseline|compare` + `--write-baseline`, ephemeral `tmp/metrics/<series>/` — so a new metric needs no grep-archaeology.
  - [ ] **ls-lint gotcha undocumented:** The ls-lint first-dot extension model (a suffix is enforced via the **basename regex**, not a `.util.ts` rule key) lives only in the 017 COH-3 spike. Promote it into `CODESTYLE_GUIDE` § File Naming so suffix-rule authors don't rediscover it.
  - [ ] **Agent pointer:** Add a one-line "where generated artifacts go" map to `CLAUDE.md`/`AGENTS.md` (tracked `tools/metrics/baselines` vs gitignored `tmp/metrics` vs ephemeral `assets/specs/`) pointing at `TOOLS_GUIDE` + `DOC_AUTHORITY`.
  - [ ] **Acceptance:** a newcomer or agent can author a new metric series AND a new suffix-enforcement rule using `assets/guides/` alone, with zero source archaeology. (Note: `018-architecture-role-taxonomy` ROLE-6 already adds the `role-conformance` series row to `TOOLS_GUIDE` — this item generalizes that to the *recipe*.)
### P3 — Architecture & consolidation

- [ ] **P3-1** — THE monolithic `App` class SHALL split into ~5 focused services:
  - [ ] `app.ts` SHALL shed `noExcessiveLinesPerFile` pressure by splitting lifecycle, list/query, task mutation, sync/import, and config/surface concerns.
  - [ ] Each extracted module SHALL keep co-located specs; dependency-cruiser FCIS rules SHALL stay green.
- [ ] **P3-2** — WHERE a list hook has a single caller, THE renderer SHALL extract or inline per lint-driven policy (17/27 candidates):
  - [ ] Single-caller overlay/list hooks identified in consolidation audit SHALL be inlined or merged (see archive `012-codebase-consolidation` R7).
  - [ ] No new single-caller extractions SHALL land without justification in review.
- [ ] **P3-3** — THE list page SHALL consolidate `ListMain` and `useListPageShell` dual orchestrators; replace the `p` prop bag with explicit contracts:
  - [ ] One orchestrator SHALL own list page wiring; `ListMain` prop surface SHALL expose named contracts instead of a generic `p` bag.
  - [ ] Biome complexity suppressions on `list_main.component.tsx` / `use_list_page_shell.hook.ts` SHALL reduce without new ignores.
- [ ] **P3-4** — WHEN multiple overlays or modals compete, THE renderer SHALL resolve priority via one central coordinator (not scattered booleans):
  - [ ] Overlay open/close and stacking order SHALL flow through one module (command palette, filter overlay, task sheet, sync modal, shortcuts).
  - [ ] No scattered mutually exclusive booleans SHALL remain as the sole coordination mechanism.
- [ ] **P3-5** — THE `components/shared/` tree SHALL distinguish primitives from sync feature code:
  - [ ] Primitives (chips, badges, markdown) SHALL stay separate from sync-feature components (`sync_modal*`, preview helpers).
  - [ ] The boundary SHALL be documented in STYLING_GUIDE or CODESTYLE_GUIDE so new shared code lands in the right subtree.
- [ ] **P3-6** — WHEN styling list/renderer surfaces, THE repo SHALL reconcile kind-first TypeScript layout with feature-first CSS:
  - [ ] A new list/renderer change SHALL not require edits across 4–5 unrelated CSS roots for one feature tweak.
  - [ ] Component folder layout and `components/*.css` partial ownership SHALL be documented or aligned.
- [ ] **P3-7** — Overdue/blocked task rules currently in the renderer SHALL move to core if they are domain policy:
  - [ ] `taskIsOverdue` / `taskIsBlocked` in `task_state.util.ts` SHALL align with or merge into core `task_views` predicates (`is_overdue.util.ts`, actionable rules).
  - [ ] Renderer SHALL consume core predicates only; no duplicate date/dependency policy in shell/renderer.
- [ ] **P3-8** — THE DB lifecycle (disposable vs durable state, migrations + sync policy) SHALL be documented:
  - [ ] A guide or foundation addendum SHALL state which tables/columns survive sync, import, and dev disposable DB modes.
  - [ ] Frecency preservation behavior (`app_sync_frecency.spec.ts`) SHALL be referenced as normative example.
- [ ] **P3-9** — THE renderer `rpc/client.ts` (~311 LOC) SHALL split transport from endpoint facade:
  - [ ] Eden Treaty transport wiring SHALL live apart from per-endpoint helper functions.
  - [ ] Co-located `client.spec.tsx` SHALL cover both layers after split.
- [ ] **P3-10** — THE shortcut keymap SHALL derive from one source; remove duplicate derivation between component and hook overlap:
  - [ ] Keymap rows and binding filters SHALL not be built independently in both `shortcut_keymap.component.tsx` and shortcut hooks.
  - [ ] One derivation path SHALL feed overlay, keymap view, and chord detail flows.
- [ ] **P3-11** — THE `App` hub and `shell/app/lib/` bucket SHALL decompose into narrower modules:
  - [ ] `shell/app/lib/` SHALL not remain a catch-all for unrelated domains (list stats, sync, task source, preview, shell surface).
  - [ ] New app-side behavior SHALL land in a named service module, not ad-hoc `app_*.util.ts` growth without boundary review.
- [ ] **P3-12** — Types SHALL NOT be imported from `.component.tsx` files (e.g. sync modal state):
  - [ ] `SyncModalModel` and similar types SHALL move to `.types.ts` or `.model.ts` modules (today imported from `sync_modal.component.tsx` in specs and siblings).
  - [ ] `rg "from '\\./.*\\.component'"` in non-spec renderer code SHALL not import types from components.
- [ ] **P3-13** — THE renderer SHALL provide shared overlay primitives so modal chrome is not duplicated:
  - [ ] At least one shared overlay primitive (backdrop, header, focus trap, dismiss) SHALL back sync modal, task sheet chrome, and filter overlay patterns.
  - [ ] Duplicate modal layout CSS/JSX SHALL shrink measurably (jscpd or manual inventory in PR).
- [ ] **P3-14** — Micro-dirs (`core/handoff`, `core/validation`, …) SHALL merge or document to reduce navigation noise:
  - [ ] Each micro-dir SHALL either merge into a parent domain folder or gain a one-line README/index explaining why it stays separate.
  - [ ] `ls-lint` suffix rules for `core/validation` and knowledges subtrees SHALL stay satisfied after moves.
- [ ] **P3-15** — THE codebase SHALL migrate to a full `features/` tree layout:
  - [ ] A migration plan SHALL map current `renderer/components/{list,task,shortcuts,...}` to feature modules without breaking FCIS import rules.
  - [ ] Migration SHALL proceed incrementally; no big-bang directory shuffle in one PR.
