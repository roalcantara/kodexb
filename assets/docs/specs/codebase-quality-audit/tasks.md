<!-- markdownlint-disable-file -->

# Codebase quality audit — Tasks

Execute in order in **one** repo clone on the agreed integration branch. After each task: merge or rebase onto the latest integration tip if needed, run gate, update inventory rows in `design.md` to **done**.

## Phase 0 — Baseline

- [ ] **T0.1** Record `git rev-parse HEAD` and sync with the agreed integration branch (e.g. merge `feat-add-stats-panel`).
- [ ] **T0.2** Run `bash .agents/skills/kb-quality-gate/scripts/gate.sh`; fix any pre-existing failures before suppression work (separate commit if unrelated).
- [ ] **T0.3** Re-run `rg "biome-ignore"` and refresh inventory table if new files appeared.

## Phase 1 — Config and constants

- [ ] **T1.1** `electrobun.config.ts`: remove `biome-ignore-all` via renames/splits/wrappers per **R7**; **if** any tool config must be relaxed, obtain **R6** maintainer approval on the PR before merging that diff.
- [ ] **T1.2** `src/core/constants/lang.const.ts`: remove file-level ignore by splitting or externalizing language list.

## Phase 2 — Test infrastructure

- [ ] **T2.1** `src/__tests__/helpers/testing.factory.ts`: remove `noExplicitAny` ignore with proper generics.
- [ ] **T2.2** `src/__tests__/factories/factories.builder.ts`: remove naming ignore via snake_case identifiers (no `biome.json` overrides without R6 approval).
- [ ] **T2.3** `src/shell/main/rpc/host.spec.ts`: remove `useImportsFirst` ignores or document allowlist with Bun mock constraint.
- [ ] **T2.4** `src/shell/renderer/rpc/client.spec.tsx`, `use_cmdk_palette.hook.spec.tsx`, `tools/preview/mock_electroview.ts`: remove naming ignores via shared Electrobun test types.

## Phase 3 — App shell

- [ ] **T3.1** `src/shell/app/app.ts`: remove `noExcessiveLinesPerFile` by splitting into focused modules (no behavior change).
- [ ] **T3.2** `src/shell/app/db/task.repository.ts`: remove cognitive complexity ignore via extracted helpers.

## Phase 4 — Renderer list and modals

- [ ] **T4.1** `use_list_page_shell.hook.ts`, `use_list_page_stats_sync.hook.ts`, `use_task_sheet.hook.ts`, `use_cmdk_palette.hook.ts`: remove line-count ignores.
- [ ] **T4.2** `use_view_navigation.hook.ts`: remove cognitive complexity ignore (table-driven or decomposed handlers).
- [ ] **T4.3** `cmdk_palette.component.tsx`, `list_main.component.tsx`: remove complexity ignores; split UI.
- [ ] **T4.4** `sync_modal.component.tsx`: remove complexity and `useExhaustiveDependencies` ignores.
- [ ] **T4.5** `list_main.component.tsx`: resolve `noAutofocus` via explicit focus protocol + spec update.

## Phase 5 — Closure

- [ ] **T5.1** Confirm allowlist empty or signed; `rg "biome-ignore"` clean on in-scope globs.
- [ ] **T5.2** Final gate; open PR from your audit branch with link to this spec folder.
