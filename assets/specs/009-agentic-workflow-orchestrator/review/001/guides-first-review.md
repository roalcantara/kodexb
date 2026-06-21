<!-- markdownlint-disable-file -->

# Guides-first review — agentic workflow orchestrator

**Date:** 2026-06-08
**Status:** Actionable input for spec rework
**Premise:** Normative truth lives in [`assets/guides/`](../../../../guides/) +
[`assets/catalog/`](../../../../catalog/) + executables (Gherkin,
`tools/**/*.spec.ts`). This spec folder is **in-flight only**. Rework should
**lift durable decisions into guides**, not harden references to 004/005/009
paths.

**Rework goal:** One spec pass → guide updates → catalog entries → tool tests →
then archive/trim the spec.

---

## 00 — Re-anchor the spec (do first)

| Current drift                                                     | Guides-first fix                                                                                                                    |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Contracts under `../contracts/`                                   | Target: `packages/workflow-core/` or `tools/governance/workflow/schemas/` + **OBSERVABILITY / SDD guide** pointers (not spec paths) |
| `WORKFLOW_OBSERVABILITY_GUIDE.md` links to `assets/specs/009-…/contracts/` | Link to **stable code path** after promotion; spec is not authority per [`DOC_AUTHORITY.md`](../../../../guides/DOC_AUTHORITY.md)      |
| Requirements cite legacy spec phase order                         | Cite **[`WORKFLOW_SDD_GUIDE.md`](../../../../guides/WORKFLOW_SDD_GUIDE.md)** § orchestrated-handoff only                               |
| `assets/catalog/workflows/` assumed but not in catalog README     | Extend **[`assets/catalog/README.md`](../../../../catalog/README.md)** + **`WORKFLOW_RUNTIME_GUIDE.md`** (or SDD subsection) for profile ARE   |

**Concrete rework task:** Add a spec section **“Guide promotion checklist”** —
list every normative paragraph that must land in guides before ship, with zero
runtime imports of `assets/specs/009-*`.

---

## 01 — Worker transport: direction that fits this project

**Best fit (per [`WORKFLOW_SDD_GUIDE.md`](../../../../guides/WORKFLOW_SDD_GUIDE.md)):**
**artifact-gated orchestration + declared commands + worker dispatch only at
documented seams** — not “call `speckit.*` programmatically.”

| Layer               | What advances the workflow                                          | Guide anchor                             |
| ------------------- | ------------------------------------------------------------------- | ---------------------------------------- |
| **Progression**     | Fileset + checklist markers (`analyze-plan.md`, `handoff.md`, etc.) | SDD § orchestrated-handoff               |
| **Verification**    | `mise run spec audit`, `spec lint/trace/gate`, hk profiles          | SDD § deterministic gates, SECURITY § hk |
| **Execution seams** | `mise run spec handoff-generate … --dispatch` (v1: opencode only)   | SDD § opencode worker handoff            |
| **Human path**      | Cursor `/speckit-*` skills (parallel, not replaced)                 | Constitution + skills                    |

**Spec rewrite instruction:** Replace assumption “Speckit stages are callable
programmatically” with:

> Stages are **repo-verifiable gates** (artifacts + commands). **Workers** run
> at seams (`implement-src`, `gherkin-bdd-handoff`, `review-fix`) via profile
> `command:` + optional opencode dispatch. **Speckit skills** remain the
> human/agent UI for specify/plan/tasks/analyze when not automated.

**Default worker model for v1:** Same as SDD guide — **opencode + handoff files
+ mise/hk evidence**. Orchestrator schedules *when* to emit/dispatch, not *how*
to run Speckit inside Bun.

---

## 02 — Slices: one spec, many PRs (not many specs)

Per [`DOC_AUTHORITY.md`](../../../../guides/DOC_AUTHORITY.md): **one in-flight spec**
while building; slices are **plan phases + PR sequence**, not new spec folders.

| Slice   | Keep in spec as              | Ship as | Normative home after ship            |
| ------- | ---------------------------- | ------- | ------------------------------------ |
| **MVP** | AWO-2, 4, 9, 10, 12 (subset) | PR 1    | OBSERVABILITY + SDD + WORKFLOW guide |
| **M1**  | + AWO-1, 5, 13               | PR 2    | SDD + SECURITY (shutdown)            |
| **M2**  | + AWO-3, 7                   | PR 3    | WORKFLOW guide (memory)              |
| **M3**  | + AWO-6                      | PR 4    | CI_GUIDE + profile `providers.*`     |
| **M4**  | + AWO-8, 11                  | PR 5+   | METRICS + SECURITY (sandbox)         |

**Instructions:**

1. **`plan.md`** — table: slice → requirements → PR boundary → guide files to update.
2. **`tasks.md`** — prefix tasks `MVP-`, `M1-`, …; each slice ends with `mise run spec gate` + guide patch task.
3. **Defer requirements** — move AWO-6/8/11 to “Post-MVP” in spec with explicit “not in v0.x first PR.”

Do **not** create `009a`, `009b` specs; that fights DOC_AUTHORITY.

---

## 03 — FCIS sustainability: monorepo vs in-repo packages

**Short answer:** Do **not** start with a two-repo monorepo split. Use **Bun
workspaces + [`TOOLS_GUIDE.md`](../../../../guides/TOOLS_GUIDE.md) taxonomy**
first; split packages only when boundaries are stable.

[`TOOLS_GUIDE.md`](../../../../guides/TOOLS_GUIDE.md) already defines:

- **Governance** — enforce (schemas, lint, catalog validate)
- **Orchestration** — sequence steps
- **Metrics** — durable run archives

[`FCIS.guide.md`](../../../../guides/FCIS.guide.md) already allows `packages/*`
with core/shell inside each package.

### Sustainable layout (recommended)

```text
packages/workflow-core/      # pure: xstate machine, guards, TypeBox schemas, profile parse
packages/workflow-runtime/   # shell: actor, command invoker, persistence, worker dispatch
apps/kb/                     # existing src/ — desktop product; does NOT own workflow kernel
assets/guides/               # shared normative layer (stays at repo root)
assets/catalog/workflows/    # ARE — profile YAML only
tools/governance/specs/      # thin CLI: spec workflow … → workflow-runtime
tools/metrics/workflow-runs/ # DONE/DID (per OBSERVABILITY)
```

**FCIS rule:** `workflow-core` has **no** `Bun.spawn`, no filesystem — only
`command_invoker` **interface** types. `workflow-runtime` implements I/O. `kb`
desktop **never** imports runtime unless a future “workflow control panel” lands
in renderer (defer).

### When a true two-project monorepo makes sense

| Signal                                                     | Action                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------- |
| Workflow engine reused by another product/repo             | Extract `packages/workflow-*` to publishable `@kb/workflow`         |
| Desktop build pulls xstate/workflow into Electrobun bundle | Keep workflow **out of `src/shell/renderer`**; CLI-only in `tools/` |
| Team split: “platform workflow” vs “kb app”                | `apps/kb` + `apps/workflow-cli` under same `assets/guides/`         |

**Migration path:**

1. **Now:** Document package boundary in spec/plan; implement under `tools/governance/workflow/` (current habit).
2. **After MVP:** `git mv` → `packages/workflow-core` + `packages/workflow-runtime`; root `package.json` workspaces.
3. **Later:** Optional second app `apps/workflow-cli` if UX grows beyond `mise run spec workflow run`.

Guides stay **one tree at repo root** — both “projects” read the same
`assets/guides/`; no guide fork.

---

## 04 — Contracts location (define vs consume)

Align with catalog/tools split from [`DOC_AUTHORITY.md`](../../../../guides/DOC_AUTHORITY.md) +
[`TOOLS_GUIDE.md`](../../../../guides/TOOLS_GUIDE.md):

| Concern           | Owner (define)        | Owner (consume)                  | Path                                                     |
| ----------------- | --------------------- | -------------------------------- | -------------------------------------------------------- |
| Schema **code**   | workflow-core package | runtime, tests, catalog validate | `packages/workflow-core/*.schema.ts`                     |
| Profile **data**  | catalog ARE           | runtime loader                   | `assets/catalog/workflows/*.yaml`                        |
| Profile **index** | catalog               | `mise run catalog validate`      | `assets/catalog/catalog.yaml` (new `workflows:` section) |
| Run **artifacts** | —                     | metrics + tmp                    | per OBSERVABILITY                                        |
| Spec **fixtures** | ephemeral             | delete on promote                | `../contracts/` → **removed after copy**                 |

**Rule:** `../contracts/` is a **spike only**. Promotion criterion: schemas exist
in `workflow-core` and catalog validate imports them; spec directory holds
**links**, not duplicates.

**Consumer (kb product):** passes `--feature <dir>`, never embeds 009 paths; uses
`catalog_paths.specs_root` ([`DOC_AUTHORITY`](../../../../guides/DOC_AUTHORITY.md)
preferred pattern).

---

## 05 — E2E, catalog tags, and workflows (low coupling)

[`DOC_AUTHORITY.md`](../../../../guides/DOC_AUTHORITY.md) keeps three concepts separate:

| Concept                     | Purpose                     | Coupling                            |
| --------------------------- | --------------------------- | ----------------------------------- |
| **Catalog key** `@<key>`    | Shipped **product** feature | `catalog.yaml` + Gherkin/`test tag` |
| **Workflow profile**        | **Process** stage graph     | `assets/catalog/workflows/`         |
| **AC slice** `@ac:SF-n_ACm` | Handoff/implement **slice** | BDD unit runner                     |

`@agentic_workflow_orchestrator` in the spec e2e table blurs **infrastructure**
with **product** — avoid that.

### Recommended strategy (high cohesion, low coupling)

**Layer A — Workflow runtime (primary for AWO)**

- **Where:** `tools/governance/workflow/**/*.spec.ts` (+ `packages/workflow-*`)
- **Fixtures:** `tools/__tests__/fixtures/workflow/` (feature-dir stubs, not `assets/specs/009`)
- **Tags:** none; run via `bun test --config /dev/null tools/governance/workflow/`
- **Cohesion:** tests sit with orchestrator code; assert envelopes, snapshots, commands

**Layer B — Guide conformance (AWO-12)**

- **Where:** integration test loads `assets/catalog/workflows/default.yaml`
- **Asserts:** stage order matches **WORKFLOW_SDD_GUIDE** phase list
- **No** Gherkin required

**Layer C — Product / release (only when orchestrator drives shipped behavior)**

- **Where:** `assets/features/<domain>.feature`
- **Tag:** `@<catalog_key>` when workflow is part of **shipping a catalog feature**
- **Coupling:** feature file references **operator-visible** outcomes only; not xstate internals

**Spec rework:** Replace e2e table with enforcement layers A/B/C; defer Layer C
until operator CLI is product-facing.

**Handoff AC slices (`@ac:`)** stay on **feature handoff tables**, not on
orchestrator meta-tests — orchestrator tests use **synthetic fixture feature dirs**.

---

## Concrete rework checklist

1. Add **“Authority”** section — guides + catalog + tools only; guide promotion checklist.
2. Replace Speckit-invocation assumption with artifact-gate + command + opencode-seam model (§01).
3. Add **`plan.md` slice table** — MVP→M4 as PRs inside **one** spec (§02).
4. Add **“Package boundary”** section — `workflow-core` / `workflow-runtime` / no renderer import (§03–04).
5. Replace **e2e declaration** with Layer A/B/C table (§05).
6. Add **guide deliverables per slice** (OBSERVABILITY, SDD, WORKFLOW_RUNTIME_GUIDE, CI_GUIDE, SECURITY).
7. **Trim scope:** Move AWO-6, 8, 11 to “Post-MVP.”
8. **Fix nits:** `events.jsonl` → `.ndjson`; define N in `tools/metrics/baselines/workflow.json` task.

---

## One-line verdict

**Keep one spec and slice by PR; orchestrate via guides-native gates
(audit/lint/handoff-generate/opencode), not Speckit APIs; put schemas in
`workflow-core`, profiles in `assets/catalog/workflows/`, tests in
`tools/governance/workflow/`; defer Gherkin/catalog tags for the orchestrator
itself until it becomes operator-facing product behavior.**
