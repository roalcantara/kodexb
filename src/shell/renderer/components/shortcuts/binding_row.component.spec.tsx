import { afterEach, describe, expect, it, vi } from 'bun:test'
import { factoryFor } from '@testing'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { BindingRowProps } from './binding_row.component'
import { BindingRow } from './binding_row.component'

afterEach(() => {
  cleanup()
})

const defaultBinding = () => factoryFor('binding:goToFile')

const KEYMAP_ROW_SELECTOR = '.cmp-keymap-row'
const SINGLE_MODIFIER_LABEL = /^(ctrl|alt|arrowLeft)$/
const CMD_P_LABEL = /^(cmd|p)$/
const SEQUENCE_MODIFIER_LABEL = /^(cmd|k|s)$/

function getKeymapRow(): HTMLElement {
  const row = document.querySelector(KEYMAP_ROW_SELECTOR)
  if (!row) throw new Error('keymap row not found')
  return row as HTMLElement
}

const defaultProps: Omit<BindingRowProps, 'binding'> = {
  collisions: [],
  displayAdvisories: false,
  selected: false,
  onSelect: () => undefined,
  onPrimary: () => undefined,
  onSecondary: () => undefined,
  onInfo: () => undefined,
  platform: 'macos'
}

describe('BindingRow', () => {
  it('renders action text', () => {
    render(<BindingRow binding={defaultBinding()} {...defaultProps} />)
    expect(screen.getByText('Go to File')).not.toBeNull()
  })

  it('renders KbdChip for chord', () => {
    render(<BindingRow binding={defaultBinding()} {...defaultProps} />)
    const kbd = screen.getAllByLabelText(CMD_P_LABEL)
    expect(kbd).toHaveLength(2)
  })

  it('shows no collision icon when no collisions', () => {
    render(<BindingRow binding={defaultBinding()} {...defaultProps} collisions={[]} />)
    const icon = document.querySelector('.cmp-keymap-row__icon')
    expect(icon?.textContent).toBe('')
  })

  it('shows ⚠ for hard collision', () => {
    render(
      <BindingRow
        binding={defaultBinding()}
        {...defaultProps}
        collisions={[{ kind: 'hard' as const, otherEntryKey: 'macos', otherApp: 'macos' }]}
      />
    )
    const icon = document.querySelector('.cmp-keymap-row__icon')
    expect(icon?.textContent).toBe('⚠')
    expect(icon?.className).toContain('cmp-keymap-row__icon--warn')
  })

  it('shows · for soft collision only when displayAdvisories is true', () => {
    const softCollisions: { kind: 'soft' | 'hard'; otherEntryKey: string; otherApp: string }[] = [
      { kind: 'soft', otherEntryKey: 'cursor', otherApp: 'cursor' }
    ]
    const { rerender } = render(
      <BindingRow binding={defaultBinding()} {...defaultProps} collisions={softCollisions} displayAdvisories={false} />
    )
    expect(document.querySelector('.cmp-keymap-row__icon')?.textContent).toBe('')

    rerender(
      <BindingRow binding={defaultBinding()} {...defaultProps} collisions={softCollisions} displayAdvisories={true} />
    )
    const icon = document.querySelector('.cmp-keymap-row__icon')
    expect(icon?.textContent).toBe('·')
    expect(icon?.className).toContain('cmp-keymap-row__icon--soft')
  })

  it('applies selected class when selected', () => {
    render(<BindingRow binding={defaultBinding()} {...defaultProps} selected />)
    expect(document.querySelector('.cmp-keymap-row--selected')).not.toBeNull()
  })

  it('calls onSelect on click', () => {
    const spy = vi.fn()
    render(<BindingRow binding={defaultBinding()} {...defaultProps} onSelect={spy} />)
    fireEvent.click(getKeymapRow())
    expect(spy).toHaveBeenCalled()
  })

  it('calls onPrimary on Enter key', () => {
    const spy = vi.fn()
    render(<BindingRow binding={defaultBinding()} {...defaultProps} onPrimary={spy} />)
    fireEvent.keyDown(getKeymapRow(), { key: 'Enter' })
    expect(spy).toHaveBeenCalled()
  })

  it('calls onSecondary on Cmd+Enter', () => {
    const spy = vi.fn()
    render(<BindingRow binding={defaultBinding()} {...defaultProps} onSecondary={spy} />)
    fireEvent.keyDown(getKeymapRow(), { key: 'Enter', metaKey: true })
    expect(spy).toHaveBeenCalled()
  })

  it('calls onInfo on info button click', () => {
    const spy = vi.fn()
    render(<BindingRow binding={defaultBinding()} {...defaultProps} onInfo={spy} />)
    fireEvent.click(screen.getByLabelText('Binding info'))
    expect(spy).toHaveBeenCalled()
  })

  it('renders chord with multiple modifiers', () => {
    const binding = factoryFor('binding', {
      overrides: { chord: [{ modifiers: ['ctrl', 'alt'], key: 'arrowLeft' }] }
    })
    render(<BindingRow binding={binding} {...defaultProps} />)
    const kbd = screen.getAllByLabelText(SINGLE_MODIFIER_LABEL)
    expect(kbd).toHaveLength(3)
  })

  it('renders sequence chord (two steps)', () => {
    const binding = factoryFor('binding', {
      overrides: {
        chord: [
          { modifiers: ['cmd'], key: 'k' },
          { modifiers: ['cmd'], key: 's' }
        ]
      }
    })
    render(<BindingRow binding={binding} {...defaultProps} />)
    const kbd = screen.getAllByLabelText(SEQUENCE_MODIFIER_LABEL)
    expect(kbd).toHaveLength(4)
  })

  it('shows warn note class for hard collision', () => {
    render(
      <BindingRow
        binding={defaultBinding()}
        {...defaultProps}
        collisions={[{ kind: 'hard', otherEntryKey: 'macos', otherApp: 'macos' }]}
      />
    )
    expect(document.querySelector('.cmp-keymap-row__note--warn')).not.toBeNull()
  })

  it('renders with linux platform glyphs', () => {
    render(<BindingRow binding={defaultBinding()} {...defaultProps} platform="linux" />)
    expect(screen.getByLabelText('cmd').textContent).toBe('Meta')
  })
})
