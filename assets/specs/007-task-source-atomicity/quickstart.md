# Quickstart: task source atomicity verification

> **Superseded by [`assets/specs/008-task-mutation-failure-ux/quickstart.md`](../008-task-mutation-failure-ux/quickstart.md)**
>
> All task mutation failure UX verification has moved to the 008 spec directory.
> The 008 quickstart covers unit tests, e2e validation, fault injection setup,
> fixture isolation, phase-gated slice validation, and the full readiness gate.
>
> ## Key commands (from 008)
>
| Purpose | Command |
|---|---|
| Unit/route tests | `bun test src/shell/app src/shell/main/rpc --filter task` |
| Tagged e2e | `mise run test tag task_source_atomicity --e2e` |
| Fault injection e2e | `KB_E2E_FAULT_INJECTION=1 mise run test tag task_source_atomicity --e2e` |
| Phase gate | `mise run spec ready --phase` |
| Full readiness gate | `mise run spec ready assets/specs/008-task-mutation-failure-ux --key task_source_atomicity` |
