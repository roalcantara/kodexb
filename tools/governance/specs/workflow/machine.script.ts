import { assign, setup } from 'xstate'
import type { EvidenceResult } from './evidence.script.ts'
import type { Envelope } from './schemas/envelope.schema.ts'

export type OrchestratorContext = {
  current_stage: string
  stage_order: string[]
  stage_index: number
  terminal_stages: string[]
  envelope: Envelope | null
  evidence_results: EvidenceResult[] | null
  is_human_gated: boolean
  human_approved: boolean
  has_pending_question: boolean
  retry_count: number
  max_retries: number
  retry_cause: string | null
  shutdown_requested: boolean
  shared_memory: Record<string, unknown>
  teardown_remaining: string[]
  teardown_timeout_ms: number
  error_message: string | null
}

export function initialContext(overrides?: Partial<OrchestratorContext>): OrchestratorContext {
  return {
    current_stage: '',
    stage_order: [],
    stage_index: 0,
    terminal_stages: [],
    envelope: null,
    evidence_results: null,
    is_human_gated: false,
    human_approved: false,
    has_pending_question: false,
    retry_count: 0,
    max_retries: 3,
    retry_cause: null,
    shutdown_requested: false,
    shared_memory: {},
    teardown_remaining: [],
    teardown_timeout_ms: 30000,
    error_message: null,
    ...overrides
  }
}

export type OrchestratorEvent =
  | { type: 'STAGE.START'; stage_id: string; stage_index: number; is_human_gated: boolean }
  | { type: 'STAGE.COMPLETE'; envelope: Envelope }
  | { type: 'EVIDENCE.CHECKED'; results: EvidenceResult[] }
  | { type: 'INPUT.ANSWERED'; question_id: string; value: string }
  | { type: 'STAGE.APPROVED' }
  | { type: 'SHUTDOWN.REQUESTED'; signal: string }
  | { type: 'ADVANCE.NEXT'; stage_id: string; stage_index: number; is_human_gated: boolean }
  | { type: 'RETRY' }
  | { type: 'RUN.COMPLETE' }
  | { type: 'TEARDOWN.QUEUED'; tasks: string[] }
  | { type: 'TEARDOWN.COMPLETED'; task_id: string }

function isDone(event: OrchestratorEvent): event is OrchestratorEvent & { type: 'STAGE.COMPLETE'; envelope: Envelope } {
  return event.type === 'STAGE.COMPLETE' && event.envelope.status === 'DONE'
}

export const workflowMachine = setup({
  types: {
    context: {} as OrchestratorContext,
    events: {} as OrchestratorEvent,
    input: {} as Partial<OrchestratorContext>
  },
  guards: {
    isDoneAndAutoAdvance: ({ context, event }) =>
      isDone(event) && !context.is_human_gated && !context.shutdown_requested,
    isDoneAndHumanGated: ({ context, event }) => isDone(event) && context.is_human_gated && !context.human_approved,
    isDoneAndTerminal: ({ context, event }) => isDone(event) && context.terminal_stages.includes(context.current_stage),
    isNeedInput: ({ event }) => event.type === 'STAGE.COMPLETE' && event.envelope.status === 'NEED_INPUT',
    isBlocked: ({ event }) => event.type === 'STAGE.COMPLETE' && event.envelope.status === 'BLOCKED',
    isRetryable: ({ context, event }) =>
      event.type === 'STAGE.COMPLETE' &&
      event.envelope.status === 'RETRYABLE_FAILURE' &&
      context.retry_count < context.max_retries,
    isEscalated: ({ context, event }) =>
      event.type === 'STAGE.COMPLETE' &&
      event.envelope.status === 'RETRYABLE_FAILURE' &&
      context.retry_count >= context.max_retries,

    evidencePassed: ({ event }) => {
      if (event.type !== 'EVIDENCE.CHECKED') return false
      return event.results.every(r => r.passed)
    },
    evidenceFailed: ({ event }) => {
      if (event.type !== 'EVIDENCE.CHECKED') return false
      return !event.results.every(r => r.passed)
    },
    evidencePassedAndHumanGated: ({ context, event }) => {
      if (event.type !== 'EVIDENCE.CHECKED') return false
      return event.results.every(r => r.passed) && context.is_human_gated && !context.human_approved
    },
    evidencePassedAndLastStage: ({ context, event }) => {
      if (event.type !== 'EVIDENCE.CHECKED') return false
      return event.results.every(r => r.passed) && context.terminal_stages.includes(context.current_stage)
    },
    evidencePassedAndHasNext: ({ context, event }) => {
      if (event.type !== 'EVIDENCE.CHECKED') return false
      return event.results.every(r => r.passed) && context.stage_index < context.stage_order.length - 1
    },

    isLastStage: ({ context }) => context.terminal_stages.includes(context.current_stage),
    hasNextStage: ({ context }) => context.stage_index < context.stage_order.length - 1,
    isShuttingDown: ({ context }) => context.shutdown_requested
  },
  actions: {
    assignStageStart: assign(({ event }) => {
      if (event.type !== 'STAGE.START') return {}
      return {
        current_stage: event.stage_id,
        stage_index: event.stage_index,
        is_human_gated: event.is_human_gated,
        human_approved: false,
        envelope: null,
        evidence_results: null,
        has_pending_question: false,
        retry_cause: null,
        error_message: null
      }
    }),
    assignEnvelope: assign(({ event }) => {
      if (event.type !== 'STAGE.COMPLETE') return {}
      return {
        envelope: event.envelope,
        has_pending_question: (event.envelope.questions?.length ?? 0) > 0
      }
    }),
    assignEvidenceResults: assign(({ event }) => {
      if (event.type !== 'EVIDENCE.CHECKED') return {}
      return { evidence_results: event.results }
    }),
    incrementRetry: assign(({ context }) => ({
      retry_count: context.retry_count + 1
    })),
    setRetryCause: assign(({ event }) => {
      if (event.type !== 'STAGE.COMPLETE') return {}
      const diag = event.envelope.diagnostics?.[0]
      return { retry_cause: diag?.code ?? 'unknown' }
    }),
    approveStage: assign(() => ({
      human_approved: true,
      has_pending_question: false
    })),
    advanceToNextStage: assign(({ context }) => {
      const nextIdx = context.stage_index + 1
      const nextStage = context.stage_order[nextIdx]
      if (!nextStage) return {}
      return {
        current_stage: nextStage,
        stage_index: nextIdx,
        envelope: null,
        evidence_results: null,
        human_approved: false,
        retry_count: 0,
        retry_cause: null,
        error_message: null
      }
    }),
    requestShutdown: assign(() => ({ shutdown_requested: true })),
    resetRetry: assign(() => ({
      retry_count: 0,
      retry_cause: null
    })),
    setError: assign(({ event }) => {
      if (event.type === 'STAGE.COMPLETE') {
        return { error_message: event.envelope.diagnostics?.[0]?.message ?? 'stage blocked' }
      }
      if (event.type === 'EVIDENCE.CHECKED') {
        const firstFail = event.results.find(r => !r.passed)
        return { error_message: firstFail?.diagnostic ?? 'evidence check failed' }
      }
      return {}
    }),
    clearEnvelope: assign(() => ({
      envelope: null,
      evidence_results: null
    })),
    queueTeardown: assign(({ context, event }) => {
      if (event.type !== 'TEARDOWN.QUEUED') return {}
      return { teardown_remaining: [...context.teardown_remaining, ...event.tasks] }
    }),
    completeTeardown: assign(({ context, event }) => {
      if (event.type !== 'TEARDOWN.COMPLETED') return {}
      return { teardown_remaining: context.teardown_remaining.filter(t => t !== event.task_id) }
    })
  }
}).createMachine({
  id: 'workflow-orchestrator',
  initial: 'pending',
  context: ({ input }) => ({ ...initialContext(), ...input }),
  states: {
    pending: {
      on: {
        'STAGE.START': {
          target: 'running',
          actions: 'assignStageStart'
        }
      }
    },
    running: {
      on: {
        'STAGE.COMPLETE': [
          { target: 'need_input', guard: 'isDoneAndHumanGated', actions: 'assignEnvelope' },
          { target: 'evidence_pending', guard: 'isDoneAndAutoAdvance', actions: 'assignEnvelope' },
          { target: 'need_input', guard: 'isNeedInput', actions: 'assignEnvelope' },
          { target: 'blocked', guard: 'isBlocked', actions: ['assignEnvelope', 'setError'] },
          { target: 'retrying', guard: 'isRetryable', actions: ['assignEnvelope', 'setRetryCause', 'incrementRetry'] },
          { target: 'escalated', guard: 'isEscalated', actions: ['assignEnvelope', 'setRetryCause'] },
          { target: 'evidence_pending', actions: 'assignEnvelope' }
        ],
        'SHUTDOWN.REQUESTED': { target: 'blocked', actions: 'requestShutdown' },
        'TEARDOWN.QUEUED': { actions: 'queueTeardown' },
        'TEARDOWN.COMPLETED': { actions: 'completeTeardown' }
      }
    },
    evidence_pending: {
      on: {
        'EVIDENCE.CHECKED': [
          { target: 'need_input', guard: 'evidencePassedAndHumanGated', actions: 'assignEvidenceResults' },
          { target: 'terminal_success', guard: 'evidencePassedAndLastStage', actions: 'assignEvidenceResults' },
          {
            target: 'running',
            guard: 'evidencePassedAndHasNext',
            actions: ['assignEvidenceResults', 'advanceToNextStage']
          },
          { target: 'blocked', guard: 'evidenceFailed', actions: ['assignEvidenceResults', 'setError'] }
        ],
        'SHUTDOWN.REQUESTED': { target: 'blocked', actions: 'requestShutdown' },
        'TEARDOWN.QUEUED': { actions: 'queueTeardown' },
        'TEARDOWN.COMPLETED': { actions: 'completeTeardown' }
      }
    },
    need_input: {
      on: {
        'INPUT.ANSWERED': {
          target: 'running',
          actions: assign(() => ({
            has_pending_question: false
          }))
        },
        'STAGE.APPROVED': [
          { target: 'terminal_success', guard: 'isLastStage', actions: 'approveStage' },
          { target: 'running', guard: 'hasNextStage', actions: ['approveStage', 'advanceToNextStage'] }
        ],
        'SHUTDOWN.REQUESTED': { target: 'blocked', actions: 'requestShutdown' },
        'TEARDOWN.QUEUED': { actions: 'queueTeardown' },
        'TEARDOWN.COMPLETED': { actions: 'completeTeardown' }
      }
    },
    blocked: {
      on: {
        'STAGE.START': {
          target: 'running',
          actions: ['assignStageStart', 'resetRetry']
        },
        'SHUTDOWN.REQUESTED': {
          target: 'blocked',
          actions: 'requestShutdown'
        },
        'TEARDOWN.QUEUED': { actions: 'queueTeardown' },
        'TEARDOWN.COMPLETED': { actions: 'completeTeardown' }
      }
    },
    retrying: {
      on: {
        RETRY: {
          target: 'running',
          actions: ['clearEnvelope', 'assignStageStart']
        },
        'SHUTDOWN.REQUESTED': {
          target: 'blocked',
          actions: 'requestShutdown'
        },
        'TEARDOWN.QUEUED': { actions: 'queueTeardown' },
        'TEARDOWN.COMPLETED': { actions: 'completeTeardown' }
      }
    },
    escalated: {
      on: {
        'STAGE.START': {
          target: 'running',
          actions: ['assignStageStart', 'resetRetry']
        },
        'SHUTDOWN.REQUESTED': {
          target: 'blocked',
          actions: 'requestShutdown'
        },
        'TEARDOWN.QUEUED': { actions: 'queueTeardown' },
        'TEARDOWN.COMPLETED': { actions: 'completeTeardown' }
      }
    },
    terminal_success: { type: 'final' },
    terminal_failure: { type: 'final' }
  }
})
