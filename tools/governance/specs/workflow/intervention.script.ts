export type QuestionShape = {
  id: string
  prompt: string
  options?: string[]
  default?: string
}

export type DecisionRecord = {
  question_id: string
  value: string
  source: 'defaulted' | 'answered'
  rationale: string
  timestamp: string
}

export function dedupQuestions(questions: QuestionShape[], sharedMemory: Record<string, string>): QuestionShape[] {
  const answered = new Set(Object.keys(sharedMemory))
  return questions.filter(q => !answered.has(q.id))
}

export function batchPrompts(questions: QuestionShape[]): string {
  return questions
    .map(q => {
      const opts = q.options?.length ? ` (options: ${q.options.join(', ')})` : ''
      return `[${q.id}] ${q.prompt}${opts}`
    })
    .join('\n')
}

export function canAutoFill(questions: QuestionShape[], sharedMemory: Record<string, string>): boolean {
  return questions.every(q => q.default !== undefined || sharedMemory[q.id] !== undefined)
}

export function autoFillValues(
  questions: QuestionShape[],
  sharedMemory: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {}
  for (const q of questions) {
    result[q.id] = sharedMemory[q.id] ?? q.default ?? ''
  }
  return result
}

export function createDefaultedDecision(question: QuestionShape, rationale: string, timestamp: string): DecisionRecord {
  return {
    question_id: question.id,
    value: question.default ?? '',
    source: 'defaulted',
    rationale,
    timestamp
  }
}

export function createAnsweredDecision(question_id: string, value: string, timestamp: string): DecisionRecord {
  return {
    question_id,
    value,
    source: 'answered',
    rationale: 'operator provided',
    timestamp
  }
}
