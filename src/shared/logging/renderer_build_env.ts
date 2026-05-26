/**
 * Environment snapshot taken when Electrobun builds the `shell` view bundle.
 *
 * The parent `bun run dev` / `electrobun dev` process has `LOG_LEVEL`; the CEF
 * webview does not. Bun inlines these literals into `views/shell/index.js` so
 * `configureRendererLogging()` can honor the same dial without `process` at runtime.
 *
 * Restart dev after changing `LOG_LEVEL` so the view is rebuilt.
 */
export const RENDERER_BUILD_ENV: Readonly<Record<string, string | undefined>> = {
  LOG_LEVEL: process.env.LOG_LEVEL,
  NODE_ENV: process.env.NODE_ENV
}
