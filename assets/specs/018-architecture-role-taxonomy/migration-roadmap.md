# Migration roadmap: Role-suffix conformance

Derived from the `role-conformance` baseline (committed under
`tools/metrics/baselines/role-conformance/baseline.json`). Each PR is one
behaviour-frozen rename/relocate pass with co-located test updates and an
additive ls-lint rule locking the target directory.

## PR-0: Pilot — `src/shell/main/handoff` (completed in 018)

| Field       | Value |
|-------------|-------|
| **Dir**     | `src/shell/main/handoff` (7 files, 5 mislabeled) |
| **Action**  | Rename + relocate to single-word layout per ROLE-5 |
| **Target**  | `registry.service.ts`, `clipboard.port.ts`, `browser.adapter.ts`, `editor.adapter.ts`, `xdotool.adapter.ts`, `frontmost/app.resolver.ts`, `frontmost/paste.adapter.ts`, `terminal/app.resolver.ts`, `terminal/command.adapter.ts` |
| **Gate**    | `bun test src/shell/main/handoff && bun run typecheck && bun run lint:ls` |
| **P-item**  | P3-7 (misplaced artifacts) |

## Foundation: Conformant-dir locks (completed in 018)

Additive `.ls-lint.yml` rules for 16 already-clean directories (0 renames
needed). See `.ls-lint.yml` diff in 018.

## PR-1: `src/__tests__/helpers`

| Field       | Value |
|-------------|-------|
| **Dir**     | `src/__tests__/helpers` (7 files, 1 mislabeled) |
| **Mislabeled** | `rpc_route.spec.util.ts` — rename to proper suffix |
| **Target**  | Rename file to match its actual role (spec helper) |
| **Action**  | Rename to `<name>.spec.util.ts` or remove `.util` if not a util |
| **Gate**    | `bun test src/__tests__ && bun run lint:ls` |
| **P-item**  | P3-7 (misplaced artifacts) |
| **Depends** | Foundation |

## PR-2: `src/shell/main/window`

| Field       | Value |
|-------------|-------|
| **Dir**     | `src/shell/main/window` (7 files, 6 mislabeled) |
| **Mislabeled** | `display_at_cursor.util.ts`, `launcher_window.util.ts`, `darwin_window_frame.util.ts`, `load_window_state.util.ts`, `launcher_frame_probe.util.ts`, `placement.util.ts` |
| **Target**  | Rename each to match FCIS role — `.service.ts` for orchestration, `.port.ts` for OS integration, `.adapter.ts` for platform bridging |
| **Action**  | Rename + update imports and co-located specs |
| **Gate**    | `bun test src/shell/main/window && bun run typecheck && bun run lint:ls` |
| **P-item**  | P3-7 (misplaced artifacts), P3-12 (app hub decomposition) |
| **Depends** | Foundation |

## PR-3: `src/shell/main/utils`

| Field       | Value |
|-------------|-------|
| **Dir**     | `src/shell/main/utils` (2 files, 1 mislabeled) |
| **Mislabeled** | `shell_hooks.util.ts` |
| **Target**  | Rename to `.service.ts` or `.helper.ts` based on content |
| **Action**  | Rename + update imports |
| **Gate**    | `bun test src/shell/main && bun run lint:ls` |
| **P-item**  | P3-7 (misplaced artifacts) |
| **Depends** | Foundation |

## PR-4: `src/shell/app/db`

| Field       | Value |
|-------------|-------|
| **Dir**     | `src/shell/app/db` (3 files, 1 mislabeled) |
| **Mislabeled** | `import_bundle_persist.util.ts` |
| **Target**  | Rename to `.service.ts` or `.repository.ts` |
| **Action**  | Rename + update imports and co-located specs |
| **Gate**    | `bun test src/shell/app/db && bun run lint:ls` |
| **P-item**  | P3-7 (misplaced artifacts), P3-12 (app hub) |
| **Depends** | Foundation, PR-5 |

## PR-5: `src/shell/app/lib`

| Field       | Value |
|-------------|-------|
| **Dir**     | `src/shell/app/lib` (13 files, 5 mislabeled) |
| **Mislabeled** | `app_preview_fetch.util.ts`, `app_sync.util.ts`, `app_task_mutation.util.ts`, `frecency_snapshot.util.ts`, `app_task_source.util.ts` |
| **Target**  | Rename each to `.service.ts`, `.adapter.ts`, or `.repository.ts` |
| **Action**  | Rename + update imports and co-located specs |
| **Gate**    | `bun test src/shell/app && bun run lint:ls` |
| **P-item**  | P3-7 (misplaced artifacts), P3-12 (app hub decomposition) |
| **Depends** | Foundation |

## Cross-cutting dependencies

| Dependency | Rationale |
|------------|-----------|
| PR-4 ← PR-5 | DB renames may affect lib import paths; sequence after lib settles |
| PR-2 ← P3-1 | Window renames touch shell surface that `App` split (P3-1) restructures — coordinate |
| PR-5 ← P3-12 | App lib decomposition (P3-12) may split dirs; renames should align with new structure |
| All PRs ← Foundation | ls-lint rules for conformant dirs must land first so `bun run lint:ls` stays green |
| All PRs ← ROLE-2 | Vocabulary (`.resolver`, single-word doctrine) finalized before renames |
