import { describe, expect, it, mock } from 'bun:test'
import { onBindingRowEnterKeyDown } from './binding_row_enter_keydown.util'

function keyEvent(partial: Partial<React.KeyboardEvent>): React.KeyboardEvent {
  return {
    key: 'Enter',
    metaKey: false,
    ctrlKey: false,
    preventDefault: mock(() => undefined),
    ...partial
  } as React.KeyboardEvent
}

describe('onBindingRowEnterKeyDown', () => {
  it('runs primary on plain Enter', () => {
    const onPrimary = mock(() => undefined)
    const onSecondary = mock(() => undefined)
    const event = keyEvent({})
    onBindingRowEnterKeyDown(event, onPrimary, onSecondary)
    expect(onPrimary).toHaveBeenCalledTimes(1)
    expect(onSecondary).toHaveBeenCalledTimes(0)
    expect(event.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('runs secondary on meta+Enter', () => {
    const onPrimary = mock(() => undefined)
    const onSecondary = mock(() => undefined)
    const event = keyEvent({ metaKey: true })
    onBindingRowEnterKeyDown(event, onPrimary, onSecondary)
    expect(onPrimary).toHaveBeenCalledTimes(0)
    expect(onSecondary).toHaveBeenCalledTimes(1)
  })
})
