# Implementation Plan: Task source atomicity

**Branch**: `007-task-source-atomicity` | **Date**: 2026-06-08 | **Spec**: `assets/specs/007-task-source-atomicity/spec.md`

**Input**: Feature specification from `assets/specs/007-task-source-atomicity/spec.md`

## Summary

Ensure task mutation RPC outcomes are source-truthful and atomic from the user perspective: source persistence is authoritative, mutation success is returned only after source write succeeds, projection updates never persist unreconcilable state, and concurrent conflicts are rejected explicitly rather than overwritten silently.

## Feature deltas

| Topic | Delta |
| ----- | ----- |
| RPC | Task mutation RPC result contract updated to reflect source persistence outcome and conflict rejection semantics |
| App task mutation flow | Source-first completion contract introduced; projection update follows successful source write |
| Error handling | Mutation-aware shared failure-message template and explicit conflict failure shape |
| Sync consistency | Regression protection for no unexpected reversals after failed mutations |
| E2e | New e2e feature path declared: `assets/features/e2e/task-source-atomicity.feature` |

## Technical Context

**Language/Version**: TypeScript (Bun runtime, strict TS project)

**Primary Dependencies**: Bun runtime, Elysia + Eden Treaty RPC, TypeBox validation, bun:sqlite

**Storage**: YAML source files (system of record) + SQLite projection

**Testing**: bun:test (co-located specs), existing e2e harness where applicable

**Target Platform**: Electrobun desktop app (macOS + Linux)

**Project Type**: Desktop application with typed RPC bridge and local persistence

**Performance Goals**: Mutation latency remains perceptibly instant; no additional blocking beyond required source-first durability confirmation

**Constraints**: Must preserve FCIS boundaries, TypeBox-only validation, no silent success on source-write failure, and explicit conflict behavior

**Scale/Scope**: Task create/update/delete/reorder mutation paths in App + RPC surface; no historical migration work

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Pre-Phase 0 check:

1. Principle I (local-first, keyboard-first): PASS — no network dependency added.
2. Principle II (FCIS): PASS — design keeps business outcome rules in core/app domain logic and I/O in shell/app utilities.
3. Principle III (source-of-truth honesty): PASS — this is the primary objective.
4. Principle IV (Type-safe contracts): PASS — no schema stack changes.
5. Principle V (test-first evidence): PASS — plan includes deterministic tests for success/failure/conflict and sync regression.
6. Principle IX (security posture): PASS — no relaxation of security gate behavior.

Post-Phase 1 re-check:

1. No new architecture violations introduced: PASS.
2. Requirements remain measurable/testable and implementation-neutral in spec: PASS.
3. Planned artifacts support deterministic verification without weakening existing quality gates: PASS.

## Project Structure

### Documentation (this feature)

```text
assets/specs/007-task-source-atomicity/
├── spec.md
├── plan.md
├── tasks.md
├── handoff.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    └── task-mutation-outcome.contract.md
```

### Source Code (repository root)

```text
src/
├── shell/
│   ├── app/
│   │   ├── app.service.ts
│   │   └── lib/
│   │       └── app_task_source.util.ts
│   └── main/
│       └── rpc/
│           └── routes/
│               └── task.routes.ts
├── core/
│   └── domain/
└── __tests__/

bdd/
└── e2e/
```

**Structure Decision**: Keep current FCIS/Electrobun layout; scope changes to existing task mutation and RPC files plus co-located specs.

## E2e traceability

| Requirement | Feature file | Scenario | Notes |
| ----------- | ------------ | -------- | ----- |
| TSA-1 | `assets/features/e2e/task-source-atomicity.feature` | Mutation fails when source write fails | `@spec:task-source-atomicity` |
| TSA-2 | `assets/features/e2e/task-source-atomicity.feature` | Failed mutation has no sync reversal | `@spec:task-source-atomicity` |
| TSA-2 | `assets/features/e2e/task-source-atomicity.feature` | Concurrent conflict returns explicit failure | `@spec:task-source-atomicity` |
| TSA-3 | `assets/features/e2e/task-source-atomicity.feature` | Mutation failure emits correlated structured diagnostics | `@spec:task-source-atomicity` |

Normative Gherkin text lives in the feature file only.

## Complexity Tracking

No constitution violations requiring exception tracking.
