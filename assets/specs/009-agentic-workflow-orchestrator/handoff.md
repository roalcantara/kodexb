<!-- markdownlint-disable-file -->

# Handoff — Agentic workflow orchestrator (`009`) — program closeout

**Spec:** [`spec.md`](./spec.md) (AWO-1…AWO-13) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)
**Branch:** merged to `main` · **Status:** **Program complete** — optional follow-ups split to [`010-workflow-packages`](../010-workflow-packages/) and [`011-mise-sdd-cli`](../011-mise-sdd-cli/).

---

## Agent workflow

| Step | Action                      | Success signal                 |
| ---- | --------------------------- | ------------------------------ |
| 1    | Confirm branch              | `feature/009-m4-retro-sandbox` |
| 2    | Full verify (below)         | All exit 0                     |
| 3    | Commit + push; `gh pr edit` | PR updated                     |

---

## In scope (this PR)

- **MVP**: schemas, profile loading, executor adapter, persistence, conformance (AWO-2, 9, 10, 4, 12)
- **M1**: machine, orchestrator actor, snapshot + resume + teardown + shutdown (AWO-1, 5, 13)
- **M2**: intervention + memory (AWO-3, 7)
- **M3**: PR/CI completion (AWO-6)
- **M4**: retrospective + sandbox (AWO-8, 11)
- **Polish**: crossref lint + NFR baselines + harness (AWO-12)
- **Optional (partial)**: SDD bindings started, smoke CI validates spec gate; remainder → **010** / **011**

## Out of scope (successor specs)

- `packages/workflow-core` / `packages/workflow-runtime` → [`010-workflow-packages`](../010-workflow-packages/)
- Full per-stage SDD command bindings (PROFILE-SDD-01) → **010**
- Orchestrator nightly smoke (SMOKE-01) → **010**
- Mise SDD CLI hub (`spec test`, `task_runner`) → [`011-mise-sdd-cli`](../011-mise-sdd-cli/)
- Process isolation (AWO-11 v2, OQ-8)

---

## Verify (all must exit 0)

```sh
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts
bun run lint:ast-grep
mise run spec lint assets/specs/009-agentic-workflow-orchestrator
mise run spec gate assets/specs/009-agentic-workflow-orchestrator
mise run app gates --quality
mise run spec ready
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Commit message

```text
feat(workflow): close 009 program on M4 branch

M1 teardown/shutdown/resume gaps, polish lint + NFR harness,
default.yaml SDD bindings, nightly smoke (AWO-5/13/12).
```

## Post-commit

```sh
git push origin HEAD
gh pr edit --title "feat(workflow): 009 program closeout (MVP–M4 + polish)"
```
