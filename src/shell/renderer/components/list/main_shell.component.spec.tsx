import { describe, expect, it } from 'bun:test'
import { ListMainShell } from './main_shell.component'

describe('ListMainShell', () => {
  it('is exported for ListMain composition', () => {
    expect(typeof ListMainShell).toBe('function')
    expect(ListMainShell.name).toBe('ListMainShell')
  })
})
