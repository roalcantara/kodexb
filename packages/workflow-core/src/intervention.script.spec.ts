import { describe, expect, it } from 'bun:test'
import {
  autoFillValues,
  batchPrompts,
  canAutoFill,
  createAnsweredDecision,
  createDefaultedDecision,
  dedupQuestions,
  type QuestionShape
} from './intervention.script'

const questions: QuestionShape[] = [
  { id: 'q1', prompt: 'Select framework?', options: ['vue', 'react', 'svelte'], default: 'react' },
  { id: 'q2', prompt: 'Include tests?', default: 'yes' },
  { id: 'q3', prompt: 'Deploy target?' }
]

describe('dedupQuestions', () => {
  it('filters out questions already answered in shared memory', () => {
    const memory = { q1: 'vue' }
    const result = dedupQuestions(questions, memory)
    expect(result).toHaveLength(2)
    expect(result.find(q => q.id === 'q1')).toBeUndefined()
  })

  it('returns all questions when memory is empty', () => {
    const result = dedupQuestions(questions, {})
    expect(result).toHaveLength(3)
  })

  it('handles partial overlap', () => {
    const memory = { q2: 'yes' }
    const result = dedupQuestions(questions, memory)
    expect(result).toHaveLength(2)
    expect(result.find(q => q.id === 'q2')).toBeUndefined()
  })
})

describe('batchPrompts', () => {
  it('joins questions into a single block', () => {
    const result = batchPrompts(questions)
    expect(result).toContain('[q1] Select framework? (options: vue, react, svelte)')
    expect(result).toContain('[q2] Include tests?')
    expect(result).toContain('[q3] Deploy target?')
    expect(result.split('\n')).toHaveLength(3)
  })

  it('returns empty string for no questions', () => {
    expect(batchPrompts([])).toBe('')
  })
})

describe('canAutoFill', () => {
  it('returns true when all questions have defaults or memory values', () => {
    const memory = { q3: 'production' }
    expect(canAutoFill(questions, memory)).toBe(true)
  })

  it('returns false when a question has no default nor memory value', () => {
    expect(canAutoFill(questions, {})).toBe(false)
  })
})

describe('autoFillValues', () => {
  it('fills from memory first, then defaults', () => {
    const memory = { q1: 'vue' }
    const result = autoFillValues(questions, memory)
    expect(result.q1).toBe('vue')
    expect(result.q2).toBe('yes')
    expect(result.q3).toBe('')
  })

  it('uses defaults when memory is empty', () => {
    const result = autoFillValues(questions, {})
    expect(result.q1).toBe('react')
    expect(result.q2).toBe('yes')
    expect(result.q3).toBe('')
  })
})

describe('createDefaultedDecision', () => {
  it('records the default value with rationale', () => {
    const ts = '2026-06-10T12:00:00.000Z'
    const q = questions[0]
    if (!q) throw new Error('expected non-empty questions')
    const d = createDefaultedDecision(q, 'single option remaining', ts)
    expect(d.question_id).toBe('q1')
    expect(d.value).toBe('react')
    expect(d.source).toBe('defaulted')
    expect(d.rationale).toBe('single option remaining')
    expect(d.timestamp).toBe(ts)
  })
})

describe('createAnsweredDecision', () => {
  it('records operator answer', () => {
    const ts = '2026-06-10T12:00:00.000Z'
    const d = createAnsweredDecision('q3', 'staging', ts)
    expect(d.question_id).toBe('q3')
    expect(d.value).toBe('staging')
    expect(d.source).toBe('answered')
    expect(d.timestamp).toBe(ts)
  })
})
