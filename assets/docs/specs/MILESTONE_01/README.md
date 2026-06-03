<!-- markdownlint-disable-file -->

# app — feature specs (canonical location)

All **product and feature specifications** for this repository live under:

**`assets/docs/specs/<feature-slug>/`**

Typical files per feature (use only what you need):

| File                     | Purpose                                        |
| ------------------------ | ---------------------------------------------- |
| `requirements.md`        | EARS-style behavior and acceptance criteria    |
| `design.md`              | Normative technical contract                   |
| `tasks.md`               | Ordered verification work                      |
| `implementation-plan.md` | Agent-oriented step-by-step plan (optional)    |
| `*.html` or other assets | Prototypes and diagrams (optional, co-located) |

Foundation and roadmap:

- [`foundation/design.md`](../MILESTONE_01/foundation/design.md)
- [`foundation/requirements.md`](../MILESTONE_01/foundation/requirements.md)
- [`foundation/roadmap.md`](../MILESTONE_01/foundation/roadmap.md)

## Do not use `docs/superpowers/`

Some external skills default to `docs/superpowers/specs/` for brainstorm output. **app does not commit there.** That path is listed in **`.gitignore`** so accidental files never enter the repo.

When an AI skill or template says to write under `docs/superpowers/`, use the `spec-driven-development` skill shape and **redirect** to `assets/docs/specs/<slug>/` instead (create the slug folder if needed). Use `requirements.md`, `design.md`, `tasks.md`, and optional `handoff.md`.

## E2e acceptance criteria (all features)

Every **release-facing feature** and **user-visible refactor** MUST include e2e
acceptance criteria before beta:

1. **`requirements.md`** — at least one requirement (or AC block) tracing to
   Gherkin under `assets/features/e2e/` with `@spec:<slug>` tags.
2. **`tasks.md`** — an e2e task or cross-link to [`e2e/tasks.md`](../MILESTONE_01/e2e/tasks.md).
3. **[`e2e/fixture-manifest.md`](../MILESTONE_01/e2e/fixture-manifest.md)** — seed data contract
   when the feature needs deterministic rows.
4. **[`e2e/step-catalog.md`](../MILESTONE_01/e2e/step-catalog.md)** — normative Gherkin phrases
   before step implementations merge.

Normative policy: [`e2e/requirements.md` R11](../MILESTONE_01/e2e/requirements.md#r11---cross-feature-e2e-acceptance).
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

Cross-feature policy: [`e2e/requirements.md` R11 AC7](../MILESTONE_01/e2e/requirements.md#r11---cross-feature-e2e-acceptance).

## Feature specs (index)

- [Entry Action Panel](../MILESTONE_01/entry-action-panel/design.md) — unified entry actions, Return / ⌘Return in list/split/detail, frecency via executor; [requirements](../MILESTONE_01/entry-action-panel/requirements.md), [tasks](../MILESTONE_01/entry-action-panel/tasks.md), [implementation plan](../MILESTONE_01/entry-action-panel/implementation-plan.md).
- [Entry action handoff](../MILESTONE_01/entry-action-handoff/design.md) — arkn-aligned browser/terminal/paste handoff, hide-on-success; [requirements](../MILESTONE_01/entry-action-handoff/requirements.md), [tasks](../MILESTONE_01/entry-action-handoff/tasks.md), [handoff](../MILESTONE_01/entry-action-handoff/handoff.md), [e2e feature](../features/e2e/entry_action_handoff.feature). UX reference: Raycast extension **arkn**.
- [List frecency sort](../MILESTONE_01/list-frecency-sort/design.md) — Raycast-style entry ranking for list/split; visits on detail open + copy; [requirements](../MILESTONE_01/list-frecency-sort/requirements.md), [tasks](../MILESTONE_01/list-frecency-sort/tasks.md), [implementation plan](../MILESTONE_01/list-frecency-sort/implementation-plan.md).
- [Compact filter overlay rebuild](../MILESTONE_01/compact-filter-redesign/design.md) — single scrollport, fixed Close footer, highlight visibility; [tasks](../MILESTONE_01/compact-filter-redesign/tasks.md), [implementation plan](../MILESTONE_01/compact-filter-redesign/implementation-plan.md).
- [Command palette and filter UX](../MILESTONE_01/command-palette-filter-ux/design.md) — ⌘P / ⌘K; behaviour matrix in the **project root** [README.md](../../../README.md).
- [Shortcuts](../MILESTONE_01/shortcuts/design.md) — `shortcut` entry type, `⌘/` quick-lookup overlay, list/detail keymaps; [requirements](../MILESTONE_01/shortcuts/requirements.md), [tasks](../MILESTONE_01/shortcuts/tasks.md), [handoff](../MILESTONE_01/shortcuts/handoff.md), [e2e Phase 7](../MILESTONE_01/e2e/tasks.md#phase-7---shortcuts-feature-p1).
- [End-to-end regression suite](../MILESTONE_01/e2e/design.md) — Playwright BDD + Gherkin smoke/regression; [requirements](../MILESTONE_01/e2e/requirements.md), [tasks](../MILESTONE_01/e2e/tasks.md), [fixture manifest](../MILESTONE_01/e2e/fixture-manifest.md), [step catalog](../MILESTONE_01/e2e/step-catalog.md).
- [CI review e2e](../MILESTONE_01/ci-review-e2e/design.md) — parallel smoke and regression jobs in review.yml; [requirements](../MILESTONE_01/ci-review-e2e/requirements.md), [tasks](../MILESTONE_01/ci-review-e2e/tasks.md), [handoff](../MILESTONE_01/ci-review-e2e/handoff.md).
- [Elysia and Electrobun capability inventory](../MILESTONE_01/elysia-electrobun-capability-inventory/design.md) — decision-neutral upstream capability research for maintainer priority review; [requirements](../MILESTONE_01/elysia-electrobun-capability-inventory/requirements.md), [tasks](../MILESTONE_01/elysia-electrobun-capability-inventory/tasks.md), [report](../MILESTONE_01/elysia-electrobun-capability-inventory/report.md), [inventory](../MILESTONE_01/elysia-electrobun-capability-inventory/inventory.yml).
- [Electrobun corpus audit](../MILESTONE_01/electrobun-corpus-audit/report.md) — full upstream doc coverage, adoption tiers, inventory refresh; [handoff](../MILESTONE_01/electrobun-corpus-audit/handoff.md).
- [Release v0.10.0 scope](../MILESTONE_01/v0.10.0-scope.md) — maintainer sign-off for corpus, inventory priorities, and release bundle.
- [Mise usage policy](../MILESTONE_01/mise-usage/design.md) — executable policy for Mise task shape, embedded Usage specs, package scripts, and automation entrypoints; [requirements](../MILESTONE_01/mise-usage/requirements.md), [tasks](../MILESTONE_01/mise-usage/tasks.md), [handoff](../MILESTONE_01/mise-usage/handoff.md).
- [Mise usage improvements](../MILESTONE_01/mise-usage-improvements/design.md) — final Mise task contract cleanup, nested command surface, package script pruning, CI updates, and command validation matrix; [requirements](../MILESTONE_01/mise-usage-improvements/requirements.md), [tasks](../MILESTONE_01/mise-usage-improvements/tasks.md), [handoff](../MILESTONE_01/mise-usage-improvements/handoff.md).
- [Source sync resilience](../MILESTONE_01/sync/design.md) — import always completes; per-file/entry error isolation; Phase 7 modal error UX (SY-7); [requirements](../MILESTONE_01/sync/requirements.md), [tasks](../MILESTONE_01/sync/tasks.md), [handoff](../MILESTONE_01/sync/handoff.md), [Phase 7 handoff](../MILESTONE_01/sync/handoff-phase-7-modal-errors.md). E2e: `@spec:sync`.
- [Shell chrome unification](../MILESTONE_01/shell-chrome/design.md) — Proposal A: remove list action row, unify overlay modals at 560px; [requirements](../MILESTONE_01/shell-chrome/requirements.md), [tasks](../MILESTONE_01/shell-chrome/tasks.md), [handoff](../MILESTONE_01/shell-chrome/handoff.md). Prototype: [`shell_modals_redesign_prototype.html`](../../wireframe/prototypes/shell_modals_redesign_prototype.html).
- [macOS / Linux platform parity](../MILESTONE_01/platform-parity/design.md) — cross-cutting audit and closure plan for handoff + shell adapters; [requirements](../MILESTONE_01/platform-parity/requirements.md), [tasks](../MILESTONE_01/platform-parity/tasks.md), [handoff](../MILESTONE_01/platform-parity/handoff.md).
- [Electrobun Utils Adoption](../MILESTONE_01/electrobun-utils-adoption/handoff.md) — Phases 1–3: boolean `openExternal`/`openPath` handling, cursor-aware Screen API, event-driven shortcut teardown; [inventory](../elysia-electrobun-capability-inventory/inventory.yml).
- [Code review graph migration](../MILESTONE_01/graph/design.md) — legacy graph removal and local CRG MCP setup for common KB agents; [requirements](../MILESTONE_01/graph/requirements.md), [tasks](../MILESTONE_01/graph/tasks.md), [implementation plan](../MILESTONE_01/graph/implementation-plan.md), [handoff](../MILESTONE_01/graph/handoff.md).

Also documented in [`CLAUDE.md`](../../../CLAUDE.md) (reference docs) and [`.agents/skills/app-context/SKILL.md`](../../../.agents/skills/app-context/SKILL.md).
