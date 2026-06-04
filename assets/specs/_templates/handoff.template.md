# Handoff — `[NNN-slug]`

**Spec:** `assets/specs/[NNN-slug]/`
**Branch:** `[NNN-slug]`

## Agent prompt

```text
Implement spec `[NNN-slug]`. Read spec.md, plan.md, tasks.md, artifacts/tasks/handoff.md,
and artifacts/plan/* as linked from plan.md.

Run `mise run spec gate -- assets/specs/[NNN-slug]` before done.
For implement on OpenCode: `specify workflow run … --integration opencode` (see SDD_WORKFLOW_GUIDE.md §Pilot 004).
When touching src/, run at least one code-review-graph MCP query; review with `mise run graph usage-report --days 14` after the feature.
```

## Acceptance criteria tracker

| ID  | Done when | Evidence |
| --- | --------- | -------- |
|     |           |          |

## Workflow closure

| Check                          | Status | Evidence                                         |
| ------------------------------ | ------ | ------------------------------------------------ |
| `mise run spec audit --strict` |        |                                                  |
| `mise run spec trace`          |        |                                                  |
| `mise run spec gate`           |        |                                                  |
| Draft PR                       |        | `mise run spec pr-draft assets/specs/[NNN-slug]` |
