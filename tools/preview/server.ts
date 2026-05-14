/**
 * Preview server — serves the kb renderer with real data from ~/.config/kb/.
 * Replaces electrobun/view with a fetch-based mock at build time.
 * Run with: bun tools/preview/server.ts (default port 3456; set PORT to override)
 */
import path from 'node:path'
import { App } from '../../src/shell/app/app'
import { loadConfig } from '../../src/shell/app/config/config.loader'
import { createRpcServer } from '../../src/shell/main/rpc/server'

const PORT = Number.parseInt(process.env.PORT ?? '3456', 10)
const ROOT = path.resolve(import.meta.dir, '../..')
const ELECTROBUN_VIEW_RE = /^electrobun\/view$/
const BYTES_PER_KIB = 1024
const API_PREFIX = '/api/'

// ── Build renderer bundle with electrobun/view swapped out ─────────────────
console.log('Building renderer bundle…')
const built = await Bun.build({
  entrypoints: [path.join(ROOT, 'src/shell/renderer/index.ts')],
  target: 'browser',
  minify: false,
  plugins: [
    {
      name: 'mock-electrobun-view',
      setup(build) {
        build.onResolve({ filter: ELECTROBUN_VIEW_RE }, () => ({
          path: path.join(ROOT, 'tools/preview/mock_electroview.ts'),
          namespace: 'file'
        }))
      }
    }
  ]
})

if (!built.success) {
  for (const msg of built.logs) console.error(msg)
  process.exit(1)
}
const bundleOut = built.outputs[0]
if (bundleOut === undefined) {
  console.error('Bun.build produced no outputs')
  process.exit(1)
}
const bundleJs = await bundleOut.text()
console.log(`Renderer bundle built (${(bundleJs.length / BYTES_PER_KIB).toFixed(0)} KB).`)

// ── Boot real App + Elysia RpcApp ──────────────────────────────────────────
const config = await loadConfig()
const app = new App(config, {}, 'default', {})
const rpc = createRpcServer(app)

// ── HTML shell ──────────────────────────────────────────────────────────────
const cssPath = path.join(ROOT, 'build/dev-macos-arm64/kb-dev.app/Contents/Resources/app/views/shell/index.css')
const cssExists = await Bun.file(cssPath).exists()

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>kb — preview</title>
    ${cssExists ? '<link rel="stylesheet" href="/index.css" />' : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/index.js"></script>
  </body>
</html>`

// ── Server ──────────────────────────────────────────────────────────────────
Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url)
    const p = url.pathname

    // Static assets
    if (p === '/' || p === '/index.html') return new Response(html, { headers: { 'Content-Type': 'text/html' } })
    if (p === '/index.js') return new Response(bundleJs, { headers: { 'Content-Type': 'application/javascript' } })
    if (p === '/index.css' && cssExists) return new Response(Bun.file(cssPath))

    // Forward all /api/* requests to the single Elysia RpcApp instance.
    // This is the same `createRpcServer(app)` used by the desktop main process,
    // so renderer ↔ main and preview share one transport contract.
    if (p.startsWith(API_PREFIX)) {
      return rpc.handle(req)
    }

    return new Response('Not found', { status: 404 })
  }
})

console.log(`Preview server running at http://localhost:${PORT}`)
