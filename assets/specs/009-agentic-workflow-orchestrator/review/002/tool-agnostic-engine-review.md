<!-- markdownlint-disable-file -->

# Tool-agnostic workflow engine — architectural review

**Date:** 2026-06-09
**Status:** Actionable input for spec/plan/contracts rework (review 002)
**Builds on:** [`review/001/guides-first-review.md`](../001/guides-first-review.md)

## Premise

The orchestrator should be **reusable** — extractable to
`packages/workflow-core` / `packages/workflow-runtime` and driven by
**different catalogs** in a future monorepo (kb desktop, Angular web app, etc.).
Each app owns **how** stages run (`pnpm run`, `mise run`, `make`); the engine
owns **when** stages run (graph, guards, envelopes, persistence).

Kb’s convention **mise = verbs / hk = events / orchestrator = decisions**
remains valid **for kb profile authoring**. It must **not** be compiled into
engine types, defaults, or unit-test fixtures.

---

## 01 — Layer model (normative for rework)

```text
┌──────────────────────────────────────────────────────────────┐
│ L1 — Workflow engine (reusable, pure where possible)          │
│   Stage graph, xstate machine, guards, envelope validation    │
│   Evidence / artifact gate evaluation (paths, exit codes)     │
│   Calls Executor.run(spec) — opaque command descriptor        │
│   FORBIDDEN: mise, hk, bun, gh, speckit imports or defaults   │
└────────────────────────────┬─────────────────────────────────┘
                             │ Executor interface
┌────────────────────────────▼─────────────────────────────────┐
│ L2 — Runtime adapter (repo-specific shell, kb v1)               │
│   command_invoker / kb_executor: subprocess, cwd, env, timeout│
│   Applies execution_policy from loaded profile (prefix rules) │
│   Bun.spawn ONLY here (+ ast-grep enforcement)                │
└────────────────────────────┬─────────────────────────────────┘
                             │ loads
┌────────────────────────────▼─────────────────────────────────┐
│ L3 — Profile / catalog (ARE — workflow usage)                 │
│   assets/catalog/workflows/*.yaml                             │
│   command: strings, execution_policy.allowed_prefixes         │
│   kb default.yaml: mise run / hk check / bun run examples     │
│   apps/web profile: pnpm run / nx / npm run examples          │
└────────────────────────────┬─────────────────────────────────┘
                             │ invoked by
┌────────────────────────────▼─────────────────────────────────┐
│ L4 — CLI / operator entry (kb-specific today)                 │
│   mise run spec workflow …, spec.script.ts routing            │
│   Not part of workflow-core                                   │
└──────────────────────────────────────────────────────────────┘
```

**Progression authority** (artifact gates, `detectPhase()`, checklist markers)
may live in **L1 guards** fed by **pure** inputs, or in **L2 kb helpers** that
the machine composes — but `detectPhase()` itself is **kb SDD knowledge**, not
a reusable engine invariant. Layer B tests in kb assert profile stage order
against SDD; they do not ship inside `workflow-core`.

---

## 02 — What “command allowlist” means after rework

| Concept                                       | Owner                                          | Engine knows?                                                                                            |
| --------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `command:` string on a stage                  | Profile (L3)                                   | Stores opaque string only                                                                                |
| `execution_policy.allowed_prefixes`           | Profile (L3)                                   | Validated at load **by adapter** or shared pure `validateExecutionPolicy()` with **no default prefixes** |
| Prefix check implementation                   | Adapter (L2)                                   | Engine receives pass/fail diagnostic                                                                     |
| kb defaults `mise run`, `hk check`, `bun run` | kb `default.yaml` only                         | **No**                                                                                                   |
| Exec failure (missing task)                   | Adapter → `BLOCKED` + `COMMAND_TARGET_MISSING` | Engine maps outcome to transition                                                                        |

**Anti-pattern (review 001 / current spikes):**

```typescript
export const DEFAULT_COMMAND_ALLOWLIST = ['mise run', 'hk check', 'bun run']
```

in schema modules intended for `workflow-core`.

**Preferred spike shape:**

```typescript
export const ExecutionPolicy = Type.Object({
  allowed_prefixes: Type.Array(Type.String(), { minItems: 1 }),
  // optional: max_command_length, deny_substrings — profile-defined
})
// ProfileSchema.execution_policy: required for runnable profiles;
// no DEFAULT constant in pure module — kb catalog supplies values.
```

Engine tests use **fixture profiles** with prefixes like `bun run` or
`echo` only to exercise policy plumbing — not to assert kb toolchain.

---

## 03 — AWO-9 rewrite intent (keep ID, change semantics)

**Keep:**

- Every orchestrator-initiated run goes through **one** invoker adapter.
- No inline shell in machine/guards/orchestrator (ast-grep).
- `task.invoked` / `task.completed` telemetry.
- Missing executable → stage `BLOCKED`, `COMMAND_TARGET_MISSING`.

**Change:**

- AC2: prefix allowlist is **profile-supplied** `execution_policy`; engine
  **does not** embed default `["mise run", "hk check", "bun run"]`.
- Wording: “first significant token matches **the active profile’s**
  `execution_policy.allowed_prefixes`” — not “the default allowlist.”
- Scope note: **validation algorithm** may live in pure code; **prefix values**
  are catalog data.

**Convention (mise/hk/bun):** move to **Guide promotion** → MISE_GUIDE +
WORKFLOW_RUNTIME_GUIDE as **kb profile authoring**, not engine API.

---

## 04 — Requirement ownership split (for tasks.md)

Do **not** merge into one “inventory” task. Use prefixes:

| Prefix          | Owns                                | Examples                                        |
| --------------- | ----------------------------------- | ----------------------------------------------- |
| `ENGINE-*`      | L1 pure + machine + envelope        | xstate, guards, snapshot schema                 |
| `ADAPTER-*`     | L2 invoker, spawn ban, policy apply | `command_invoker.script.ts`                     |
| `PROFILE-*`     | L3 catalog YAML, loader, schema     | `default.yaml`, `catalog.yaml` workflows        |
| `CLI-*`         | L4 mise routing                     | `ALLOWED_WORKFLOW_NAMES`, resume naming         |
| `CONFORMANCE-*` | kb Layer B                          | stage **order** vs SDD / `detectPhase()`        |
| `SMOKE-*`       | optional integration                | full mise+hk dogfood; **not** engine unit tests |

**AWO-12 AC3** (SECURITY_GUIDE cross-ref): scope to **optional profile lint**
(`profile_guide_crossref.script.ts`) when `default.yaml` references documented
safety commands — **not** engine core.

---

## 05 — Monorepo scenario (design validation)

Future layout (illustrative — not implemented in 009 MVP):

```text
packages/workflow-core/       # L1 — no spawn, no toolchain strings
packages/workflow-runtime/    # L2 interface + optional reference impl
apps/kb/
  assets/catalog/workflows/default.yaml
  tools/governance/specs/workflow/kb_executor.script.ts
apps/web/
  catalog/workflows/angular-ci.yaml
  tools/workflow/web_executor.script.ts
```

Same engine package; different L3 + L2. CLI (`mise run spec workflow`) stays
under kb; web might use `pnpm workflow` wrapping the same packages.

**Extraction trigger** (from plan): reuse by another repo — tool-agnostic L1
is a **prerequisite**, not a follow-up nice-to-have.

---

## 06 — What stays kb-specific (explicitly out of engine)

| Concern                                  | Home                                           |
| ---------------------------------------- | ---------------------------------------------- |
| SDD phase order / `detectPhase()`        | kb workflow helpers + Layer B test             |
| Speckit / opencode seams                 | Profile `command:` + SDD guide                 |
| HK profile names (`commit`, `pr`, …)     | Profile + SECURITY_GUIDE                       |
| `mise run spec gate`                     | Profile + CLI                                  |
| NDJSON layout under `tmp/workflow-runs/` | kb OBSERVABILITY contract (runtime implements) |
| Renderer must not import engine          | Unchanged                                      |

---

## 07 — Sandbox field vs Post-MVP AWO-11

`StageDefinition.sandbox` in the spike is **coupling** if required for MVP.
Options (pick one in spec/plan, document in handoff):

1. **MVP:** `sandbox` optional; minimal stub when dispatch disabled.
2. **MVP:** required stub object; M4 adds enforcement semantics only.

Engine agnosticism: sandbox **descriptor shape** can stay in schema; **enforcement**
is adapter/M4 — same as execution policy.

---

## 08 — Out of scope for this review pass

- Implementing xstate or invoker code
- Creating `packages/workflow-*` directories (unless operator approves early)
- Changing hk.pkl or mise.toml (except doc references in spec/plan)
- Rewriting 004/005 legacy specs

---

## 09 — Success criteria for rework 002

- [ ] Spec § Implementation home states: **core MUST NOT default to toolchain names**
- [ ] AWO-9 AC2 uses profile `execution_policy`, not baked-in mise/hk/bun
- [ ] Glossary distinguishes **Executor**, **execution policy**, **command binding**
- [ ] Plan slice table lists ENGINE / ADAPTER / PROFILE / CLI task families
- [ ] `contracts/profile.schema.ts` spike: no `DEFAULT_COMMAND_ALLOWLIST` export
- [ ] `research.md` decision on invoker updated for Executor port
- [ ] Guide promotion: kb toolchain convention → WORKFLOW_RUNTIME_GUIDE / MISE_GUIDE, not engine
- [ ] `mise run spec lint` on feature dir passes after edits
