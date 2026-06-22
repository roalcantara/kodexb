import { describe, expect, it } from 'bun:test'

/**
 * `main.ts` is the Electrobun entry (top-level `await bootstrap()`). Importing it in
 * `bun test` would spawn native windows. Bootstrap helpers are extracted to
 * `window/window.const.ts` and covered in `shell_hooks.util.spec.ts`.
 */
describe('main entry', () => {
  it('keeps bootstrap side effects out of the test runner', async () => {
    const winConst = await import('./window/window.const')
    expect(winConst.MAIN_WINDOW_DEFAULT_SIZE).toEqual({ width: 748, height: 600 })
    expect(winConst.MAIN_WINDOW_RENDERER_URL).toBe('views://shell/index.html')
  })
})
