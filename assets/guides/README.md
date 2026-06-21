---
title: Guides index (agent entrypoint)
description: Where agents find normative project rules — no legacy spec folders required
---
<!-- markdownlint-disable-file -->

# Guides index — agent entrypoint

**Normative rules for every agent and every PR live here.** If a guide disagrees with
`CLAUDE.md` or `AGENTS.md`, **the guide wins** — fix the entrypoint file in a follow-up PR.

## Do not use as rule sources

| Location                   | When (if ever)                                                                    |
| -------------------------- | --------------------------------------------------------------------------------- |
| `assets/docs/archive/**`   | Archaeology only — **only** when the human task explicitly names that legacy slug |
| `assets/docs/.bak/**`      | Historical drafts — not authoritative                                             |
| `assets/specs/NNN-<slug>/` | **Only** while implementing that named in-flight feature (Spec Kit quartet)       |
| `docs/superpowers/`        | Does not exist (gitignored) — never create                                        |

Executable truth for shipped behaviour: **Gherkin** (`assets/features/`), **unit specs**
(`src/**/*.spec.ts(x)`), **catalog** (`assets/catalog/catalog.yaml`). Process truth:
**this folder**.

Authority policy: [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md).

---

## Start here (any task)

1. Load **`.agents/skills/app-context/SKILL.md`** — stack, FCIS, RPC, naming.
2. Open the **topic guide** from the table below.
3. Before claiming done: **`.agents/skills/app-quality-gate/SKILL.md`** →
   `bash .agents/skills/app-quality-gate/scripts/gate.sh`.

Optional: [`SKILLS.md`](SKILLS.md) + [`assets/catalog/SKILLS.yaml`](../catalog/SKILLS.yaml) for skill routing.

---

## Product snapshot (no foundation spec required)

**kb** is a desktop knowledge-base app (Electrobun + Bun + React 19). Users browse,
search, and manage personal knowledge entries (bookmarks, commands, cheat-sheets,
tasks, etc.).

| Concept             | Rule                                                                                                                  |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Source of truth** | YAML files on disk (catalog sources)                                                                                  |
| **SQLite**          | Derived, rebuildable index — not authoritative over YAML                                                              |
| **Main process**    | All I/O (DB, config, filesystem, RPC server)                                                                          |
| **Renderer**        | UI only — calls main via **Eden Treaty** (`@rpc/client`), never `shell/app/`                                          |
| **Validation**      | **TypeBox** everywhere; `zod` is not a dependency                                                                     |
| **ORM**             | None — `bun:sqlite` + typed prepared statements                                                                       |
| **Layer imports**   | See [`FCIS.guide.md`](FCIS.guide.md) § Layer import rules — renderer → RPC only; routes → AppService not repositories |

Architecture depth: [`FCIS.guide.md`](FCIS.guide.md), [`ELECTROBUN.md`](ELECTROBUN.md),
[`.agents/skills/app-rpc/SKILL.md`](../../.agents/skills/app-rpc/SKILL.md).

---

## Guide router

| I need to…                                     | Read                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Understand layers / purity / forbidden imports | [`FCIS.guide.md`](FCIS.guide.md)                                                                                               |
| Name files, suffixes, FCIS layout              | [`CODESTYLE_GUIDE.md`](CODESTYLE_GUIDE.md)                                                                                     |
| Add or change Elysia routes / Eden client      | [`ELECTROBUN.md`](ELECTROBUN.md) § RPC + `app-rpc` skill; mirror `tools/dev/preview/server.script.ts`                          |
| Write or run tests                             | [`TESTING_GUIDE.md`](TESTING_GUIDE.md), [`FISHERY_GUIDE.md`](FISHERY_GUIDE.md), [`BDD_GUIDE.md`](BDD_GUIDE.md)                 |
| Style renderer UI                              | [`STYLING_GUIDE.md`](STYLING_GUIDE.md)                                                                                         |
| Logging                                        | [`LOGGING_GUIDE.md`](LOGGING_GUIDE.md)                                                                                         |
| Mise tasks / `mise run` vs `bun run`           | [`MISE_GUIDE.md`](MISE_GUIDE.md)                                                                                               |
| Spec Kit / SDD workflow                        | [`WORKFLOW_SDD_GUIDE.md`](WORKFLOW_SDD_GUIDE.md)                                                                               |
| Workflow profiles / orchestrator YAML          | [`WORKFLOW_RUNTIME_GUIDE.md`](WORKFLOW_RUNTIME_GUIDE.md), [`WORKFLOW_OBSERVABILITY_GUIDE.md`](WORKFLOW_OBSERVABILITY_GUIDE.md) |
| CI / release / nightly smoke                   | [`CI_GUIDE.md`](CI_GUIDE.md)                                                                                                   |
| Security / handoff scrub / spec ready          | [`SECURITY_GUIDE.md`](SECURITY_GUIDE.md)                                                                                       |
| Tools layout (`tools/` taxonomy)               | [`TOOLS_GUIDE.md`](TOOLS_GUIDE.md)                                                                                             |
| Code review graph                              | [`CRG.md`](CRG.md)                                                                                                             |
| Commits / branches                             | [`GIT_COMMITS_GUIDE.md`](GIT_COMMITS_GUIDE.md), [`GIT_GUIDE.md`](GIT_GUIDE.md)                                                 |
| Definition of done                             | [`DoD.md`](DoD.md)                                                                                                             |
| Bun APIs (YAML, SQLite, test)                  | [`BUN_RUNTIME.md`](BUN_RUNTIME.md)                                                                                             |
| E2e step phrases / fixtures                    | [`BDD_GHERKIN_GUIDE.md`](BDD_GHERKIN_GUIDE.md), [`../features/e2e/contracts/`](../features/e2e/contracts/README.md)            |
| Document layers / catalog governance           | [`DOC_AUTHORITY.md`](DOC_AUTHORITY.md)                                                                                         |
| Backlog (non-normative)                        | root [`TODO.md`](../../TODO.md)                                                                                                |

### When to read which workflow guide

| Guide                                                                | Primary question                             | Open when                                                                                          |
| -------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [`WORKFLOW_SDD_GUIDE.md`](WORKFLOW_SDD_GUIDE.md)                     | How do I build/ship a feature with Spec Kit? | `/speckit-*`, quartet, `mise run spec lint\|gate\|conform`, orchestrated-handoff operator commands |
| [`WORKFLOW_RUNTIME_GUIDE.md`](WORKFLOW_RUNTIME_GUIDE.md)             | How does the workflow **runtime** work?      | Profile YAML, `@kb/workflow-core` / `@kb/workflow-runtime`, resume semantics, kit smoke            |
| [`WORKFLOW_OBSERVABILITY_GUIDE.md`](WORKFLOW_OBSERVABILITY_GUIDE.md) | What was recorded during a run?              | NDJSON events, `runs list/show/tail/prune`, retention                                              |

Spec Kit workspace map: [`.specify/README.md`](../../.specify/README.md).

---

## Spec workflow (when the task names a feature)

Use **Spec Kit** on `assets/specs/NNN-<slug>/` (`spec.md`, `plan.md`, `tasks.md`, `handoff.md`).
Commands: [`WORKFLOW_SDD_GUIDE.md`](WORKFLOW_SDD_GUIDE.md), [`MISE_GUIDE.md`](MISE_GUIDE.md) § SDD hub.

For **product fixes without a spec** (bugs, UX, refactors): follow guides + co-located tests;
no quartet required unless the maintainer opened one.

---

## E2e contracts (living docs, not archive)

- [`../features/e2e/contracts/step-catalog.md`](../features/e2e/contracts/step-catalog.md)
- [`../features/e2e/contracts/fixture-manifest.md`](../features/e2e/contracts/fixture-manifest.md)

Referenced from [`TESTING_GUIDE.md`](TESTING_GUIDE.md) — not from `assets/docs/archive/`.
