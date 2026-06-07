<!-- markdownlint-disable-file -->
# kb SDD Workflow Automation — plan punch-list

Concrete edits to apply to the Cursor-authored plan before building. Ordered by
severity. Items map to the evaluation. Items #1 and #9 are already addressed by
the draft checkers in this folder (`lint.ts`, `trace.ts`).

## High

### 1. Move EARS enforcement out of `.cursor/` into provider-agnostic gates
**Problem:** the plan enforces EARS shape by editing
`.cursor/skills/speckit-{specify,checklist,analyze}/SKILL.md`. Those files exist
**only** under `.cursor/`, and this branch is deleting `.cursor/` infra
(`hooks.json`, `hooks/`, `mcp.json`). Any non-Cursor provider (OpenCode, Codex,
DeepSeek) running `/speckit-specify` skips the guardrail.

**Edit:**
- Keep the template replacement (`.specify/templates/spec-template.md`) — it is
  read by every provider. ✅ feasible.
- Add a **deterministic** `mise run spec lint --strict` (see `tools/spec/lint.script.ts`)
  as the real gate. The LLM skills become advisory, not load-bearing.
- In the step tables, change "checklist/analyze enforce EARS" → "checklist/analyze
  advise; `spec lint` enforces."

### 2. Drop `!`-negation from `specDirectories`
**Problem:** Companion docs document only (a) simple name → lists children,
(b) wildcard → each match is a spec. **No negation.** `"!assets/specs/archive"`
will likely be ignored.

**Edit — replace the recommended config with a numeric glob:**
```jsonc
"speckit.specDirectories": ["assets/specs/[0-9][0-9][0-9]-*"]
```
This matches only `001-…`, structurally excluding `_templates/` and `archive/`.
(Alternative: move them out of the scanned parent entirely.)

### 3. Pilot orchestrated-handoff on 001, not orchestrated-sliced
**Problem:** todo `p1-pilot-001` says "Run orchestrated-sliced on 001," but the
sliced workflow skips clarify + analyze-plan — the steps carrying the new EARS
enforcement. The pilot would never exercise what's most likely to break.

**Edit:** pilot **orchestrated-handoff** on 001 end-to-end; switch to
orchestrated-sliced for 002/003 once it ships. (Workflow names were renamed
from `kb-full` / `kb-slice` in the orchestrated-handoff PR; see
[`assets/specs/004-orchestrated-handoff/spec.md`](../../../assets/specs/004-orchestrated-handoff/spec.md).)

## Medium

### 4. Fix workflow registration mechanics
Spec Kit CLI discovers via **catalogs** (`.specify/workflow-catalogs.yml` /
`specify workflow add <path>`), not by dropping a file. Runs need
`id/name/version/inputs` metadata; state lands in `.specify/workflows/runs/<id>/`.
The existing `workflow-registry.json` is **Companion's**, a different layer.

**Edit:** in P1, add (a) full metadata blocks to each `kb-*/workflow.yml`, and
(b) a registration step (`specify workflow add` or a catalog entry). Keep
Option A (Companion `customWorkflows`) and Option B (CLI YAML) clearly separate.

### 5. Make gates deterministic, not LLM-judged
"fail checklist if EARS missing," "CRITICAL = stop," "Measure/Evidence required"
are prompts today. For unattended runs add `spec lint` (#1) + `spec trace` (#9)
to `mise run spec gate`. LLM skills stay advisory.

### 6. Reconcile the two commit-gating layers
Commits are gated by **both** `.specify/extensions.yml` (`optional: true`
prompts) **and** `.specify/extensions/git/git-config.yml` (`auto_commit.enabled`,
all `false`). The plan ignores `git-config.yml`. Note `before_specify →
speckit.git.feature` is `optional: false` (auto branch, not a commit).

**Edit:** state `git-config.yml` is authoritative for auto-commit; keep all
`auto_commit.*: false`; the commit-policy conclusion ("operator-initiated, no
AGENTS.md exception") is correct and already true on disk.

### 7. Inventory every `assets/docs/specs` reference before the path flip
Not just CLAUDE.md/AGENTS.md. Also: constitution (currently **v1.2.0**, hardcodes
`assets/docs/specs/`), `mise.toml` LEDGER (`assets/docs/specs/normalise-specs/
tasks.md`), e2e docs (`assets/docs/specs/e2e/step-catalog.md`), `.cursor/rules`
(stale paths). Run `rg -l "assets/docs/specs"` and migrate as one sweep.

### 8. Write the guide before/with the constitution bump
Repo precedence is `assets/guides/ > CLAUDE.md > constitution > templates`.
P0 amends the constitution while `SDD_WORKFLOW_GUIDE.md` waits until P2 —
constitution leads a guide that contradicts it. **Edit:** move the guide into P0
(or same phase) and have the constitution *reference* it.

## Lower

### 9. Add cross-file traceability check
spec.md pointer ⇄ plan.md scenario ⇄ `.feature` tag has nothing checking the
full chain. `gherkin-lint` only checks structure. → `tools/spec/trace.script.ts`
(drafted) resolves each `@spec:<slug>` end-to-end. Add to `spec gate`.

### 10. Pin parallel-worktree branch base
002/003 must branch from **merged-001 / main**, not in-flight 001 (frecency may
change the SQLite schema). State the base + a rebase rule, not just "CRG check."

### 11. Verify per-step provider routing exists
The step tables assign Codex/OpenCode/DeepSeek per step. Confirm Companion/Spec
Kit supports per-step provider assignment; if it's only a per-`implement` pick,
mark the routing column "manual guidance," not config.

### 12. Wire `specify workflow resume`
It exists (`.specify/workflows/runs/<id>/state.json`) and is the real recovery
path for a broken `implement`. Add a `spec resume` mise task.

### 13. Make `import-legacy` a diff, not a one-way paste
Report drift between legacy `requirements.md` EARS and new `spec.md`, so it keeps
its parity-check value.

## Keep unchanged
Greenfield numbered folders · EARS template replacement · Gherkin in plan.md +
executable `.feature` · spec.md EARS-only with pointer table · operator-gated
commits without a blanket AGENTS.md exception · defer README backlog.
