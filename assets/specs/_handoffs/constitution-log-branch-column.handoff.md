<!-- markdownlint-disable-file -->

# Handoff — Constitution log `Branch` column

**Target:** DeepSeek / any implementer agent
**Branch:** `feat/add-workflow-audit` (continue; amend or add commit on top)

## Agent prompt

```text
# Handoff — Constitution log Branch column

## Mission

Rename the last column in `assets/docs/specs/spec-kit-constitution-log.md` from
**PR** to **Branch**. At amendment time we often have a branch name but no PR
yet — branch is the correct provenance field.

Align the constitution governance row that references the log. Single small
docs commit; no tooling or src/ changes.

## Current file (before)

Header: `| Date | Version | Summary | PR |`
Row 1.3.0 Branch value is wrong: `005-workflow-observability` (feature slug, not branch).

## Required changes

### 1. `assets/docs/specs/spec-kit-constitution-log.md`

- Rename column **PR** → **Branch** (header + separator row).
- Set Branch cells to git branch names (backticks), not PR numbers or feature slugs:

| Version | Branch (target)             | Notes                                     |
| ------- | --------------------------- | ----------------------------------------- |
| 1.3.0   | `feat/orchestrated-handoff` | SDD migration + quartet (merged via #16)  |
| 1.3.1   | `feat/add-workflow-audit`   | Already correct form                      |
| 1.3.2   | `feat/add-workflow-audit`   | Spec-audit landed on same branch as 1.3.1 |

If `git log --oneline main` suggests a different branch for 1.3.0, use the
branch that introduced `.specify/memory/constitution.md` v1.3.0 / SDD path
migration — do not leave a feature slug in the Branch column.

Optional footer note (one line under the table):

> After merge, add the GitHub PR link in the PR description or amend the row;
> the log records **branch at amendment time**.

### 2. `.specify/memory/constitution.md` (Governance table)

Update the **Amendments** row:

- From: `PR + dated row in spec-kit-constitution-log.md`
- To: `Branch + dated row in spec-kit-constitution-log.md`

Do **not** bump constitution version footer (1.3.2) — wording-only alignment.

---

## Read first

1. `.agents/skills/app-context/SKILL.md`
2. `assets/guides/GIT_COMMITS_GUIDE.md`
3. `.cursor/rules/hk-commit-messages.mdc`

---

## Verification

git diff assets/docs/specs/spec-kit-constitution-log.md .specify/memory/constitution.md

# No " PR " column header left in log
rg -n '\| PR \|' assets/docs/specs/spec-kit-constitution-log.md && exit 1 || true
rg -n '\| Branch \|' assets/docs/specs/spec-kit-constitution-log.md

bash .agents/skills/app-quality-gate/scripts/gate.sh

---

## Commit

git add \
  assets/docs/specs/spec-kit-constitution-log.md \
  .specify/memory/constitution.md

git commit -m "$(cat <<'EOF'
docs(spec): Use Branch column in constitution log

Record git branch at amendment time instead of PR numbers, since
amendments are often written before a pull request exists.

Changes:
- Rename PR column to Branch in spec-kit-constitution-log.md
- Fix 1.3.0 provenance to branch name, align 1.3.2 branch
- Constitution Governance row: Branch + dated row
EOF
)"

Validate with:
bun tools/governance/policies/hooks/commit_message.script.ts .git/COMMIT_EDITMSG
(after commit, or validate message in mktemp file before committing)

---

## Explicit OUT OF SCOPE

- Bumping constitution semver or SYNC IMPACT block
- Changing amendment log row summaries or dates
- spec-audit tooling, speckit skills, or handoff files
- Production `src/` changes

---

## Definition of done

- [ ] Log table header is **Branch**, not PR
- [ ] All three rows use branch names (no feature slug in 1.3.0)
- [ ] Constitution Governance **Amendments** row says Branch
- [ ] `gate.sh` green
- [ ] HK commit-message policy passes
- [ ] Working tree clean
```

## Related

- Constitution log: [`assets/docs/specs/spec-kit-constitution-log.md`](../../docs/specs/spec-kit-constitution-log.md)
- Constitution: [`.specify/memory/constitution.md`](../../../.specify/memory/constitution.md)
- Prior cherry-pick handoff: [`cherry-pick-speckit-wrap.handoff.md`](./cherry-pick-speckit-wrap.handoff.md)
