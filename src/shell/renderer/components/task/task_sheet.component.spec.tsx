import '@happy-dom/global-registrator'
import { describe, expect, it, mock } from 'bun:test'
import { render, screen } from '@testing-library/react'
import type { TaskSheetFormState } from '../../hooks/list/use_task_sheet.hook'
import { TaskSheetInner } from './task_sheet.component'

function emptyForm(overrides: Partial<TaskSheetFormState> = {}): TaskSheetFormState {
  return {
    key: '',
    desc: '',
    status: 'todo',
    priority: 'mid',
    dueDateStr: '',
    tags: '',
    dependsOn: '',
    saving: false,
    error: null,
    ...overrides
  }
}

describe('TaskSheetInner', () => {
  describe('when form.error is set', () => {
    it('renders the error message in an alert region', () => {
      render(
        <TaskSheetInner
          entry={undefined}
          form={emptyForm({ error: 'Write failed' })}
          dirty={false}
          onSet={mock()}
          onSave={mock()}
          onCancel={mock()}
          onCycleStatus={mock()}
          onCyclePriority={mock()}
        />
      )
      const errorEl = screen.getByTestId('task-sheet-error')
      expect(errorEl).not.toBeNull()
      expect(errorEl.textContent).toBe('Write failed')
    })
  })

  describe('when form.error is null', () => {
    it('does not render an error region', () => {
      render(
        <TaskSheetInner
          entry={undefined}
          form={emptyForm()}
          dirty={false}
          onSet={mock()}
          onSave={mock()}
          onCancel={mock()}
          onCycleStatus={mock()}
          onCyclePriority={mock()}
        />
      )
      const errorEl = screen.queryByTestId('task-sheet-error')
      expect(errorEl).toBeNull()
    })
  })
})
