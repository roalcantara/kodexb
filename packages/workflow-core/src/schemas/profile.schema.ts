import { type Static, Type } from '@sinclair/typebox'

export const PROFILE_SCHEMA_VERSION = '009.1.0' as const

// allowed_prefixes must be tool-agnostic — this schema only defines the
// shape. Actual command-prefix values live in profile YAML (KB/engine
// configuration), not here. Do NOT add a DEFAULT_COMMAND_ALLOWLIST.
export const ExecutionPolicy = Type.Object({
  allowed_prefixes: Type.Array(Type.String(), {
    minItems: 1,
    description: 'accepted command prefixes; profile data, no engine default'
  })
})

export const RetryPolicy = Type.Object({
  max_attempts: Type.Integer({ minimum: 1, default: 3 }),
  backoff: Type.Union([Type.Literal('exponential'), Type.Literal('linear'), Type.Literal('constant')], {
    default: 'exponential'
  }),
  base_ms: Type.Integer({ minimum: 0, default: 500 }),
  cap_ms: Type.Integer({ minimum: 0, default: 30000 }),
  jitter: Type.Union([Type.Literal('full'), Type.Literal('equal'), Type.Literal('none')], { default: 'full' }),
  reset_on_new_cause: Type.Boolean({ default: true }),
  escalation_event: Type.String({ default: 'stage.escalated' })
})

export const CommandString = Type.String({
  minLength: 1,
  description: 'command line; opaque to engine; prefix checked against execution_policy'
})

export const TriggerMap = Type.Object({
  pre: Type.Optional(CommandString),
  post: Type.Optional(CommandString)
})

export const SandboxDescriptor = Type.Object({
  tool_allowlist: Type.Array(Type.String()),
  fs_scope: Type.Object({
    allow_roots: Type.Array(Type.String()),
    deny: Type.Optional(Type.Array(Type.String()))
  }),
  secret_handling: Type.Union([Type.Literal('none'), Type.Literal('passthrough'), Type.Literal('redacted')], {
    default: 'redacted'
  }),
  network: Type.Union([Type.Literal('offline'), Type.Literal('localhost'), Type.Literal('declared_hosts')], {
    default: 'offline'
  }),
  declared_hosts: Type.Optional(Type.Array(Type.String())),
  acknowledged_unsafe: Type.Optional(Type.Boolean({ default: false }))
})

export const StageDefinition = Type.Object({
  id: Type.String(),
  worker: Type.String(),
  sandbox: Type.Optional(SandboxDescriptor),
  optional: Type.Optional(Type.Boolean({ default: false })),
  human_gated: Type.Optional(Type.Boolean({ default: false })),
  triggers: Type.Optional(TriggerMap),
  evidence: Type.Optional(Type.Array(CommandString)),
  retry: Type.Optional(RetryPolicy),
  teardown: Type.Optional(Type.Array(CommandString)),
  teardown_timeout_ms: Type.Optional(Type.Integer({ minimum: 0, default: 30000 })),
  parallel: Type.Optional(Type.Boolean({ default: false }))
})

export const StageTransition = Type.Object({
  from: Type.String(),
  to: Type.String(),
  on: Type.Union([
    Type.Literal('DONE'),
    Type.Literal('NEED_INPUT'),
    Type.Literal('BLOCKED'),
    Type.Literal('RETRYABLE_FAILURE')
  ]),
  guard: Type.Optional(Type.String())
})

export const MemoryPolicy = Type.Object({
  conflict: Type.Union([Type.Literal('prefer_latest'), Type.Literal('prompt_user'), Type.Literal('block')], {
    default: 'prompt_user'
  }),
  retention: Type.Object({
    tmp_days: Type.Integer({ minimum: 0, default: 30 }),
    durable_days: Type.Integer({ minimum: 0, default: 365 })
  })
})

export const ProviderBindings = Type.Object({
  pr_open: Type.Optional(CommandString),
  pr_update: Type.Optional(CommandString),
  ci_status: Type.Optional(CommandString),
  retrospective: Type.Optional(CommandString)
})

export const ShutdownPolicy = Type.Object({
  grace_ms: Type.Integer({ minimum: 0, default: 10000 }),
  signals: Type.Array(Type.String(), { default: ['SIGINT', 'SIGTERM'] })
})

export const ProfileSchema = Type.Object({
  schema_version: Type.Literal(PROFILE_SCHEMA_VERSION),
  name: Type.String(),
  description: Type.Optional(Type.String()),
  execution_policy: ExecutionPolicy,
  stages: Type.Array(StageDefinition),
  transitions: Type.Array(StageTransition),
  terminal: Type.Array(Type.String()),
  default_retry: RetryPolicy,
  memory: MemoryPolicy,
  providers: ProviderBindings,
  shutdown: ShutdownPolicy
})

export type Profile = Static<typeof ProfileSchema>
