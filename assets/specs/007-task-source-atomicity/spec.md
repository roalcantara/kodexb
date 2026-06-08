<!-- markdownlint-disable-file -->

# Task source atomicity

**Feature Branch**: `007-task-source-atomicity`
**Release**: v0.x
**Status**: Draft

**Input**: Today, task create/update/delete/reorder in App writes SQLite first, then calls writeTaskToSource / removeTaskFromSource, which log errors and return without throwing. The RPC layer therefore returns success while YAML may be unchanged, creating silent split-brain. A later sync can rebuild SQLite from YAML and undo perceived user action.

## Introduction

Task mutations currently acknowledge success even when durable source persistence fails. This creates a trust and data-consistency issue: users think an operation succeeded, but later synchronization can revert it. This feature ensures task mutation outcomes always reflect source persistence and that local projection updates do not become irreconcilable with source state.

## Out of scope

- Changes to task schema or user-facing task fields
- Bulk migration of historical inconsistent records
- New sync algorithms beyond preserving existing reconciliation behavior
- New authorization or role models

## Glossary

| Term | Meaning |
| ---- | ------- |
| Source | Durable task definition files used as system-of-record input |
| Projection | SQLite task representation used for fast app operations |
| Mutation | Create, update, delete, or reorder task operation |
| Split-brain | Source and projection disagree while operation was reported as successful |

## Clarifications

### Session 2026-06-08

- Q: Which failure-message policy should be normative for create/update/delete/reorder mutation failures? → A: Structured, mutation-aware messages with a shared template.
- Q: Which write-order contract should the feature require for mutation completion semantics? → A: Source-first commit; success only after source persistence succeeds, then projection update.
- Q: What conflict-resolution policy should be required for concurrent mutations on the same task? → A: Reject conflicting second write with explicit conflict failure.

---

## REQUIREMENT TSA-1: Mutation result reflects durable source outcome

**User story:** As a user, I want task mutation responses to match actual persistence so that I can trust operation results.

### Acceptance criteria

1. WHEN a task mutation request is processed and source persistence succeeds, THEN the operation SHALL return success.
   - **Measure:** 100% of successful source writes return success in mutation responses across create, update, delete, and reorder.
   - **Evidence:** `bun test` coverage for mutation success paths and response assertions.

2. WHEN a task mutation request is processed and source persistence fails, THEN the operation SHALL return failure and include a clear reason using a shared template with operation-specific fields (`operation`, `taskId`, `status`, `correlation`) and user-safe wording.
   - **Measure:** 100% of simulated source-write failures return non-success mutation outcomes with mutation-aware, user-safe failure messaging using a shared template across mutation types and required operation-specific fields.
   - **Evidence:** `bun test` coverage for failure paths per mutation type.

3. WHEN source persistence fails, THEN no success acknowledgement SHALL be emitted for that mutation.
   - **Measure:** Zero false-positive success responses during failure-injection test runs.
   - **Evidence:** `bun test` assertions on response status and emitted events.

---

## REQUIREMENT TSA-2: Projection consistency is preserved on source failure

**User story:** As an operator, I want projection updates to remain reconcilable with source so that sync does not undo user actions unexpectedly.

### Acceptance criteria

1. WHEN source persistence for a mutation fails, THEN the projection state SHALL remain unchanged or be restored to the pre-mutation state before completion.
   - **Measure:** In failure-injection scenarios, post-operation projection snapshots match pre-operation snapshots for all mutation types.
   - **Evidence:** `bun test` snapshot and state-diff assertions.

2. WHEN source persistence succeeds, THEN the projection state SHALL match source-derived expected state for that mutation.
   - **Measure:** 100% of success-path projection validations pass for create, update, delete, and reorder.
   - **Evidence:** `bun test` reconciliation checks.

3. WHEN a follow-up sync executes after any failed mutation, THEN it SHALL not apply an unexpected reversal caused by a previously misreported success.
   - **Measure:** Zero unexpected reversals in sync-after-failure regression scenarios.
   - **Evidence:** `bun test` sync regression cases.

4. WHEN a mutation is processed, THEN the completion contract SHALL be source-first: mutation success is permitted only after source persistence succeeds, and projection update happens afterward.
   - **Measure:** 100% of completion-path tests show success only on source-first completion order.
   - **Evidence:** `bun test` ordering contract assertions for all mutation types.

5. WHEN concurrent mutations target the same task and conflict, THEN the later conflicting write SHALL be rejected with explicit conflict failure (no silent overwrite).
   - **Measure:** 100% of concurrent-conflict tests return explicit conflict failure for the rejected write.
   - **Evidence:** `bun test` conflict-handling assertions for create/update/delete/reorder combinations.

---

## REQUIREMENT TSA-3: Failure visibility and auditability

**User story:** As a maintainer, I want persistence failures to be visible and attributable so that I can diagnose and remediate quickly.

### Acceptance criteria

1. WHEN source persistence fails during a mutation, THEN a structured failure record SHALL be emitted with mutation type and correlation context.
   - **Measure:** 100% of failure-path tests emit one structured failure record with required fields.
   - **Evidence:** `bun test` assertions on emitted diagnostics.

2. WHEN repeated failures occur, THEN records SHALL be distinguishable per request to support incident triage.
   - **Measure:** Distinct correlation values across repeated-failure test runs.
   - **Evidence:** `bun test` verification of per-request identifiers.

3. WHEN no failure occurs, THEN failure-specific diagnostics SHALL not be emitted.
   - **Measure:** Zero failure diagnostics in success-only test suites.
   - **Evidence:** `bun test` negative assertions.

---

## E2e declaration (optional — pointers only)

| Requirement | E2e tag        | Scenario (name only) |
| ----------- | -------------- | -------------------- |
| TSA-1       | `@spec:task-source-atomicity` | Task mutation reports failure on source write failure |
| TSA-2       | `@spec:task-source-atomicity` | Failed mutation does not create sync reversal |
| TSA-3       | `@spec:task-source-atomicity` | Mutation failure emits correlated structured diagnostics |

Gherkin text lives in **`assets/features/e2e/<slug>.feature`**, not in this file.
State under **Out of scope** when e2e is deferred for this increment.

## Assumptions (optional)

- Source persistence failure can be detected synchronously at mutation completion.
- The system can access pre-mutation projection state for rollback or no-op enforcement.
- Existing sync behavior remains unchanged once mutation outcomes and projection consistency are corrected.
- Mutation clients can consume non-success outcomes without protocol changes.

## Open Questions (optional)

| #    | Question | Status | Notes |
| ---- | -------- | ------ | ----- |
| OQ-1 | Should user-facing failure messages differ by mutation type or use one generic message? | Resolved | Use one shared template with operation-specific fields; keep wording user-safe while diagnostics remain specific. |
