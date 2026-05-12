<!-- markdownlint-disable-file -->
# kb — Implementation Roadmap

Aligned with [requirements.md](requirements.md) **V1-1 … V1-8** and
[design.md](design.md).

Per-feature task breakdowns are generated on demand by the `sdd` skill and
stored at `docs/specs/<feature-slug>/tasks.md`. This file tracks phase
sequencing, delivery value, and recommended skills only.

---

## Phase sequence

| Phase | Name                           | Requirements | Status    |
| :---: | ------------------------------ | ------------ | --------- |
|   0   | Scaffold & Tooling             | —            | ✔ done    |
|   1   | Tooling                        | —            | ⬜ pending |
|   2   | CI / Build / Packaging         | —            | ⬜ pending |
|   3   | Core Domain (port from KodexB) | —            | ⬜ done    |
|   4   | Data Layer                     | V1-2         | ⬜ done    |
|   5   | App Service + Elysia RPC       | V1-1         | ✔ done    |
|   6   | Renderer: List View            | V1-3         | ⬜ done    |
|   7   | Renderer: Detail View          | V1-4         | ✔ done    |
|   8   | First-Run Setup & Settings     | V1-1, V1-6   | ✔ done    |
|   9   | Task Management                | V1-7         | ✔ done    |
|  10   | Actions System (⌘K)            | V1-8         | ✔ done    |
|  11   | Sync UI                        | V1-2         | ⬜ pending |
|  12   | Stats Panel                    | V1-5         | ⬜ pending |

---

## Value delivered per phase

---

### Phase 0 — Scaffold & Tooling ✅

`bun run dev` opens an Electrobun window. Build pipeline produces `.app` on macOS.

**Skills:** `kb-context`, `electrobun-core`, `electrobun-config`, `mise-expert`, `mise-tasks`

---

### Phase 1 — Tooling ✅

Add dev dependencies:
- @biomejs/biome" for linting and formatting
- knip: for dependency analysis
- dependency-cruiser for dependency graphing and circular-dep detection
- jscpd: for copy-paste detection
- @ls-lint for editor diagnostics (optional, can be added in a later phase)

Add to mise:
- ast-grep: for custom lint rules (e.g. no direct DB access from the renderer)

Add scripts to package.json:
- "typecheck": "bunx tsc --noEmit",
- "lint:biome": "bunx biome check",
- "lint:biome:fix": "bun run lint:biome -- --write",
- "lint:biome:format": "bunx biome format",
- "lint:mise": "mise exec -- tombi check mise.toml tools/benchmarks/mise.toml",
- "lint:knip": "bunx knip",
- "lint:knip:fix": "bunx knip --fix",
- "lint:depcruise": "bunx depcruise . --config .dependency-cruiser.cjs",
- "lint:depcruise:graph": "bunx depcruise . --config .dependency-cruiser.cjs --include-only '^.' --output-type dot | dot -T svg > report/dependency-graph.svg",
- "lint:jscpd": "bunx jscpd .",
- "lint:ls": "bunx @ls-lint/ls-lint",
- "lint:ast-grep": "mise exec -- ast-grep scan --error",
- "lint:ast-grep:fix": "mise exec -- ast-grep scan --update-all",
- "lint": "e=0; bun run typecheck || e=1; bun run lint:biome || e=1; bun run lint:knip || e=1; bun run lint:depcruise || e=1; bun run lint:mise || e=1; bun run lint:jscpd || e=1; bun run lint:ls || e=1; bun run lint:ast-grep || e=1; exit $e",
- "lint:fix": "e=0; bun run lint:biome:fix || e=1; bun run lint:knip:fix || e=1; bun run lint:ast-grep:fix || e=1; exit $e",

**Skills:** `ast-grep`, `biome-developer` `jscpd`, `knip`

---

### Phase 2 — CI / Build / Packaging

Quality gates and distribution infrastructure in place before any feature work.
Every subsequent phase lands on CI-gated main.

**Why CI first?** Shipping feature code before lint, tests, and a working build
pipeline guarantees accumulating regressions. Phases 2–11 inherit zero-cost
correctness assurance if CI is in place at the start.

#### What this phase delivers

- `review.yml` — PR gate: lint (Biome, Knip, depcruiser, JSCPD) + `bun test`
- `release.yml` — Conventional-commit release (release-it, SSH-signed tags,
  squash-and-merge enforcement)
- `publish.yml` — On release tag: Electrobun production build → `.dmg` → notarize
  → attach to GitHub Release
- `mise.toml` tasks for all of the above, runnable locally

#### Electrobun build vs CLI Docker

This project is a macOS desktop app, not a server binary. The reference
Dockerfile/CST/DockerHub pipeline is **not applicable here**. The key differences:

| CLI approach             | Electrobun equivalent                           |
| ------------------------ | ----------------------------------------------- |
| `docker build`           | `bun run build --platform=mac` (Electrobun)     |
| `ubuntu-latest` runner   | `macos-latest` runner (required for signing)    |
| Container Structure Test | _not needed_ — binary is tested by `bun test`   |
| DockerHub image          | GitHub Release `.dmg` attachment                |
| `FROM alpine:3` final    | `.app` bundle wrapped in `.dmg`                 |
| `bun --target`           | Electrobun handles platform bundling internally |

#### CI jobs

**Review (PR):**

```yaml
# lint: biome check --reporter=github, knip, depcruise, jscpd
# test: bun test --reporter=junit --coverage
# build: bun run build (electrobun build check, darwin-arm64 only)
# No Docker, no CST
```

**Release (push to main):**

Reuse the same `release.yml` from the CLI — release-it is tooling-agnostic.
Squash-and-merge enforcement and SSH commit signing apply unchanged.

**Publish (on release tag):**

```yaml
jobs:
  build-mac:
    runs-on: macos-latest        # ← required for codesign + notarytool
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile

      # Import Apple Developer ID certificate from secrets
      - name: Import signing certificate
        run: |
          echo "${{ secrets.MAC_CERTIFICATE_BASE64 }}" | base64 --decode > cert.p12
          security import cert.p12 -P "${{ secrets.MAC_CERT_PASSWORD }}" \
            -k ~/Library/Keychains/login.keychain-db \
            -T /usr/bin/codesign
          security set-key-partition-list -S apple-tool:,apple: \
            -s -k "" ~/Library/Keychains/login.keychain-db

      # Electrobun production build — handles bundling, signing, notarization
      # via electrobun.config.ts (mac.identity, mac.notarize)
      - name: Build .app / .dmg
        env:
          APPLE_ID:           ${{ secrets.APPLE_ID }}
          APPLE_APP_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_TEAM_ID:      ${{ secrets.APPLE_TEAM_ID }}
        run: bun run build --platform=mac

      - name: Upload .dmg
        uses: softprops/action-gh-release@v2
        with:
          files: dist/*.dmg
          tag_name: ${{ needs.resolve_tag.outputs.tag }}
```

#### electrobun.config.ts additions for signing

```ts
export default defineConfig({
  app: { name: 'kb', identifier: 'sh.blackboard.kb', version: '0.1.0' },
  build: { main: './src/shell/main/main.ts' },
  // darwin-arm64 only for Phase 1; add more targets in a later phase
  mac: {
    identity: process.env.APPLE_IDENTITY,   // "Developer ID Application: ..."
    hardenedRuntime: true,
    entitlements: 'entitlements.mac.plist', // allow-jit, disable-library-validation
    notarize: {
      teamId:          process.env.APPLE_TEAM_ID,
      appleId:         process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_PASSWORD,
    },
  },
})
```

#### Required entitlements (Bun runtime needs these)

```xml
<!-- entitlements.mac.plist -->
<key>com.apple.security.cs.allow-jit</key><true/>
<key>com.apple.security.cs.allow-unsigned-executable-memory</key><true/>
<key>com.apple.security.cs.disable-library-validation</key><true/>
<key>com.apple.security.network.client</key><true/>
```

#### Secrets to configure in GitHub

| Secret                    | Value                                               |
| ------------------------- | --------------------------------------------------- |
| `MAC_CERTIFICATE_BASE64`  | Developer ID cert exported as .p12, base64-encoded  |
| `MAC_CERT_PASSWORD`       | .p12 export password                                |
| `APPLE_ID`                | Apple ID email                                      |
| `APPLE_APP_PASSWORD`      | App-specific password from appleid.apple.com        |
| `APPLE_TEAM_ID`           | 10-char team identifier from developer.apple.com    |
| `APPLE_IDENTITY`          | Full cert CN: "Developer ID Application: Name (ID)" |
| `GH_TOKEN`                | PAT for release-it to bypass branch protection      |
| `RELEASE_SIGNING_SSH_KEY` | SSH key for signed commits (from release.yml)       |

**Skills:** `kb-context`, `kb-quality-gate`, `electrobun-distribution`,
`electrobun-build`, `electrobun-config`

---

### Phase 3 — Core Domain ✅

Pure parsers, validators, id derivation, and doc assembly ported from KodexB.
No I/O. Full unit test coverage.

**Skills:** `kb-context`, `kb-testing`, `bun-development`

---

### Phase 4 — Data Layer ✅

Drizzle + SQLite schema. Import service reads YAML → upserts → FTS5. drizzle-seed
fixtures for integration tests.

**Skills:** `kb-context`, `kb-testing`, `bun-development`

---

### Phase 5 — App Service + Elysia RPC ✅

`App` (renamed from `AppService`) is now exposed through a single Elysia
`RpcApp` defined in `src/shell/main/rpc/server.ts`. Both transports share that
contract:

- **Desktop**: `src/shell/main/rpc/host.ts` registers one Electrobun
  `BrowserView.defineRPC` request (`rpcCall`) that rebuilds a `Request` and
  delegates to `RpcApp.handle()`. Sync push (`syncProgress`/`syncComplete`)
  still rides Electrobun `webview.messages`.
- **Preview**: `tools/preview/server.ts` forwards every `/api/*` request to
  the same `createRpcServer(app).handle(req)` — no parallel switch/case.
- **Renderer**: `src/shell/renderer/rpc/client.ts` uses Eden Treaty
  (`treaty<RpcApp>`) with a custom fetcher that tunnels requests through the
  Electrobun `rpcCall` bridge (or `fetch` in preview).

TypeBox is the sole validation library across core and transport.

**Skills:** `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`,
`electrobun-rpc`, `electrobun-rpc-patterns`

---

### Phase 6 — Renderer: List View ✅

Searchable, filterable list of all knowledge entries. Type filters, tag filters,
task view presets. Priority/status/overdue badges. Brand icons. Keyboard navigation.

**Skills:** `kb-context`, `kb-testing`, `electrobun-dev`

---

### Phase 7 — Renderer: Detail View

Enter on a selected entry opens the detail panel (180 ms slide-in, window expands
to 1200 px). Markdown with syntax highlighting. OG image / YouTube thumbnail.
Task dependency graph. Metadata sidebar at ≥ 1300 px.

**Skills:** `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`,
`electrobun-dev`, `electrobun-window-management`

---

### Phase 8 — First-Run Setup & Settings

Auto-create platform directories and default config on first launch. Settings panel
(paths, apps, display). Config reload without restart.

**Skills:** `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`,
`electrobun-dev`, `electrobun-platform`

---

### Phase 9 — Task Management

Create/edit/delete tasks from the UI. YAML write-back. Status and priority cycling.
Reorder. Dependency management with circular-dep rejection.

**Skills:** `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`,
`electrobun-dev`

---

### Phase 10 — Actions System (⌘K)

⌘K palette with context-sensitive primary action per type. Copy submenu. Open in
editor. AI tag suggestions. Task-specific actions.

**Skills:** `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`,
`electrobun-dev`, `electrobun-native-ui`

---

### Phase 11 — Sync UI

Progress bar in toolbar while sync runs. Completion toast with counts and errors.
Concurrent sync prevention.

**Skills:** `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`,
`electrobun-dev`

---

### Phase 12 — Stats Panel

Entry counts by type. Total count. Database path and size. Auto-refresh after sync.

**Skills:** `kb-context`, `kb-rpc`, `kb-testing`, `kb-quality-gate`,
`electrobun-dev`

---

## Recommended order

> 0 (scaffold) → **2 (CI)** → 5 (RPC) → 7 (detail) → 8 (first-run)
> → 9 (tasks) → 10 (⌘K) → 11 (sync UI) → 12 (stats)

Phases 3, 4, 5, 6 are done. Phase 5 (App Service + Elysia RPC) is the critical
path — everything from Phase 7 onward builds on the Eden Treaty client.

---

## Per-phase development loop

Each pending phase follows this Superpowers workflow:

```
1. /brainstorming          Design + SDD spec → docs/specs/<slug>/
2.  ↳ review & approve
3. /using-git-worktrees    Isolated branch for the phase
4. /writing-plans          2-4h task plan with TDD markers
5.  ↳ review & approve
6. /executing-plans        One task at a time
   /test-driven-development  RED → GREEN → REFACTOR per task
7. /finishing-a-development-branch
   ↳ runs kb-quality-gate (gate.sh must exit 0 before merge)
8.  Evaluate in preview server: bun tools/preview/server.ts
9. Go to 1 for next phase
```

The `kb-quality-gate` skill is the gate for step 7. Running
`.agents/skills/kb-quality-gate/scripts/gate.sh` is how
`finishing-a-development-branch` verifies the phase is done.

---

## Starting fresh (clean git history)

To start from a clean conventional-commit history:

```bash
# Don't soft-reset main — create a fresh branch instead
git checkout --orphan rebuild/elysia-rpc
git add .
git commit -m "chore(scaffold): Initial project structure"

# Then work through phases 1, 4, 6… committing each phase separately
```

An orphan branch preserves all current code as the working tree while giving
you a clean commit log for the new implementation sequence.
