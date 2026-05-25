<!-- markdownlint-disable-file -->
# Elysia and Electrobun capability inventory — Report

## Summary

Normalized inventory for maintainer review: **69** capabilities (**41** Elysia, **28** Electrobun) in `inventory.yml`, generated **2026-05-22**.

| Metric                                 | Count |
| -------------------------------------- | ----- |
| `current_usage.status: used`           | 14    |
| `current_usage.status: partial`        | 12    |
| `current_usage.status: not-used`       | 28    |
| `current_usage.status: not-applicable` | 12    |
| `current_usage.status: unknown`        | 3     |
| All `priority: undecided`              | 69    |

Every capability follows the schema in `design.md`: structured `current_usage` (status, evidence paths, confidence, notes), `source_urls` arrays, and `priority_signals` buckets (`roi`, `technical_debt`, `risk_reduction`). The **DONE** column renders `✔` when `current_usage.status` is `used` (single source of truth; no separate `done` field).

## Known limitations

- Upstream docs were refreshed for a coverage addendum on **2026-05-22**, but the inventory is not continuously monitored for future documentation drift.
- The addendum records prominent missing Elysia and Electrobun pages; it does not deeply benchmark or product-rank every capability.
- **Electrobun transport security** (encryption claims) was **not verified** in app code; speculative claims remain avoided or marked as hypotheses.
- **AOT/precompile**, **WebSocket**, **cron**, **trace**, **CEF bundling**, and **tray** ROI statements are hypotheses until benchmarked or product-approved.
- **Code signing** is configured but **env-gated**; default dev/CI paths produce unsigned builds (`mise.toml` `ci:review:build`).
- Inventory tables truncate long `pros`/`cons` lists; see `inventory.yml` for full bullets and `priority_signals`.

## Entries needing human review

Maintainers should prioritise review of:

1. **Partial adoptions** — mixed upstream vs app usage: `elysia-typebox`, `elysia-lifecycle`, `elysia-config`, `elysia-plugin-dedup`, `electrobun-code-signing`, `electrobun-platform`, `electrobun-utils`, `electrobun-events`, `elysia-best-practices`, `electrobun-compatibility`, `electrobun-build-configuration`, `electrobun-cli-args`.
2. **Unknown evidence** — needs targeted code confirmation: `elysia-typescript-performance`, `electrobun-draggable-regions`, `electrobun-global-properties`.
3. **Upstream-only / policy conflicts** — examples include `elysia-cors`, `elysia-jwt`, `elysia-bearer`, `elysia-html`, `elysia-standard-schema`, `elysia-integration-drizzle`, `elysia-integration-ai-sdk`, `electrobun-webgpu`, `elysia-cookies`, `elysia-deploy-patterns`, `elysia-graphql-apollo`, `electrobun-draggable-regions`.
4. **Distribution prerequisites** — `electrobun-code-signing`, `electrobun-updates`, `electrobun-updater-api`, `electrobun-platform`, and `electrobun-bundling-cef`.

## Priority labels

Use these labels **only after** maintainer review (not assigned in this pass).

|     Label      | Meaning                                                                  |
| :------------: | ------------------------------------------------------------------------ |
|  `MUST-HAVE`   | Correctness, security, architectural alignment, or major debt reduction. |
| `NICE-TO-HAVE` | Clear value, reasonable effort, not urgent.                              |
|  `POSTPONED`   | Likely useful later, blocked by timing or prerequisites.                 |
|     `MEH`      | Interesting, not worth backlog weight for app.                           |
|  `Undecided`   | Research complete; classification pending.                               |
|       ✔        | Used                                                                     |
|       H        | High confidence                                                          |
|       M        | Medium confidence                                                        |
|       L        | Low confidence                                                           |

## Elysia inventory

Maintainer tables derived from `inventory.yml` (41 items). Detailed narrative notes remain in YAML `notes` and `current_usage.notes`.

| DONE | Ecosystem | Area          | Feature                                      | Source                                        | Current app usage | Priority  | Pros                                                                         | Cons                                                                                              | Candidate story                                                                          |
| ---- | --------- | ------------- | -------------------------------------------- | --------------------------------------------- | ----------------- | --------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ✔    | elysia    | routing       | POST routing and handlers                    | [route.html][0]                               | Used (H)          | Undecided | Foundation of app's typed RPC server.                                        | —                                                                                                 | —                                                                                        |
|      | elysia    | validation    | TypeBox validation                           | [typebox.html][1]                             | Partial (H)       | Undecided | TypeBox is app's sole validation library across transport and core.          | Route schemas do not use Elysia's `t` helper; docs examples may not match app's pattern verbatim. | Document app's TypeBox-only RPC schema pattern in app-rpc skill examples.                |
| ✔    | elysia    | rpc           | Eden Treaty                                  | [overview.html][2]                            | Used (H)          | Undecided | Keeps renderer and main RPC types aligned without manual sync.               | Bridge discipline required because production transport is Electrobun IPC, not HTTP.              | Harden Eden bridge response and error contracts.                                         |
|      | elysia    | lifecycle     | Lifecycle hooks                              | [life-cycle.html][3]                          | Partial (H)       | Undecided | onError already provides a global error boundary for RPC routes.             | Most lifecycle hooks are unused; trace would add overhead unless adopted deliberately.            | Add onRequest logging with request IDs for preview-server debugging. (+1)                |
| ✔    | elysia    | lifecycle     | Global error handling (onError)              | [error-handling.html][4]                      | Used (H)          | Undecided | Consistent RPC error shape for renderer and preview server.                  | —                                                                                                 | —                                                                                        |
| ✔    | elysia    | testing       | Eden Treaty unit testing (app.handle)        | [unit-test.html][5]                           | Used (H)          | Undecided | Fast, parallel-safe RPC tests without real HTTP ports.                       | —                                                                                                 | —                                                                                        |
|      | elysia    | configuration | Elysia constructor configuration             | [configuration.html][6]                       | Partial (H)       | Undecided | —                                                                            | —                                                                                                 | —                                                                                        |
|      | elysia    | plugins       | Plugin composition and deduplication         | [plugin.html][7]                              | Partial (M)       | Undecided | Plugin model keeps error handling modular.                                   | —                                                                                                 | —                                                                                        |
|      | elysia    | handler       | State, decorate, and store                   | [handler.html][8]                             | Not used (H)      | Undecided | —                                                                            | —                                                                                                 | —                                                                                        |
|      | elysia    | patterns      | Macros                                       | [macro.html][9]                               | Not used (H)      | Undecided | Could reduce duplication across many similar POST routes.                    | Adds indirection; app currently favours explicit route definitions.                               | Evaluate a typed-rpc macro for common route patterns after maintainer review.            |
|      | elysia    | patterns      | Mount                                        | [mount.html][10]                              | Not used (H)      | Undecided | —                                                                            | —                                                                                                 | —                                                                                        |
|      | elysia    | configuration | AOT and precompile                           | [configuration.html][6]                       | Not used (H)      | Undecided | —                                                                            | Benefit unverified for app's small RPC surface.                                                   | Benchmark AOT/precompile impact on preview-server startup before adoption.               |
|      | elysia    | plugins       | OpenAPI plugin                               | [openapi.html][11]                            | Not used (H)      | Undecided | Zero-config API docs from existing TypeBox route schemas.                    | Adds `@elysia/openapi` dependency; limited value for IPC-only production path.                    | Generate OpenAPI docs for preview server endpoints only.                                 |
|      | elysia    | transport     | WebSocket support                            | [websocket.html][12]                          | Not used (H)      | Undecided | Built into Elysia without extra WebSocket libraries for HTTP servers.        | Duplicates existing Electrobun bidirectional messaging for production. (+1)                       | Stream sync progress via WebSocket on preview server only (if HTTP streaming is needed). |
|      | elysia    | plugins       | CORS plugin                                  | [cors.html][13]                               | Not used (M)      | Undecided | Simple one-liner for browser-based preview tooling.                          | Irrelevant for Electrobun IPC production path. (+1)                                               | —                                                                                        |
|      | elysia    | plugins       | JWT plugin                                   | [jwt.html][14]                                | N/A (H)           | Undecided | —                                                                            | Unnecessary overhead for local desktop RPC. (+1)                                                  | —                                                                                        |
|      | elysia    | plugins       | Bearer auth plugin                           | [bearer.html][15]                             | N/A (H)           | Undecided | —                                                                            | Unnecessary for single-user desktop app.                                                          | —                                                                                        |
|      | elysia    | plugins       | HTML plugin                                  | [html.html][16]                               | N/A (H)           | Undecided | —                                                                            | Conflicts with existing React renderer architecture.                                              | —                                                                                        |
|      | elysia    | plugins       | Static file plugin                           | [static.html][17]                             | Not used (H)      | Undecided | —                                                                            | Electrobun `views://` and `build.copy` already handle packaged assets.                            | —                                                                                        |
|      | elysia    | plugins       | Cron plugin                                  | [cron.html][18]                               | Not used (H)      | Undecided | —                                                                            | Adds background scheduling complexity to a desktop app that currently syncs on demand.            | Schedule periodic knowledge-base refresh (requires product decision first).              |
|      | elysia    | plugins       | Server Timing plugin                         | [server-timing.html][19]                      | Not used (H)      | Undecided | Lightweight HTTP observability for local preview.                            | No effect on Electrobun IPC production path.                                                      | —                                                                                        |
|      | elysia    | validation    | File upload (t.File / t.Files)               | [validation.html][20]                         | N/A (H)           | Undecided | —                                                                            | —                                                                                                 | —                                                                                        |
|      | elysia    | plugins       | GraphQL (Yoga / Apollo)                      | [graphql-yoga.html][21]                       | N/A (H)           | Undecided | —                                                                            | Significant complexity versus current Eden Treaty RPC model.                                      | —                                                                                        |
|      | elysia    | plugins       | OpenTelemetry plugin                         | [opentelemetry.html][22]                      | Not used (H)      | Undecided | Standard observability protocol for HTTP services.                           | Heavy dependency footprint for a local desktop app. (+1)                                          | —                                                                                        |
|      | elysia    | validation    | Standard Schema support (Zod, Valibot, etc.) | [at-glance.html][23]                          | Not used (H)      | Undecided | Flexible for upstream projects using multiple validator libraries.           | Violates app TypeBox-only policy (CLAUDE.md, app-rpc skill). (+1)                                 | —                                                                                        |
|      | elysia    | integrations  | Drizzle ORM integration                      | [drizzle.html][24]                            | N/A (H)           | Undecided | —                                                                            | Violates app no-Drizzle policy and foundation design decisions.                                   | —                                                                                        |
|      | elysia    | integrations  | Better Auth integration                      | [better-auth.html][25]                        | N/A (H)           | Undecided | —                                                                            | Requires network-exposed auth flows app does not have.                                            | —                                                                                        |
|      | elysia    | integrations  | Vercel AI SDK integration                    | [ai-sdk.html][26]                             | Not used (M)      | Undecided | Opens path to AI-assisted knowledge features if product approves.            | Adds dependencies and external API key requirements. (+1)                                         | AI-powered tag suggestions (requires product and privacy review). (+1)                   |
|      | elysia    | architecture  | Best practices                               | [best-practice.html][27]                      | Partial (M)       | Undecided | Validates app's thin route and extracted schema approach.                    | Upstream layout guidance must stay subordinate to FCIS and app skill routing.                     | Cross-check app-rpc examples against current Elysia best-practice guidance.              |
|      | elysia    | typescript    | TypeScript type performance                  | [typescript.html][28]                         | Unknown (L)       | Undecided | Could reduce future typecheck friction as routes accumulate.                 | Current RPC surface is small enough that benefit is unproven.                                     | Measure RPC typecheck cost before adding more Elysia plugins.                            |
|      | elysia    | lifecycle     | Trace lifecycle instrumentation              | [trace.html][29]                              | Not used (H)      | Undecided | Fine-grained route timing without rewriting handlers.                        | Adds instrumentation complexity and may not help the Electrobun IPC path directly.                | Prototype trace instrumentation for preview-only RPC latency debugging.                  |
|      | elysia    | handler       | Cookie handling                              | [cookie.html][30]                             | N/A (H)           | Undecided | —                                                                            | Cookie state is unnecessary for the current single-user desktop IPC model.                        | —                                                                                        |
|      | elysia    | handler       | Extends context                              | [extends-context.html][31]                    | Not used (H)      | Undecided | Could centralise shared request metadata if app adds auth or observability.  | Not needed while handlers remain thin delegates to `App`.                                         | —                                                                                        |
|      | elysia    | deployment    | Deploy patterns                              | [deploy.html][32]                             | N/A (H)           | Undecided | —                                                                            | Mostly irrelevant to Electrobun IPC production architecture.                                      | —                                                                                        |
|      | elysia    | development   | Full-stack dev server                        | [fullstack-dev-server.html][33]               | Not used (H)      | Undecided | Could consolidate preview HTTP handling if the renderer workflow changes.    | Would compete with the existing Electrobun preview pipeline.                                      | —                                                                                        |
|      | elysia    | rpc           | Eden Fetch client                            | [fetch.html][34]                              | Not used (H)      | Undecided | Could be simpler for isolated utility calls.                                 | Switching would churn a working Treaty wrapper without clear benefit.                             | —                                                                                        |
| ✔    | elysia    | rpc           | Eden Treaty configuration and response model | [config.html][35], [parameters.html][36]      | Used (H)          | Undecided | Directly documents the custom Treaty bridge shape app relies on.             | Requires version-aware care because Treaty options can change.                                    | Document Treaty fetcher and response assumptions in the RPC guide.                       |
|      | elysia    | rpc           | Eden Treaty WebSocket client                 | [websocket.html][37]                          | Not used (H)      | Undecided | Could type a preview-only streaming channel if app adopts Elysia WebSockets. | Duplicates Electrobun push-message transport in production.                                       | —                                                                                        |
|      | elysia    | plugins       | Swagger plugin                               | [swagger.html][38]                            | Not used (H)      | Undecided | Alternative human-readable API explorer for preview endpoints.               | Overlaps with the OpenAPI plugin entry and has limited production value for IPC.                  | —                                                                                        |
|      | elysia    | plugins       | GraphQL Apollo integration                   | [graphql-apollo.html][39]                     | N/A (H)           | Undecided | —                                                                            | Same mismatch as GraphQL Yoga: higher complexity than the current typed RPC surface.              | —                                                                                        |
|      | elysia    | integrations  | Runtime and framework integrations           | [node.html][40], [cloudflare-worker.html][41] | N/A (H)           | Undecided | —                                                                            | Hosted runtime integrations do not match app desktop-local deployment.                            | —                                                                                        |

## Electrobun inventory

Maintainer tables derived from `inventory.yml` (28 items). Detailed narrative notes remain in YAML `notes` and `current_usage.notes`.

| DONE | Ecosystem  | Area         | Feature                               | Source                           | Current app usage | Priority  | Pros                                                                            | Cons                                                                                | Candidate story                                                                        |
| ---- | ---------- | ------------ | ------------------------------------- | -------------------------------- | ----------------- | --------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| ✔    | electrobun | window       | BrowserWindow                         | [browser-window][42]             | Used (H)          | Undecided | Foundation of app desktop shell.                                                | —                                                                                   | —                                                                                      |
| ✔    | electrobun | rpc          | BrowserView.defineRPC (main process)  | [browser-view][43]               | Used (H)          | Undecided | Bridges Electrobun IPC to Elysia without duplicating route logic.               | Custom bridge rules (POST-only, `/api/` prefix) must stay in sync with Eden client. | Document bridge validation rules alongside app-rpc skill.                              |
| ✔    | electrobun | rpc          | Electroview.defineRPC (renderer)      | [browser-view][43]               | Used (H)          | Undecided | Typed renderer-side handlers for sync progress push messages.                   | —                                                                                   | —                                                                                      |
| ✔    | electrobun | build        | Bundled assets (views://)             | [bundled-assets][44]             | Used (H)          | Undecided | Packaged renderer without external origin in production.                        | —                                                                                   | —                                                                                      |
| ✔    | electrobun | build        | Build and bundling                    | [bundling-and-distribution][45]  | Used (H)          | Undecided | Core desktop packaging pipeline exists.                                         | —                                                                                   | —                                                                                      |
|      | electrobun | distribution | Code signing and notarization         | [code-signing][46]               | Partial (H)       | Undecided | Wiring exists in config; no custom signing scripts in app repo.                 | Not exercised in default dev/CI paths without credentials.                          | Document maintainer signing env vars and release checklist.                            |
|      | electrobun | distribution | Auto-update system                    | [updates][47]                    | Not used (H)      | Undecided | Built-in delta updates without a separate updater framework.                    | Requires update hosting infrastructure and release process.                         | Auto-update app from canary/stable channels after signing pipeline exists.             |
|      | electrobun | platform     | Cross-platform support                | [cross-platform-development][48] | Partial (H)       | Undecided | Single codebase can target multiple platforms via Electrobun.                   | Platform-specific testing and debugging overhead. (+1)                              | Build and smoke-test app on Windows/Linux (requires platform CI investment).           |
| ✔    | electrobun | native-ui    | GlobalShortcut                        | [bun][49]                        | Used (H)          | Undecided | Quick show/hide without focusing the webview first.                             | —                                                                                   | —                                                                                      |
|      | electrobun | utils        | Utils (paths, dialogs, external open) | [utils][50]                      | Partial (H)       | Undecided | Native file picker and external URL handling already integrated in shell hooks. | —                                                                                   | Evaluate Electrobun PATHS for config/database default locations.                       |
|      | electrobun | native-ui    | ApplicationMenu and ContextMenu       | [application-menu][51]           | Not used (H)      | Undecided | Native OS integration and accelerator support.                                  | —                                                                                   | Add Edit menu with Cut/Copy/Paste roles. (+1)                                          |
|      | electrobun | native-ui    | System Tray                           | [tray][52]                       | Not used (H)      | Undecided | Persistent access without keeping the main window visible.                      | —                                                                                   | Add system tray with quick-search entry point. (+1)                                    |
|      | electrobun | lifecycle    | App and window Events API             | [events][53]                     | Partial (M)       | Undecided | —                                                                               | —                                                                                   | Save window state on before-quit via Electrobun Events API.                            |
|      | electrobun | gpu          | WebGPU / GpuWindow                    | [webgpu][54]                     | N/A (H)           | Undecided | —                                                                               | Irrelevant to app's knowledge-management UI.                                        | —                                                                                      |
| ✔    | electrobun | architecture | Electrobun architecture overview      | [architecture][55]               | Used (H)          | Undecided | Matches app's desktop shell structure.                                          | —                                                                                   | —                                                                                      |
|      | electrobun | platform     | Compatibility guidance                | [compatibility][56]              | Partial (M)       | Undecided | Can turn platform caveats into explicit release criteria.                       | Requires real platform testing, not just docs review.                               | Create a compatibility matrix for app release targets.                                 |
|      | electrobun | webview      | Webview tag architecture              | [webview-tag-architecture][57]   | Not used (H)      | Undecided | Could support embedded external documentation or preview panes later.           | Nested webviews would add isolation and navigation-policy work.                     | —                                                                                      |
|      | electrobun | webview      | <electrobun-webview> tag API          | [webview-tag][58]                | Not used (H)      | Undecided | Possible future embedded browser surface.                                       | External content requires sandboxing, partitions, and navigation allowlists.        | —                                                                                      |
|      | electrobun | native-ui    | ContextMenu API                       | [context-menu][59]               | Not used (H)      | Undecided | Could expose native actions for entries and text fields.                        | Renderer already owns most contextual UI behaviour.                                 | Evaluate native context menu for entry actions after command palette workflows settle. |
|      | electrobun | utils        | PATHS and app storage locations       | [paths][60]                      | Not used (M)      | Undecided | Can make storage defaults more platform-native.                                 | Changing paths can break existing local data unless migrated carefully.             | Audit config and database paths against Electrobun PATHS before distribution.          |
|      | electrobun | distribution | Updater API                           | [updater][61]                    | Not used (H)      | Undecided | Completes the runtime side of the auto-update story.                            | Blocked by release hosting, signing, and channel policy.                            | Add update checks after signing and release hosting are proven.                        |
| ✔    | electrobun | rpc          | Electroview class                     | [electroview][62]                | Used (H)          | Undecided | Central to app renderer-main bridge initialization.                             | Initialization order matters for RPC availability.                                  | —                                                                                      |
|      | electrobun | window       | Draggable regions                     | [draggable-regions][63]          | Unknown (L)       | Undecided | Could improve native feel for the custom window frame.                          | May be unnecessary if current frame mode already handles dragging.                  | Verify whether app needs explicit draggable regions for the custom frame.              |
|      | electrobun | runtime      | Global properties                     | [global-properties][64]          | Unknown (L)       | Undecided | Could expose runtime metadata without extra plumbing.                           | Globals are harder to test than injected values.                                    | —                                                                                      |
|      | electrobun | build        | Build configuration schema            | [build-configuration][65]        | Partial (H)       | Undecided | Can identify packaging options before public release.                           | Advanced build options add maintenance cost if adopted prematurely.                 | Review Electrobun build config options before the first distribution release.          |
|      | electrobun | development  | CLI args and environment flags        | [cli-args][66]                   | Partial (M)       | Undecided | Could simplify debug and release workflows.                                     | Task wrappers already hide most CLI detail from contributors.                       | Document the Electrobun CLI flags actually used by app tasks.                          |
|      | electrobun | build        | Bundling CEF                          | [bundling-cef][67]               | Not used (H)      | Undecided | More consistent rendering across platforms.                                     | Increases artifact size and distribution complexity.                                | Decide whether CEF bundling is needed for Windows/Linux release targets.               |
| ✔    | electrobun | build        | Application icons                     | [application-icons][68]          | Used (H)          | Undecided | Required packaging polish is already wired.                                     | —                                                                                   | —                                                                                      |

## Backlog candidates

These are unprioritised stories, extracted from the tables above and the signals in `inventory.yml`:

- **[Document app's TypeBox-only RPC schema pattern in app-rpc skill examples.][0] _`(elysia-typebox)`_**
  - Tech debt: Two TypeBox authoring styles (Elysia `t` vs `@sinclair/typebox`) if app ever mixes them.
  - Priority: Undecided

- **[Harden Eden bridge response and error contracts.][0] _`(elysia-eden-treaty)`_**
  - Priority: Undecided

- **[Add onRequest logging with request IDs for preview-server debugging.][0] _`(elysia-lifecycle)`_**
  - Risk reduction: Trace hooks could add RPC latency observability if app adopts them later.
  - Priority: Undecided

- **[Evaluate trace hooks for RPC performance monitoring (requires benchmark evidence first).][0] _`(elysia-lifecycle)`_**
  - Risk reduction: Trace hooks could add RPC latency observability if app adopts them later.
  - Priority: Undecided

- **[Evaluate a typed-rpc macro for common route patterns after maintainer review.][0] _`(elysia-macro)`_**
  - Tech debt: Repeated POST route patterns could be DRY'd if macros prove clearer than plain handlers.
  - Priority: Undecided

- **[Benchmark AOT/precompile impact on preview-server startup before adoption.][0] _`(elysia-aot-precompile)`_**
  - ROI: Hypothesis only — could reduce preview-server cold start; requires benchmark evidence before prioritisation.
  - Priority: Undecided

- **[Generate OpenAPI docs for preview server endpoints only.][0] _`(elysia-openapi)`_**
  - ROI: Could document preview-server HTTP endpoints for local development.
  - Prereq: @elysia/openapi package; Preview server remains HTTP-accessible for doc UI
  - Priority: Undecided

- **[Stream sync progress via WebSocket on preview server only (if HTTP streaming is needed).][0] _`(elysia-websocket)`_**
  - ROI: Hypothesis — could stream sync progress over HTTP preview; Electrobun messages already cover desktop path.
  - Prereq: HTTP server path (preview server), not Electrobun IPC
  - Priority: Undecided

- **[Schedule periodic knowledge-base refresh (requires product decision first).][0] _`(elysia-cron)`_**
  - ROI: Hypothesis — periodic background sync could use cron if app adds always-on main-process scheduling.
  - Prereq: @elysia/cron package; Defined policy for background sync while app is open
  - Priority: Undecided

- **[AI-powered tag suggestions (requires product and privacy review).][0] _`(elysia-integration-ai-sdk)`_**
  - ROI: Hypothesis — AI-powered search or tag suggestions could add user value.
  - Prereq: Product approval for AI features; API keys and provider accounts; Privacy review for local knowledge content
  - Priority: Undecided

- **[Natural language knowledge search (requires product and privacy review).][0] _`(elysia-integration-ai-sdk)`_**
  - ROI: Hypothesis — AI-powered search or tag suggestions could add user value.
  - Prereq: Product approval for AI features; API keys and provider accounts; Privacy review for local knowledge content
  - Priority: Undecided

- **[Document bridge validation rules alongside app-rpc skill.][0] _`(electrobun-main-process-rpc)`_**
  - Priority: Undecided

- **[Document maintainer signing env vars and release checklist.][0] _`(electrobun-code-signing)`_**
  - Tech debt: Release pipeline needs verified signing path before public distribution.
  - Risk reduction: Required for Gatekeeper-trusted macOS distribution when maintainers ship releases.
  - Prereq: Apple Developer ID and notarization credentials for macOS releases; Windows signing certificate if targeting Windows releases
  - Priority: Undecided

- **[Auto-update app from canary/stable channels after signing pipeline exists.][0] _`(electrobun-updates)`_**
  - ROI: Essential for distributing updates once app ships beyond maintainer machines.
  - Risk reduction: Reduces manual reinstall burden for users.
  - Prereq: Static hosting or update server for release artifacts; Signed release builds; Channel policy (dev/canary/stable)
  - Priority: Undecided

- **[Build and smoke-test app on Windows/Linux (requires platform CI investment).][0] _`(electrobun-platform)`_**
  - ROI: Expands addressable users if app ships cross-platform.
  - Prereq: Platform CI runners and test hardware; Platform-specific signing/notarization as applicable
  - Priority: Undecided

- **[Evaluate Electrobun PATHS for config/database default locations.][0] _`(electrobun-utils)`_**
  - Tech debt: PATHS helpers might simplify cross-platform data directory resolution if app expands storage layout.
  - Priority: Undecided

- **[Add Edit menu with Cut/Copy/Paste roles.][0] _`(electrobun-menus)`_**
  - ROI: Could improve macOS-native editing shortcuts and app-specific commands.
  - Priority: Undecided

- **[Add app-specific application menu entries.][0] _`(electrobun-menus)`_**
  - ROI: Could improve macOS-native editing shortcuts and app-specific commands.
  - Priority: Undecided

- **[Add system tray with quick-search entry point.][0] _`(electrobun-tray)`_**
  - ROI: Hypothesis — quick access while window is minimized.
  - Priority: Undecided

- **[Minimize to tray instead of dock-only minimize.][0] _`(electrobun-tray)`_**
  - ROI: Hypothesis — quick access while window is minimized.
  - Priority: Undecided

- **[Save window state on before-quit via Electrobun Events API.][0] _`(electrobun-events)`_**
  - Tech debt: before-quit could persist window state cleanly.
  - Priority: Undecided

- **[Cross-check app-rpc examples against current Elysia best-practice guidance.][0] _`(elysia-best-practices)`_**
  - Priority: Undecided

- **[Measure RPC typecheck cost before adding more Elysia plugins.][0] _`(elysia-typescript-performance)`_**
  - Tech debt: Could matter if the RPC surface or plugin graph grows.
  - Priority: Undecided

- **[Prototype trace instrumentation for preview-only RPC latency debugging.][0] _`(elysia-trace)`_**
  - Risk reduction: Could isolate slow preview-server RPC handlers if latency issues appear.
  - Prereq: Benchmark or debugging need for RPC latency
  - Priority: Undecided

- **[Document Treaty fetcher and response assumptions in the RPC guide.][0] _`(elysia-eden-treaty-options)`_**
  - Tech debt: Bridge response handling is custom and deserves explicit documentation.
  - Priority: Undecided

- **[Create a compatibility matrix for app release targets.][0] _`(electrobun-compatibility)`_**
  - Tech debt: Compatibility expectations are not fully documented for non-macOS maintainers.
  - Prereq: Windows/Linux test access or CI runners
  - Priority: Undecided

- **[Evaluate native context menu for entry actions after command palette workflows settle.][0] _`(electrobun-context-menu)`_**
  - Priority: Undecided

- **[Audit config and database paths against Electrobun PATHS before distribution.][0] _`(electrobun-paths-api)`_**
  - Tech debt: Could reduce custom path handling for config and database locations.
  - Priority: Undecided

- **[Add update checks after signing and release hosting are proven.][0] _`(electrobun-updater-api)`_**
  - ROI: Useful only after signed release channels exist.
  - Prereq: Signed release builds; Update hosting; Release channel policy
  - Priority: Undecided

- **[Verify whether app needs explicit draggable regions for the custom frame.][0] _`(electrobun-draggable-regions)`_**
  - Tech debt: Custom-frame window dragging should be documented if app relies on it.
  - Priority: Undecided

- **[Review Electrobun build config options before the first distribution release.][0] _`(electrobun-build-configuration)`_**
  - Priority: Undecided

- **[Document the Electrobun CLI flags actually used by app tasks.][0] _`(electrobun-cli-args)`_**
  - Priority: Undecided

- **[Decide whether CEF bundling is needed for Windows/Linux release targets.][0] _`(electrobun-bundling-cef)`_**
  - Risk reduction: Could reduce renderer differences if cross-platform bugs appear.
  - Prereq: Cross-platform rendering issue or explicit release requirement
  - Priority: Undecided

## References

[0]: https://elysiajs.com/essential/route.html
[1]: https://elysiajs.com/patterns/typebox.html
[2]: https://elysiajs.com/eden/treaty/overview.html
[3]: https://elysiajs.com/essential/life-cycle.html
[4]: https://elysiajs.com/patterns/error-handling.html
[5]: https://elysiajs.com/eden/treaty/unit-test.html
[6]: https://elysiajs.com/patterns/configuration.html
[7]: https://elysiajs.com/essential/plugin.html
[8]: https://elysiajs.com/essential/handler.html
[9]: https://elysiajs.com/patterns/macro.html
[10]: https://elysiajs.com/patterns/mount.html
[11]: https://elysiajs.com/plugins/openapi.html
[12]: https://elysiajs.com/patterns/websocket.html
[13]: https://elysiajs.com/plugins/cors.html
[14]: https://elysiajs.com/plugins/jwt.html
[15]: https://elysiajs.com/plugins/bearer.html
[16]: https://elysiajs.com/plugins/html.html
[17]: https://elysiajs.com/plugins/static.html
[18]: https://elysiajs.com/plugins/cron.html
[19]: https://elysiajs.com/plugins/server-timing.html
[20]: https://elysiajs.com/essential/validation.html
[21]: https://elysiajs.com/plugins/graphql-yoga.html
[22]: https://elysiajs.com/plugins/opentelemetry.html
[23]: https://elysiajs.com/at-glance.html
[24]: https://elysiajs.com/integrations/drizzle.html
[25]: https://elysiajs.com/integrations/better-auth.html
[26]: https://elysiajs.com/integrations/ai-sdk.html
[27]: https://elysiajs.com/essential/best-practice.html
[28]: https://elysiajs.com/patterns/typescript.html
[29]: https://elysiajs.com/patterns/trace.html
[30]: https://elysiajs.com/patterns/cookie.html
[31]: https://elysiajs.com/patterns/extends-context.html
[32]: https://elysiajs.com/patterns/deploy.html
[33]: https://elysiajs.com/patterns/fullstack-dev-server.html
[34]: https://elysiajs.com/eden/fetch.html
[35]: https://elysiajs.com/eden/treaty/config.html
[36]: https://elysiajs.com/eden/treaty/parameters.html
[37]: https://elysiajs.com/eden/treaty/websocket.html
[38]: https://elysiajs.com/plugins/swagger.html
[39]: https://elysiajs.com/plugins/graphql-apollo.html
[40]: https://elysiajs.com/integrations/node.html
[41]: https://elysiajs.com/integrations/cloudflare-worker.html
[42]: https://blackboard.sh/electrobun/docs/apis/browser-window
[43]: https://blackboardsh/electrobun/docs/apis/browser-view
[44]: https://blackboardsh/electrobun/docs/apis/bundled-assets
[45]: https://blackboardsh/electrobun/docs/guides/bundling-and-distribution
[46]: https://blackboardsh/electrobun/docs/guides/code-signing
[47]: https://blackboardsh/electrobun/docs/guides/updates
[48]: https://blackboardsh/electrobun/docs/guides/cross-platform-development
[49]: https://blackboardsh/electrobun/docs/apis/bun
[50]: https://blackboardsh/electrobun/docs/apis/utils
[51]: https://blackboardsh/electrobun/docs/apis/application-menu
[52]: https://blackboardsh/electrobun/docs/apis/tray
[53]: https://blackboardsh/electrobun/docs/apis/events
[54]: https://blackboardsh/electrobun/docs/apis/webgpu
[55]: https://blackboardsh/electrobun/docs/guides/architecture
[56]: https://blackboardsh/electrobun/docs/guides/compatibility
[57]: https://blackboardsh/electrobun/docs/guides/webview-tag-architecture
[58]: https://blackboardsh/electrobun/docs/apis/webview-tag
[59]: https://blackboardsh/electrobun/docs/apis/context-menu
[60]: https://blackboardsh/electrobun/docs/apis/paths
[61]: https://blackboardsh/electrobun/docs/apis/updater
[62]: https://blackboardsh/electrobun/docs/apis/electroview
[63]: https://blackboardsh/electrobun/docs/apis/draggable-regions
[64]: https://blackboardsh/electrobun/docs/apis/global-properties
[65]: https://blackboardsh/electrobun/docs/guides/build-configuration
[66]: https://blackboardsh/electrobun/docs/guides/cli-args
[67]: https://blackboardsh/electrobun/docs/guides/bundling-cef
[68]: https://blackboardsh/electrobun/docs/apis/application-icons
