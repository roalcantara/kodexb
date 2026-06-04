# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Stack baseline

Authoritative stack and FCIS rules: [`.specify/memory/constitution.md`](../../memory/constitution.md)
and [`CLAUDE.md`](../../../CLAUDE.md). Do not repeat the full guide index here.

## Feature deltas

Only list what **differs** from the baseline for this feature (new RPC routes, tables,
e2e paths, performance targets). Use `NEEDS CLARIFICATION` only for unknowns that
block design — resolve in Phase 0 research.

| Topic      | Delta                      |
| ---------- | -------------------------- |
| [e.g. RPC] | [new routes or none]       |
| [e.g. DB]  | [schema/migration or none] |
| [e.g. E2e] | [feature file path]        |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on constitution file]

## Project Structure

### Documentation (this feature)

```text
assets/specs/[###-feature]/
├── spec.md
├── plan.md
├── tasks.md
├── handoff.md
└── artifacts/          # optional: research, contracts, checklists
```

### Source Code (repository root)

[Concrete paths under `src/` for this feature — delete unused placeholders]

## Complexity Tracking

| Violation          | Why Needed     | Simpler Alternative Rejected Because |
| ------------------ | -------------- | ------------------------------------ |
| [e.g. 4th project] | [current need] | [why 3 projects insufficient]        |
