import { describe, expect, it } from 'bun:test'

/**
 * `main.ts` is the Electrobun entry (top-level `await bootstrap()`). Importing it in
 * `bun test` would spawn native windows. Bootstrap helpers are extracted to
 * `shell_hooks.util.ts` and covered in `shell_hooks.util.spec.ts`.
 */
describe('main entry', () => {
  it('keeps bootstrap side effects out of the test runner', async () => {
    const util = await import('./shell_hooks.util')
    expect(util.MAIN_WINDOW_DEFAULT_SIZE).toEqual({ width: 680, height: 420 })
    expect(util.MAIN_WINDOW_RENDERER_URL).toBe('views://shell/index.html')
  })
})
