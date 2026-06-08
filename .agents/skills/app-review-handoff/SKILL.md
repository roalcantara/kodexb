---
name: app-review-handoff
description: >
  Use after a worker completes implementation from a handoff prompt — verify
  AC Evidence, map diff to contract, emit terse findings and optional fix
  handoff. Triggers on: review handoff, verify worker output, post-implement
  review, dispatch reviewer subagent, handoff AC tracker, tmp/handoffs review.
---

# App review handoff

## Overview

Verify **implementation against the handoff contract** — not the implementer's
chat history. Runs after `speckit.implement`, opencode/DeepSeek worker return,
or any session that executed an agent prompt from `handoff.md` or
`tmp/handoffs/*.md`.

**Does not replace:** `app-quality-gate` (commit readiness), `mise run spec
lint/trace/gate` (spec document EARS), `/speckit-analyze` (pre-implement
consistency), `requesting-code-review` (generic diff without handoff contract),
`receiving-code-review` (implementer applying feedback).

## When to load

- Operator asks to review worker output from a handoff
- Before merging a branch that was built from `handoff.md` or `tmp/handoffs/`
- Dispatching a **fresh reviewer subagent** (clean context, read-only)
- After implementer claims "done" — re-derive pass/fail from Evidence + diff

## Handoff sources (in scope)

| Source            | Path                                                |
| ----------------- | --------------------------------------------------- |
| Normative quartet | `<feature-dir>/handoff.md`                          |
| Generated worker  | `tmp/handoffs/opencode-{slug}-{focus}.md`           |
| Review fix pass   | `tmp/handoffs/review-{slug}-{focus}-{sha}.md`       |
| Ad-hoc operator   | `tmp/handoffs/*.md` with AC table or Evidence block |

## Entry paths

Same checklist; two triggers:

| Path         | Actor                    | Context bundle                                                                                            |
| ------------ | ------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Inline**   | Operator in same session | Feature dir, handoff file, `git diff`, optional worker thread                                             |
| **Dispatch** | Reviewer subagent        | **Only:** handoff prompt, AC table, `BASE_SHA`/`HEAD_SHA`, feature dir, focus — **no** implementer thread |

### Dispatch template

```text
Load .agents/skills/app-review-handoff/SKILL.md first.
Feature: <feature-dir>
Handoff: handoff.md | tmp/handoffs/opencode-… | tmp/handoffs/review-…
BASE_SHA: …
HEAD_SHA: …
Focus: implement-src | gherkin-bdd | governance-tools | mixed
Deliver: Chat report (§ Output chat) + patch scaffold audit file. Read-only — do not modify code.
```

## Review pipeline (ordered)

1. **Orient** — load `app-context` (always)
2. **Classify** — slice from focus + `git diff --name-only BASE..HEAD`
3. **Route** — load ≤3 additional skills (§ Review skill routing)
4. **Contract** — parse AC table; one row = one review unit
5. **Evidence** — run each row's Evidence command; record exit code
6. **Diff** — map changed files to AC rows / `plan.md` touch list
7. **Deep pass** — CRG impact-radius when MCP available; FCIS/TypeBox spot checks on touched files
8. **Scaffold** — `mise run spec review-handoff scaffold-audit …` when verdict may need full audit trail
9. **Verdict** — chat report (§ Output chat); patch scaffold file when non-APPROVE
10. **Follow-up** — fix handoff when needed (§ Follow-up)
11. **Remind** — operator runs `app-quality-gate` before commit on APPROVE

**Governance specs:** Many handoffs require
`bun test --config /dev/null tools/governance/specs/workflow/` — do **not**
assume `gate.sh` ran those (`bunfig.toml` root = `src`).

Pull **Before done** commands from the handoff agent prompt when present.

## CLI helpers (deterministic)

Run before the LLM review pass to classify diff paths, list Evidence commands,
and bundle context for dispatch:

```bash
# Slice + skill routing from git diff (defaults: HEAD~1..HEAD)
mise run spec review-handoff classify --json

# AC Evidence + Before done commands from handoff.md
mise run spec review-handoff extract-evidence --feature <feature-dir> --json

# Combined bundle for reviewer subagent
mise run spec review-handoff prepare \
  --feature <feature-dir> \
  --base "$(git merge-base main HEAD)" \
  --head HEAD \
  --json

# Full audit file scaffold (dual-artifact path C)
mise run spec review-handoff scaffold-audit \
  --feature <feature-dir> \
  --base "$(git merge-base main HEAD)" \
  --head HEAD
```

Implementation: `tools/governance/specs/workflow/review_handoff.script.ts` (uses
`parseHandoffAcTable` from `handoff_generate.script.ts`). Does **not** run
Evidence or emit verdicts — the agent skill still owns terse findings.

| Action             | Purpose                                                                                                                      |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `classify`         | `ReviewSlice`, path hits, skill cap (≤3 + `app-context`), split-follow-up flag                                               |
| `extract-evidence` | AC row → backtick commands; agent prompt **Before done** lines                                                               |
| `prepare`          | All of the above in one JSON/text payload                                                                                    |
| `scaffold-audit`   | Write `tmp/reviews/review-{slug}-{short_sha}.md` with AC matrix + Evidence command tables (agent fills Status/Exit/Blockers) |

## Review skill routing

**Always:** `app-context` + this skill.

**Cap:** at most **3 additional** skills (4 total including `app-context`) unless
operator expands scope.

**Deterministic** — classify from changed paths and focus; do not "load all
skills from SKILLS.yaml".

| Classifier hits…                             | Load (after app-context)                                                           |
| -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/shell/renderer/`, `*.css`               | `STYLING_GUIDE.md` ref; tailwind skills only if CSS architecture unclear           |
| `src/shell/app/`, `*.routes.ts`, `@rpc/`     | `app-rpc`                                                                          |
| `*.spec.ts(x)`, `bdd/`                       | `app-testing`                                                                      |
| `@shared/logging`, log categories            | `app-logging`                                                                      |
| `assets/features/`, `@e2e`, `@unit`, catalog | `BDD_GUIDE.md` + `TESTING_GUIDE.md` refs first                                     |
| `tools/governance/`, `mise.toml`             | `mise-tasks`                                                                       |
| `electrobun.config.ts`, `src/shell/main/`    | `electrobun-best-practices` + one skill from `.cursor/electrobun-skill-routing.md` |
| Evidence failing / flaky behavior            | `systematic-debugging` (swap lowest-priority routed skill)                         |
| Blast radius / architecture                  | **CRG MCP tools** (not a skill read)                                               |

**Priority when cap exceeded:** `app-testing` > `app-rpc` > `mise-tasks` >
Electrobun narrow > optional globals.

**Do not load:** `app-quality-gate` as upfront reading — run it only when
Evidence column invokes `gate.sh`. Do not load `requesting-code-review` or
`receiving-code-review` in the reviewer dispatch path.

## Output (A+C — mandatory)

**Dual artifact:** short **chat** summary for operator scan + **full audit file** on disk.

### Chat report (operator scan)

**Target:** ≤20 lines for a large AC review; ≤12 when only a few gaps.

**Hard rules:**

| Rule                           | Detail                                                    |
| ------------------------------ | --------------------------------------------------------- |
| **No markdown tables in chat** | Lists only — pipe tables collapse in chat UI              |
| **No PASS rows in chat**       | Rollup line counts PASS/FAIL/PARTIAL/SKIP                 |
| **Blockers**                   | CRITICAL + IMPORTANT only                                 |
| **AC gaps**                    | FAIL + PARTIAL + SKIP with one-line note each             |
| **MINOR**                      | At most one line: `Notes: …`                              |
| **No duplicate prose**         | Same item in Blockers and AC gaps only when angle differs |
| **One line per finding**       | `{location} \| {problem} \| {fix}`                        |

**Banned in chat:** context recap, strengths essays, FCIS lectures, duplicated EARS
text, "overall looks good", full AC matrix.

```markdown
## Review — {feature} ({focus}) — {verdict}

Evidence: {pass}P · {fail}F · {partial}~ · {skip}- · diff {base}..{head} ({n} files)
Full: tmp/reviews/review-{slug}-{short_sha}.md

### Blockers
[CRITICAL] path:line | problem | fix
[IMPORTANT] WOBS-2 AC1 | Evidence exit 1 | wire emit in orchestrator

### AC gaps
WOBS-2 AC1 FAIL | emit sites not in orchestrator
WOBS-3 AC1 FAIL | no handoff_written in production path

### Commands
PASS bun test --config /dev/null tools/governance/specs/workflow/
FAIL mise run spec lint <feature-dir> --strict
SKIP gate.sh (WIP tree)

### Follow-up
P0 orchestrated_handoff.script.ts | wire phase_decided | see full report § Fix handoff
File: tmp/handoffs/review-{slug}-{focus}-{short_sha}.md
```

**Verdicts:** `APPROVE` | `APPROVE_WITH_NOTES` | `REQUEST_CHANGES` | `BLOCKED`

### Full audit file (audit trail)

**Path:** `tmp/reviews/review-{slug}-{short_sha}.md` (gitignored under `tmp/`)

**Write when:** verdict ≠ `APPROVE`; optional on `APPROVE_WITH_NOTES`; skip on clean `APPROVE`.

**Contents:** scope note, full AC matrix table, Evidence + Before-done command log,
blockers, fix handoff block, diff paths.

**Scaffold CLI** pre-fills structure; agent patches Status/Exit/Blockers/Fix handoff:

```bash
mise run spec review-handoff scaffold-audit \
  --feature <feature-dir> \
  --base "$(git merge-base main HEAD)" \
  --head HEAD
```

**Worker fix file** (separate): `tmp/handoffs/review-{slug}-{focus}-{short_sha}.md` —
P0/P1 only when verdict ≠ `APPROVE`. Chat links both paths.

## Follow-up package

Emit when verdict ≠ `APPROVE` or any IMPORTANT+ finding exists.

**Default:** provide complete follow-up in the report — no extra questions.

**Ask once** only when classifier detects mixed slices (src + gherkin both
failing) or findings span >1 worker:

```text
Follow-up routing: [A] single fix handoff (default) | [B] split handoffs | [C] operator-only | [D] full re-implement
```

### Fix handoff block (copy-paste)

Terse bullets — same one-line shape as findings:

```text
Fix handoff — {feature} ({focus}) — review {short_sha}

Load: app-context + {routed skills from review}

P0: path:line | problem | fix
Verify: {minimal command for P0 only}

P1: …

Out of scope: …

Before done (subset): {failed AC Evidence only; gate.sh if src/ touched}

Do not commit unless asked.
```

**Optional file emit:** `tmp/handoffs/review-{slug}-{focus}-{short_sha}.md`
when dispatch path or ≥2 P0 items. Always pair with
`tmp/reviews/review-{slug}-{short_sha}.md` when verdict ≠ `APPROVE`.

**Do not** invoke `handoff-generate` for fix passes — fix handoffs are
narrower than new gherkin slices.

## Boundaries

| Concern                      | Owner                                                |
| ---------------------------- | ---------------------------------------------------- |
| Lint/test/commit readiness   | `app-quality-gate`                                   |
| Spec document EARS           | `mise run spec lint/trace/gate`                      |
| Pre-implement drift          | `/speckit-analyze`                                   |
| Implementer applies feedback | `receiving-code-review`                              |
| Generic diff review          | `requesting-code-review`                             |
| Orchestrator next phase      | `mise run spec workflow orchestrated-handoff --next` |

## Related

- SDD workflow: [`assets/guides/SDD_WORKFLOW_GUIDE.md`](../../../assets/guides/SDD_WORKFLOW_GUIDE.md) § Review handoff
- Handoff generator: `tools/governance/specs/workflow/handoff_generate.script.ts`
- AC table parser: `parseHandoffAcTable()` in same module
- Review CLI: `mise run spec review-handoff {classify|extract-evidence|prepare|scaffold-audit}`
