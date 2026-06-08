# Data Model: task source atomicity

## Entities

### TaskMutationRequest

- Fields:
  - operation: create | update | delete | reorder
  - taskId: string
  - sourceVersion: string | number (required for conflict detection)
  - payload: operation-specific task fields
- Validation: TypeBox schema at RPC boundary.

### TaskMutationOutcome

- Fields:
  - ok: boolean
  - status: success | source_write_failed | conflict | projection_failed
  - operation: create | update | delete | reorder
  - taskId: string
  - sourceVersion: string | number (new authoritative version when success)
  - message: string
  - details: optional structured diagnostics (non-sensitive)
- Invariant:
  - ok=true is allowed only when source write succeeded.

### SourceState

- Description: canonical YAML representation for tasks and metadata.
- Key fields:
  - tasks: ordered collection
  - version: monotonic change marker
- Invariant:
  - any successful mutation must result in persisted SourceState update.

### ProjectionState

- Description: SQLite-derived query model used by app workflows.
- Invariant:
  - projection must not represent a successful mutation absent a successful SourceState write.

## Relationships

- TaskMutationRequest -> SourceState (authoritative write)
- SourceState -> ProjectionState (derived update)
- TaskMutationOutcome summarizes both mutation intent and write-stage result.

## Transition rules

1. Validate request schema and operation preconditions.
2. Compare request.sourceVersion to current SourceState version.
3. If mismatch, return conflict outcome without mutation.
4. Attempt SourceState write.
5. If source write fails, return source_write_failed outcome and stop.
6. Attempt ProjectionState refresh/update.
7. Return success only when step 4 succeeded; projection failures are surfaced explicitly and must not misreport canonical success.

## Test implications

- Unit/integration tests must assert:
  - success outcome implies source write happened
  - source write failure never reports success
  - conflict path leaves source/projection unchanged
  - no sync reversal after failed mutation path
