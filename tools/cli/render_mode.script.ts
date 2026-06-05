/** TTY vs CI output mode for Bun-backed mise task scripts. */

export type RenderMode = 'pretty' | 'raw' | 'json'

export function chooseRenderer(opts: { json: boolean; raw: boolean; isTty: boolean }): RenderMode {
  if (opts.json) return 'json'
  if (opts.raw || !opts.isTty) return 'raw'
  return 'pretty'
}
