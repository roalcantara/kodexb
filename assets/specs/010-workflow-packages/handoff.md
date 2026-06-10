<!-- markdownlint-disable-file -->

# Handoff — Workflow packages & engine follow-ups (`010`)

**Spec:** [`spec.md`](./spec.md) (WEP-1…WEP-9) · **Plan:** [`plan.md`](./plan.md) · **Tasks:** [`tasks.md`](./tasks.md)
**Branch:** `feature/010-workflow-packages` · **Status:** Ready — **009 merged** on `main`
**Successor:** [`011-mise-sdd-cli`](../011-mise-sdd-cli/)

---

## Scope (one PR)

| Track              | Phases | Outcome                                      |
| ------------------ | ------ | -------------------------------------------- |
| **Packages**       | 1–5    | `@kb/workflow-core` + `@kb/workflow-runtime` |
| **009 follow-ups** | 6–8    | PROFILE-SDD-01, SMOKE-01, kb lint boundary   |

**Mise CLI redesign** → [`011`](../011-mise-sdd-cli/) (orchestrator dogfood closeout).

---

## Acceptance criteria tracker

| ID         | Done when                                                                                                        | Evidence                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| WEP-1 AC1  | `bun install` resolves `@kb/workflow-core` and `@kb/workflow-runtime` as workspace packages with `private: true` | `cd packages/workflow-core && bun test && cd ../workflow-runtime && bun test`                            |
| WEP-2 AC1  | ast-grep finds no spawn/child_process/toolchain strings in core package                                          | `bun run lint:ast-grep`                                                                                  |
| WEP-3 AC1  | dependency-cruiser finds no `src/shell/**` or renderer imports in runtime package                                | `bun run lint:depcruise`                                                                                 |
| WEP-4 AC1  | Governance workflow specs pass without duplicating L1/L2 source under tools/governance                           | `bun test --config /dev/null tools/governance/specs/workflow/`                                           |
| WEP-5 AC1  | WORKFLOW_GUIDE.md documents `@kb/workflow-core` / `@kb/workflow-runtime` and governance CLI seams                | `mise run spec lint assets/specs/010-workflow-packages`                                                  |
| WEP-6 AC1  | Each SDD stage in default.yaml has real kb bindings; profile validates and conformance passes                    | `mise run catalog validate`                                                                              |
| WEP-7 AC1  | Smoke workflow drives a committed fixture feature dir through orchestrator; nightly CI green                     | `mise run spec workflow orchestrated-handoff --feature tools/__tests__/fixtures/workflow/smoke-feature` |
| WEP-8 AC1  | `profile_guide_crossref.script.ts` stays in governance — not imported by packages                                | `bun run lint:depcruise`                                                                                 |
| WEP-9 AC1  | One PR delivers packages + profile bindings + smoke wiring + guide updates                                       | `mise run spec gate assets/specs/010-workflow-packages`                                                  |
| WEP-10 AC1 | Shared deps use root `catalog:` in workspace packages; CI frozen install                                         | `bun install`                                                                                            |

---

## Agent workflow

| Step | Action                                        |
| ---- | --------------------------------------------- |
| 1    | Branch `feature/010-workflow-packages`        |
| 2    | Phases 1→9 per [`tasks.md`](./tasks.md)       |
| 3    | Verify (below)                                |
| 4    | Single PR; then start **011** on fresh branch |

---

## Verify (all must exit 0)

```sh
# Packages
bun test --config /dev/null packages/workflow-core/
bun test --config /dev/null packages/workflow-runtime/
bun test --config /dev/null tools/governance/specs/workflow/
bun test --config /dev/null ./tools/governance/specs/workflow_run.script.spec.ts

# Profile + smoke
mise run catalog validate
mise run spec gate assets/specs/010-workflow-packages

# Quality
bun run lint:ast-grep
mise run spec lint assets/specs/010-workflow-packages
mise run app gates --quality
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

---

## Commit message (squash target)

```text
feat(workflow): promote workflow packages and profile smoke

Extract @kb/workflow-*; complete default.yaml SDD bindings;
orchestrator nightly smoke (WEP-1…WEP-9).
```

## Post-commit

```sh
git push -u origin HEAD
gh pr create --title "feat(workflow): 010 workflow packages" --body "…"
```
