<!-- markdownlint-disable-file -->

# Handoff — Agentic workflow orchestrator (`009`) — program closeout

**Spec:** [`spec.md`](./spec.md) (AWO-1…AWO-13) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)
**Branch:** `feature/009-m4-retro-sandbox` · **Status:** **COMPLETE** — all tasks `[X]`

---

## Agent workflow

| Step | Action | Success signal |
| ---- | ------ | -------------- |
| 1 | Confirm branch | `feature/009-m4-retro-sandbox` |
| 2 | Full verify (below) | All exit 0 |
| 3 | Commit + push; `gh pr edit` | PR updated |

---

## In scope (this PR)

- **MVP**: schemas, profile loading, executor adapter, persistence, conformance (AWO-2, 9, 10, 4, 12)
- **M1**: machine, orchestrator actor, snapshot + resume + teardown + shutdown (AWO-1, 5, 13)
- **M2**: intervention + memory (AWO-3, 7)
- **M3**: PR/CI completion (AWO-6)
- **M4**: retrospective + sandbox (AWO-8, 11)
- **Polish**: crossref lint + NFR baselines + harness (AWO-12)
- **Optional**: real SDD bindings + nightly smoke

## Out of scope

- `packages/workflow-core` / `packages/workflow-runtime` extraction
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
