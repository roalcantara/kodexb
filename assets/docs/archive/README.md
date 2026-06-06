<!-- markdownlint-disable-file -->

# app — feature specs (legacy tree)

## Read first (orientation)

**Part II (incoming):** condensed logs at [`PRODUCT_DESIGN.md`](PRODUCT_DESIGN.md) and [`PRODUCT_REQUIREMENTS.md`](PRODUCT_REQUIREMENTS.md) — use those for product orientation, not a folder search.

**Legacy folders:** numbered **`NNN-<slug>/`** slices under this directory, ordered by creation time (see [`library_manifest.json`](library_manifest.json)). Example: [`001-foundation/`](001-foundation/design.md). These hold full SDD artifacts for drill-down only.

---

All **historical product and feature specifications** live under:

**`assets/docs/specs/NNN-<feature-slug>/`**

Typical files per feature (use only what you need):

| File                     | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `requirements.md`        | EARS-style behavior and acceptance criteria    |
| `design.md`              | Normative technical contract                   |
| `tasks.md`               | Ordered verification work                      |
| `implementation-plan.md` | Agent-oriented step-by-step plan (optional)    |
| `*.html` or other assets | Prototypes and diagrams (optional, co-located) |

Foundation and roadmap:

- [`001-foundation/design.md`](001-foundation/design.md)
- [`001-foundation/requirements.md`](001-foundation/requirements.md)
- [`001-foundation/roadmap.md`](001-foundation/roadmap.md)

## Do not use `docs/superpowers/`

Some external skills default to `docs/superpowers/specs/` for brainstorm output. **app does not commit there.** That path is listed in **`.gitignore`** so accidental files never enter the repo.

When an AI skill or template says to write under `docs/superpowers/`, use the `spec-driven-development` skill shape and **redirect** to `assets/docs/specs/<slug>/` instead (create the slug folder if needed). Use `requirements.md`, `design.md`, `tasks.md`, and optional `handoff.md`.

## E2e acceptance criteria (all features)

Every **release-facing feature** and **user-visible refactor** MUST include e2e
acceptance criteria before beta:

1. **`requirements.md`** — at least one requirement (or AC block) tracing to
   Gherkin under `assets/features/e2e/` with `@spec:<slug>` tags.
2. **`tasks.md`** — an e2e task or cross-link to [`e2e/tasks.md`](018-e2e/tasks.md).
3. **[`e2e/fixture-manifest.md`](018-e2e/fixture-manifest.md)** — seed data contract
   when the feature needs deterministic rows.
4. **[`e2e/step-catalog.md`](018-e2e/step-catalog.md)** — normative Gherkin phrases
   before step implementations merge.

Normative policy: [`e2e/requirements.md` R11](018-e2e/requirements.md#r11---cross-feature-e2e-acceptance).
Scenarios MAY ship with `@todo` until automation lands; release gates require
green runs without `@todo` on P0/P1 scenarios.

## Verifiable acceptance (no orphan checks)

Every behavior a maintainer must validate before marking a feature
**beta-ready** — including manual dogfood, preview-server walkthroughs, and
“integration sanity” checks — MUST be expressed so a reviewer can execute it
**without reading implementation source**:

1. **`requirements.md`** — at least one numbered **acceptance criterion**
   (EARS `WHEN … THEN … SHALL …`) with a **Measure** clause when the check is
   not fully automated.
2. **`assets/features/e2e/*.feature`** — a Gherkin scenario tagged
   `@spec:<slug>` when the flow is browser-observable (preferred for release
   gates). Scenarios MAY carry `@todo` until steps land; the AC still binds the
   intended outcome.
3. **`tasks.md`** — MAY link tasks to AC ids and record evidence, but MUST NOT
   be the **only** place a check exists.

Orphan bullets in `tasks.md`, `handoff.md`, or agent checklists that are not
backed by an AC or feature scenario are spec debt — add the AC (and scenario
when applicable) in the same PR series as the behavior.

Cross-feature policy: [`e2e/requirements.md` R11 AC7](018-e2e/requirements.md#r11---cross-feature-e2e-acceptance).

## Feature specs (index)

- [Entry Action Panel](021-entry-action-panel/design.md) — unified entry actions, Return / ⌘Return in list/split/detail, frecency via executor; [requirements](021-entry-action-panel/requirements.md), [tasks](021-entry-action-panel/tasks.md), [implementation plan](021-entry-action-panel/implementation-plan.md).
- [Entry action handoff](020-entry-action-handoff/design.md) — arkn-aligned browser/terminal/paste handoff, hide-on-success; [requirements](020-entry-action-handoff/requirements.md), [tasks](020-entry-action-handoff/tasks.md), [handoff](020-entry-action-handoff/handoff.md), [e2e feature](../features/e2e/entry_action_handoff.feature). UX reference: Raycast extension **arkn**.
- [List frecency sort](025-list-frecency-sort/design.md) — Raycast-style entry ranking for list/split; visits on detail open + copy; [requirements](025-list-frecency-sort/requirements.md), [tasks](025-list-frecency-sort/tasks.md), [implementation plan](025-list-frecency-sort/implementation-plan.md).
- [Compact filter overlay rebuild](015-compact-filter-redesign/design.md) — single scrollport, fixed Close footer, highlight visibility; [tasks](015-compact-filter-redesign/tasks.md), [implementation plan](015-compact-filter-redesign/implementation-plan.md).
- [Command palette and filter UX](014-command-palette-filter-ux/design.md) — ⌘P / ⌘K; behaviour matrix in the **project root** [README.md](../../../README.md).
- [Shortcuts](036-shortcuts/design.md) — `shortcut` entry type, `⌘/` quick-lookup overlay, list/detail keymaps; [requirements](036-shortcuts/requirements.md), [tasks](036-shortcuts/tasks.md), [handoff](036-shortcuts/handoff.md), [e2e Phase 7](018-e2e/tasks.md#phase-7---shortcuts-feature-p1).
- [End-to-end regression suite](018-e2e/design.md) — Playwright BDD + Gherkin smoke/regression; [requirements](018-e2e/requirements.md), [tasks](018-e2e/tasks.md), [fixture manifest](018-e2e/fixture-manifest.md), [step catalog](018-e2e/step-catalog.md).
- [CI review e2e](043-ci-review-e2e/design.md) — parallel smoke and regression jobs in review.yml; [requirements](043-ci-review-e2e/requirements.md), [tasks](043-ci-review-e2e/tasks.md), [handoff](043-ci-review-e2e/handoff.md).
- [Elysia and Electrobun capability inventory](019-elysia-electrobun-capability-inventory/design.md) — decision-neutral upstream capability research for maintainer priority review; [requirements](019-elysia-electrobun-capability-inventory/requirements.md), [tasks](019-elysia-electrobun-capability-inventory/tasks.md), [report](019-elysia-electrobun-capability-inventory/report.md), [inventory](019-elysia-electrobun-capability-inventory/inventory.yml).
- [Electrobun corpus audit](044-electrobun-corpus-audit/report.md) — full upstream doc coverage, adoption tiers, inventory refresh; [handoff](044-electrobun-corpus-audit/handoff.md).
- [Release v0.10.0 scope](v0.10.0-scope.md) — maintainer sign-off for corpus, inventory priorities, and release bundle.
- [Mise usage policy](026-mise-usage/design.md) — executable policy for Mise task shape, embedded Usage specs, package scripts, and automation entrypoints; [requirements](026-mise-usage/requirements.md), [tasks](026-mise-usage/tasks.md), [handoff](026-mise-usage/handoff.md).
- [Mise usage improvements](026-mise-usage-improvements/design.md) — final Mise task contract cleanup, nested command surface, package script pruning, CI updates, and command validation matrix; [requirements](026-mise-usage-improvements/requirements.md), [tasks](026-mise-usage-improvements/tasks.md), [handoff](026-mise-usage-improvements/handoff.md).
- [Source sync resilience](040-sync/design.md) — import always completes; per-file/entry error isolation; Phase 7 modal error UX (SY-7); [requirements](040-sync/requirements.md), [tasks](040-sync/tasks.md), [handoff](040-sync/handoff.md), [Phase 7 handoff](040-sync/handoff-phase-7-modal-errors.md). E2e: `@spec:sync`.
- [Shell chrome unification](034-shell-chrome/design.md) — Proposal A: remove list action row, unify overlay modals at 560px; [requirements](034-shell-chrome/requirements.md), [tasks](034-shell-chrome/tasks.md), [handoff](034-shell-chrome/handoff.md). Prototype: [`shell_modals_redesign_prototype.html`](../../wireframe/prototypes/shell_modals_redesign_prototype.html).
- [macOS / Linux platform parity](031-platform-parity/design.md) — cross-cutting audit and closure plan for handoff + shell adapters; [requirements](031-platform-parity/requirements.md), [tasks](031-platform-parity/tasks.md), [handoff](031-platform-parity/handoff.md).
- [Electrobun Utils Adoption](045-electrobun-utils-adoption/handoff.md) — Phases 1–3: boolean `openExternal`/`openPath` handling, cursor-aware Screen API, event-driven shortcut teardown; [inventory](../elysia-electrobun-capability-inventory/inventory.yml).
- [Code review graph migration](022-graph/design.md) — legacy graph removal and local CRG MCP setup for common KB agents; [requirements](022-graph/requirements.md), [tasks](022-graph/tasks.md), [implementation plan](022-graph/implementation-plan.md), [handoff](022-graph/handoff.md).

Also documented in [`CLAUDE.md`](../../../CLAUDE.md) (reference docs) and [`.agents/skills/app-context/SKILL.md`](../../../.agents/skills/app-context/SKILL.md).
