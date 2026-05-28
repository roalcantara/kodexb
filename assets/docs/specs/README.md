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

- [`foundation/design.md`](foundation/design.md)
- [`foundation/requirements.md`](foundation/requirements.md)
- [`foundation/roadmap.md`](foundation/roadmap.md)

## Do not use `docs/superpowers/`

Some external skills default to `docs/superpowers/specs/` for brainstorm output. **app does not commit there.** That path is listed in **`.gitignore`** so accidental files never enter the repo.

When an AI skill or template says to write under `docs/superpowers/`, use the `spec-driven-development` skill shape and **redirect** to `assets/docs/specs/<slug>/` instead (create the slug folder if needed). Use `requirements.md`, `design.md`, `tasks.md`, and optional `handoff.md`.

## E2e acceptance criteria (all features)

Every **release-facing feature** and **user-visible refactor** MUST include e2e
acceptance criteria before beta:

1. **`requirements.md`** — at least one requirement (or AC block) tracing to
   Gherkin under `assets/features/e2e/` with `@spec:<slug>` tags.
2. **`tasks.md`** — an e2e task or cross-link to [`e2e/tasks.md`](e2e/tasks.md).
3. **[`e2e/fixture-manifest.md`](e2e/fixture-manifest.md)** — seed data contract
   when the feature needs deterministic rows.
4. **[`e2e/step-catalog.md`](e2e/step-catalog.md)** — normative Gherkin phrases
   before step implementations merge.

Normative policy: [`e2e/requirements.md` R11](e2e/requirements.md#r11---cross-feature-e2e-acceptance).
Scenarios MAY ship with `@todo` until automation lands; release gates require
green runs without `@todo` on P0/P1 scenarios.

## Feature specs (index)

- [Entry Action Panel](entry-action-panel/design.md) — unified entry actions, Return / ⌘Return in list/split/detail, frecency via executor; [requirements](entry-action-panel/requirements.md), [tasks](entry-action-panel/tasks.md), [implementation plan](entry-action-panel/implementation-plan.md).
- [List frecency sort](list-frecency-sort/design.md) — Raycast-style entry ranking for list/split; visits on detail open + copy; [requirements](list-frecency-sort/requirements.md), [tasks](list-frecency-sort/tasks.md), [implementation plan](list-frecency-sort/implementation-plan.md).
- [Compact filter overlay rebuild](compact-filter-redesign/design.md) — single scrollport, fixed Close footer, highlight visibility; [tasks](compact-filter-redesign/tasks.md), [implementation plan](compact-filter-redesign/implementation-plan.md).
- [Command palette and filter UX](command-palette-filter-ux/design.md) — ⌘P / ⌘K; behaviour matrix in the **project root** [README.md](../../../README.md).
- [Shortcuts](shortcuts/design.md) — `shortcut` entry type, `⌘/` quick-lookup overlay, list/detail keymaps; [requirements](shortcuts/requirements.md), [tasks](shortcuts/tasks.md), [handoff](shortcuts/handoff.md), [e2e Phase 7](e2e/tasks.md#phase-7---shortcuts-feature-p1).
- [End-to-end regression suite](e2e/design.md) — Playwright BDD + Gherkin smoke/regression; [requirements](e2e/requirements.md), [tasks](e2e/tasks.md), [fixture manifest](e2e/fixture-manifest.md), [step catalog](e2e/step-catalog.md).
- [Elysia and Electrobun capability inventory](elysia-electrobun-capability-inventory/design.md) — decision-neutral upstream capability research for maintainer priority review; [requirements](elysia-electrobun-capability-inventory/requirements.md), [tasks](elysia-electrobun-capability-inventory/tasks.md), [report](elysia-electrobun-capability-inventory/report.md), [inventory](elysia-electrobun-capability-inventory/inventory.yml).
- [Mise usage policy](mise-usage/design.md) — executable policy for Mise task shape, embedded Usage specs, package scripts, and automation entrypoints; [requirements](mise-usage/requirements.md), [tasks](mise-usage/tasks.md), [handoff](mise-usage/handoff.md).
- [Mise usage improvements](mise-usage-improvements/design.md) — final Mise task contract cleanup, nested command surface, package script pruning, CI updates, and command validation matrix; [requirements](mise-usage-improvements/requirements.md), [tasks](mise-usage-improvements/tasks.md), [handoff](mise-usage-improvements/handoff.md).

Also documented in [`CLAUDE.md`](../../../CLAUDE.md) (reference docs) and [`.agents/skills/app-context/SKILL.md`](../../../.agents/skills/app-context/SKILL.md).
