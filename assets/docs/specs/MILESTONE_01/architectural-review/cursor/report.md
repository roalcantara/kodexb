<!-- markdownlint-disable-file -->
# Architectural review — kb v0.10.0 (Cursor)

**Date:** 2026-06-02 · **Prompt:** [`../requirements/architectural.md`](../../../MILESTONE_01/architectural-review/requirements/architectural.md)
**Scope:** Repository-wide structure, FCIS boundaries, types/schemas, maintainability.
**Companion:** [`presentation_layer.md`](../../../MILESTONE_01/architectural-review/cursor/presentation_layer.md) · Literature: [`../requirements/presentation-layer-literature-review.md`](../../../MILESTONE_01/architectural-review/requirements/presentation-layer-literature-review.md)

Other first-pass reviews: [`../claude/report.md`](../../../MILESTONE_01/architectural-review/claude/report.md), [`../gemini/report.md`](../../../MILESTONE_01/architectural-review/gemini/report.md), [`../codex/report.md`](../../../MILESTONE_01/architectural-review/codex/report.md).

---

## 1. Executive summary

kb at v0.10.0 is a **small, serious desktop product** with **enterprise-grade guardrails** on a **v0.x feature set**. Your mixed feelings are understandable and mostly accurate in *direction*, but slightly harsh in *severity*: the architecture is **sound**; the friction you feel is **seam duplication** and **organizational drift**, not a broken foundation.

The stack is deliberately opinionated:

```text
core/          Pure domain + validation (TypeBox, no I/O)
shared/        Cross-layer types and utilities (no shell I/O)
shell/app/     AppService, SQLite, import, config
shell/main/    Electrobun, Elysia RPC (thin routes)
shell/renderer React UI (Eden Treaty only)
```

**What is “there” already (Rails-adjacent):**

- **Convention over configuration** — `.ls-lint.yml` + suffix vocabulary (`*.repository.ts`, `*.routes.ts`) do what Rails does with `app/models` naming: you know what a file is before you open it.
- **Fat model, thin controller** — translated to **fat core, thin routes**: RPC route files are ~15–30 lines; repositories hold SQL; `App` orchestrates.
- **Tests co-located** — every `src/` artifact has a `.spec.ts(x)`; quality gate is executable, not aspirational.

**What is “not quite there” yet:**

- **The same enum in four places** — entry types, task views, priorities, page sizes. Rails would scream at four `validates :inclusion` lists; kb has four TypeBox/TS sources with a drift test holding the line.
- **`@shared/rpc` naming** — domain concepts (`TaskView`, `ListStats`) live under a transport label; `core/` imports `TaskView` from `@shared/rpc` (legal FCIS, wrong story).
- **`App` as a growing façade** — one class, many responsibilities; recent route split (`catalog`, `task`, `handoff`, `config_sync`, `shell`) shows the team already feels the seam.

**Verdict on your Core vs Shell worry:** Largely **unfounded as a dominant problem today**. Consolidation work already moved tag ranking, task-view predicates, and co-occurrence into `core/`. What remains in `shell/app/lib/` is mostly orchestration plus **payload shapes that duplicate core**. That is a **typing/consolidation** problem, not “domain logic trapped in the shell because of I/O guilt.”

**Verdict for v0.10.0:** Ship. Pay down Tier A consolidation after release; reserve Tier B for v0.11.

---

## 2. Key strengths to preserve

### 2.1 FCIS is enforced, not documented

`dependency-cruiser` and `ast-grep` block `renderer → shell/app`, `core → shell`, and routes importing repositories directly. In a Rails world this is like **zeitwerk + packwerk** actually running in CI. **Do not relax these for velocity.**

### 2.2 Thin RPC surface (recent improvement)

Routes are split by bounded context:

```text
shell/main/rpc/routes/
├── catalog.routes.ts
├── task.routes.ts
├── handoff.routes.ts
├── config_sync.routes.ts
└── shell.routes.ts
```

Each file: validate with TypeBox → call `App` → return. This is the “RESTful controller” ideal adapted to Eden Treaty.

### 2.3 One validation dialect

TypeBox everywhere; no Zod adapter tax. Fishery factories ride the same types. For a TypeScript desktop app, this is a **long-term win** over schema-framework churn.

### 2.4 Preview server = production contract

`tools/preview/server.ts` serves the real `RpcApp`. Preview is not a mock RPC layer. That choice prevents an entire class of “works in dev” bugs.

### 2.5 Written architecture culture

`assets/guides/`, `assets/docs/specs/foundation/`, prior audits (`codebase-consolidation`, quality audit), and `app-quality-gate` mean you **review in prose before refactoring**. That habit is rare and valuable — keep it.

### 2.6 SQLite + explicit SQL

FTS5, `json_each`, BM25 ordering in repositories — honest SQL with typed rows. Appropriate for a knowledge-base app; ORM indirection would not pay off yet.

---

## 3. Architectural concerns, risks, and code smells

Severity: **P1** (change-amplification / correctness), **P2** (cognitive load), **P3** (local cleanup).

### P1. Quadruple representation of discriminants

| Concept              | Places                                                                            |
| -------------------- | --------------------------------------------------------------------------------- |
| Entry type           | `entryTypeSchema`, `ENTRY_TYPE_VALUES`, `desktop_rpc_schema.ts`, `rpc/schemas.ts` |
| Task view            | `TASK_VIEW_ORDER`, `TaskView` in shared, TypeBox in schemas                       |
| Task priority/status | core schema + const + shared + RPC                                                |
| Page size            | core default, config schema, shared, renderer constants                           |

The comment in `desktop_rpc_schema.ts` documents the trade-off and relies on `schemas.spec.ts` for drift — **honest engineering**, but **permanent maintenance rent**. Every new variant is a scavenger hunt.

**Rails parallel:** This is like maintaining the same `ENUM` in migrations, model validations, serializers, and API docs by hand.

### P1. `@shared/rpc` semantic inversion

`core` imports domain types from transport namespace:

```text
core/domain/.../task_view_order.const.ts  →  import type { TaskView } from '@shared/rpc'
```

FCIS allows it; **bounded-context storytelling does not**. `TaskView` belongs in `core`; RPC and renderer should reference core-shaped types (or thin aliases), not the reverse.

`RpcKnowledge = Knowledge` adds noise without information.

### P1. `App` growth (composition root under pressure)

`App` spans catalog reads, frecency, bindings, list stats, config, sync, task CRUD, OS handoffs, window chrome. Route files already mirror natural service boundaries — **`App` has not caught up to the route split yet**.

`app_shell_surface.util.ts` is eleven hand-rolled `new Promise((resolve, reject) => { try { hooks... } })` blocks — adapter boilerplate, not domain.

**Not a crisis** at current size; **is** the axis along which v0.11 complexity will hurt if unchecked.

### P2. `ListStats` redundant fields

Explicit `bookmark`, `command`, `cheat`, `shortcut`, `task` counts **and** `byType` duplicate the same data. New entry type → multiple builders and consumers. Prefer one map shape.

### P2. Renderer hook fragmentation (cross-reference)

27 files under `hooks/list/`; 17 single-caller hooks. Architectural **symptom** of the same “split until lint is green” pressure. Detailed in [`presentation_layer.md`](../../../MILESTONE_01/architectural-review/cursor/presentation_layer.md). Not an FCIS violation — an **onboarding tax**.

### P3. Micro-directories in `core/`

`core/handoff/` (one const file), `core/validation/` (one helper), scattered `constants/` trees — fine individually, noisy collectively. Rails would fold these into `lib/` or `models/concerns/` with a naming convention.

### P3. Stale agent rules (if still present)

`.cursor/rules/` paths from another project confuse tooling — housekeeping, not product risk.

---

## 4. Opportunities for simplification

1. **`typeUnion()` from core tuples** — one literal source; RPC TypeBox maps `ENTRY_TYPE_VALUES`, `TASK_VIEW_ORDER`, etc. Delete hand-maintained parallel unions.
2. **Single page-size tuple** — `pagination.const.ts` in core; config + RPC + renderer derive.
3. **`asPromise(hookFn)`** — collapse eleven shell delegate wrappers.
4. **Inline or merge single-caller list hooks** — fewer files, same behavior (presentation track).
5. **Drop redundant `ListStats` fields** — one `byType` map.
6. **Rename away `Rpc*` where it is identity** — `Knowledge` is `Knowledge`.

---

## 5. Opportunities for consolidation

| Cluster                | Target                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| Domain enums           | `@core/domain/constants` owns tuples; all layers derive                                               |
| Query shapes           | `ListOpts`, `ListStats`, `TaskCreateInput` → `@core/domain/queries/` or similar                       |
| Transport-only         | Keep in `@shared/rpc`: sync progress, import result, dialog opts, Electrobun schema                   |
| `App` responsibilities | `CatalogService`, `TasksService`, `SyncService`, `ConfigService`, `ShellSurface` composed in `app.ts` |
| Constants              | Merge `shared/constants/` into core or renderer; fold one-file dirs into `core/lib/`                  |

**What not to consolidate (yet):**

- Redux/Zustand — state size does not justify it.
- TanStack Query — Eden Treaty is not cache-shaped today.
- Drizzle — Decision 5 still holds for FTS/SQL expressiveness.

---

## 6. Recommendations by priority and ROI

### Tier A — High impact, low effort (post–v0.10.0 maintenance sprint)

| #   | Recommendation                                      | ROI                       |
| --- | --------------------------------------------------- | ------------------------- |
| A1  | `typeUnion()` + derive RPC schemas from core tuples | Stops four-way enum edits |
| A2  | Single-source page sizes                            | Same                      |
| A3  | `ListStats` → `byType` only                         | Smaller change surface    |
| A4  | Generic `asPromise()` for shell hooks               | −80 lines boilerplate     |
| A5  | Move non-hook `.util.ts` out of `hooks/list/`       | Restores folder meaning   |
| A6  | Drop meaningless `Rpc*` aliases                     | Clarity                   |

### Tier B — High impact, high effort (v0.11)

| #   | Recommendation                                                          | ROI                       |
| --- | ----------------------------------------------------------------------- | ------------------------- |
| B1  | Move domain types out of `@shared/rpc` into `core`                      | Fixes arrow direction     |
| B2  | Split `App` into services aligned with route files                      | Scales feature work       |
| B3  | Renderer hook second-pass (inline or split shell into 2 coherent hooks) | Onboarding + traceability |

### Tier C — Nice to have

| #   | Recommendation                                             |
| --- | ---------------------------------------------------------- |
| C1  | Fold micro-dirs (`core/handoff`, `core/validation`)        |
| C2  | Split `key.const.ts` by concern if it keeps growing        |
| C3  | Push `types` filter into FTS `WHERE` when datasets grow    |
| C4  | Refresh stale Cursor rules / design.md historical sections |

---

## 7. Refactoring roadmap

```text
v0.10.0  ── ship (architecture is not blocking)

v0.10.x  ── Tier A (1 PR per item, ~1–3 days total)
           discriminants · page sizes · ListStats · asPromise · hook utils · Rpc* rename

v0.11.0  ── Tier B1: domain types home in core
v0.11.x  ── Tier B2: App → services (incremental; routes unchanged externally)
           Tier B3: renderer orchestration (see presentation_layer.md)

ongoing  ── consolidation passes when touching a surface (Rails-style “leave it better”)
```

---

## Rails philosophy — without abandoning FCIS

You asked for Rails influence **without replicating Rails**. The honest mapping:

| Rails instinct            | kb equivalent today       | Opportunity                                   |
| ------------------------- | ------------------------- | --------------------------------------------- |
| “Where do I put this?”    | ls-lint + suffixes        | Already strong                                |
| “Don’t repeat the domain” | core schemas              | Stop repeating literals at seams              |
| “Thin controller”         | thin `.routes.ts`         | Keep                                          |
| “Fat model”               | repositories + core utils | Move more query *shapes* into core naming     |
| “One obvious way”         | FCIS + guides             | Document hook-extraction rule (presentation)  |
| “Convention over config”  | biome + hk + gate         | Add optional ast-grep for single-caller hooks |

**What Rails would *not* do here:** introduce ActiveRecord, global before_filters, or a generic `ApplicationController` god-object. kb’s `App` is the closest analog — watch that line.

---

## Assumptions challenged

| Your concern                          | Assessment                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Core vs Shell boundary too aggressive | **Mostly addressed**; remaining issue is type duplication, not misplaced pure logic           |
| Type proliferation                    | **Valid** — P1; fix by owning tuples in core                                                  |
| Structure won’t scale                 | **Valid for renderer**; **less urgent for core/shell** until feature count doubles            |
| “Codebase isn’t quite there”          | **Half right** — product and tooling *are* there; **folder and seam hygiene** are catching up |

---

## Issues you may not have named explicitly

1. **Success tax:** Quality gate + co-located specs + four-layer enums = **correct but slow** feature work on RPC/entry-type changes. Tier A directly attacks that.
2. **CSS/TS organizational mismatch:** Styles are feature-named; TS is kind-named — see presentation review. This alone can cause “Rails brain” discomfort.
3. **Biome complexity rules driving file count:** `biome-ignore` on orchestrators marks where lint rules and React structure fight each other.

---

*Honest assessment: kb is closer to “maintainable v1” than “messy prototype.” v0.10.0 is a fair release line; use v0.10.x for seam consolidation, not architectural rescue.*
