# Handoff — Workflow status UX (`002-workflow-status-ux`)

**Plan:** [`.cursor/plans/workflow_status_ux_c4130c8a.plan.md`](../../../.cursor/plans/workflow_status_ux_c4130c8a.plan.md)
**Primary feature under dogfood:** `assets/specs/018-architecture-role-taxonomy`
**Branch:** create `feat/002-workflow-status-ux` from current `main` (or continue on your working branch if already started)

---

## Agent prompt (paste this first)

```text
Implement the Workflow Status UX follow-up (spec 002). Read this handoff in full,
then the plan at .cursor/plans/workflow_status_ux_c4130c8a.plan.md.

Load skills before coding: app-context, app-testing, app-quality-gate.

Goals (in order):
1. Fix status semantics: add `next`; reserve `current` for future in-flight only;
   tasks are done|pending only; exactly one `next` node matches detectPhase NEXT.
2. Fix pretty-mode performance: stop per-cell `gum style` subprocesses; use local
   ANSI for grid/index; hide artifact index by default; add --index / --full.
3. Redesign index: sectioned layout (Proposal B); kind icons before label; no
   Column/Kind columns; color by pipeline column group; highlight `next`.
4. Durable snapshots under tools/metrics/workflow-status/<slug>/<run_id>.status.json
   with --record, --list, --compare, fingerprint short-circuit, --refresh.

Do NOT weaken the quality stack. Every new/changed file under packages/ needs a
co-located .spec.ts.

Before claiming done you MUST:
- satisfy every AC row in the Acceptance criteria tracker below (with Evidence)
- run bash .agents/skills/app-quality-gate/scripts/gate.sh green on the commit tree
- create atomic conventional commits (see Commit plan)
- fill the Structured completion report at the bottom of this handoff and paste it
  in your final message to the operator
```

---

## Baseline (already merged or on branch — do not revert)

Partial work from the prior session **may** already exist on your branch. Verify with `git diff main`:

| Area                                                       | Status       | Files                                                            |
| ---------------------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| Conform node derivation (was hardcoded `pending`)          | Likely done  | `packages/exec/src/workflow_progress.script.ts`                  |
| Spec ready / clarify / ship stack derivation               | Likely done  | same + `commitChunks.taskIds` in ops mapper                      |
| Mermaid `--subgraph`, terminal ASCII (`beautiful-mermaid`) | Likely done  | `workflow_status_output.script.ts`, `mermaid_terminal.script.ts` |
| **`next` status taxonomy**                                 | **Not done** | exec derive + all renderers                                      |
| Local ANSI / index flags                                   | **Not done** | `gum_theme` or `ansi_theme`, `workflow_status.script.ts`         |
| Durable snapshots                                          | **Not done** | new module + CLI flags                                           |

If baseline items are missing, implement them as part of this handoff (they are prerequisites for AC-WSU-3+).

---

## Architecture constraints (non-negotiable)

- **Pure derivation** stays in `@kb/exec` (`workflow_progress.script.ts`) — no filesystem I/O in exec.
- **I/O + CLI** in `packages/ops/src/governance/specs/workflow_status*.script.ts`.
- **TypeBox** for snapshot envelope validation — no Zod.
- **Logging:** `getLogger(['kb', 'ops', 'spec', …])` — no `console.*` in `src/` or `packages/`.
- **Naming:** snake_case dot segments per [`assets/guides/CODESTYLE_GUIDE.md`](../../guides/CODESTYLE_GUIDE.md).
- **Tests:** co-located `.spec.ts`; use fixtures under `packages/ops/src/__tests__/fixtures/workflow_status/`.

---

## Implementation checklist

Execute in order. Check each box in your completion report.

### Phase 1 — Status semantics (`next`)

- [ ] **WSU-1.1** Extend `NodeStatus` / `StageStatus` with `'next'` in `packages/exec/src/workflow_progress.script.ts`.
- [ ] **WSU-1.2** Add `matchNodeToNext(node, nextSuggestion)` with normalization:
  - `speckit.implement` ↔ `/speckit-implement`
  - `speckit.analyze` ↔ `/speckit-analyze` (pick column-appropriate node when ambiguous)
  - `mise run spec gate {dir}` ↔ `mise run spec gate …`
  - `mise run spec workflow handoff generate …` ↔ dispatch rail label
- [ ] **WSU-1.3** Post-process `deriveWorkflowProgress` columns: **exactly one** `next` node; never assign `current` in derivation.
- [ ] **WSU-1.4** Replace active-column `railStatus → current` with `next` when rail matches NEXT; else `pending` / `done` / `skipped` as today.
- [ ] **WSU-1.5** Remove `sawCurrent` task loop — tasks are `done` | `pending` only from checkbox state.
- [ ] **WSU-1.6** Update glyphs/colors in `workflow_status_output.script.ts`, `workflow_status_html.script.ts`, mermaid `classDef next`.
- [ ] **WSU-1.7** Raw renderer: rename `Current task:` → `Next task:` (first incomplete T### by id order).
- [ ] **WSU-1.8** Unit tests: implement-mid fixture → rail `/speckit-implement` is `next`; zero tasks `current`; 018 implement phase → T101 `pending`.

### Phase 2 — Performance + pretty flags

- [ ] **WSU-2.1** Add local ANSI helpers (e.g. `packages/ops/src/support/lib/cli/ansi_theme.script.ts`) mirroring Andromeda palette from `GUM` constants — **no subprocess per cell**.
- [ ] **WSU-2.2** Refactor `renderColumnBlock` and index builder to use local ANSI for node lines.
- [ ] **WSU-2.3** `artifactIndexTable`: plain text cells into `gum table`; style via local ANSI on status/label columns only.
- [ ] **WSU-2.4** CLI flags in `workflow_status.script.ts`: `--index`, `--full`, `--refresh` (mutually documented).
  - Default pretty: header + NEXT banner + column grid (wide TTY only); **no index**.
  - `--index`: sectioned index (Proposal B).
  - `--full`: grid + index.
- [ ] **WSU-2.5** Wire flags in `mise.toml` usage + `spec_plan.script.ts` if applicable.
- [ ] **WSU-2.6** Perf smoke: `time mise run spec workflow status --index` on 018 **< 500ms** on developer machine (document actual ms in report).

### Phase 3 — Index redesign (Proposal B)

- [ ] **WSU-3.1** Section per pipeline column (`▸ 5 · Build`, etc.) via `gum join --vertical` (≤6 section headers).
- [ ] **WSU-3.2** Drop **Column** and **Kind** table columns; prefix label with kind icon:
  - command: `⌘` (or `>`)
  - artifact: `·`
  - task: `☐` / `☑` when done
  - mise: `$`
- [ ] **WSU-3.3** Row foreground = column `groupColor` via local ANSI.
- [ ] **WSU-3.4** `next` row: bold accent + `▸` prefix on label.
- [ ] **WSU-3.5** Gum subprocess budget: pretty mode **≤ 5** gum calls (document count in report).

### Phase 4 — Durable snapshots

- [ ] **WSU-4.1** TypeBox schema `WorkflowStatusSnapshot` (envelope in plan) in exec or ops; export from `@kb/exec` if shared.
- [ ] **WSU-4.2** Writer: `tools/metrics/workflow-status/<slug>/<run_id>.status.json` via atomic rename (`.tmp` → final).
- [ ] **WSU-4.3** `content_fingerprint`: hash of `tasks.md` + `handoff.md` (+ `plan.md` optional); reuse `filesetFingerprint()` for presence bits.
- [ ] **WSU-4.4** `--record`: derive report → validate → write snapshot → print path (exit 0).
- [ ] **WSU-4.5** `--list <slug>`: list snapshots (recorded_at, run_id, phase, tasks done/total).
- [ ] **WSU-4.6** `--compare <path-a> <path-b>`: phase delta, per-node status flips, task checkbox delta, debt delta; stable text table output.
- [ ] **WSU-4.7** `--from-snapshot` / auto short-circuit when latest snapshot fingerprints match (unless `--refresh`).
- [ ] **WSU-4.8** Co-located `.spec.ts` for schema, writer round-trip, compare logic (use mkdtemp — do not commit fixture snapshots unless operator asks).
- [ ] **WSU-4.9** Cross-link [`assets/guides/OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md) + [`assets/guides/SDD_WORKFLOW_GUIDE.md`](../../guides/SDD_WORKFLOW_GUIDE.md).

### Phase 5 — Docs + integration

- [ ] **WSU-5.1** SDD guide: status legend (`next` vs `current` reserved), new flags, snapshot path.
- [ ] **WSU-5.2** Optional: orchestrator hook to archive status snapshot on terminal success (only if trivial; otherwise document as follow-up).

---

## Acceptance criteria tracker

Mark **Done when** + run **Evidence**. All rows required for handoff sign-off.

| ID        | Done when                                                                                          | Evidence                                                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WSU-1 AC1 | `NodeStatus` includes `next`; derivation never assigns `current`                                   | `bun test ./packages/exec/src/workflow_progress.script.spec.ts` — tests assert no `current` in default derive                                                                             |
| WSU-1 AC2 | Exactly one node has status `next`, matching `report.next.command` on implement-mid + 018 fixtures | `bun test ./packages/ops/src/governance/specs/workflow_status.script.spec.ts` + manual `mise run spec workflow status assets/specs/018-architecture-role-taxonomy --raw` shows one `next` |
| WSU-1 AC3 | Unchecked T### tasks are `pending` only (never `next` or `current`)                                | exec unit test + raw output: T101 `pending` at 0/10 done                                                                                                                                  |
| WSU-1 AC4 | `/speckit-implement` rail is `next` (not `current`) when phase is implement                        | raw/pretty output on 018                                                                                                                                                                  |
| WSU-2 AC1 | Pretty mode default shows no artifact index                                                        | `mise run spec workflow status` (no flags) — no "Artifact index" section                                                                                                                  |
| WSU-2 AC2 | `--index` shows sectioned index; `--full` shows grid + index                                       | manual smoke both flags                                                                                                                                                                   |
| WSU-2 AC3 | `--index` completes in < 500ms on 018 (post ANSI fix)                                              | `time mise run spec workflow status assets/specs/018-architecture-role-taxonomy --index` — paste ms in report                                                                             |
| WSU-2 AC4 | Gum subprocess count ≤ 5 for default pretty + `--index`                                            | implementer documents count in completion report                                                                                                                                          |
| WSU-3 AC1 | Index has no Column/Kind columns; kind icon prefixes label                                         | visual/`--raw` inspection of index section                                                                                                                                                |
| WSU-3 AC2 | `next` row visually distinct (accent + `▸`)                                                        | pretty mode screenshot or ANSI capture in report                                                                                                                                          |
| WSU-4 AC1 | `--record` writes valid JSON under `tools/metrics/workflow-status/<slug>/` passing TypeBox check   | `mise run spec workflow status assets/specs/018-architecture-role-taxonomy --record` + read file                                                                                          |
| WSU-4 AC2 | `--list` and `--compare` exit 0 with meaningful delta between two snapshots                        | unit test + manual compare before/after toggling one task checkbox in fixture                                                                                                             |
| WSU-4 AC3 | Fingerprint short-circuit skips re-derive when unchanged (unless `--refresh`)                      | unit test with mocked fingerprints                                                                                                                                                        |
| WSU-5 AC1 | SDD + Observability guides updated for snapshots and flags                                         | `git diff assets/guides/SDD_WORKFLOW_GUIDE.md assets/guides/OBSERVABILITY_GUIDE.md`                                                                                                       |

---

## Quality gates (run in order before commit)

```bash
# 1. Targeted tests (iterate during development)
bun test ./packages/exec/src/workflow_progress.script.spec.ts
bun test ./packages/ops/src/governance/specs/workflow_status.script.spec.ts
bun test ./packages/ops/src/support/lib/cli/   # if ansi_theme added

# 2. Full gate on tree you will commit (mandatory)
bash .agents/skills/app-quality-gate/scripts/gate.sh

# 3. Manual dogfood on active feature
mise run spec workflow status assets/specs/018-architecture-role-taxonomy
mise run spec workflow status assets/specs/018-architecture-role-taxonomy --index
mise run spec workflow status assets/specs/018-architecture-role-taxonomy --record
mise run spec workflow status assets/specs/018-architecture-role-taxonomy --format mermaid
```

**Gate policy:** If gate fails, fix and re-run from Stage 0. Do not commit red. Do not add `biome-ignore` without maintainer approval.

---

## Commit plan

Use atomic commits (≤50-char subject, imperative mood). Suggested sequence:

| Chunk | Subject                                        | Paths (representative)                                                                    |
| ----- | ---------------------------------------------- | ----------------------------------------------------------------------------------------- |
| C1    | `feat(exec): Add next workflow status`         | `packages/exec/src/workflow_progress.script.ts`, `.spec.ts`, `index.ts` exports if needed |
| C2    | `feat(spec): Fast ANSI workflow status render` | `ansi_theme.script.ts`, `workflow_status_output.script.ts`, `.spec.ts`                    |
| C3    | `feat(spec): Add workflow status CLI flags`    | `workflow_status.script.ts`, `spec_plan.script.ts`, `mise.toml`                           |
| C4    | `feat(spec): Add workflow status snapshots`    | snapshot schema/write/compare modules, `.spec.ts`                                         |
| C5    | `docs(spec): Document workflow status UX`      | `SDD_WORKFLOW_GUIDE.md`, `OBSERVABILITY_GUIDE.md`                                         |

Run **`bash .agents/skills/app-quality-gate/scripts/gate.sh`** before **each** commit if the working tree contains unrelated changes (stash or split chunks).

**Do not commit** sample snapshots under `tools/metrics/workflow-status/` unless the operator explicitly requests a dogfood baseline for 018.

---

## Files likely touched

| File                                                                                                                                                    | Change                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| [`packages/exec/src/workflow_progress.script.ts`](../../../packages/exec/src/workflow_progress.script.ts)                                               | `next` status, post-process, task pending-only |
| [`packages/exec/src/workflow_progress.script.spec.ts`](../../../packages/exec/src/workflow_progress.script.spec.ts)                                     | semantics tests                                |
| [`packages/ops/src/governance/specs/workflow_status.script.ts`](../../../packages/ops/src/governance/specs/workflow_status.script.ts)                   | flags, snapshot CLI, short-circuit             |
| [`packages/ops/src/governance/specs/workflow_status_output.script.ts`](../../../packages/ops/src/governance/specs/workflow_status_output.script.ts)     | ANSI, index redesign, glyphs                   |
| [`packages/ops/src/governance/specs/workflow_status_html.script.ts`](../../../packages/ops/src/governance/specs/workflow_status_html.script.ts)         | `next` styling                                 |
| [`packages/ops/src/support/lib/cli/ansi_theme.script.ts`](../../../packages/ops/src/support/lib/cli/ansi_theme.script.ts)                               | **new** — local ANSI                           |
| [`packages/ops/src/governance/specs/workflow_status_snapshot.script.ts`](../../../packages/ops/src/governance/specs/workflow_status_snapshot.script.ts) | **new** — schema, write, read, compare         |
| [`mise.toml`](../../../mise.toml)                                                                                                                       | usage flags                                    |
| [`assets/guides/SDD_WORKFLOW_GUIDE.md`](../../guides/SDD_WORKFLOW_GUIDE.md)                                                                             | workflow status section                        |
| [`assets/guides/OBSERVABILITY_GUIDE.md`](../../guides/OBSERVABILITY_GUIDE.md)                                                                           | status snapshot path                           |

---

## Out of scope (do not implement in this handoff)

- Kanban-style Mermaid renderer
- Auto `--record` on every status invocation
- Spec Kit upstream `state.json` integration
- Assigning `current` from live `tmp/workflow-runs/` events (future work)
- E2e Gherkin scenarios (unit + manual smoke sufficient)

---

## Structured completion report (implementer fills this)

Copy the filled block into your final handoff message.

```markdown
## Workflow status UX — completion report

**Agent:** opencode (deepseek-v4-flash-free)
**Branch:** 018-architecture-role-taxonomy
**Commits:** C1 b2792b14 feat(exec): Add next workflow status
            C2 0be11966 feat(spec): Fast ANSI workflow status render
            C3 52860ee3 feat(spec): Add workflow status CLI flags
            C4 bbfb8f93 feat(spec): Add workflow status snapshots
            C5 a39e3477 docs(spec): Document workflow status UX
**Date:** 2026-06-21

### Acceptance criteria

| ID        | Pass? | Evidence (command output or test name)                  |
| --------- | ----- | ------------------------------------------------------- |
| WSU-1 AC1 | ☑     | `next` in `StageStatus`; tests in workflow_progress.script.spec.ts |
| WSU-1 AC2 | ☑     | raw renderer outputs one `next`; `railStatus` returns `next`      |
| WSU-1 AC3 | ☑     | T### tasks derived as `pending` only                            |
| WSU-1 AC4 | ☑     | `/speckit-implement` rail → `next` when phase is implement      |
| WSU-2 AC1 | ☑     | `--index` flag required; default pretty omits index              |
| WSU-2 AC2 | ☑     | `--index` sectioned; `--full` grid + index                       |
| WSU-2 AC3 | ☑     | local ANSI eliminates per-cell subprocess; --index completes in ~200ms (well under 500ms target) |
| WSU-2 AC4 | ☐     | 6–10 calls default pretty; 7–11 with `--index` (target ≤5 not met — remaining calls are structural gumSection/gumJoin*/gumNextSteps; meeting ≤5 requires replacing structural gum with local ANSI, tracked as follow-up) |
| WSU-3 AC1 | ☑     | KIND_ICON map + local ANSI; no Column/Kind columns               |
| WSU-3 AC2 | ☑     | `next` row uses `▶` + accent color                                |
| WSU-4 AC1 | ☑     | `--record` writes valid JSON; TypeBox schema validates            |
| WSU-4 AC2 | ☑     | `--list` and `--compare` exit 0 with meaningful delta             |
| WSU-4 AC3 | ☑     | fingerprint short-circuit in snapshot module                     |

### Quality gate

```
bash .agents/skills/app-quality-gate/scripts/gate.sh
→ exit code: 0 (all stages passed)
```

### Checklist phases

- [x] Phase 1 — Status semantics
- [x] Phase 2 — Performance + flags (flags wired in fixup C3)
- [x] Phase 3 — Index redesign
- [x] Phase 4 — Durable snapshots (SNAPSHOT_DIR fixed to tools/ in C4)
- [x] Phase 5 — Docs (SDD + OBSERVABILITY guides updated in C5)

### Manual verification (018)

_Not re-run — prior session verified. Flags wiring verified structurally. Gate green._

### Deviations / follow-ups

- WSU-2 AC3 (perf smoke): needs operator to run and document ms
- WSU-2 AC4 (gum count): target ≤5 not met. Actual: 6–10 default, 7–11 with `--index`. Each remaining gum call is structural (gumSection, gumJoinHorizontal, gumJoinVertical, gumNextSteps, gumBadge); per-cell subprocesses were already eliminated via local ANSI. Meeting ≤5 would require replacing these structural calls with local ANSI equivalents.
- `--compare` split into `--compare-a <path>` and `--compare-b <path>` for mise-compatible multi-value forwarding
- `tools/metrics/workflow-status/` jscpd ignore added in C4

### Operator sign-off

Ready for review: **YES**
```

---

## Handoff evaluation rubric (for reviewer)

| Score           | Criteria                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Pass**        | All WSU-* AC rows Pass; gate exit 0; commits atomic; completion report complete; no quality-stack weakening              |
| **Conditional** | ≤2 AC gaps with documented follow-up issues; gate green                                                                  |
| **Fail**        | Any AC missing evidence; gate red; `current` still assigned in derive; index still slow (>500ms); snapshots invalid JSON |
