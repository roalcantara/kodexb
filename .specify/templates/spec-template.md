<!-- markdownlint-disable-file -->

# [Feature title]

**Feature Branch**: `[###-feature-name]`
**Release**: v0.x
**Status**: Draft

**Input**: $ARGUMENTS

## Introduction

[Problem, goal, user value]

## Out of scope

- [Explicit non-goals]

## Glossary

| Term | Meaning |
| ---- | ------- |
|      |         |

---

## REQUIREMENT [PREFIX]-1: [Short title]

**User story:** As a …, I want … so that …

### Acceptance criteria

1. WHEN …, THEN …
   - **Measure:** …
   - **Evidence:** `bun test path/to.spec.ts`

2. WHEN …, THEN …
   - **Measure:** …
   - **Evidence:** `bun test …`

---

## E2e declaration (optional — pointers only)

| Requirement | E2e tag        | Scenario (name only) |
| ----------- | -------------- | -------------------- |
| [PREFIX]-1  | `@spec:<slug>` | [Scenario title]     |

Gherkin text lives in **`assets/features/e2e/<slug>.feature`**, not in this file.
State under **Out of scope** when e2e is deferred for this increment.

## Assumptions (optional)

- …

## Open Questions (optional)

| #    | Question | Status | Notes |
| ---- | -------- | ------ | ----- |
| OQ-1 | …        | Open   | …     |
