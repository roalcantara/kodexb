<!-- markdownlint-disable-file -->

# Handoff — Mise SDD CLI (`011`)

**Spec:** [`spec.md`](./spec.md) (MSC-1…MSC-10) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)
**Branch:** `feature/011-mise-sdd-cli` · **Status:** Blocked until **010 merges**
**Predecessor:** [`010-workflow-packages`](../010-workflow-packages/)

---

## Scope (one PR + orchestrator closeout)

| Track            | Phases | Outcome                                                            |
| ---------------- | ------ | ------------------------------------------------------------------ |
| **Mise SDD CLI** | 1–5    | `spec` hub, `spec test`, `task_runner`, `app`/`policy` bin scripts |
| **Dogfood**      | 6      | Full xstate workflow run on **this** feature dir                   |

---

## Agent workflow

| Step | Action                                                                |
| ---- | --------------------------------------------------------------------- |
| 0    | Wait for **010** merge on `main`                                      |
| 1    | Branch `feature/011-mise-sdd-cli`; point `.specify/feature.json` here |
| 2    | Phases 1→5 (mise CLI) per [`tasks.md`](./tasks.md)                    |
| 3    | Phase 6: `mise run spec workflow run` closeout (MSC-9)                |
| 4    | Single PR with run id in description                                  |

**Intent:** 011 is the first feature whose **mandatory acceptance** is an orchestrator-driven SDD run, not only manual task checkboxes.

---

## Verify (all must exit 0)

```sh
# Mise CLI
bun test --config /dev/null tools/support/lib/cli/task_runner.script.spec.ts
bun test --config /dev/null tools/governance/specs/spec_test.script.spec.ts
mise run spec gate assets/specs/011-mise-sdd-cli
mise run spec test --feat assets/specs/011-mise-sdd-cli --unit
mise run policy check
mise run app gates quality

# Orchestrator dogfood (MSC-9)
mise run spec workflow run --feat assets/specs/011-mise-sdd-cli
# → terminal gate success; archive run id

# Quality
bun run lint:ast-grep
mise run spec lint assets/specs/011-mise-sdd-cli
mise run app gates --quality
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Commit message (squash target)

```text
feat(spec): reorganize mise SDD CLI under spec hub

task_runner gum output; spec test/workflow/audit/init;
app/policy bin scripts; orchestrator dogfood closeout (MSC-1…MSC-10).
```

## Post-commit

```sh
git push -u origin HEAD
gh pr create --title "feat(spec): 011 mise SDD CLI + workflow dogfood" --body "…"
```
