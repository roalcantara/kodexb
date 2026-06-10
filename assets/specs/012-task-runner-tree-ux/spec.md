<!-- markdownlint-disable-file -->

# Task runner tree UX — `app gates` spike

**Feature Branch**: `feature/012-task-runner-tree-ux`
**Release**: v0.x
**Status**: Draft (spec only — no `plan.md` / `tasks.md` until UX is validated)
**Predecessor**: [`011-mise-sdd-cli`](../011-mise-sdd-cli/) (flat `task_runner`, gum spin on `command[]` leaves)

**Input**: Operators want multi-step mise tasks to feel **traceable, normalized, and calm** on a TTY: one parsed summary line per step, clear grouping by phase, no interleaved raw subprocess banners. **011** shipped the shared runner with flat pretty output; this spike validates whether a **tree-shaped** pretty mode is worth generalizing before touching `spec ready`, `spec gate`, or HK parsing.

## Introduction

Today `mise run app gates` runs one or two top-level steps (`quality`, `policy`) through `task_runner`. When the quality step delegates to `gate.sh`, the operator sees a **second UI** (ASCII banners, inline `✔`/`✘`, full tool output on failure) that fights the runner summary printed afterward. The result is noisy, hard to scan, and not comparable across commands.

This feature is a **UX spike**, not a full platform migration. Success means an operator can run `mise run app gates` on a TTY and recognize each phase, each leaf check, and the final rollup **without reading raw tool logs on a green run**.

**Non-goal for this spike:** replicate the full `spec ready` tree (catalog, HK, tag tests, nested spec gate). That composition is a follow-on only if this spike passes review.

## Authority

| Topic                      | Authority                                                                                                                                                                                          |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Flat runner contract (011) | [`011` spec](../011-mise-sdd-cli/spec.md) MSC-1, [`plan.md`](../011-mise-sdd-cli/plan.md) § Output contract                                                                                        |
| Gum styling                | [`gum_theme.script.ts`](../../../tools/support/lib/cli/gum_theme.script.ts)                                                                                                                        |
| Render modes               | [`render_mode.script.ts`](../../../tools/support/lib/cli/render_mode.script.ts)                                                                                                                    |
| Quality gate stages        | [`.agents/skills/app-quality-gate/scripts/gate.sh`](../../../.agents/skills/app-quality-gate/scripts/gate.sh), [`gate_policy.sh`](../../../.agents/skills/app-quality-gate/scripts/gate_policy.sh) |
| `app gates` dispatch       | [`app.script.ts`](../../../tools/bin/app.script.ts)                                                                                                                                                |

## Out of scope (explicit deferrals)

- `mise run spec ready`, `spec gate`, `spec test`, HK step parsing, catalog validate parsing
- `-v` / `-vv` verbosity flags and `log_tail` surfacing (011 deferred item — may follow in plan)
- Changing `--raw` / `--json` line grammar from 011 (extensions allowed only if backward compatible)
- CI workflow changes beyond proving non-TTY behavior still works
- Replacing `gate.sh` / `gate_policy.sh` with Bun rewrites (orchestration may move; check semantics must stay)
- npm publish, package extraction, orchestrator behavior

## Glossary

| Term                 | Meaning                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Tree pretty mode** | TTY rendering where steps may have `children`; each **leaf** completes as one indented `✔` line with a short **summary** |
| **Leaf step**        | A step with no `children` that executes exactly one subprocess (or one scripted check)                                   |
| **Group step**       | A step with `children`; its own line summarizes aggregate pass/fail for the subtree                                      |
| **Summary**          | Human-readable tail on a leaf line (counts, duration, severity) — not a dump of stdout                                   |
| **Capture run**      | Leaf execution with stdout/stderr piped to the runner (not inherited to the terminal on success)                         |
| **Spike path**       | `mise run app gates` — default dual selection (quality + policy per 011 rule 07)                                         |

## Target UX (normative example)

The spike SHALL move operator-visible output **toward** this shape (exact labels may differ; hierarchy and one-line leaves are the contract):

```text
$ mise run app gates

  ✔ [app > gates]
    ✔ [quality] app quality gate (41234ms)
      ✔ [autofix] knip + ast-grep + biome + typecheck (0): bun run lint:fix
      ✔ [policy] new suppressions + reminders (0.5):
        ✔ [diff] No new suppressions
        ✔ [guards] Config unchanged
        ✔ [electrobun > R7] reminders acknowledged
      ✔ [lint/typecheck] typecheck + biome + knip + depcruise + jscpd + ls + ast-grep + mise (1): bun run lint
      ✔ [tests] 0 fail: bun test
      ✔ [smoke > preview] HTTP 200: server at http://localhost:3456
      ✔ [smoke > build] skipped (non-macOS) | bun run build
    ✔ [policy] embedded policy gate (1200ms)
      ✔ [diff] No new suppressions
      ✔ [guards] Config unchanged
      ✔ [electrobun > R7] reminders acknowledged

  ✔ 2/2 groups passed (42434ms)
```

**Interpretation:**

- Only **one active spinner** at a time (current leaf under spin).
- On success, the spinner is replaced by the leaf's `✔` line; raw subprocess output is **not** shown.
- On failure, the failing leaf shows summary + enough context to act (implementation detail deferred to plan).
- `[quality]` group exposes the same stages operators know from `gate.sh` today, without the duplicate banner block.

## Clarifications

### Session 2026-06-03 (spike framing)

- Q: Why `app gates` first? → A: **Smallest real tree**: at most two group steps today, quality subtree maps 1:1 to known `gate.sh` stages, no HK/catalog parsers, no feature-dir resolution. Validates capture + parse + indent renderer before harder consumers.
- Q: Must every parser be perfect on day one? → A: **No.** Spike requires **stable summaries for pass paths** on each quality leaf; fail paths must surface actionable text but exact parser grammar is plan-owned.
- Q: Does tree mode replace flat pretty mode everywhere? → A: **Not in this spike.** Only commands explicitly migrated (initially `app gates`). Other consumers keep 011 flat pretty until a follow-on.
- Q: How do `--quality` / `--policy` flags compose? → A: Unchanged from 011 rule 07. Tree root reflects the selected groups only (one group → one top-level branch; both → two branches).

### Open (plan phase — do not block spec approval)

- OQ-1: Extend `RunStep` with `children` vs separate `task_tree_runner` module?
- OQ-2: Split `gate.sh` into invokable stage entrypoints vs parse legacy banner output?
- OQ-3: Policy subtree duplicated under `[quality]` embedded policy vs standalone `[policy]` — collapse when identical?

## REQUIREMENT TRT-1: Spike scope locked to `app gates`

**Slice:** Spike

**User story:** As a maintainer, I want a bounded UX experiment so we do not rewrite every multi-step command before validating the tree model.

### Acceptance criteria

1. WHEN this feature ships, THEN the only mise consumer required to use tree pretty mode SHALL be `mise run app gates` (all flag combinations from 011 rule 07).
   - **Measure:** `spec ready`, `spec gate`, and `catalog validate` behavior unchanged from 011 flat pretty/raw.
   - **Evidence:** Manual diff or review note listing touched dispatch files; no accidental migration of other commands.

2. WHEN an operator runs `mise run app gates --raw` or `--json`, THEN output SHALL remain machine-oriented (flat `STEP`/`TASK` lines or JSON report per 011) without tree indentation.
   - **Measure:** Existing `task_runner.script.spec.ts` raw assertions still pass; no TTY-only fields required in `--raw`.
   - **Evidence:** `task_runner.script.spec.ts` + manual `mise run app gates --raw`.

---

## REQUIREMENT TRT-2: Group / leaf tree on TTY

**Slice:** Spike

**User story:** As an operator, I want to see which phase I am in and which checks belong to it.

### Acceptance criteria

1. WHEN `mise run app gates` runs on a TTY without `--raw`/`--json`, THEN the runner SHALL render a **root group** `[app > gates]` with one **child group per selected gate** (`quality`, `policy`).
   - **Measure:** Default invocation shows two groups; `--quality` only shows one group; `--policy` only shows one group.
   - **Evidence:** Screenshot or pasted TTY transcript attached to PR / handoff.

2. WHEN the `quality` group runs, THEN it SHALL expose **leaf lines** corresponding to the sequential stages in `gate.sh` (autofix, embedded policy, lint+typecheck, tests, preview smoke, build smoke).
   - **Measure:** Six leaf ids stable across platforms; build leaf documents skip on non-macOS instead of failing the group silently.
   - **Evidence:** TTY transcript on macOS (all six) and Linux (build skipped line present).

3. WHEN the `policy` group runs, THEN it SHALL expose leaf lines for the policy checks operators expect from `gate_policy.sh` (at minimum: new-suppression diff, config guard, Electrobun R7 reminder block).
   - **Measure:** Three or more indented leaves under `[policy]` on a clean tree.
   - **Evidence:** TTY transcript on passing repo state.

4. WHEN all selected groups pass, THEN the runner SHALL print a final rollup line of the form `<n>/<n> groups passed (<ms>ms)`.
   - **Measure:** Rollup counts groups, not every leaf in the repo.
   - **Evidence:** TTY transcript.

---

## REQUIREMENT TRT-3: One leaf, one spinner, one summary line

**Slice:** Spike

**User story:** As an operator, I want progress to advance one line at a time without subprocess noise on green runs.

### Acceptance criteria

1. WHEN a leaf step executes in tree pretty mode, THEN the runner SHALL show at most **one** gum spinner titled with the leaf label until the step completes.
   - **Measure:** No parallel spinners; no inherited stdout from the child on exit 0.
   - **Evidence:** Visual check during `mise run app gates`.

2. WHEN a leaf step completes with exit 0, THEN the runner SHALL replace the spinner with a single `✔` line containing `[leaf-id]` or equivalent short tag and a **summary** string (see TRT-4).
   - **Measure:** Each passing leaf occupies exactly one line in the final transcript (excluding group headers).
   - **Evidence:** TTY transcript.

3. WHEN a leaf step fails, THEN the runner SHALL print the failing leaf line with `✗`, stop subsequent leaves in the same group (fail-fast within group), mark skipped siblings, and exit non-zero.
   - **Measure:** Induced failure (e.g. lint error) stops later quality leaves; policy group not started if quality selected and quality failed first.
   - **Evidence:** TTY transcript + exit code 1.

---

## REQUIREMENT TRT-4: Parsed summaries (pass path)

**Slice:** Spike

**User story:** As an operator, I want each line to answer "what ran" and "what happened" without reading logs.

### Acceptance criteria

1. WHEN the autofix leaf passes, THEN its summary SHALL include the invoked command name (`bun run lint:fix`) and an issue count token (`0` on clean tree).
   - **Measure:** Summary matches `/lint:fix.*\b0\b/` on green repo.
   - **Evidence:** TTY transcript.

2. WHEN the lint/typecheck leaf passes, THEN its summary SHALL include `bun run lint` and a non-error status token (implementation may mirror biome/knip aggregate — exact token deferred to plan).
   - **Measure:** Summary mentions `bun run lint`.
   - **Evidence:** TTY transcript.

3. WHEN the tests leaf passes, THEN its summary SHALL include `bun test` and a failure count of `0` (or equivalent `N pass`).
   - **Measure:** Summary includes test runner identity and zero failures on green repo.
   - **Evidence:** TTY transcript.

4. WHEN the preview smoke leaf passes, THEN its summary SHALL include HTTP status `200` and the preview URL host (`localhost:3456`).
   - **Measure:** Summary contains `200` and `3456`.
   - **Evidence:** TTY transcript.

5. WHEN the build smoke leaf is skipped on non-macOS, THEN its summary SHALL explicitly state skip reason (`non-macOS` or equivalent) rather than omitting the leaf.
   - **Measure:** Linux transcript shows skip line; macOS shows pass or fail line.
   - **Evidence:** Platform-specific transcript or CI log.

6. WHEN a policy leaf passes, THEN its summary SHALL use the same human phrases operators see today (`No new suppressions`, `Config unchanged`, Electrobun reminder acknowledgment) without printing the full reminder prose on success.
   - **Measure:** At least one policy leaf summary matches current `gate_policy.sh` pass strings.
   - **Evidence:** TTY transcript.

---

## REQUIREMENT TRT-5: No duplicate gate banner on success

**Slice:** Spike

**User story:** As an operator, I should not see two competing UIs for the same quality run.

### Acceptance criteria

1. WHEN `mise run app gates` completes with exit 0 on a TTY, THEN stdout SHALL NOT contain the legacy `Quality Gate` banner block from `gate.sh` (`════════════` separator).
   - **Measure:** Transcript lacks banner; stages appear only as tree leaves.
   - **Evidence:** TTY transcript grep.

2. WHEN a quality leaf fails, THEN the operator SHALL still receive enough stderr/stdout excerpt to fix the failure (full dump, tail, or `--raw` replay — mechanism deferred to plan).
   - **Measure:** Induced lint failure shows error content somewhere before exit 1.
   - **Evidence:** TTY transcript on failure injection.

---

## REQUIREMENT TRT-6: Semantics and exit codes preserved

**Slice:** Spike

**User story:** As CI and hooks rely on exit codes, the spike must not weaken gating behavior.

### Acceptance criteria

1. WHEN `mise run app gates` runs on a clean tree, THEN exit code SHALL be `0` regardless of pretty vs raw mode.
   - **Measure:** `echo $?` is 0 after TTY and `--raw` runs.
   - **Evidence:** Commands in PR verify block.

2. WHEN any leaf that would fail under 011 `gate.sh` / `gate_policy.sh` fails, THEN `mise run app gates` SHALL exit non-zero at the same logical point (first failing leaf).
   - **Measure:** Compare failure injection: flat 011 baseline vs tree spike — same first failing stage id.
   - **Evidence:** Documented failure injection scenario in handoff (when plan/tasks exist).

---

## REQUIREMENT TRT-7: Spike review gate

**Slice:** Closeout

**User story:** As a maintainer, I want a explicit go/no-go before writing plan/tasks for repo-wide tree migration.

### Acceptance criteria

1. WHEN the spike PR is ready for review, THEN the author SHALL attach **one passing** and **one failing** TTY transcript for `mise run app gates` plus confirmation that `bash .agents/skills/app-quality-gate/scripts/gate.sh` still passes standalone (no behavioral drift for direct gate invocation).
   - **Measure:** Transcripts in PR description or `handoff.md` (when created).
   - **Evidence:** Reviewer sign-off field: **APPROVE UX** or **REVISE UX** with notes.

2. IF reviewers **APPROVE UX**, THEN a follow-on change MAY add `plan.md` / `tasks.md` generalizing tree mode to `spec gate` and `spec ready`.
   - **Measure:** No plan.md in spike PR unless explicitly split.
   - **Evidence:** Repository state after merge.

---

## Delivery map (spec-only)

| Phase                 | Intent                                                               |
| --------------------- | -------------------------------------------------------------------- |
| **Spec (this doc)**   | Lock spike scope, UX contract, acceptance tests                      |
| **Plan (later)**      | Data structures, parser modules, `gate.sh` decomposition, failure UX |
| **Tasks (later)**     | Implementation checklist after plan review                           |
| **Follow-on feature** | Generalize tree runner to `spec ready` / nested HK if spike approved |

## Success criteria summary

The spike is **successful** when an operator prefers the tree transcript over today's flat runner + `gate.sh` banner for `mise run app gates`, and TRT-1…TRT-6 pass without regressing `--raw`/`--json`. Generalization is **optional** and gated by TRT-7 review.
