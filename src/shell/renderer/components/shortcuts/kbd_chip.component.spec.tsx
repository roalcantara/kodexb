import { describe, expect, it } from 'bun:test'
import type { ChordStep } from '@core/domain/models/entries/schemas/shortcut.schema'
import { render, screen } from '@testing-library/react'
import { KbdChip } from './kbd_chip.component'

const chord = (steps: ChordStep[]): ChordStep[] => steps

const RE_CMD_P = /^(cmd|p)$/
const RE_CTRL_ALT_SHIFT_T = /^(ctrl|alt|shift|t)$/
const RE_CMD_K_S = /^(cmd|k|s)$/
const RE_CMD_SPACE = /^(cmd|space)$/
const RE_CMD_SHIFT_P = /^(cmd|shift|p)$/
const RE_CTRL_ALT_CMD_ARROW_S = /^(ctrl|alt|cmd|arrowLeft|s)$/

describe('KbdChip', () => {
  it('renders single-step chord with one modifier', () => {
    render(<KbdChip chord={chord([{ modifiers: ['cmd'], key: 'p' }])} platform="macos" />)
    const kbd = screen.getAllByLabelText(RE_CMD_P)
    expect(kbd).toHaveLength(2)
    expect(kbd[0]?.textContent).toBe('⌘')
    expect(kbd[1]?.textContent).toBe('p')
  })

  it('renders single-step chord with multiple modifiers sorted by keyboard layout', () => {
    render(<KbdChip chord={chord([{ modifiers: ['shift', 'alt', 'ctrl'], key: 't' }])} platform="macos" />)
    const kbd = screen.getAllByLabelText(RE_CTRL_ALT_SHIFT_T)
    expect(kbd).toHaveLength(4)
    expect(kbd[0]?.textContent).toBe('⌃')
    expect(kbd[1]?.textContent).toBe('⌥')
    expect(kbd[2]?.textContent).toBe('⇧')
    expect(kbd[3]?.textContent).toBe('t')
  })

  it('renders Raycast hyper triple as ✦', () => {
    render(<KbdChip chord={chord([{ modifiers: ['ctrl', 'alt', 'cmd'], key: 'k' }])} platform="macos" />)
    expect(screen.getByLabelText('hyper').textContent).toBe('✦')
    expect(screen.getByLabelText('k').textContent).toBe('k')
  })

  it('renders Linux super modifier', () => {
    render(<KbdChip chord={chord([{ modifiers: ['super'], key: 'tab' }])} platform="linux" />)
    expect(screen.getByLabelText('super').textContent).toBe('Super')
  })

  it('renders sequence of two steps', () => {
    render(
      <KbdChip
        chord={chord([
          { modifiers: ['cmd'], key: 'k' },
          { modifiers: ['cmd'], key: 's' }
        ])}
        platform="macos"
      />
    )
    const kbd = screen.getAllByLabelText(RE_CMD_K_S)
    expect(kbd).toHaveLength(4)
    expect(kbd[0]?.textContent).toBe('⌘')
    expect(kbd[1]?.textContent).toBe('k')
    expect(kbd[2]?.textContent).toBe('⌘')
    expect(kbd[3]?.textContent).toBe('s')
  })

  it('renders chord with no modifiers', () => {
    render(<KbdChip chord={chord([{ key: 'f3' }])} platform="macos" />)
    const kbd = screen.getAllByLabelText('f3')
    expect(kbd).toHaveLength(1)
    expect(kbd[0]?.textContent).toBe('f3')
  })

  it('uses display string when present', () => {
    render(<KbdChip chord={chord([{ modifiers: ['cmd'], key: 'space', display: '⌘␣' }])} platform="macos" />)
    const kbd = screen.getAllByLabelText(RE_CMD_SPACE)
    expect(kbd).toHaveLength(2)
    expect(kbd[0]?.textContent).toBe('⌘')
    expect(kbd[1]?.textContent).toBe('⌘␣')
  })

  it('renders linux platform with word glyphs', () => {
    render(<KbdChip chord={chord([{ modifiers: ['cmd'], key: 'p' }])} platform="linux" />)
    const kbd = screen.getAllByLabelText(RE_CMD_P)
    expect(kbd).toHaveLength(2)
    expect(kbd[0]?.textContent).toBe('Meta')
    expect(kbd[1]?.textContent).toBe('p')
  })

  it('renders mixed modifiers with shift correctly', () => {
    render(<KbdChip chord={chord([{ modifiers: ['shift', 'cmd'], key: 'p' }])} platform="macos" />)
    const kbd = screen.getAllByLabelText(RE_CMD_SHIFT_P)
    expect(kbd).toHaveLength(3)
    expect(kbd[0]?.textContent).toBe('⌘')
    expect(kbd[1]?.textContent).toBe('⇧')
    expect(kbd[2]?.textContent).toBe('p')
  })

  it('returns null for empty chord', () => {
    const { container } = render(<KbdChip chord={[]} platform="macos" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders two-step sequence with all modifiers', () => {
    render(
      <KbdChip
        chord={chord([
          { modifiers: ['ctrl', 'alt'], key: 'arrowLeft' },
          { modifiers: ['cmd'], key: 's' }
        ])}
        platform="macos"
      />
    )
    const kbd = screen.getAllByLabelText(RE_CTRL_ALT_CMD_ARROW_S)
    expect(kbd).toHaveLength(5)
    expect(kbd[0]?.textContent).toBe('⌃')
    expect(kbd[1]?.textContent).toBe('⌥')
    expect(kbd[2]?.textContent).toBe('←')
    expect(kbd[3]?.textContent).toBe('⌘')
    expect(kbd[4]?.textContent).toBe('s')
    expect(document.querySelector('.cmp-kbd-chip')).not.toBeNull()
  })

  it('empty chord returns no output', () => {
    const { container } = render(<KbdChip chord={[]} platform="macos" />)
    expect(container.firstChild).toBeNull()
  })
})
