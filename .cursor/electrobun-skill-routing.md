# Electrobun skill routing

**Read the full `SKILL.md`** with the Read tool when a row matches the task.

**Where to read from:** the project keeps project-authored skills and Skills CLI-managed project skills under **`<repo>/.agents/skills/<id>/SKILL.md`** (same folder as `app-context`, `app-rpc`, etc.). Use `mise run skill install` to restore external project skills from `skills-lock.json`. Global companions stay under `$HOME/.agents/skills/`.

<!-- skills:electrobun-routing:start -->
| When the task involves... | Read this skill first | Note |
| --- | --- | --- |
| Unsure where to start, which electrobun skill, overview | `electrobun-plugin-guide` | project |
| electrobun.config.ts, build.views, copy assets | `electrobun-config` | project |
| Main process, BrowserWindow, BrowserView, lifecycle, menus, tray | `electrobun-core` | project |
| Typed RPC, Electroview.defineRPC, schema bun/webview, rpc.client | `electrobun-rpc` | project - native IPC transport only |
| electrobun dev, watch/hot, devtools, dev cycle | `electrobun-dev` | project |
| electrobun build, CI, signing, distribution failures | `electrobun-build` | project |
| Linux/Windows/macOS differences, CEF, multi-platform CI | `electrobun-platform` | project |
| End-to-end feature pipeline, multi-agent SDLC | `electrobun-sdlc` | project |
| What stage next, lifecycle between dev/build/ship | `electrobun-workflow` | project |
| Kitchen sink, defineTest, upstream Electrobun test harness | `electrobun-kitchen-sink` | project |
| Electrobun's own test framework patterns, defineTest | `electrobun-testing` | project |
| WebGPU, GpuWindow, WGSL | `electrobun-webgpu` | project |
| milady-ai/milady repo PRs, Electrobun conventions | `electrobun-milady` | project |
<!-- skills:electrobun-routing:end -->

**Project-specific in-repo docs** (read when relevant): [`assets/guides/ELECTROBUN.md`](../assets/guides/ELECTROBUN.md), [`assets/guides/FCIS.guide.md`](../assets/guides/FCIS.guide.md) (RPC and layout).

**Heuristic:** If the user edits under `src/shell/`, `electrobun.config.ts`, or `src/shared/rpc/`, load **`electrobun-core`** and/or **`electrobun-rpc`** before changing behavior.

**Important:** `electrobun-rpc` covers the native Electrobun IPC transport layer (`BrowserView.defineRPC`, `Electroview.defineRPC`, `ElectrobunRPCSchema`). For the project's **app-level RPC** (Elysia + Eden Treaty endpoints, TypeBox schemas, preview server mirroring), load **`app-rpc`** instead of or in addition to `electrobun-rpc`.
