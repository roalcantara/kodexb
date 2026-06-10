import { afterEach, describe, expect, it } from 'bun:test'
import { createActor } from 'xstate'
import { type OrchestratorContext, workflowMachine } from './machine.ts'
import { ENVELOPE_SCHEMA_VERSION, type Envelope } from './schemas/envelope.schema.ts'

function makeEnvelope(overrides?: Partial<Envelope>): Envelope {
  return {
    schema_version: ENVELOPE_SCHEMA_VERSION,
    stage: 'specify',
    status: 'DONE',
    artifacts_created: [],
    evidence: [],
    diagnostics: [],
    retry_count: 0,
    elapsed_ms: 100,
    ...overrides
  } as Envelope
}

const STAGE_ORDER = [
  'specify',
  'plan',
  'analyze-plan',
  'tasks',
  'analyze-tasks',
  'handoff-generate',
  'implement',
  'review'
]

function startActor(ctx?: Partial<OrchestratorContext>) {
  return createActor(workflowMachine, { input: ctx ?? {} }).start()
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: test describe block
describe('workflow orchestrator machine', () => {
  afterEach(() => {
    // cleanup handled by actor lifecycle
  })

  describe('initial state', () => {
    it('starts in pending', () => {
      const actor = startActor()
      expect(actor.getSnapshot().value).toBe('pending')
      actor.stop()
    })

    it('STAGE.START transitions to running', () => {
      const actor = startActor({ stage_order: STAGE_ORDER, terminal_stages: ['gate'] })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      expect(actor.getSnapshot().value).toBe('running')
      expect(actor.getSnapshot().context.current_stage).toBe('specify')
      actor.stop()
    })
  })

  describe('AWO-1: auto-advance', () => {
    it('DONE + evidence passed + auto-advance goes to evidence_pending', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({
        type: 'STAGE.COMPLETE',
        envelope: makeEnvelope({
          stage: 'specify',
          status: 'DONE',
          evidence: [{ kind: 'marker', ref: 'checklists/done.md' }]
        })
      })
      expect(actor.getSnapshot().value).toBe('evidence_pending')
      actor.stop()
    })

    it('EVIDENCE.CHECKED passed + has next stage advances to running', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate'],
        is_human_gated: false
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'DONE' }) })
      expect(actor.getSnapshot().value).toBe('evidence_pending')
      actor.send({ type: 'EVIDENCE.CHECKED', results: [{ kind: 'marker', ref: 'done.md', passed: true }] })
      const val = actor.getSnapshot().value
      expect(val).toBe('running')
      expect(actor.getSnapshot().context.current_stage).toBe('plan')
      actor.stop()
    })

    it('EVIDENCE.CHECKED passed + terminal stage goes to terminal_success', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 7,
        current_stage: 'gate',
        terminal_stages: ['gate'],
        is_human_gated: false
      })
      actor.send({ type: 'STAGE.START', stage_id: 'gate', stage_index: 7, is_human_gated: false })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'gate', status: 'DONE' }) })
      actor.send({ type: 'EVIDENCE.CHECKED', results: [{ kind: 'marker', ref: 'done.md', passed: true }] })
      expect(actor.getSnapshot().value).toBe('terminal_success')
      actor.stop()
    })
  })

  describe('AWO-1 AC3: BLOCKED stops progression', () => {
    it('BLOCKED envelope goes to blocked state', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({
        type: 'STAGE.COMPLETE',
        envelope: makeEnvelope({
          stage: 'specify',
          status: 'BLOCKED',
          diagnostics: [{ code: 'EVIDENCE_MISSING', message: 'required artifact not found', severity: 'error' }]
        })
      })
      expect(actor.getSnapshot().value).toBe('blocked')
      expect(actor.getSnapshot().context.error_message).toContain('not found')
      actor.stop()
    })

    it('no auto-transition fires from blocked', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'BLOCKED' }) })
      expect(actor.getSnapshot().value).toBe('blocked')
      // Send unrelated event — should not change
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'DONE' }) })
      expect(actor.getSnapshot().value).toBe('blocked')
      actor.stop()
    })

    it('STAGE.START from blocked transitions to running', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'BLOCKED' }) })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      expect(actor.getSnapshot().value).toBe('running')
      actor.stop()
    })
  })

  describe('AWO-2 AC3: DONE without evidence stays evidence_pending', () => {
    it('DONE claim with failing evidence stays in evidence_pending', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({
        type: 'STAGE.COMPLETE',
        envelope: makeEnvelope({
          stage: 'specify',
          status: 'DONE',
          evidence: [{ kind: 'marker', ref: 'checklists/missing.md' }]
        })
      })
      expect(actor.getSnapshot().value).toBe('evidence_pending')
      actor.send({
        type: 'EVIDENCE.CHECKED',
        results: [{ kind: 'marker', ref: 'checklists/missing.md', passed: false, diagnostic: 'marker not found' }]
      })
      expect(actor.getSnapshot().value).toBe('blocked')
      actor.stop()
    })
  })

  describe('AWO-2 AC4: unverifiable evidence does not auto-advance', () => {
    it('evidence failed stays blocked, not advancing', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({
        type: 'STAGE.COMPLETE',
        envelope: makeEnvelope({
          stage: 'specify',
          status: 'DONE',
          evidence: [{ kind: 'artifact', ref: 'output.json' }]
        })
      })
      actor.send({
        type: 'EVIDENCE.CHECKED',
        results: [{ kind: 'artifact', ref: 'output.json', passed: false, diagnostic: 'artifact not found' }]
      })
      expect(actor.getSnapshot().value).toBe('blocked')
      actor.stop()
    })
  })

  describe('AWO-5 AC4: human_gated pause', () => {
    it('human_gated stage pauses until STAGE.APPROVED', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate'],
        is_human_gated: true,
        human_approved: false
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: true })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'DONE' }) })
      expect(actor.getSnapshot().value).toBe('need_input')
      actor.send({ type: 'STAGE.APPROVED' })
      expect(actor.getSnapshot().value).toBe('running')
      expect(actor.getSnapshot().context.current_stage).toBe('plan')
      actor.stop()
    })

    it('human_gated on terminal stage goes to terminal_success after approval', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 7,
        current_stage: 'review',
        terminal_stages: ['review'],
        is_human_gated: true,
        human_approved: false
      })
      actor.send({ type: 'STAGE.START', stage_id: 'review', stage_index: 7, is_human_gated: true })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'review', status: 'DONE' }) })
      expect(actor.getSnapshot().value).toBe('need_input')
      actor.send({ type: 'STAGE.APPROVED' })
      expect(actor.getSnapshot().value).toBe('terminal_success')
      actor.stop()
    })
  })

  describe('AWO-1 AC4: retry and escalate', () => {
    it('RETRYABLE_FAILURE within budget transitions to retrying', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate'],
        max_retries: 3,
        retry_count: 0
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({
        type: 'STAGE.COMPLETE',
        envelope: makeEnvelope({
          stage: 'specify',
          status: 'RETRYABLE_FAILURE',
          diagnostics: [{ code: 'TIMEOUT', message: 'worker timed out', severity: 'error' }]
        })
      })
      expect(actor.getSnapshot().value).toBe('retrying')
      expect(actor.getSnapshot().context.retry_count).toBe(1)
      actor.stop()
    })

    it('RETRY transitions back to running', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate'],
        max_retries: 3,
        retry_count: 1
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'RETRYABLE_FAILURE' }) })
      expect(actor.getSnapshot().value).toBe('retrying')
      actor.send({ type: 'RETRY' })
      expect(actor.getSnapshot().value).toBe('running')
      actor.stop()
    })

    it('RETRYABLE_FAILURE beyond budget transitions to escalated', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate'],
        max_retries: 3,
        retry_count: 3
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'RETRYABLE_FAILURE' }) })
      expect(actor.getSnapshot().value).toBe('escalated')
      actor.stop()
    })
  })

  describe('AWO-13: graceful shutdown', () => {
    it('SHUTDOWN.REQUESTED from running transitions to blocked', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'SHUTDOWN.REQUESTED', signal: 'SIGINT' })
      expect(actor.getSnapshot().value).toBe('blocked')
      expect(actor.getSnapshot().context.shutdown_requested).toBe(true)
      actor.stop()
    })

    it('SHUTDOWN.REQUESTED from evidence_pending transitions to blocked', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'DONE' }) })
      actor.send({ type: 'SHUTDOWN.REQUESTED', signal: 'SIGTERM' })
      expect(actor.getSnapshot().value).toBe('blocked')
      expect(actor.getSnapshot().context.shutdown_requested).toBe(true)
      actor.stop()
    })
  })

  describe('AWO-5.5: teardown tracking', () => {
    it('TEARDOWN.QUEUED adds tasks without blocking transitions', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'TEARDOWN.QUEUED', tasks: ['cleanup-temp', 'archive-logs'] })
      expect(actor.getSnapshot().context.teardown_remaining).toEqual(['cleanup-temp', 'archive-logs'])
      // Teardown does not gate: STAGE.COMPLETE still transitions
      actor.send({ type: 'STAGE.COMPLETE', envelope: makeEnvelope({ stage: 'specify', status: 'DONE' }) })
      expect(actor.getSnapshot().value).toBe('evidence_pending')
      actor.stop()
    })

    it('TEARDOWN.COMPLETED removes a specific task', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate'],
        teardown_remaining: ['task-a', 'task-b']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'TEARDOWN.COMPLETED', task_id: 'task-a' })
      expect(actor.getSnapshot().context.teardown_remaining).toEqual(['task-b'])
      actor.stop()
    })

    it('TEARDOWN.QUEUED with empty tasks is a no-op', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate'],
        teardown_remaining: ['existing']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({ type: 'TEARDOWN.QUEUED', tasks: [] })
      expect(actor.getSnapshot().context.teardown_remaining).toEqual(['existing'])
      actor.stop()
    })
  })

  describe('NEED_INPUT flow', () => {
    it('NEED_INPUT goes to need_input state', () => {
      const actor = startActor({
        stage_order: STAGE_ORDER,
        stage_index: 0,
        current_stage: 'specify',
        terminal_stages: ['gate']
      })
      actor.send({ type: 'STAGE.START', stage_id: 'specify', stage_index: 0, is_human_gated: false })
      actor.send({
        type: 'STAGE.COMPLETE',
        envelope: makeEnvelope({
          stage: 'specify',
          status: 'NEED_INPUT',
          questions: [{ id: 'q1', prompt: 'Which approach?' }]
        })
      })
      expect(actor.getSnapshot().value).toBe('need_input')
      expect(actor.getSnapshot().context.has_pending_question).toBe(true)
      actor.stop()
    })
  })
})
