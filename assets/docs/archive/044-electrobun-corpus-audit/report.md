<!-- markdownlint-disable-file -->

# Electrobun documentation corpus audit — Report

**Audit date:** 2026-05-27
**Pinned package:** `electrobun@^1.18.1` ([`package.json`](../../../package.json))
**Inventory refresh:** [`elysia-electrobun-capability-inventory/inventory.yml`](../elysia-electrobun-capability-inventory/inventory.yml) (`generated_at: 2026-05-27`)
**Scope:** Electrobun docs only — Elysia entries unchanged. **No `src/` implementation** in this audit.

---

## Executive summary

kb uses a **narrow but deep** slice of Electrobun: single `BrowserWindow` with `views://` renderer, typed RPC bridge to Elysia, partial `Utils`, `GlobalShortcut`, `Screen.getPrimaryDisplay`, and build/signing config. The largest gaps versus upstream docs are **lifecycle** (`before-quit` / shortcut teardown), **Utils completeness** (clipboard, cursor display, openPath), and **distribution** (updater, signing in CI).

This report maps **~38 doc URLs** to inventory ids and assigns kb-specific adoption tiers (**Should / Could / Defer / Skip**). Inventory entries remain `priority: undecided` per the neutral inventory spec.

> **Maintainer sign-off (2026-06-01):** Should-tier items 1–4 are in v0.10.0 via electrobun-utils-adoption. Inventory priorities for 14 Electrobun ids are assigned in inventory.yml; see assets/docs/archive/v0.10.0-scope.md.

---

## Page checklist

Legend: **Mapped** = covered by an inventory entry; **Gap** = no dedicated entry or redirect.

### Getting started

| Page                    | URL (canonical)                     | Inventory                                                        | Fetch 2026-05-27 |
| ----------------------- | ----------------------------------- | ---------------------------------------------------------------- | ---------------- |
| Quick Start             | `/guides/quick-start/`              | `electrobun-getting-started`                                     | OK               |
| Hello World             | `/guides/hello-world/`              | `electrobun-getting-started`                                     | OK               |
| What is Electrobun?     | `/guides/what-is-electrobun/`       | `electrobun-getting-started`, `electrobun-architecture-overview` | OK               |
| Creating UI             | `/guides/creating-ui/`              | `electrobun-getting-started`, `electrobun-electroview-class`     | OK               |
| Bundling & Distribution | `/guides/bundling-and-distribution` | `electrobun-build`                                               | OK               |

### Advanced guides

| Page                       | URL                                  | Inventory                             | Fetch    |
| -------------------------- | ------------------------------------ | ------------------------------------- | -------- |
| Cross-Platform Development | `/guides/cross-platform-development` | `electrobun-platform`                 | OK       |
| Compatibility              | `/guides/compatibility`              | `electrobun-compatibility`            | OK       |
| Code Signing               | `/guides/code-signing`               | `electrobun-code-signing`             | OK       |
| Architecture Overview      | `/guides/architecture`               | `electrobun-architecture-overview`    | OK       |
| Webview Tag Architecture   | `/guides/webview-tag-architecture`   | `electrobun-webview-tag-architecture` | OK       |
| Updates                    | `/guides/updates`                    | `electrobun-updates`                  | OK       |
| Migrating 0.x → v1         | `/guides/migrating-from-0x-to-v1`    | **Gap** (redirects to marketing home) | Redirect |
| Build Configuration        | `/guides/build-configuration`        | `electrobun-build-configuration`      | OK       |
| CLI Arguments              | `/guides/cli-args`                   | `electrobun-cli-args`                 | OK       |
| Bundling CEF               | `/guides/bundling-cef`               | `electrobun-bundling-cef`             | OK       |

### Bun / main-process APIs

| Page               | URL                       | Inventory                                                           | Fetch           |
| ------------------ | ------------------------- | ------------------------------------------------------------------- | --------------- |
| Bun API hub        | `/apis/bun`               | `electrobun-global-shortcut`, `electrobun-screen`                   | Partial timeout |
| BrowserWindow      | `/apis/browser-window`    | `electrobun-browser-window`                                         | OK              |
| BrowserView        | `/apis/browser-view`      | `electrobun-main-process-rpc`, `electrobun-browser-view-navigation` | OK              |
| WebGPU / GpuWindow | `/apis/webgpu`            | `electrobun-webgpu`                                                 | OK              |
| Utils              | `/apis/utils`             | `electrobun-utils`, `electrobun-paths-api`                          | OK              |
| Context Menu       | `/apis/context-menu`      | `electrobun-context-menu`                                           | OK              |
| Application Menu   | `/apis/application-menu`  | `electrobun-menus`                                                  | OK              |
| Paths              | `/apis/paths`             | `electrobun-paths-api`                                              | OK              |
| Tray               | `/apis/tray`              | `electrobun-tray`                                                   | OK              |
| Updater            | `/apis/updater`           | `electrobun-updater-api`                                            | OK              |
| Events             | `/apis/events`            | `electrobun-events`                                                 | OK              |
| BuildConfig        | `/apis/build-config`      | `electrobun-build-config-api`                                       | OK              |
| Bundled assets     | `/apis/bundled-assets`    | `electrobun-bundled-assets`                                         | OK              |
| Application icons  | `/apis/application-icons` | `electrobun-application-icons`                                      | OK              |

### Renderer APIs

| Page              | URL                       | Inventory                                                             | Fetch |
| ----------------- | ------------------------- | --------------------------------------------------------------------- | ----- |
| Electroview       | `/apis/electroview`       | `electrobun-electroview-class`, `electrobun-renderer-electroview-rpc` | OK    |
| Webview tag       | `/apis/webview-tag`       | `electrobun-webview-tag`                                              | OK    |
| Draggable regions | `/apis/draggable-regions` | `electrobun-draggable-regions`                                        | OK    |
| Global properties | `/apis/global-properties` | `electrobun-global-properties`                                        | OK    |
| WGPU tag          | `/apis/wgpu`              | `electrobun-wgpu-tag`                                                 | OK    |

**Coverage:** 37/38 URLs mapped; 1 redirect (`migrating-from-0x-to-v1`).

---

## kb evidence snapshot (2026-05-27)

| Surface                              | Status   | Primary evidence                                                 |
| ------------------------------------ | -------- | ---------------------------------------------------------------- |
| BrowserWindow + views://             | Used     | `src/shell/main/main.ts`, `electrobun.config.ts`                 |
| RPC (defineRPC / Electroview)        | Used     | `src/shell/main/rpc/host.ts`, `src/shell/renderer/rpc/client.ts` |
| Utils subset                         | Partial  | `openExternal`, `openFileDialog`, `showMessageBox`, `quit`       |
| GlobalShortcut                       | Partial  | Registered; no `unregisterAll` on quit                           |
| Screen                               | Partial  | `getPrimaryDisplay` only                                         |
| Events                               | Partial  | `blur` only; no `before-quit`                                    |
| Window state                         | Partial  | `state.ts` helpers exist; not wired to launch/save               |
| Window drag                          | Custom   | `use_window_drag.hook.ts` RPC drag, not draggable-regions API    |
| CEF                                  | Partial  | Opt-in `ELECTROBUN_RENDERER=cef` / `dev:cef`                     |
| Menus / Tray / Updater / Webview tag | Not used | —                                                                |
| BuildConfig API                      | Not used | —                                                                |

---

## Adoption matrix

Tiers are **audit recommendations only** — not inventory `priority` values.

### Should (adopt soon)

| Item                                             | Effort | Rationale                                                                | Spec / follow-up                                                             |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `before-quit` → `GlobalShortcut.unregisterAll()` | S      | Prevents orphaned global shortcuts after quit/restart                    | [`electrobun-utils-adoption`](../electrobun-utils-adoption/tasks.md) Phase 3 |
| Utils clipboard for handoff                      | S      | Replace shell `pbpaste`/`xclip` with `Utils.clipboardReadText/WriteText` | [`electrobun-utils-adoption`](../electrobun-utils-adoption/design.md)        |
| `Utils.openExternal` / `openPath` return checks  | S      | Handoff should respect boolean failures                                  | `electrobun-utils-adoption` Phase 1                                          |
| Optional `App.closeDb()` in `before-quit`        | S      | DB today closed on sync/config paths, not on quit                        | Note in utils-adoption or future lifecycle spec                              |

### Could (when a named spec lands)

| Item                                                | Effort | Rationale                                          | Spec / follow-up                                                               |
| --------------------------------------------------- | ------ | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| Cursor-aware window placement                       | M      | `Screen.getCursorScreenPoint` + display resolve    | [`electrobun-utils-adoption`](../electrobun-utils-adoption/requirements.md) R3 |
| Debounced `move`/`resize` → `saveWindowState`       | M      | Helpers in `window/state.ts` unused in main        | Future `shell-window-persistence`                                              |
| Launch `loadWindowStateSync` before `BrowserWindow` | M      | Same                                               | Future persistence spec                                                        |
| ApplicationMenu Edit roles (Cut/Copy/Paste)         | M      | Creating UI guide pattern; improves native editing | Future `electrobun-native-ui`                                                  |
| `BuildConfig.get()` verbose startup log             | S      | Debug CEF vs native artifacts                      | Optional dev ergonomics                                                        |
| `setNavigationRules` if external URLs load          | L      | Security prerequisite for embedded web             | Before any http(s) webview feature                                             |

### Defer (product trigger required)

| Item                                            | Trigger                                                         |
| ----------------------------------------------- | --------------------------------------------------------------- |
| Auto-update (`Updater` API + `release.baseUrl`) | Signed release channel + hosting                                |
| System tray                                     | Minimize-to-tray product decision                               |
| Context menus for entry actions                 | After command palette / handoff UX stable                       |
| `open-url` deep linking                         | Custom URL scheme + macOS `/Applications` install               |
| Quit-cancel for in-flight sync                  | Sync UX policy                                                  |
| Utils `showNotification`                        | Replace renderer toasts (explicitly deferred in utils-adoption) |
| PATHS / `Utils.paths` migration                 | Pre-distribution path audit                                     |
| Session API (Utils)                             | Only if multi-profile or cookie isolation needed                |
| Windows/Linux release verification              | Platform CI + hardware                                          |

### Skip / N/A

| Item                                   | Reason                                    |
| -------------------------------------- | ----------------------------------------- |
| WebGPU / GpuWindow / WGPU tag          | No GPU UI                                 |
| `<electrobun-webview>` nested OOPIF    | Single primary webview; views:// only     |
| Draggable regions API                  | Custom RPC drag already implemented       |
| Download / navigation event hooks      | No external navigation today              |
| `process.on('beforeExit')`             | Upstream recommends `before-quit` instead |
| Getting-started guides as code changes | Onboarding/docs alignment only            |
| Migrating 0.x → v1 doc                 | Unreachable; kb already on v1             |

---

## Top 10 ranked recommendations

| Rank | Recommendation                                      | Tier   | Effort | Owner spec                         |
| ---: | --------------------------------------------------- | ------ | ------ | ---------------------------------- |
|    1 | Wire `before-quit` → `unregisterAll`                | Should | S      | electrobun-utils-adoption          |
|    2 | Utils clipboard ports for handoff                   | Should | S      | electrobun-utils-adoption          |
|    3 | Handoff openExternal/openPath with boolean handling | Should | S      | electrobun-utils-adoption          |
|    4 | Cursor-display window placement                     | Could  | M      | electrobun-utils-adoption R3       |
|    5 | Persist window bounds (move/resize + launch load)   | Could  | M      | New persistence spec               |
|    6 | ApplicationMenu Edit roles                          | Could  | M      | Future native-ui spec              |
|    7 | Document signing env vars for maintainers           | Could  | S      | electrobun-code-signing / CI guide |
|    8 | CEF policy for cross-platform releases              | Defer  | L      | electrobun-platform                |
|    9 | Updater after signing pipeline                      | Defer  | L      | electrobun-updates                 |
|   10 | Navigation rules before external URLs               | Could  | L      | Security gate                      |

---

## Lifecycle appendix (Events API)

Source: [Events](https://blackboard.sh/electrobun/docs/apis/events) (fetched 2026-05-27).

### Recommended shutdown pattern for kb

```typescript
Electrobun.events.on('before-quit', async () => {
  GlobalShortcut.unregisterAll()
  // optional: await app.closeDb()
})
```

### Platform caveats

- **Linux:** System-initiated quit (WM close, taskbar) may **not** fire `before-quit`; programmatic `Utils.quit()` and `process.exit()` do.
- **macOS:** `open-url` for deep links requires URL scheme in `electrobun.config.ts` and app in `/Applications`.
- **Dev mode:** First Ctrl+C runs graceful shutdown; second force-kills; 10s safety timeout.

### Event surfaces kb does not need today

- Global/per-webview `will-navigate` — no external URLs in production webview.
- Download events — no download handlers.
- Quit cancellation — defer until sync-in-progress UX is defined.

### Window events for persistence (Could tier)

When a persistence spec lands, prefer debounced `move` and `resize` on `BrowserWindow` plus `saveWindowState`, with `loadWindowStateSync` before construction — not solely `before-quit`, due to Linux system-quit gap.

---

## Cross-links

| Workstream                                                                             | Relationship                                               |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [`electrobun-utils-adoption`](../electrobun-utils-adoption/)                           | Implements Should-tier Utils + Events Phase 3              |
| [`elysia-electrobun-capability-inventory`](../elysia-electrobun-capability-inventory/) | Neutral evidence; 33 Electrobun entries after refresh      |
| [`ci-review-e2e`](../ci-review-e2e/)                                                   | CEF dev path (`ELECTROBUN_RENDERER=cef`) for CDP debugging |
| [`assets/guides/ELECTROBUN.md`](../../../assets/guides/ELECTROBUN.md)                  | Canonical doc URL map for contributors                     |

---

## Out of scope (this audit)

- Implementation in `src/`
- Assigning inventory `must-have` / `meh` priorities
- Elysia doc re-scrape
- New feature specs beyond cross-links above

---

## Maintainer next steps

1. Review adoption tiers in this report and [`handoff.md`](handoff.md).
2. Assign inventory priorities for Should-tier items (or confirm utils-adoption spec as the implementation vehicle).
3. Re-fetch `/guides/migrating-from-0x-to-v1` if Electrobun restores the page; add inventory entry if content returns.
