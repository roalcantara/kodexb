# Research: task source atomicity

## Decision 1: Use source-write result as mutation success authority

- Decision: Mark task mutation as successful only after source persistence succeeds.
- Rationale: The source file is the canonical store; success before durability causes split-brain with the projection.
- Alternatives considered:
  - Projection-first optimistic success and later source retry: rejected because it violates source-of-truth honesty and creates user-visible reversals.
  - Best-effort source save with warning-only failure: rejected because users cannot rely on mutation outcomes.

## Decision 2: Keep projection writes downstream of source success

- Decision: Projection update is attempted only after source write success, and failure paths must not leave a logically successful mutation with failed source state.
- Rationale: Projection is a derivative index; the write order must preserve canonical consistency.
- Alternatives considered:
  - Dual-write with compensation: rejected due to unnecessary complexity and harder determinism in local desktop runtime.

## Decision 3: Introduce explicit conflict failures for concurrent mutation races

- Decision: Detect source version mismatch and return an explicit conflict failure payload.
- Rationale: Explicit conflict is safer than silent overwrite and gives the UI actionable feedback.
- Alternatives considered:
  - Last-writer-wins overwrite: rejected because it can erase user edits without acknowledgement.

## Decision 4: Normalize failure messaging for mutation-aware UX

- Decision: Use a shared mutation failure template that reports operation, target identity, and conflict/source-write cause.
- Rationale: Consistent failure semantics reduce renderer ambiguity and improve supportability.
- Alternatives considered:
  - Route-specific ad-hoc messages: rejected due to inconsistent behavior and harder testing.

## Decision 5: Preserve current technology stack and architectural boundaries

- Decision: No new libraries, no schema stack change, no FCIS boundary changes.
- Rationale: Existing stack (TypeBox + Elysia/Eden + bun:sqlite) already supports required guarantees.
- Alternatives considered:
  - Add transactional middleware abstraction: rejected as premature and unrelated to the feature-level guarantee.

## Skill-loading note

This plan uses project-routed planning context and keeps companion context minimal to avoid overloading skill routing during planning.
