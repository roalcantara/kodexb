import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { APP_LIST_MIN_WIDTH_PX, OVERLAY_SHELL_WIDTH_PX } from './overlay_shell_layout.const'

describe('overlay_shell_layout.const', () => {
  it('defines overlay and list min widths', () => {
    expect(OVERLAY_SHELL_WIDTH_PX).toBe(560)
    expect(APP_LIST_MIN_WIDTH_PX).toBe(740)
  })

  it('CSS partial defines cmp-overlay-shell', () => {
    const cssPath = path.join(import.meta.dirname, '../../../styles/components/overlay_shell.css')
    const css = readFileSync(cssPath, 'utf-8')
    expect(css).toContain('.cmp-overlay-shell')
    expect(css).toContain('--overlay-shell-width')
  })
})
