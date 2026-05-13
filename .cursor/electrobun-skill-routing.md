# Electrobun skill routing (kb)

**Read the full `SKILL.md`** with the Read tool when a row matches the task.

**Where to read from:** kb vendors Electrobun skills under **`<repo>/.agents/skills/<id>/SKILL.md`** (same folder as `kb-context`, `kb-rpc`, etc.). Use `mise run link:skills` to symlink additional skills from `$HOME/.agents/skills/` into that tree. A global Cursor copy under `$HOME/.config/cursor/skills/` may also exist on your machine — prefer the repo path when both are present.

| When the task involves…                                                         | Read this skill first     |
| ------------------------------------------------------------------------------- | ------------------------- |
| Unsure where to start, “which electrobun skill”, overview                       | `electrobun-plugin-guide` |
| `electrobun.config.ts`, build.views, copy assets                                | `electrobun-config`       |
| Main process: `BrowserWindow`, `BrowserView`, lifecycle, menus, tray            | `electrobun-core`         |
| Typed RPC, `Electroview.defineRPC`, schema bun/webview, `rpc.client`            | `electrobun-rpc`          |
| `electrobun dev`, watch/hot, devtools, dev cycle                                | `electrobun-dev`          |
| `electrobun build`, CI, signing, distribution failures                          | `electrobun-build`        |
| Linux/Windows/macOS differences, CEF, multi-platform CI                         | `electrobun-platform`     |
| End-to-end feature pipeline / multi-agent SDLC                                  | `electrobun-sdlc`         |
| “What stage next”, lifecycle between dev/build/ship                             | `electrobun-workflow`     |
| Kitchen sink / `defineTest` / upstream Electrobun test harness                  | `electrobun-kitchen-sink` |
| Electrobun’s own test framework patterns (`defineTest`, etc.)                   | `electrobun-testing`      |
| WebGPU / `GpuWindow` / WGSL                                                     | `electrobun-webgpu`       |
| **milady-ai/milady** repo PRs and their Electrobun conventions                  | `electrobun-milady`       |
| **CDP / automate the running app** (separate tool; not kb’s default dev script) | `agent-electrobun`        |

**kb-specific in-repo docs** (read when relevant): [`assets/guides/ELECTROBUN.md`](../assets/guides/ELECTROBUN.md), [`assets/docs/specs/foundation/design.md`](../assets/docs/specs/foundation/design.md) (RPC and layout).

**Heuristic:** If the user edits under `src/shell/`, `electrobun.config.ts`, or `src/shared/rpc/`, load **`electrobun-core`** and/or **`electrobun-rpc`** before changing behavior.
