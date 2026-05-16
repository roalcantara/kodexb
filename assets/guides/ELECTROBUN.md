---
title: Electrobun orientation
description: Official docs map and RPC shape for kb main ↔ renderer
---

# Electrobun orientation (kb)

Cursor rule (summary): use Bun per `.cursor/rules/use-bun-instead-of-node-vite-npm-pnpm.mdc`; this guide links **Blackboard Electrobun** docs and records how **kb** maps them to `design.md`.

## Official documentation (read order)

1. **[Quick Start](https://blackboard.sh/electrobun/docs/guides/quick-start/)** — `bunx electrobun init`, template layout, `bun install` + `bun start` / dev workflow.
2. **[Hello World](https://blackboard.sh/electrobun/docs/guides/hello-world/)** — `bun init`, `bun install electrobun`, `electrobun.config.ts` `build.bun.entrypoint`, `BrowserWindow` from `electrobun/bun`. **Note:** Electrobun pins a **Bun version under `node_modules`**; system Bun is mainly for install and scripts.
3. **[What is Electrobun?](https://blackboard.sh/electrobun/docs/guides/what-is-electrobun/)** — Small bundles vs Electron, **system WebView** by default (WebKit / WebView2 / WebKitGTK), optional CEF, **typed encrypted RPC**, **`views://`** bundled assets, binary diff updates.
4. **[Creating UI](https://blackboard.sh/electrobun/docs/guides/creating-ui/)** — `Electroview` from `electrobun/view`, **`views://…`** URLs, `electrobun.config.ts` `build.views` + `build.copy`, **`ApplicationMenu`** for Edit roles (⌘C / ⌘V / ⌘A).
5. **[Bun API](https://blackboard.sh/electrobun/docs/apis/bun)** — Main process = TypeScript on Bun; import **`electrobun/bun`** for windows, menus, tray, etc.
6. **[BrowserView](https://blackboard.sh/electrobun/docs/apis/browser-view)** — `BrowserWindow` owns a default **BrowserView** (`win.webview`); nested **`<electrobun-webview>`** for OOPIFs; **`BrowserView.defineRPC`** with a shared **`ElectrobunRPCSchema`**; **`sandbox: true`** disables RPC for untrusted URLs.
7. **[Bundling & Distribution](https://blackboard.sh/electrobun/docs/guides/bundling-and-distribution)** — `electrobun build`, `artifacts/`, `release.baseUrl`, ZSTD + patches, build lifecycle hooks.

## kb layout vs templates

| Template / doc | kb |
| ---------------- | -- |
| `src/bun/index.ts` | `src/shell/main/main.ts` (must match `electrobun.config.ts` `build.bun.entrypoint`) |
| `views://…` + `build.views` | Today: `import.meta.resolve('…/renderer/index.html')` + root `renderer/`; migrating to **`views://`** is optional and matches [Creating UI](https://blackboard.sh/electrobun/docs/guides/creating-ui/). |
| `BrowserWindow({ width, height })` | API types prefer **`frame: { x, y, width, height }`**; use `frame` for explicit sizing. |

## RPC schema (official `ElectrobunRPCSchema`)

Shared type (e.g. `KbDesktopRpcSchema` in `src/shared/rpc/kb_rpc_schema.ts`) has two sides: **`bun`** and **`webview`**. Each side has **`requests`** (async call/response) and **`messages`** (fire-and-forget).

| Direction | Schema location | API |
| --------- | ---------------- | --- |
| Renderer → main (request/response) | **`bun.requests`** | Renderer: `rpc.request.<method>(params)`; Bun: `BrowserView.defineRPC({ handlers: { requests: { … } } })`. |
| Main → renderer (push) | **`webview.messages`** | Bun: `win.webview.rpc.send.<message>(payload)`; Renderer: `Electroview.defineRPC({ handlers: { messages: { … } } })`. |
| Renderer → main (one-way) | **`bun.messages`** | Renderer sends; Bun handles under `handlers.messages`. |
| Main → renderer (request/response into webview) | **`webview.requests`** | Bun: `await win.webview.rpc.request.<method>(params)`. |

**kb / `design.md` mapping:** `RendererToMain` methods align with **`bun.requests`**. `MainToRenderer` notifications align with **`webview.messages`**.

## Build

The default `bun run build` runs Electro build with TLS verification enabled.
An escape-hatch `bun run build:insecure-local` exists for environments where local
certificate configuration blocks the Electrobun download step. Prefer the
default build; only use `build:insecure-local` when the default build fails
with a specific TLS error and the environment cannot be fixed directly.

## Security

For remote or untrusted `url`, use **`sandbox: true`** so RPC is disabled ([BrowserView RPC](https://blackboard.sh/electrobun/docs/apis/browser-view)).

## References

- [Documentation home](https://blackboard.sh/electrobun/docs/)
- [GitHub — electrobun](https://github.com/blackboardsh/electrobun)
