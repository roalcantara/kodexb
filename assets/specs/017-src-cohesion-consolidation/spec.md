<!-- markdownlint-disable-file -->

# src cohesion consolidation (logging-led module regrouping)

**Feature Branch**: `017-src-cohesion-consolidation`
**Release**: v0.x
**Status**: Draft

**Input**: Follow-up to `016-src-kernel-dry`. Regroup fragmented `src/` modules so
each file holds **one clear concern**, merging only where it genuinely improves
cohesion (not to chase a file-count metric). `src/shared/logging` is the
centerpiece. Unlike 016, **ls-lint may be adjusted** — but only to *strengthen*
the naming contract, gated by a research spike.

## Introduction

`src/shared/logging` is a 10-file "mixed-concern" folder: pure logging
(`logger.ts`, `log_verbosity.ts`), process config (`main.config.ts`,
`renderer.config.ts`, `renderer_build_env.ts`), Elysia transport plugins
(`rpc.middleware.ts`, `rpc_common.plugin.ts`, `rpc_error.contract.ts`), and
SQLite instrumentation (`db_query.logger.ts`). The three RPC files compose each
other; `renderer_build_env.ts` has a single consumer; `index.ts` duplicates the
logtape re-exports that `logger.ts` already owns. Several other `src/` directories
show the same fragmentation (e.g. five `doc.*.parser.ts` preamble builders).

A probe (2026-06-20) established that ls-lint uses a **first-dot extension model**:
its `.ts`/`.tsx` rules pin only single-segment-extension files; every suffixed
file (`*.util.ts`, `*.parser.ts`, …) is effectively unconstrained. So almost all
cohesion merges need **no** ls-lint change, and the naming contract that
`CLAUDE.md` calls "machine-checked by ls-lint" is, for suffixed files, only
partially enforced.

This feature delivers three groups: **COH-1** (logging regroup), **COH-2**
(abstraction-driven merges in other dirs — dispatch families and single-orchestrator
encapsulation only, never concatenation), and **COH-3** (a gated research spike to
strengthen the ls-lint suffix contract). Behaviour is frozen throughout — this is
structural.

## Clarifications

### Session 2026-06-20
- Q: Optimize for raw file count or cohesion? → A: **Cohesion** — each file one concern; merge only what genuinely belongs together; never merge for a metric.
- Q: Scope breadth (logging only / logging + unpinned dirs / + ls-lint adjustments)? → A: **Above + targeted ls-lint adjustments** — logging centerpiece, plus unpinned-dir merges, plus a principled ls-lint tier.
- Q: COH-3 direction — strengthen the contract or relax pinned dirs? → A: **Strengthen** (make the suffix vocabulary actually enforced), gated on a discovery spike; defer if blast radius is large. Relaxation is not the goal (the probe shows merges rarely need it).
- Q: Name for the merged RPC-logging file? → A: **`rpc.plugin.ts`** — the `.plugin` suffix is precisely what licenses a single-word concern name (`rpc`); it also marks the file's artifact (Elysia plugins) and survives COH-3's suffix-strengthening. (Not `rpc_logging.plugin.ts` — over-verbose; not `rpc.ts` — dropping the suffix discards the contract.)

## Authority

| Topic                          | Authority                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| FCIS layer + forbidden imports | [`FCIS.guide.md`](../../guides/FCIS.guide.md), [`CLAUDE.md`](../../../CLAUDE.md), `.dependency-cruiser.cjs`     |
| File naming + suffix vocabulary| [`CODESTYLE_GUIDE.md`](../../guides/CODESTYLE_GUIDE.md) §File Naming, `.ls-lint.yml`, Biome `useFilenamingConvention` |
| Logging conventions            | [`LOGGING_GUIDE.md`](../../guides/LOGGING_GUIDE.md), `app-logging` skill                                        |
| Co-located spec + DoD          | [`DoD.md`](../../guides/DoD.md), [`TESTING_GUIDE.md`](../../guides/TESTING_GUIDE.md)                            |
| Unused exports                 | `knip` (`knip.jsonc`)                                                                                           |
| Completion gate                | `mise run spec ready ${featureDir} --key ${catalogKey}`                                                         |

## Out of scope

- Merging files that are genuinely distinct concerns to lower file count (e.g. `src/shared/constants` holds three unrelated consts — **left alone**).
- Splitting `main.config.ts`/`renderer.config.ts` into one file (they have different runtime deps; `main.config.ts` imports `node:async_hooks`, which must never reach the renderer/CEF bundle).
- Relocating `db_query.logger.ts` out of `logging/`, or any change to its instrumentation behaviour.
- `neverthrow`/Result wrappers; any behavioural change to logging output, RPC error envelopes, sink configuration, or verbosity mapping.
- Relaxing/disabling any Biome, dependency-cruiser, or knip rule. ls-lint may change **only** via COH-3, and only to *strengthen*.
- COH-3 implementation if its spike finds the contract is not cleanly expressible or the blast radius is large — in that case COH-3 ships only the documented finding (see COH-3 AC4).

## Glossary

| Term                  | Meaning                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **cohesion regroup**  | Reorganizing a directory so each file is one concern; merging files that belong together, keeping distinct ones split. |
| **concern-named file**| A file whose descriptive part is a single word, licensed by its type suffix (e.g. `rpc.plugin.ts`). `logger.ts` is the lone pre-existing suffixless file in `logging/`.   |
| **first-dot model**   | ls-lint's extension rule: extension = everything from the first dot; `.ts` rules govern only single-segment files.  |
| **strengthen (COH-3)**| Add ls-lint rules so the suffix vocabulary is genuinely enforced (catch misnamed files), never to permit looser names. |

---

## REQUIREMENT COH-1: `src/shared/logging` cohesion regroup

**Slice:** MVP

**User story:** As a maintainer, I want `src/shared/logging` to read as one concern
per file so the folder stops mixing logtape, Elysia, env, and SQLite plumbing.

### Acceptance criteria

1. WHEN the RPC-logging plugins are consolidated, THEN `rpc.middleware.ts`, `rpc_common.plugin.ts`, and `rpc_error.contract.ts` SHALL be merged into a single `src/shared/logging/rpc.plugin.ts` exporting `rpcLogger`, `rpcErrorContract`, `rpcCommonPlugins`, and `RPC_LOG_PREVIEW_MAX_LEN`, with the three old files deleted.
   - **Measure:** `ls src/shared/logging/rpc*.ts` shows only `rpc.plugin.ts` (+ `rpc.plugin.spec.ts`); the three old basenames are gone.
   - **Evidence:** The merged `src/shared/logging/rpc.plugin.spec.ts` (consolidating the 3 old specs) is green; `bun test src/shared/logging` passes. The `rpcLogger → rpcErrorContract` onError ordering comment is preserved in `rpc.plugin.ts`.

2. WHEN the renderer build-env snapshot is consolidated, THEN `renderer_build_env.ts` SHALL be folded into `renderer.config.ts` (its sole consumer) and deleted, with `RENDERER_BUILD_ENV` becoming a module-local (or still-exported) binding in `renderer.config.ts`.
   - **Measure:** `test ! -f src/shared/logging/renderer_build_env.ts`; `rg -rn "renderer_build_env" src` returns 0 stale imports.
   - **Evidence:** `renderer.config.spec.ts` (absorbing `renderer_build_env.spec.ts`) green.

3. WHEN the barrel is de-duplicated, THEN `src/shared/logging/index.ts` SHALL re-export the logtape symbols **from `./logger`** rather than repeating `from '@logtape/logtape'`, so `logger.ts` is the single logtape boundary.
   - **Measure:** `rg -c "from '@logtape/logtape'" src/shared/logging/index.ts` → 0; `index.ts` re-exports `getLogger`/`withContext`/`Logger`/`LogRecord`/`Sink` from `./logger`.
   - **Evidence:** `logger.ts` exports all five symbols; `bun run typecheck` green.

4. WHEN COH-1 is complete, THEN the public `@shared/logging` barrel surface SHALL be byte-for-byte identical (same exported names), and `main.config.ts`, `log_verbosity.ts`, `db_query.logger.ts` SHALL be unchanged in concern.
   - **Measure:** `rg '^export' src/shared/logging/index.ts` lists exactly the names in `baseline-metrics.txt`; `src/shared/logging` non-spec file count = **7**, spec count = **5**.
   - **Evidence:** Every consumer in the baseline import list compiles unchanged; `bun test src/shell src/shared` green; `bun run lint:knip` reports no new unused exports.

5. WHEN logging behaviour is exercised, THEN log output, RPC error envelopes (`{ error: string }` / HTTP 500), sink config, and verbosity mapping SHALL be unchanged (refactor only).
   - **Measure:** No assertion in the merged specs changes expected log output or error-envelope values versus baseline.
   - **Evidence:** Full `src/shared/logging` suite green with only mechanical edits.

---

## REQUIREMENT COH-2: Abstraction-driven merges (no concatenation)

**Slice:** MVP

**User story:** As a maintainer, I want files merged **only** when they are cases of
one abstraction or single-use helpers of one orchestrator — never unrelated peers
concatenated to lower a file count.

### The merge bar (binding rule)

A merge is permitted **only** if it satisfies one of:
- **(A) Dispatch family** — N files are per-variant implementations of one operation
  that some caller already dispatches over (e.g. `doc.*.parser.ts` dispatched by
  `doc.assembler`). Merge target exposes the **dispatcher**, not N loose exports.
- **(B) Encapsulation** — a helper used by exactly one orchestrator (no external
  importer) folds **into** that orchestrator and becomes private.

If neither holds, the files stay split. This bar is the requirement; the cases
below are its verified applications (importer analysis in `baseline-metrics.txt`).

### Acceptance criteria

1. WHEN candidate dirs are assessed, THEN `assets/specs/017-src-cohesion-consolidation/cohesion-inventory.md` SHALL record, per file, whether it meets bar (A), (B), or **neither** (keep), with the importer evidence (`rg` of each symbol outside its dir).
   - **Measure:** Inventory covers `knowledges/detail`, `knowledges/tags`, `knowledges/task_views`, `core/helpers/list_opts`, `shared/constants`, and any other dir surveyed.
   - **Evidence:** Committed inventory; every "keep" cites an external importer or a distinct-concern reason; every "merge" cites bar (A) or (B).

2. WHEN the doc-preamble dispatch family is consolidated (bar A), THEN the five `doc.{bookmark,cheat,command,shortcut,task}.parser.ts` builders **and** the `buildPreamble` dispatcher (currently private inside `doc.assembler.ts`) SHALL live in one `src/core/domain/models/knowledges/detail/doc.parser.ts` that **exports `buildPreamble(knowledge, now, previewImageUrl?)`**; the five `build*Preamble` functions become module-private; `doc.assembler.ts` imports `buildPreamble` from `./doc.parser` and drops its local dispatcher + the five imports.
   - **Measure:** `ls .../detail/doc.*.parser.ts` → only `doc.parser.ts`; `rg -rn 'doc\.(bookmark|cheat|command|shortcut|task)\.parser' src` → 0; `rg -n 'buildPreamble' src/core/domain/models/knowledges/detail/doc.assembler.ts` shows an **import**, not a local definition.
   - **Evidence:** Co-located `doc.parser.spec.ts` (merging the old per-type specs) green; `bun test src/core/domain/models/knowledges/detail` green; `doc.assembler.ts` output byte-identical for each type.

3. WHEN the tag-ranking helpers are encapsulated (bar B), THEN `extract_keywords.util.ts` and `cooccurrence.util.ts` (each imported **only** by `rank_suggested_tags`) SHALL fold into `rank_suggested_tags.util.ts` as module-private functions and be deleted; `sorted_tags.util.ts` SHALL stay (imported by the renderer); `stop_words.const.ts` and `suggest_max_results.const.ts` SHALL stay (data).
   - **Measure:** `rg -rn 'extract_keywords|cooccurrence' src` → only `rank_suggested_tags.util.ts` (definitions inline) + specs; `sorted_tags.util.ts` still exists.
   - **Evidence:** `rank_suggested_tags.util.spec.ts` (absorbing the helper specs) green; `App.suggestTags` and renderer tag callers compile unchanged.

4. WHEN the task-view predicates are encapsulated (bar B), THEN `is_actionable.util.ts` and `is_overdue.util.ts` (each imported **only** by `filter_by_view`) SHALL fold into `filter_by_view.util.ts`'s existing `Record<TaskView, predicate>` as module-private predicates and be deleted; `show_task_section.util.ts` SHALL stay (imported by the renderer); `task_date.util.ts`, `count_by_view.util.ts`, `task_view_order.const.ts` SHALL stay (distinct concerns).
   - **Measure:** `rg -rn 'is_actionable|is_overdue' src` → only `filter_by_view.util.ts` + specs; `show_task_section.util.ts` still exists.
   - **Evidence:** `filter_by_view.util.spec.ts` (absorbing the predicate specs) green; renderer callers of `showTaskSection` unchanged.

5. WHEN `core/helpers/list_opts` and `shared/constants` are assessed, THEN they SHALL be **left unmerged**: `stableListCacheKey` and `toFindAllOpts` are unrelated transforms (fail bar A and B); the three `shared/constants` consts are unrelated domains.
   - **Measure:** `core/helpers/list_opts` and `shared/constants` file counts unchanged.
   - **Evidence:** Inventory entries stating the bar failed (no dispatch family, no single-orchestrator encapsulation).

6. WHEN COH-2 lands, THEN no Biome/dependency-cruiser/knip/ls-lint config SHALL change and behaviour SHALL be frozen.
   - **Measure:** `git diff` of all rule files empty; net non-spec file count across COH-2 dirs decreases by **8** — detail −4 (5 builders → 1 `doc.parser.ts`), tags −2 (`extract_keywords` + `cooccurrence` folded), task_views −2 (`is_actionable` + `is_overdue` folded); list_opts 0, constants 0.
   - **Evidence:** `bun test`, `bun run typecheck`, `bun run lint:ls`, `bun run lint:biome`, `bun run lint:depcruise`, `bun run lint:knip` all green.

---

## REQUIREMENT COH-3: ls-lint suffix-contract strengthening (gated spike)

**Slice:** MVP (spike) → conditional implementation

**User story:** As a maintainer, I want the naming suffix vocabulary to be actually
enforced by ls-lint so `CLAUDE.md`'s "machine-checked" claim is true and future
drift is caught — but only if it can be expressed cleanly at low cost.

### Acceptance criteria

1. WHEN the spike runs, THEN it SHALL determine whether ls-lint can express the
   suffix contract given the first-dot extension model (documented in
   `baseline-metrics.txt`), and record the mechanism in
   `assets/specs/017-src-cohesion-consolidation/lslint-spike.md`.
   - **Measure:** The spike answers: can a rule key like `.util.ts` (or an ls-lint
     `dirs`/extension option) govern `*.util.ts` files without false-matching
     `*.x.util.ts`? For multi-segment cases (`doc.task.parser.ts`), is enforcement
     possible per-dir?
   - **Evidence:** `lslint-spike.md` with the tested config snippets and ls-lint
     output for each.

2. WHEN the spike measures blast radius, THEN it SHALL report, per candidate suffix
   (`util`, `hook`, `component`, `const`, `parser`, `schema`, `types`, `routes`,
   `helper`, `factory`, `guard`, `config`), how many existing files would newly
   **fail** a strengthened rule.
   - **Measure:** A table of `suffix → new failures`, produced by adding the rule
     and running `bun run lint:ls`.
   - **Evidence:** Table in `lslint-spike.md`; raw ls-lint output retained.

3. WHEN the strengthened contract is cleanly expressible AND total new failures are
   **≤ 10**, THEN COH-3 SHALL add the strengthening rules to `.ls-lint.yml`, fix the
   ≤ 10 offending filenames (renaming + import updates), and leave the contract
   green; the lone pre-existing suffixless `src/shared/logging/logger.ts` SHALL
   be either explicitly permitted or suffixed per the spike's recommendation
   (`rpc.plugin.ts` already carries a suffix and needs no exemption).
   - **Measure:** `bun run lint:ls` green with the new rules; `git diff .ls-lint.yml`
     shows only additive strengthening (no rule removed or loosened).
   - **Evidence:** ls-lint green; renamed files' specs green; `rg` finds no stale imports.

4. WHEN the contract is NOT cleanly expressible OR new failures are **> 10**, THEN
   COH-3 SHALL ship only `lslint-spike.md` (the finding + a recommended follow-up),
   make **no** `.ls-lint.yml` change, and the feature SHALL still pass its gate on
   COH-1 + COH-2 alone.
   - **Measure:** `git diff .ls-lint.yml` empty; `lslint-spike.md` states "deferred"
     with rationale and a proposed dedicated spec.
   - **Evidence:** Spike doc committed; gate green without COH-3 code changes.

---

## Cross-requirement rules

- **Behaviour frozen.** Every modify/merge task baselines the existing spec green, then re-runs it green after. No logging output, RPC envelope, validation, or return value changes.
- **Co-located spec for every file with logic.** Merged files carry a merged `.spec.ts`; deleted files' specs are folded in, not dropped.
- **Suffix discipline.** Merged files keep a valid suffix for their concern (`*.util.ts`, `*.parser.ts`, `*.plugin.ts`); the suffix is what licenses a single-word concern name (`rpc.plugin.ts`).
- **Rule files frozen except ls-lint via COH-3.** `git diff` of `biome.jsonc`, `.dependency-cruiser.cjs`, `knip.jsonc` MUST be empty at PR time. `.ls-lint.yml` changes only under COH-3 AC3, additively.
- **Import hygiene.** After every merge, `rg` the old module paths → 0 stale imports; `bun run lint:knip` → no new unused/missing exports.

---

## Quantified gains (targets + measurement)

Measured against [`baseline-metrics.txt`](./baseline-metrics.txt); implementer
records actuals in `closeout-metrics.txt`.

### File-count / cohesion (target floors)
| Area                                   | Baseline | Target | Command |
| -------------------------------------- | -------: | -----: | ------- |
| `src/shared/logging` non-spec files    |       10 |      7 | `ls src/shared/logging/*.ts \| grep -v spec \| wc -l` |
| `src/shared/logging` spec files        |        8 |      5 | `ls src/shared/logging/*.spec.ts \| wc -l` |
| `logging/` duplicated logtape re-export |        1 |      0 | `rg -c "from '@logtape/logtape'" src/shared/logging/index.ts` |
| COH-2 dirs net non-spec files          |        — |    − 8 | per-dir `find … ! -name '*.spec.*' \| wc -l` before/after |
| `detail/doc.*.parser.ts` files         |        5 |      1 | `ls …/detail/doc.*.parser.ts \| wc -l` (now exposes `buildPreamble`) |
| tags single-use helpers (encapsulated) |        2 |      0 | `rg -rn 'extract_keywords\|cooccurrence' src \| grep -v rank_suggested` |
| task_views single-use predicates       |        2 |      0 | `rg -rn 'is_actionable\|is_overdue' src \| grep -v filter_by_view` |

### Structural / qualitative gains (assertable)
| Dimension   | Concrete improvement |
| ----------- | -------------------- |
| **Cohesion**| `logging/` drops from 4 mixed concern-domains per folder to one-concern-per-file; the 3 mutually-composing RPC plugins live in one `rpc.plugin.ts`; the doc-preamble dispatcher + its 5 type builders live in one `doc.parser.ts` exposing a single `buildPreamble`. |
| **Single boundary** | `logger.ts` becomes the sole logtape re-export point; `index.ts` stops duplicating it. |
| **Bundle safety preserved** | `main.config.ts` (node:async_hooks) stays out of `renderer.config.ts`, so the renderer/CEF bundle is unaffected. |
| **Contract honesty (COH-3)** | Either the suffix vocabulary becomes genuinely ls-lint-enforced, or the gap is documented with a follow-up — `CLAUDE.md`'s "machine-checked" claim is reconciled with reality. |

---

## Definition of Done (gate)

1. All COH-1, COH-2 acceptance criteria met; COH-3 met per its conditional branch (AC3 *or* AC4).
2. `closeout-metrics.txt` committed; every target floor met or beaten.
3. `cohesion-inventory.md` and (for COH-3) `lslint-spike.md` committed.
4. Rule-file diff: `biome.jsonc`, `.dependency-cruiser.cjs`, `knip.jsonc` unchanged; `.ls-lint.yml` unchanged unless COH-3 AC3 applied (additive only).
5. Catalog key `src_cohesion` registered in `assets/catalog/catalog.yaml`; `mise run spec ready assets/specs/017-src-cohesion-consolidation --key src_cohesion` green (`bun test`, `bun run typecheck`, `bun run lint:depcruise`, `bun run lint:ls`, `bun run lint:biome`, `bun run lint:knip`).
6. No behavioural diff: every pre-existing spec passes without behavioural edits.

## E2e declaration (optional — pointers only)

Not applicable. Structural/interface refactor of `src/`; acceptance is unit/
integration specs (see each Evidence row), not Playwright e2e — matching
predecessors `014`, `015`, `016`.

## Open Questions (optional)

| #    | Question | Status | Notes |
| ---- | -------- | ------ | ----- |
| OQ-1 | None     | Closed |       |
