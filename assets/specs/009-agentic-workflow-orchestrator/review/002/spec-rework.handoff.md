<!-- markdownlint-disable-file -->

# Handoff — Spec rework 002 (tool-agnostic engine)

**Target:** Implementer agent
**Feature:** `assets/specs/009-agentic-workflow-orchestrator/`
**Read first:** [`tool-agnostic-engine-review.md`](./tool-agnostic-engine-review.md)
**Prior pass:** [`review/001/spec-rework.handoff.md`](../001/spec-rework.handoff.md)

## Agent prompt

```text
# Handoff — 009 spec rework 002 (tool-agnostic workflow engine)

## Mission

Align spec.md, plan.md, data-model.md, contracts/* spikes, and research.md with
the tool-agnostic engine vision in:

  assets/specs/009-agentic-workflow-orchestrator/review/002/tool-agnostic-engine-review.md

Do NOT implement runtime code in this pass unless the operator asks.
Do NOT create packages/workflow-* directories.
Update review/002/README.md changelog section when done (mark applied + list files touched).

## Non-negotiable architectural decisions

1. **Four layers:** Engine (L1 pure) → Runtime adapter (L2 I/O) → Profile/catalog
   (L3 usage) → CLI (L4 kb entry). Engine MUST NOT import or default to mise, hk,
   bun, gh, or speckit.

2. **Executor port:** AWO-9 is "declared execution + single invoker adapter," not
   "mise/hk/bun allowlist in core." Prefix policy lives in profile
   execution_policy.allowed_prefixes, enforced by adapter (or pure validator with
   NO default prefix constants).

3. **No command inventory in engine:** Engine tests use fixture profiles + stub
   commands (bun run fixtures/… or fake task names). Full SDD mise/hk bindings
   belong in kb default.yaml authoring (PROFILE-*) and optional SMOKE-* — not
   ENGINE-* unit tests.

4. **Kb convention preserved in guides:** "mise = verbs / hk = events /
   orchestrator = decisions" stays in MISE_GUIDE + WORKFLOW_RUNTIME_GUIDE as profile
   authoring guidance — not in engine API or DEFAULT_* constants.

5. **Layer B (AWO-12):** Conformance test asserts stage **graph order** vs
   WORKFLOW_SDD_GUIDE / detectPhase() — NOT that every command: string exists
   or passes in CI.

6. **detectPhase()** remains kb-specific composition (tools/governance/specs/workflow/),
   not a reusable engine export.

## Required spec.md edits

### A. New subsection under "Implementation home & package boundary"

Add **Tool-agnostic engine boundary** (or fold into existing section):

- Pure engine modules MUST NOT contain toolchain identifiers (mise, hk, bun, gh,
  speckit) in constants, defaults, or type names.
- Runnable profiles MUST declare execution_policy.allowed_prefixes (min 1 entry).
- Kb ships those prefixes only in assets/catalog/workflows/default.yaml.
- Future monorepo apps supply their own profiles (e.g. pnpm run, nx).

### B. Revise "Convention: mise = verbs, hk = events, orchestrator = decisions"

Retitle or qualify: **Kb profile authoring convention (L3 — not engine API)**.
Clarify schema uses unified command: only; toolchain split is documentation +
catalog data.

### C. Glossary additions / edits

| Term             | Definition                                                                   |
| ---------------- | ---------------------------------------------------------------------------- |
| Executor         | Port invoked by engine: run(opaque command descriptor) → exit code + streams |
| execution_policy | Profile field: allowed_prefixes[] (+ optional future knobs)                  |
| command binding  | Profile command: string on stage/trigger/evidence                            |
| Engine           | L1 — graph, guards, envelopes; no spawn                                      |
| Runtime adapter  | L2 — subprocess, policy enforcement, telemetry emit                          |

Remove or reword glossary rows that imply engine defaults to mise/hk/bun.

### D. AWO-9 acceptance criteria

- AC1: unchanged intent (profile command: only; single adapter).
- AC2: REPLACE "default [`mise run`, `hk check`, `bun run`]" with:
  "matches the loaded profile's execution_policy.allowed_prefixes; rejection at
  profile load with diagnostics." Note: kb default profile supplies kb prefixes.
- AC3: keep exec-time BLOCKED / COMMAND_TARGET_MISSING (tool-agnostic).
- AC4: keep telemetry (tool-agnostic).
- Add AC scope note: prefix **algorithm** may be pure; prefix **values** are never
  hardcoded in engine modules.

### E. AWO-10 / AWO-12

- AWO-10: profile load includes execution_policy validation.
- AWO-12 AC1: unchanged (stage graph superset of SDD order).
- AWO-12 AC3: reword to optional **profile lint** when default profile references
  SECURITY_GUIDE commands — not engine responsibility to maintain inventory.
- Add note: AC3 evidence = profile_guide_crossref test or manual checklist, not
  orchestrator.script.ts logic.

### F. Out of scope / Assumptions

- Update assumption that hk profile names are "stable enough to reference from
  workflow profiles" → clarify: **kb profiles** reference them; engine agnostic.
- Out of scope: add "Engine embedding kb toolchain defaults or command catalogs."

### G. Open questions (optional table row)

| # | Question | Resolution |
| OQ-9 | Should prefix allowlist defaults live in engine or catalog? | Catalog + adapter only; engine has no toolchain defaults |

## Required plan.md edits

1. Add **Architecture layers** table (L1–L4) mirroring review doc.
2. Under Implementation home, split artifacts:
   - L1: machine.ts, schemas (pure), guards
   - L2: command_invoker.script.ts (Executor impl), orchestrator.script.ts
   - L3: profile_loader, assets/catalog/workflows/*
   - L4: spec.script.ts / mise.toml (kb)
3. Update Feature deltas row for AWO-9: "Executor port + execution_policy in profile"
   not "mise/hk/bun allowlist."
4. Update **Slice → requirements → PR** table with task-family column:
   ENGINE / ADAPTER / PROFILE / CLI / CONFORMANCE / SMOKE (optional).
5. MVP deliverables: promote schemas without DEFAULT_COMMAND_ALLOWLIST; kb
   default.yaml includes execution_policy + minimal stage graph (commands may be
   stubs until PROFILE-SDD pack).
6. Explicitly defer **SMOKE-*** integration (real mise run spec gate in engine
   unit tests) to optional post-MVP or CI nightly.

## Required contracts/ edits

### profile.schema.ts (spike)

- Remove `DEFAULT_COMMAND_ALLOWLIST` export OR move to a kb-only fixture file
  under tools/__tests__/fixtures/workflow/ (NOT promoted to workflow-core).
- Add `ExecutionPolicy` object with required `allowed_prefixes: string[]`.
- Add `execution_policy: ExecutionPolicy` to ProfileSchema (required).
- Keep `command:` as Type.String on stages/triggers/evidence/providers.
- Document: sandbox optional for MVP OR stub-only — align with review §07; update
  spec accordingly.

### README.md (contracts/)

- Note execution_policy is profile-owned; kb defaults live in default.yaml example
  in WORKFLOW_RUNTIME_GUIDE stub (not in schema constants).

## Required research.md edits

- Update "command invoker" decision: Executor port; policy from profile; ast-grep
  bans spawn outside adapter; **no** default mise/hk/bun list in core.

## Required data-model.md edits (if touched)

- Distinguish engine run state from kb catalog paths; no new coupling.

## tasks.md — authoring guidance (if creating in same pass)

Only if operator requests tasks.md now. Otherwise add a **Tasks authoring note**
section to plan.md:

Prefix tasks:
- MVP-ENGINE-*, MVP-ADAPTER-*, MVP-PROFILE-*, MVP-CONFORMANCE-*
- M1-CLI-* for resume / workflow name / spec.script.ts
- Optional PROFILE-SDD-* for full default.yaml command bindings
- Optional SMOKE-* for dogfood — never block MVP engine merge

Each slice ends with:
  bun test --config /dev/null tools/governance/specs/workflow/
  mise run spec lint assets/specs/009-agentic-workflow-orchestrator

Do NOT add a task "maintain central command inventory in engine."

## Explicit OUT OF SCOPE (this handoff)

- Implementing Executor, xstate machine, or invoker
- Creating packages/workflow-*
- Editing hk.pkl or mise.toml (unless operator extends scope)
- Editing production src/
- Committing unless operator asks

## Verification (report exit codes)

mise run spec lint assets/specs/009-agentic-workflow-orchestrator

# Engine sections should not mandate default mise/hk/bun in AWO-9 AC2:
rg -n 'default `\["mise run"' assets/specs/009-agentic-workflow-orchestrator/spec.md || true

# Spike should not export DEFAULT_COMMAND_ALLOWLIST (after edit):
rg -n 'DEFAULT_COMMAND_ALLOWLIST' assets/specs/009-agentic-workflow-orchestrator/contracts/ || true

# Layer model documented:
rg -n 'Executor|execution_policy|tool-agnostic|L1' \
  assets/specs/009-agentic-workflow-orchestrator/spec.md \
  assets/specs/009-agentic-workflow-orchestrator/plan.md

Optional: mise run spec audit assets/specs/009-agentic-workflow-orchestrator

## Definition of done

- [ ] Tool-agnostic boundary section in spec.md
- [ ] AWO-9 AC2 profile-owned execution_policy (no engine toolchain defaults)
- [ ] Plan layer table + task-family column
- [ ] profile.schema.ts spike: ExecutionPolicy, no DEFAULT_COMMAND_ALLOWLIST
- [ ] research.md invoker decision updated
- [ ] review/002/README.md changelog marked applied
- [ ] spec lint passes
- [ ] No runtime code unless operator requested

Do not commit unless operator asks.
```

## Related

- Architecture: [`tool-agnostic-engine-review.md`](./tool-agnostic-engine-review.md)
- Prior rework: [`../001/README.md`](../001/README.md)
- Normative: [`DOC_AUTHORITY.md`](../../../guides/DOC_AUTHORITY.md),
  [`FCIS.guide.md`](../../../guides/FCIS.guide.md),
  [`TOOLS_GUIDE.md`](../../../guides/TOOLS_GUIDE.md)
