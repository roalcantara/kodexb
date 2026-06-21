<!-- markdownlint-disable-file -->

# Tasks — `004-orchestrated-handoff`

Ordered tasks reference requirement IDs from [`spec.md`](./spec.md). No EARS
text copied here per [`WORKFLOW_SDD_GUIDE.md` § Normative quartet](../../guides/WORKFLOW_SDD_GUIDE.md#normative-quartet).

## Phase 1 — Workflow registration

| # | Task                                                                 | Done when                                                                                                          | Refs                |
| - | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------- |
| 1 | Author `.specify/workflows/orchestrated-handoff/workflow.yml`        | Steps cover specify, clarify, checklist, plan, analyze ×2, tasks, implement, with gates between each phase         | OHW-1 AC2           |
| 2 | Register in `.specify/workflow-catalogs.yml`                         | Both `speckit/workflow.yml` and `orchestrated-handoff/workflow.yml` listed                                         | OHW-1 AC3           |

## Phase 2 — Bun handoff generator

| # | Task                                                                                            | Done when                                                                                                                                  | Refs                       |
| - | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 3 | Author `handoff_generate.script.ts` (parser, renderer, file writer)                              | Writes `tmp/handoffs/opencode-{slug}-{focus}.md`; reuses `sliceIdFromAcTag`                                                                 | OHW-2 AC1, AC2             |
| 4 | Operator-smoke detection + `@e2e` block                                                          | Operator-smoke rows produce a Playwright/`bdd/e2e/` block; `@unit` rows never get Playwright                                                | OHW-2 AC3                  |
| 5 | Reject non-opencode workers + bad `--focus`                                                      | CLI exits 2 with usage error                                                                                                                | OHW-2 AC5                  |
| 6 | Opencode dispatch (argv + stdin fallback; missing PATH warns)                                    | `--dispatch` works for small + large bodies; missing opencode → file-only, exit 0                                                          | OHW-4 AC1, AC2, AC3        |
| 7 | Per-AC slice section trim                                                                        | Slice section prints AC id → slice id only; Evidence not duplicated                                                                         | OHW-8 AC4                  |
| 8 | Required-reading line for plan skill routing                                                     | Generated prompt mentions "Plan skill routing" / "at most 4 skills"                                                                          | OHW-7 AC3                  |

## Phase 3 — Bun orchestrator

| #  | Task                                                                                                                  | Done when                                                                                                                            | Refs            |
| -- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| 9  | `detectPhase()` implements the 10-row transition table with `--next`                                                  | Table-driven tests cover each transition                                                                                              | OHW-3 AC1       |
| 10 | Dual analyze passes (`checklists/analyze-plan.md`, `checklists/analyze-tasks.md`) with focus hints                    | `--next` prints hint per pass                                                                                                          | OHW-3 AC2, AC3  |
| 11 | Manifest-gated handoff-generate transition (A1)                                                                       | Unit-only feature skips handoff-generate; `gherkin-bdd-handoff` triggers it                                                            | OHW-3 AC4, AC6  |
| 12 | tasks.md without handoff.md → speckit.tasks (A2)                                                                      | Transition test covers the gap                                                                                                         | OHW-3 AC1       |
| 13 | `checklists/implement-done.md` operator marker (A3)                                                                   | scanFeatureDir + spec OHW-3 AC5 align                                                                                                  | OHW-3 AC5       |
| 14 | `--manifest` XML emitter                                                                                              | Well-formed XML; 003 pilot fixture passes                                                                                              | OHW-3 AC6, AC7  |
| 15 | `--lint` flag delegates to `lint.script.ts`                                                                           | Spawn-shape test asserts argv; exit code propagates                                                                                    | OHW-6 AC1       |

## Phase 4 — Mise wiring + docs

| #  | Task                                                                                            | Done when                                                                                                                            | Refs            |
| -- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| 16 | Mise subcommands (`spec workflow`, `spec handoff-generate`) + dispatcher cases                  | `mise run spec workflow …` and `mise run spec handoff-generate …` both work                                                          | OHW-1, OHW-2    |
| 17 | `WORKFLOW_SDD_GUIDE.md` orchestrated-handoff section (phase order, commands, focus, dispatch)   | Section present; no "Deferred" line                                                                                                   | OHW-5 AC1, AC2  |
| 18 | Constitution footnote on Analyze row                                                            | `[^analyze-dual]` footnote present                                                                                                    | OHW-5 AC3       |
| 19 | Guide subsection "Review-spec gate" with deterministic-EARS phrasing                            | Substring `deterministic EARS gate` present                                                                                            | OHW-6 AC2       |
| 20 | Guide subsection "Plan skill routing" with cap rule                                             | Routing table + `Maximum 4 skills` present                                                                                            | OHW-7 AC1       |
| 21 | Guide subsection "Normative quartet" with rule                                                  | Substring `Normative quartet` present; satellites listed as optional                                                                  | OHW-8 AC1       |
| 22 | Plan template marks satellites OPTIONAL                                                         | Template diff replaces `research.md` / `data-model.md` / `quickstart.md` / `contracts/` entries with `OPTIONAL — create only when …` | OHW-8 AC2       |

## Phase 5 — 004 dogfooding

| #  | Task                                                       | Done when                                                                          | Refs       |
| -- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------- |
| 23 | Write slim `plan.md` (this PR)                             | Pointer-only; no EARS text copied; references requirement IDs                       | OHW-8 AC3  |
| 24 | Write `tasks.md` (this file)                               | References OHW IDs; no EARS text                                                    | OHW-8 AC3  |
| 25 | Write `handoff.md` (AC tracker for OHW-1 … OHW-8)          | Acceptance tracker present                                                          | OHW-8 AC3  |
| 26 | Confirm 004 has no `research.md` / `data-model.md` / `contracts/` / `quickstart.md` | Directory listing assertion in CI / manual review              | OHW-8 AC3  |

## Verification

```bash
bun test --config /dev/null tools/governance/specs/workflow/
mise run spec lint assets/specs/004-orchestrated-handoff --strict
mise run spec trace assets/specs/004-orchestrated-handoff --strict
bash .agents/skills/app-quality-gate/scripts/gate.sh

# Pilot 003 acceptance
mise run spec handoff-generate --feature assets/specs/003-sync-frecency-preserve --focus gherkin
mise run spec workflow orchestrated-handoff --feature assets/specs/003-sync-frecency-preserve --manifest
mise run spec workflow orchestrated-handoff --feature assets/specs/003-sync-frecency-preserve --next
```
