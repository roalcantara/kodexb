<!-- markdownlint-disable-file -->

# Handoff — Cherry-pick wrap-up (terse speckit + plan template)

**Target:** DeepSeek / any implementer agent
**Branch:** `feat/add-workflow-audit` (continue; do not rebase unless asked)

## Agent prompt

```text
# Handoff — Cherry-pick wrap-up (terse speckit + plan template)

## Mission

Finish the **003-sync-frecency-preserve** cherry-pick slice that was intentionally
left out of the spec-audit commits. Apply remaining diffs, fix constitution-log
hygiene, validate, and commit. **Do not** touch spec-audit tooling or re-open
already-committed files unless fixing a clear inconsistency.

## Context (already on branch)

| Commit     | Scope                                      |
| ---------- | ------------------------------------------ |
| `0304e2a4` | `feat(spec): Add deterministic spec audit` |
| `6b775421` | `docs(spec): Wire spec audit into SDD`     |

Already committed in docs commit (do not redo):

- `.cursor/skills/speckit-tasks/SKILL.md` — terse Completion Report + audit next step
- `.cursor/skills/speckit-analyze/SKILL.md` — terse Completion Report + audit hint
- `.specify/memory/constitution.md` — v1.3.2, [12] log link fix, audit footnote
- `assets/docs/specs/spec-kit-constitution-log.md` — rows 1.3.0, 1.3.2

## Remaining work (working tree)

Stage and commit **only** these three files (diffs already present):

1. `.cursor/skills/speckit-specify/SKILL.md` — one-line success: `OK — <dir>/spec.md`
2. `.cursor/skills/speckit-plan/SKILL.md` — one-line success: `OK — <dir>/plan.md`
3. `.specify/templates/plan-template.md` — new `## Feature deltas` section after Summary

**Revert / exclude** (local-only, not project convention):

git checkout -- .vscode/settings.json

That file hardcodes a user-specific `bun.runtime` path; keep
`${env:HOME}/.local/share/mise/shims/bun`.

## Constitution log fix (same commit)

`constitution.md` SYNC IMPACT documents **1.3.1** (log link + terse completion
reports) but `assets/docs/specs/spec-kit-constitution-log.md` jumps 1.3.0 → 1.3.2.

Add a **1.3.1** row between existing rows:

| Date       | Version | Summary                                                                                               | PR                        |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------- | ------------------------- |
| 2026-06-07 | 1.3.1   | Fix amendment log [12] canonical path; terse Completion Report for speckit specify/plan/tasks/analyze | `feat/add-workflow-audit` |

Do **not** bump constitution footer version (stays **1.3.2**). Log-only backfill.

Optional: fix 1.3.0 PR column if you can verify from `git log` (e.g. `#16` for
orchestrated-handoff SDD migration).

---

## Read first (mandatory)

1. `.agents/skills/app-context/SKILL.md`
2. `assets/guides/GIT_COMMITS_GUIDE.md` (≤50 char subject, imperative, body ≥20 chars)
3. `.cursor/rules/hk-commit-messages.mdc` — validate with `commit_message.script.ts`

---

## Verification (run all; report exit codes)

git status -sb
git diff .cursor/skills/speckit-specify/SKILL.md .cursor/skills/speckit-plan/SKILL.md .specify/templates/plan-template.md

bash .agents/skills/app-quality-gate/scripts/gate.sh

# Sanity: all four speckit skills have terse Completion Report pattern
rg -n "## Completion Report" .cursor/skills/speckit-{specify,plan,tasks,analyze}/SKILL.md

No new tests required (markdown/skills only). Do **not** run `mise run spec audit`
as proof of this slice.

---

## Commit

Single atomic commit on `feat/add-workflow-audit`:

git add \
  .cursor/skills/speckit-specify/SKILL.md \
  .cursor/skills/speckit-plan/SKILL.md \
  .specify/templates/plan-template.md \
  assets/docs/specs/spec-kit-constitution-log.md

git commit -m "$(cat <<'EOF'
docs(spec): Add terse speckit completion reports

Standardize specify/plan success output to one-line OK paths and add
Feature deltas section to plan-template for incremental design.

Changes:
- Terse Completion Report for speckit-specify and speckit-plan
- plan-template Feature deltas table after Summary
- Constitution log 1.3.1 row for log link and completion reports

Completes 003 cherry-pick slice; spec-audit commits remain separate.
EOF
)"

Validate message before commit:

_f=$(mktemp)
printf '%s\n' '<paste message>' > "$_f"
bun tools/governance/policies/hooks/commit_message.script.ts "$_f"
rm -f "$_f"

After commit: `git status -sb` must be clean except intentionally ignored local files.

---

## Explicit OUT OF SCOPE

- `mise run spec audit` implementation (already merged)
- `kb-workflow` extension, branch naming (`kb-full` / `kb-slice`), `artifacts/plan/` layout
- `.vscode/settings.json` (revert, do not commit)
- Production `src/` changes
- Amending prior commits (`0304e2a4`, `6b775421`) unless user explicitly asks

---

## Definition of done

- [ ] Three skill/template files committed
- [ ] Constitution log has 1.3.0, **1.3.1**, 1.3.2 rows
- [ ] `.vscode/settings.json` reverted to `${env:HOME}` form
- [ ] `gate.sh` green
- [ ] HK commit-message policy passes
- [ ] Working tree clean (or only untracked local junk)
```

## Related

- Prior spec-audit handoff: [`spec-audit.implement.handoff.md`](./spec-audit.implement.handoff.md)
- Constitution log: [`assets/docs/specs/spec-kit-constitution-log.md`](../../docs/specs/spec-kit-constitution-log.md)
- SDD workflow: [`assets/guides/SDD_WORKFLOW_GUIDE.md`](../../guides/SDD_WORKFLOW_GUIDE.md)
