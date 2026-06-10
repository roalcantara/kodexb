<!-- markdownlint-disable-file -->

# Review 002 — tool-agnostic workflow engine

In-flight review artifacts for a **second architectural pass** on
`009-agentic-workflow-orchestrator`. Builds on
[`review/001`](../001/README.md) (guides-first rework). **Normative truth**
remains in [`assets/guides/`](../../../guides/) and
[`assets/catalog/`](../../../catalog/) per
[`DOC_AUTHORITY.md`](../../../guides/DOC_AUTHORITY.md).

| File                                                                 | Audience             | Purpose                                                           |
| -------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------- |
| [`tool-agnostic-engine-review.md`](./tool-agnostic-engine-review.md) | Operator / architect | Vision: engine vs adapter vs profile vs CLI; monorepo reuse       |
| [`spec-rework.handoff.md`](./spec-rework.handoff.md)                 | Implementer agents   | Checklist + agent prompt to align spec, plan, contracts, research |

**Related:** [`../spec.md`](../spec.md), [`../plan.md`](../plan.md),
[`../contracts/`](../contracts/)

## Why this pass exists

Review 001 anchored the feature on **guides as authority** and **reuse of
shipped workflow code**. Review 002 adds a hidden product goal: a **workflow
engine reusable outside kb** (future monorepo, other stacks — e.g. an Angular
app using `pnpm`/`nx` instead of Bun/mise/hk). That requires **separating**
the orchestration kernel from kb toolchain conventions.

## Changelog — rework 002 (applied 2026-06-09)

Applied via `/speckit-clarify` (two operator forks resolved: sandbox optional;
`DEFAULT_COMMAND_ALLOWLIST` removed, values to catalog + fixtures). Files touched:

- **`spec.md`** — retitled "Convention" → "Kb profile authoring convention (L3 — not engine API)"; added **Tool-agnostic engine boundary** subsection (L1–L4 table + invariants) under Implementation home; Glossary added Executor / execution_policy / Engine (L1) / Runtime adapter (L2); **AWO-9 AC2** now uses the active profile's `execution_policy.allowed_prefixes` (no engine default), AC3 made tool-agnostic, scope note (algorithm pure / values never in engine); **AWO-10 AC1** validates `execution_policy`; **AWO-12 AC3** rescoped to optional profile lint; **AWO-11 AC1** sandbox now optional; Out-of-scope + Assumptions + OQ-9 added; 4 Clarifications bullets (Session 2026-06-09) incl. reconciling 2 stale 2026-06-08 bullets.
- **`contracts/profile.schema.ts`** — removed `DEFAULT_COMMAND_ALLOWLIST`; added required `ExecutionPolicy` (`allowed_prefixes` minItems 1); `sandbox` now optional; `command_allowlist` field → `execution_policy`.
- **`contracts/README.md`** — tool-agnostic note (profile-owned prefixes; optional sandbox).
- **`plan.md`** — Architecture layers (L1–L4) table; AWO-9 feature delta; slice table gains Task-families column + Optional SMOKE row; Tasks authoring note (ENGINE/ADAPTER/PROFILE/CLI/CONFORMANCE/SMOKE prefixes); constraints + traceability reworded.
- **`research.md`** — invoker decision → Executor port; no engine toolchain defaults.
- **`data-model.md`** — engine-vs-catalog separation note; sandbox section marked optional.

Original target edits (for reference):

- **Three-layer model** documented in spec + plan: **engine (pure)** →
  **runtime adapter (I/O)** → **profile/catalog (usage)** → **CLI (kb entry)**.
- **AWO-9 reframed:** declared **Executor port** + single invoker adapter — not
  “mise/hk/bun allowlist in core.” Prefix policy moves to profile
  `execution_policy` and/or kb adapter; **no toolchain defaults in pure modules**.
- **Remove engine coupling** to `DEFAULT_COMMAND_ALLOWLIST = ['mise run', …]`
  in promoted schemas; kb `default.yaml` owns kb prefixes.
- **Requirement split** for `tasks.md`: `ENGINE-*`, `PROFILE-*`, `CLI-*`,
  optional `SMOKE-*` — no central “command inventory” in engine tests.
- **Layer B (AWO-12)** scoped to **stage graph order** only; command strings
  are profile authoring, not engine conformance.
- **Monorepo / package extraction** note: tool-agnostic core is a prerequisite
  for optional `packages/workflow-core` promotion.

Verification after agent pass:

```bash
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
rg -n 'DEFAULT_COMMAND_ALLOWLIST|mise run.*hk check.*bun run' \
  assets/specs/009-agentic-workflow-orchestrator/contracts/profile.schema.ts \
  assets/specs/009-agentic-workflow-orchestrator/spec.md
# Expect: kb examples remain in guides/usage sections; pure-engine sections cite Executor, not mise
```

No runtime code in this review pass unless the operator explicitly requests
implementation after spec/plan alignment.
