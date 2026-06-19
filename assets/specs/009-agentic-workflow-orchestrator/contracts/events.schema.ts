// Spec fixture for AWO-4 / AWO-9.4 / AWO-11.4 / AWO-12.2 / AWO-13 —
// orchestrator event-type extension over the canonical event base
// defined in OBSERVABILITY_GUIDE.md.
// Ephemeral spike — promoted on the MVP slice by EXTENDING the existing
// WorkflowEvent union in packages/ops/src/governance/specs/workflow/workflow_run.script.ts
// (do not fork a second writer or event union).
// Runtime imports from that stable path, never from this spec folder.

import { Type, type Static } from '@sinclair/typebox'

export const EVENTS_SCHEMA_VERSION = '009.1.0' as const

// Canonical project-wide event base; the runtime import will be
// `import { WorkflowEventBase } from '@core/observability'`. This local
// declaration pins the shape so the extension types compose correctly.
export const WorkflowEventBase = Type.Object({
  schema_version: Type.String(),
  ts: Type.String({ format: 'date-time' }),
  run_id: Type.String(),
  source: Type.String({ description: 'process emitting the event' })
})

const stageEvent = (typeLiteral: string) =>
  Type.Composite([
    WorkflowEventBase,
    Type.Object({
      type: Type.Literal(typeLiteral),
      stage: Type.String(),
      attempt: Type.Optional(Type.Integer({ minimum: 0 })),
      elapsed_ms: Type.Optional(Type.Integer({ minimum: 0 })),
      details: Type.Optional(Type.Record(Type.String(), Type.Unknown()))
    })
  ])

export const StageEnteredEvent = stageEvent('stage.entered')
export const StageExitedEvent = stageEvent('stage.exited')
export const StageRetriedEvent = stageEvent('stage.retried')
export const StageEscalatedEvent = stageEvent('stage.escalated')

export const TransitionEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Union([Type.Literal('transition.auto'), Type.Literal('transition.gated')]),
    from: Type.String(),
    to: Type.String(),
    cause: Type.String({ description: 'guard id or operator action' })
  })
])

// AWO-9.4 — every command invocation emits start/end events with the
// full command string preserved for audit.
export const TaskInvocationEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Union([
      Type.Literal('task.invoked'),
      Type.Literal('task.completed')
    ]),
    command: Type.String({ description: 'full command string from profile' }),
    role: Type.Union([
      Type.Literal('trigger.pre'),
      Type.Literal('trigger.post'),
      Type.Literal('evidence'),
      Type.Literal('provider'),
      Type.Literal('teardown'),
      Type.Literal('retrospective')
    ]),
    stage: Type.Optional(Type.String()),
    exit_code: Type.Optional(Type.Integer()),
    duration_ms: Type.Optional(Type.Integer({ minimum: 0 })),
    status: Type.Optional(Type.Union([
      Type.Literal('ok'),
      Type.Literal('fail'),
      Type.Literal('cancelled')
    ])),
    cancellation_reason: Type.Optional(Type.String())
  })
])

export const DecisionEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Union([
      Type.Literal('decision.requested'),
      Type.Literal('decision.defaulted'),
      Type.Literal('decision.answered')
    ]),
    question_id: Type.String(),
    source: Type.Optional(Type.String({ description: 'memory, profile, or operator' })),
    rationale: Type.Optional(Type.String())
  })
])

// AWO-11.4 — sandbox violations.
export const SandboxViolationEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Literal('sandbox.violation'),
    stage: Type.String(),
    descriptor_field: Type.Union([
      Type.Literal('tool_allowlist'),
      Type.Literal('fs_scope'),
      Type.Literal('secret_handling'),
      Type.Literal('network')
    ]),
    attempted: Type.String({ description: 'redacted summary of the attempted action' })
  })
])

// AWO-12.4 — schema drift between live tail and durable archive, or
// canonical base bump without extension catch-up.
export const ContinuityViolationEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Literal('continuity.violation'),
    offending_field: Type.String(),
    expected_schema_version: Type.String(),
    observed_schema_version: Type.String()
  })
])

// AWO-2 — emitted when an envelope or other payload fails schema validation.
export const SchemaViolationEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Literal('schema.violation'),
    payload_type: Type.String(),
    errors: Type.Array(Type.String())
  })
])

// AWO-13 — graceful shutdown trace events.
export const ShutdownEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Union([
      Type.Literal('shutdown.requested'),
      Type.Literal('shutdown.completed')
    ]),
    signal: Type.Optional(Type.String()),
    grace_ms: Type.Optional(Type.Integer({ minimum: 0 }))
  })
])

export const RunSummaryEvent = Type.Composite([
  WorkflowEventBase,
  Type.Object({
    type: Type.Literal('run.summary'),
    outcome: Type.Union([
      Type.Literal('terminal_success'),
      Type.Literal('terminal_failure'),
      Type.Literal('cancelled')
    ]),
    lead_time_ms: Type.Integer({ minimum: 0 }),
    stage_durations_ms: Type.Record(Type.String(), Type.Integer({ minimum: 0 })),
    interventions: Type.Integer({ minimum: 0 }),
    retries: Type.Integer({ minimum: 0 })
  })
])

export const Awo009Event = Type.Union([
  StageEnteredEvent,
  StageExitedEvent,
  StageRetriedEvent,
  StageEscalatedEvent,
  TransitionEvent,
  TaskInvocationEvent,
  DecisionEvent,
  SandboxViolationEvent,
  ContinuityViolationEvent,
  SchemaViolationEvent,
  ShutdownEvent,
  RunSummaryEvent
])

export type Awo009EventT = Static<typeof Awo009Event>
