# Quickstart: task source atomicity verification

## Preconditions

- Branch checked out: `007-task-source-atomicity`
- Feature directory exists: `assets/specs/007-task-source-atomicity`
- Local environment prepared via repo standard toolchain

## 1. Run focused task mutation tests

```bash
bun test src/shell/app src/shell/main/rpc --filter task
```

Expected:
- Conflict path tests pass.
- Source-write failure tests pass.
- Success path asserts source write before success outcome.

## 2. Run relevant e2e trace scenario set

```bash
bun test bdd/e2e --filter task-source-atomicity
```

Expected:
- No silent overwrite under concurrent mutation.
- Failed source write does not create success projection state.

## 3. Run strict audit and analyze pass

```bash
mise run spec audit assets/specs/007-task-source-atomicity --strict
```

```bash
/speckit-analyze 007-task-source-atomicity
```

Expected:
- Strict audit reports clean.
- Analyze reports 0 CRITICAL and 0 HIGH issues before implementation.

## 4. Run repository quality gate for completion

```bash
mise run spec ready assets/specs/007-task-source-atomicity --key task-source-atomicity
```

Expected:
- Gate exits success.
- No new security/perf/lint regressions.

## 5. Manual smoke check (optional)

- Trigger a task update while simulating source write failure (fixture/mocked failure path).
- Confirm UI shows explicit failure message and task is not reported as successfully mutated.
- Trigger two concurrent edits with stale version token.
- Confirm one succeeds and the stale operation returns conflict.
