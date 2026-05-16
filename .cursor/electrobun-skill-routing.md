# Electrobun skill routing (kb)

**Read the full `SKILL.md`** with the Read tool when a row matches the task.

**Where to read from:** kb keeps repo-owned skills and approved symlinks under **`<repo>/.agents/skills/<id>/SKILL.md`** (same folder as `kb-context`, `kb-rpc`, etc.). Use `mise run link:skills` to sync the linked companions defined in [`assets/guides/SKILLS.md`](../assets/guides/SKILLS.md) from `$HOME/.agents/skills/` into that tree. A global Cursor copy under `$HOME/.config/cursor/skills/` may also exist on your machine — prefer the repo path when both are present.

| When the task involves…                                                         | Read this skill first     | Note                              |
| ------------------------------------------------------------------------------- | ------------------------- | --------------------------------- |
| Unsure where to start, "which electrobun skill", overview                       | `electrobun-plugin-guide` | linked                            |
| `electrobun.config.ts`, build.views, copy assets                                | `electrobun-config`       | linked                            |
| Main process: `BrowserWindow`, `BrowserView`, lifecycle, menus, tray            | `electrobun-core`         | linked                            |
| Typed RPC, `Electroview.defineRPC`, schema bun/webview, `rpc.client`            | `electrobun-rpc`          | linked — native IPC transport only |
| `electrobun dev`, watch/hot, devtools, dev cycle                                | `electrobun-dev`          | linked                            |
| `electrobun build`, CI, signing, distribution failures                          | `electrobun-build`        | linked                            |
| Linux/Windows/macOS differences, CEF, multi-platform CI                         | `electrobun-platform`     | linked                            |
| End-to-end feature pipeline / multi-agent SDLC                                  | `electrobun-sdlc`         | global only                       |
| "What stage next", lifecycle between dev/build/ship                             | `electrobun-workflow`     | linked                            |
| Kitchen sink / `defineTest` / upstream Electrobun test harness                  | `electrobun-kitchen-sink` | linked                            |
| Electrobun's own test framework patterns (`defineTest`, etc.)                   | `electrobun-testing`      | linked                            |
| WebGPU / `GpuWindow` / WGSL                                                     | `electrobun-webgpu`       | global only                       |
| **milady-ai/milady** repo PRs and their Electrobun conventions                  | `electrobun-milady`       | global only                       |
| **CDP / automate the running app** (separate tool; not kb's default dev script) | `agent-electrobun`        | linked                            |

**kb-specific in-repo docs** (read when relevant): [`assets/guides/ELECTROBUN.md`](../assets/guides/ELECTROBUN.md), [`assets/docs/specs/foundation/design.md`](../assets/docs/specs/foundation/design.md) (RPC and layout).

**Heuristic:** If the user edits under `src/shell/`, `electrobun.config.ts`, or `src/shared/rpc/`, load **`electrobun-core`** and/or **`electrobun-rpc`** before changing behavior.

**Important:** `electrobun-rpc` covers the native Electrobun IPC transport layer (`BrowserView.defineRPC`, `Electroview.defineRPC`, `ElectrobunRPCSchema`). For kb's **app-level RPC** (Elysia + Eden Treaty endpoints, TypeBox schemas, preview server mirroring), load **`kb-rpc`** instead of or in addition to `electrobun-rpc`.
