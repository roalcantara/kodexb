# Contract: task mutation outcome

## Scope

Defines the behavior contract for task mutation RPC responses so clients can rely on source-truthful semantics.

## Request contract

- RPC operation: task mutation endpoint(s) handling create, update, delete, reorder, cycle_status, cycle_priority.
- Fields:
  - operation (required)
  - taskId (optional; number; absent for create when server-assigned, required for update/delete/reorder)
  - sourceVersion (optional; number; required for operations that use optimistic concurrency such as update/delete)
  - payload

## Response contract

### Success

- Conditions:
  - source write succeeded
  - conflict not detected
- Shape:
  - ok: true
  - status: success
  - operation
  - taskId
  - sourceVersion (updated)
  - message

### Conflict failure

- Conditions:
  - request sourceVersion does not match current source version
- Shape:
  - ok: false
  - status: conflict
  - operation
  - taskId
  - message
  - details.currentSourceVersion

### Source-write failure

- Conditions:
  - persistence to canonical source fails
- Shape:
  - ok: false
  - status: source_write_failed
  - operation
  - taskId
  - message

### Projection failure (post-source)

- Conditions:
  - source write succeeded but projection update failed
- Shape:
  - ok: false
  - status: projection_failed
  - operation
  - taskId
  - sourceVersion
  - message
- Rule:
  - Must not imply source write was rolled back unless rollback actually occurred.

## Behavioral guarantees

1. No ok=true response when source write failed.
2. Conflict is explicit and non-destructive.
3. Failure messages are mutation-aware and operation-specific.
4. Renderer can branch logic solely from status/ok without string parsing.

## Backward-compatibility note

If existing clients assume boolean-only success, adapter logic must preserve current callsites while introducing the richer status field.
