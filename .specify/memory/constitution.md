<!--
SYNC IMPACT REPORT
==================
Version change: 1.2.0 → 1.4.0
Bump rationale: PATCH (1.3.0) + PATCH (1.3.1) + PATCH. SDD path migration, spec.md/plan.md
  authority, deterministic spec lint/trace gates, Gherkin in assets/features/e2e/,
  git-config auto_commit documented, WORKFLOW_SDD_GUIDE reference. 1.3.1:
  Fix amendment log [12] link to canonical path; terse speckit completion reports.
   1.3.2: Document mise run spec audit in analyze-dual footnote.
   1.4.0: Add mandatory `mise run spec security` subgate and emit-time
   `spec handoff-scrub` validator binding for Principle IX.
-->

<!-- markdownlint-disable MD013 -->

# kb — Project Constitution

Governing principles for **Spec Kit** commands (`/speckit-*`) and contributors.
kb is a **keyboard-driven knowledge base** desktop launcher ([Electrobun][13]),
focused on speed, utilities, local-first, and trustworthy experience.

This file **binds Spec Kit to kb**. It does not replace [`CLAUDE.md`][14],
[`AGENTS.md`][15], or canonical guides under [`assets/guides/`][0]. On
divergences, precedence is:
**[`assets/guides/`][0] > [`CLAUDE.md`][14] > this file > Spec Kit templates**
(see [Governance](#governance)).

---

## Specification-Driven Development

kb practices **SDD**: specifications drive implementation; code expresses them
in Bun, Electrobun, and TypeBox. Inspired by [GitHub Spec Kit — spec-driven.md][16].

| Idea                       | kb practice                                                                                                                                                                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Specs as lingua franca** | Normative `spec.md`, `plan.md`, `tasks.md`, `handoff.md` in the active feature directory from `.specify/feature.json`; backlog/routing policy in [`DOC_AUTHORITY.md`](../../assets/guides/DOC_AUTHORITY.md) and [`WORKFLOW_SDD_GUIDE.md`](../../assets/guides/WORKFLOW_SDD_GUIDE.md). |
| **Executable specs**       | EARS in `spec.md` with **Measure** + **Evidence**; Gherkin in `assets/features/e2e/` when declared.                                                                                                                                                                                   |
| **Continuous refinement**  | `/speckit-clarify`, `/speckit-checklist`, `/speckit-analyze` — not one-shot doc dumps.                                                                                                                                                                                                |
| **Intent-driven change**   | Pivots update requirements/design first; implementation and tests follow.                                                                                                                                                                                                             |
| **Operational feedback**   | Incidents and review findings become new requirements or backlog rows — not silent code-only fixes.                                                                                                                                                                                   |

Spec Kit artifacts (`spec.md`, `checklists/`) **supplement** kb specs; they MUST
NOT contradict normative files (see [Spec artifacts](#spec-artifacts)).

---

## Core Principles

### I. Product Identity (Keyboard-Driven, Local-First)

kb is a launcher, not a form app. Every feature MUST honor this identity.

1. **Keyboard-first** — Every user-facing action MUST be reachable and
   operable from the keyboard without a mouse. Pointer support is additive,
   never required to complete a flow.
2. **Speed is paramount** — Interactive surfaces (list filter, command
   palette, entry navigation) MUST stay perceptibly instant. See
   [Performance budgets](#performance-budgets); regressions are defects, not polish.
3. **Local-first & offline** — Core flows MUST work without network access.
   User content lives on disk (YAML sources); no feature may require a remote
   service to read, filter, or open existing entries.
4. **Focused utilities** — Prefer small, composable commands over monolithic
   screens. New behavior SHOULD extend the command/action surface rather than
   overload an existing screen.

*Rationale: risks are latency and trust, not scope.*

### II. Functional Core, Imperative Shell (NON-NEGOTIABLE)

Per [`FCIS.guide.md`][1]:

1. **Pure core** — `src/core/` and `src/shared/` MUST contain pure functions
   only: no `async/await`, `fetch`, `fs.*`, `console.*`, `process.env`,
   `new Date()`, or DB calls. Time and randomness arrive as parameters.
2. **Imperative shell** — All I/O lives in `src/shell/`. Shell handlers follow
   **parse → fetch → call core → act → output**; business decisions belong in
   step 3 (core), never step 4.
3. **Result over throw** — Expected failures MUST be returned as `Result<T, E>`
   values; exceptions are reserved for truly unexpected crashes.
4. **Forbidden imports** (machine-enforced by dependency-cruiser + ast-grep):
   - `renderer/` → `shell/app/` — use Eden Treaty (`@rpc/client`) only.
   - `core/` or `shared/` → `shell/`.
   - `*.routes.ts` → `*.repository.ts` — must go through `App` / AppService.

### III. Source-of-Truth Honesty (NON-NEGOTIABLE)

1. **YAML is the source of truth** for catalog content; SQLite is a rebuildable
   **projection**.
2. A mutation MUST NOT report success when the durable source write (YAML) fails.
   RPC responses MUST reflect persistence outcome.
3. Sync/rebuild operations MUST preserve **learned local state** (e.g. frecency)
   not represented in YAML, or migrate it explicitly.

### IV. Type-Safe Contracts (TypeBox-only)

1. **TypeBox for all validation** — transport (Elysia `t.*`), core/config
   (`Type.Object` + `Value.Check`). **Zod is not a dependency.**
2. **RPC** — Elysia + Eden Treaty; every new route mirrored in
   `tools/preview/server.ts`.
3. **Database** — `bun:sqlite` with typed prepared statements; no Drizzle stack.
4. **Single source of types** — prefer `Static<typeof schema>`; avoid shape drift
   across core, shared, and RPC.

### V. Test-First & Evidence (NON-NEGOTIABLE)

Per [`TESTING_GUIDE.md`][3] and [`DoD.md`][4]:

1. **Co-located specs** — every file under `src/` MUST have a co-located
   `.spec.ts(x)` (kb overrides upstream “tests optional”).
2. **No mocking** — dependency injection + real implementations; DB tests use
   `:memory:` only.
3. **Coverage** — aim **≥ 80%**; table-driven tests for multi-case logic.
4. **Factories** — Fishery `factoryFor`; YAML fixtures only for import e2e.
5. **Measure / Evidence** — release-gating ACs MUST name **Measure** and
   **Evidence** (`bun test <path>` or e2e tag). Checks only in `tasks.md` without
   a requirement id are **spec debt**.

*Rationale: evidence-bound ACs let maintainers verify without re-reading code.*

### VI. Conventions (Naming, Structure & Simplicity)

Per [`CODESTYLE_GUIDE.md`][5]:

1. **One artifact per file**; suffix declares role; Biome + ls-lint enforce naming.
2. **No magic numbers/strings** — named constants, single source of truth.
3. **DRY / SOLID** — extend via modules/registries, not growing switch statements.
4. **Minimal change** — only what the active spec/backlog row requires.

### VII. Renderer & Design System

Per [`STYLING_GUIDE.md`][6] and [`DESIGN.md`][7]:

1. **`DESIGN.md`** is the source of truth for palette, spacing, and shadows;
   **`theme.css` `@theme`** implements Andromeda Void from it. JSX uses only
   `cmp-*` and `.semantic-*` — not ad-hoc utility strings.
2. **Token hygiene (machine-checked)** — `styles/components/*.css` MUST NOT
   contain `#…`, `rgb(…)`, or `rgba(…)`; use `var(--color-*)` / `var(--shadow-*)`.
3. **Renderer isolation** — Eden Treaty only; no `shell/app` from renderer.
4. **Accessible keyboard UX** — focus states and handlers per Principle I.

### VIII. Observability

Per [`LOGGING_GUIDE.md`][8]:

1. `getLogger(['kb', '<area>', …])` from `@shared/logging`; **`console.*`
   forbidden in `src/`.**
2. Configure at main/renderer entry; `repositoryStmts`, `withContext` per guide.

### IX. Electrobun (Security & Distribution)

Per [`ELECTROBUN.md`][9]:

1. Main window: trusted packaged content (`views://…`). External webviews:
   `sandbox: true`, partition isolation, navigation allowlists.
2. Config/main/RPC/build work: read `.cursor/electrobun-skill-routing.md` and
   routed skills — do not invent APIs from memory.
3. Security enforcement is executable, not review-only: `mise run spec security`
   (including `electrobun_surface.script`) is REQUIRED in deterministic gate flow,
   and `spec handoff-scrub` is REQUIRED before handoff emit/write/dispatch.

---

## Technology Stack

| Layer          | Technology                   | Purpose                                             |
| -------------- | ---------------------------- | --------------------------------------------------- |
| Runtime        | Bun                          | test, run, bundle; orchestrate via `mise run`       |
| Desktop        | Electrobun                   | macOS + Linux shell; React 19 renderer              |
| RPC            | Elysia + Eden Treaty         | type-safe main ↔ renderer                           |
| Validation     | TypeBox                      | all transport, core, config schemas                 |
| Database       | `bun:sqlite`                 | typed prepared statements; YAML → projection        |
| Tests          | `bun:test` + Fishery         | co-located specs; `:memory:` SQLite                 |
| Styling        | Tailwind v4 + Andromeda Void | `theme.css` + `cmp-*` / `.semantic-*`               |
| **Disallowed** | Zod, Drizzle*, Jest, Vitest  | *ORM, kit, typebox, seed; `docs/superpowers/` paths |

### Performance budgets

| Interaction                              | Target                                                |
| ---------------------------------------- | ----------------------------------------------------- |
| List filter / search keystroke → results | Perceptibly instant; tag facets O(1) SQL, not O(tags) |
| Command palette open                     | No perceptible stall                                  |
| Entry open / navigation                  | No blocking I/O on keyboard path                      |

Numeric budgets in a feature spec override this table via that spec’s
Measure/Evidence.

---

## SDD Pipeline

kb uses **Spec Kit** commands aligned to [spec-driven.md][16] — not a separate
`spw.*` toolchain. Custom workflows live in `.specify/workflows/` when added.

| Step | Command / artifact                                                   | Purpose                                              |
| ---- | -------------------------------------------------------------------- | ---------------------------------------------------- |
| 0    | **Constitution** — this file; `/speckit-constitution` to amend       | Governance + gates                                   |
| 1    | **Specify** — `/speckit-specify` → `spec.md`                         | EARS behavior + ACs                                  |
| 2    | **Clarify** — `/speckit-clarify`                                     | Resolve open questions in `spec.md`                  |
| 3    | **Checklist** — `/speckit-checklist`                                 | Requirements-quality pass (advisory)                 |
| 4    | **Plan** — `/speckit-plan` → `plan.md`                               | Design + E2e traceability (Gherkin in `.feature`)    |
| 5    | **Tasks** — `/speckit-tasks` → `tasks.md`, `handoff.md`              | Ordered work + Done when + Evidence                  |
| 6    | **Analyze** — `/speckit-analyze`[^analyze-dual]                      | Constitution + cross-artifact consistency (advisory) |
| 7    | **Implement** — `/speckit-implement` + `handoff.md`                  | Code + tests                                         |
| 8    | **Review** — `mise run spec gate` + handoff AC table + [`DoD.md`][4] | lint + trace + `gate.sh`                             |

**Feature path:** `.specify/feature.json` → `feature_directory` (authoritative
path rules in [`DOC_AUTHORITY.md`](../../assets/guides/DOC_AUTHORITY.md)).

[^analyze-dual]: The `orchestrated-handoff` workflow runs `speckit.analyze`
    **twice** — once after `plan.md` (plan-pass; catches plan/traceability
    gaps) and once after `tasks.md` + `handoff.md` (tasks-pass; catches
    task/handoff/Evidence drift). Both passes remain advisory. `mise run spec audit`
    enforces quartet/handoff/tasks readiness deterministically between tasks and
    analyze. Phase order and completion markers (`checklists/analyze-plan.md`,
    `checklists/analyze-tasks.md`) are documented in
    [`assets/guides/WORKFLOW_SDD_GUIDE.md` § orchestrated-handoff workflow](../../assets/guides/WORKFLOW_SDD_GUIDE.md#orchestrated-handoff-workflow).

### Workflow rules

1. **No production `src/` without a spec** — normative `spec.md` + `plan.md` for
   the feature, unless [Prototype gate](#prototype-gate) applies.
2. **Brownfield default** — legacy M02 under `assets/docs/specs/MILESTONE_02/` is
   parity reference only; use `mise run spec import-legacy` to diff EARS ids.
3. **Constitution check** — `/speckit-analyze` SHOULD flag conflicts as **CRITICAL**;
   **`mise run spec lint --strict`** enforces EARS shape deterministically.
4. **Human gates** — prototype approval; operator runs `mise run spec gate` before merge.
5. **Chat agents commit WHEN ASKED**; SDD features use **`## Commit plan`** in
   `tasks.md` and **`mise run spec ready --phase … --commit`** / **`spec ready --commit`**
   for plan-driven atomic commits (gate + HK per chunk — no generic closeout messages).
   Spec Kit `after_implement` in [`git-config.yml`](../extensions/git/git-config.yml)
   does not replace that flow. All other `auto_commit.*` hooks remain **false**.
6. **Creative ambiguity** — load `brainstorming` when intent is unclear; record
   outcomes in specs, not only chat.

### Operating values

Values that guide *how* we apply the pipeline (not separate from Principles
above):

- **Convention over invention** — follow `assets/guides/` and existing patterns.
- **Evidence over assertion** — tests and `gate.sh`, not “looks good.”
- **Simplicity over cleverness** — minimal diff; YAGNI unless the spec demands it.
- **Integration over isolation** — real SQLite-in-memory and AppService paths, not mocks.
- **Automation over manual repeat** — `gate.sh`, mise tasks, CI (`review.yml`).

---

## Spec artifacts

| Artifact                 | Authority                                                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `spec.md`                | **Normative** — EARS ids, Measure, Evidence; E2e pointer table                                                                          |
| `plan.md`                | **Normative** — design + E2e traceability (no Gherkin body)                                                                             |
| `tasks.md`               | **Normative** — ordered tasks, **Commit plan**, Done when + Evidence per task                                                           |
| `handoff.md`             | **Normative** — implementer prompt + maintainer AC checklist                                                                            |
| `assets/features/e2e/*`  | **Normative Gherkin** when e2e declared                                                                                                 |
| `checklists/`            | Spec quality checks; **not** a substitute for tests                                                                                     |
| Spec backlog index       | See [`DOC_AUTHORITY.md`](../../assets/guides/DOC_AUTHORITY.md) and [`WORKFLOW_SDD_GUIDE.md`](../../assets/guides/WORKFLOW_SDD_GUIDE.md) |
| Legacy `requirements.md` | Reference only under `assets/docs/specs/MILESTONE_*`                                                                                    |

---

## Quality Gates

Gates for `/speckit-implement` and merge. Detail lives in Principles and
[`DoD.md`][4]; this section is the **checklist summary**.

### Testing

| Gate                       | Status                          | Rule                                             |
| -------------------------- | ------------------------------- | ------------------------------------------------ |
| Unit / co-located specs    | **REQUIRED**                    | Every `src/` file has `.spec.ts(x)`; Principle V |
| Coverage                   | **REQUIRED**                    | ≥ 80% target; edge + error paths                 |
| Integration (shell/DB/RPC) | **REQUIRED** when touched       | `:memory:` SQLite; no AppService mocks           |
| Contract (RPC)             | **REQUIRED** when routes change | TypeBox + preview server mirror                  |
| TDD                        | **ENCOURAGED**                  | Red-green-refactor for non-trivial core logic    |
| E2E / Gherkin              | **REQUIRED** when spec declares | Per `assets/docs/specs/e2e/` policy              |

### Review

| Gate                  | Status                                         | Rule                                                |
| --------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Spec compliance       | **REQUIRED**                                   | All AC Measure/Evidence pass; handoff table updated |
| Constitution          | **REQUIRED**                                   | `/speckit-analyze` clean or justified violations    |
| Secrets (Gitleaks)    | **REQUIRED**                                   | `hk check --profile commit` (Gitleaks builtin)      |
| Security subgate      | **REQUIRED**                                   | `mise run spec security --strict` passes            |
| Performance           | **REQUIRED** when UX hot path touched          | [Performance budgets](#performance-budgets)         |
| Security (Electrobun) | **REQUIRED** when webviews/RPC surface changes | Principle IX                                        |

### Deployment / merge

| Gate                | Status         | Rule                                                                                                               |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------ |
| Quality gate script | **REQUIRED**   | `mise run spec gate` or `bash .agents/skills/app-quality-gate/scripts/gate.sh` → exit 0                            |
| CI review           | **REQUIRED**   | [`CI_GUIDE.md`][11] — `review.yml` green                                                                           |
| Lint stack          | **REQUIRED**   | No weakening Biome, knip, dep-cruiser, ast-grep, ls-lint, jscpd, `tsc`, CSS token lint without maintainer approval |
| Commits             | **WHEN ASKED** | Conventional Commits; HK message policy ≠ gate substitute                                                          |

### Prototype gate

No production `src/` feature work from a prototype until explicit approval
(e.g. `PROTOTYPE APPROVED: implement`). See [`AGENTS.md`][15].

---

## Governance

| Rule           | Detail                                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| **Precedence** | `assets/guides/*` > `CLAUDE.md` > this constitution > Spec Kit templates                             |
| **Amendments** | Branch + dated row in [`spec-kit-constitution-log.md`][12]                                           |
| **Versioning** | SemVer: MAJOR = principle removal/redefinition; MINOR = new section/guidance; PATCH = clarifications |
| **Compliance** | Analyze = CRITICAL on conflict; `gate.sh` = executable enforcement                                   |
| **Authority**  | Guides own engineering detail; this file owns Spec Kit + SDD workflow                                |

**Version**: 1.4.0 | **Ratified**: 2026-06-07 | **Last Amended**: 2026-06-07

[0]: ../../assets/guides/ 'Canonical guides'
[1]: ../../assets/guides/FCIS.guide.md 'FCIS Guide'
[3]: ../../assets/guides/TESTING_GUIDE.md 'Testing Guide'
[4]: ../../assets/guides/DoD.md 'Definition of Done'
[5]: ../../assets/guides/CODESTYLE_GUIDE.md 'CODESTYLE Guide'
[6]: ../../assets/guides/STYLING_GUIDE.md 'Styling Guide'
[7]: ../../DESIGN.md 'Design System'
[8]: ../../assets/guides/LOGGING_GUIDE.md 'Logging Guide'
[9]: ../../assets/guides/ELECTROBUN.md 'Electrobun Guide'
[11]: ../../assets/guides/CI_GUIDE.md 'CI Guide'
[12]: ../../assets/docs/specs/spec-kit-constitution-log.md 'Spec Kit constitution log'
[13]: https://github.com/blackboardsh/electrobun 'Electrobun'
[14]: ../../CLAUDE.md
[15]: ../../AGENTS.md
[16]: https://github.com/github/spec-kit/blob/main/spec-driven.md 'GitHub SDD'
