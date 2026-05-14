<!-- markdownlint-disable-file -->

# Codebase quality audit — Design

## OVERVIEW

Normative plan to eliminate Biome suppressions and tighten hygiene without weakening project guards. Implementation uses **hybrid phasing**: baseline gate + inventory, then theme-based PRs (shell hooks, components, app layer, tests, config).

## LINT AND TOOLING POLICY

- **Default:** Resolve every finding by **code** (split modules, rename to snake_case, types, wrappers, honest hook deps). Do not use config or inline directives to **weaken** any quality tool relative to the repo baseline.
- **Approval gate (R6):** Changes that relax enforcement—examples include `biome.json` `overrides` or rule `off` / severity downgrades; `// biome-ignore` / `biome-ignore-all`; knip `ignore*` / `ignoreDependencies`; dependency-cruiser `forbidden` exceptions not already policy; ast-grep or ls-lint relaxations; jscpd threshold raises; disabling or narrowing `tsc` strictness for production paths—may merge **only** with **explicit maintainer approval** on the PR (same format as R6). Until approved, use refactors or a signed **Allowlist** row for a remaining exception (last resort).
- **Electrobun (R7):** Any work under `src/shell/main/`, `electrobun.config.ts`, or packaging/updater paths MUST follow **electrobun-best-practices** (read `.agents/skills/electrobun-best-practices/SKILL.md` plus routing in `.cursor/electrobun-skill-routing.md`); do not guess Electrobun APIs.

## REPO AND BRANCH

| Item                         | Value                                                                   |
| ---------------------------- | ----------------------------------------------------------------------- |
| Primary clone (example path) | `/Users/roalcantara/Work/bun/kb`                                        |
| Integration branch           | Agreed with maintainers (e.g. `feat-add-stats-panel` or `chore/*`)      |
| Inventory snapshot           | Captured at `feat-add-stats-panel` @ `3fcd6ee` (update table if re-run) |

All audit commits and PRs use **one** clone only—do not split the same effort across a second worktree.

## RESOLUTION STRATEGY (NORMATIVE)

1. **Refactor first:** extract functions, components, and hooks to satisfy `noExcessiveCognitiveComplexity`, `noExcessiveLinesPerFunction`, and `noExcessiveLinesPerFile` without ignores.
2. **Correct hooks:** replace `useExhaustiveDependencies` ignores with stable callbacks, `useRef` for scroll containers, or derived state so the dependency array is honest.
3. **Tests and Electrobun shapes:** consolidate Electrobun API mirrors into typed helpers or a single test fixture module; use **snake_case wrappers** that call into upstream APIs. No tool weakening for third-party naming without **R6** PR approval.
4. **Config files:** remove `biome-ignore-all` on `electrobun.config.ts` by **renaming keys** to snake_case where Electrobun’s config type allows, splitting into small modules, or thin re-export files—**not** by config relaxations unless **R6**-approved; follow **R7** for Electrobun patterns.
5. **Data tables:** `lang.const.ts` — split by locale group files under `src/core/constants/lang/` re-exported from `lang.const.ts`, or use generated JSON import, so line-count rule passes without `biome-ignore-all`.
6. **Fishery / factories:** replace `noExplicitAny` ignore with generic typing (`Factory<T>`) or module-local `unknown` + narrow casts at call sites; if Biome still flags after typing, document one **allowlist** row only after two failed fix attempts are recorded in `tasks.md`.

## ALLOWLIST

**Target: zero rows.** Each row must list owner sign-off date before merge.

| Path     | Rule | Rationale | Owner sign-off |
| -------- | ---- | --------- | -------------- |
| _(none)_ |      |           |                |

## INVENTORY (STARTING STATE)

Captured from worktree at `3fcd6ee`. Markdown or skill docs that **mention** `biome-ignore` in prose (e.g. `ci-build-packaging/tasks.md`) are not source suppressions and are out of scope for R2.

| Path                                                               | Line (approx) | Suppression                                | Planned resolution                                                                |
| ------------------------------------------------------------------ | ------------- | ------------------------------------------ | --------------------------------------------------------------------------------- |
| `electrobun.config.ts`                                             | 1             | `biome-ignore-all` useNamingConvention     | Rename keys / split config / wrappers; `biome.json` override only if R6-approved  |
| `src/__tests__/helpers/testing.factory.ts`                         | 1             | `biome-ignore-all` noExplicitAny           | Generic Fishery types                                                             |
| `src/__tests__/factories/factories.builder.ts`                     | 1             | `biome-ignore-all` useNamingConvention     | snake_case factory keys and exports                                               |
| `src/core/constants/lang.const.ts`                                 | 1             | `biome-ignore-all` noExcessiveLinesPerFile | Split modules / generated data                                                    |
| `src/shell/app/app.ts`                                             | 1             | noExcessiveLinesPerFile                    | Split `App` into cohesive modules (routes vs lifecycle vs wiring)                 |
| `src/shell/app/db/task.repository.ts`                              | 23            | noExcessiveCognitiveComplexity             | Extract query helpers                                                             |
| `src/shell/main/rpc/host.spec.ts`                                  | 7, 14         | useImportsFirst                            | Restructure mocks per kb-testing; if impossible, allowlist with Bun justification |
| `src/shell/renderer/components/actions/cmdk_palette.component.tsx` | 16            | noExcessiveLinesPerFunction                | Further extract subcomponents                                                     |
| `src/shell/renderer/components/list/list_main.component.tsx`       | 24–25, 196    | complexity, noAutofocus                    | Split rendering; replace autofocus ignore with focus management hook + test       |
| `src/shell/renderer/components/shared/sync_modal.component.tsx`    | 31, 36        | complexity, useExhaustiveDependencies      | Split modal sections; fix effect deps                                             |
| `src/shell/renderer/hooks/list/use_cmdk_palette.hook.ts`           | 30            | noExcessiveLinesPerFunction                | Extract action builders                                                           |
| `src/shell/renderer/hooks/list/use_cmdk_palette.hook.spec.tsx`     | 10            | useNamingConvention                        | Mirror helpers                                                                    |
| `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts`        | 18            | noExcessiveLinesPerFunction                | Split shell concerns                                                              |
| `src/shell/renderer/hooks/list/use_list_page_stats_sync.hook.ts`   | 23            | noExcessiveLinesPerFunction                | Split stats vs sync wiring                                                        |
| `src/shell/renderer/hooks/list/use_task_sheet.hook.ts`             | 20            | noExcessiveLinesPerFunction                | Extract sheet state machine                                                       |
| `src/shell/renderer/hooks/list/use_view_navigation.hook.ts`        | 53            | noExcessiveCognitiveComplexity             | Table-driven routing or smaller handlers                                          |
| `src/shell/renderer/rpc/client.spec.tsx`                           | 11, 27        | useNamingConvention                        | Mirror helpers                                                                    |
| `tools/preview/mock_electroview.ts`                                | 57            | useNamingConvention                        | Wrapper types                                                                     |

## VERIFICATION

Per PR and at completion:

```bash
bash .agents/skills/kb-quality-gate/scripts/gate.sh
```

That script runs **Stage 0.5** (`scripts/gate_policy.sh`) for new inline suppressions and guard-config reminders; use `KB_GATE_APPROVED_TOOL_WEAKENING=1` only after maintainer approval (R6). See `kb-quality-gate` skill.

Confirm no suppressions:

```bash
rg "biome-ignore" --glob "*.ts" --glob "*.tsx" src tools electrobun.config.ts
```

## RISKS

- Large splits (`app.ts`, `list_main`) touch many imports; keep PRs mechanical (move-only) where possible.
- Parallel feature work requires frequent merges or rebases onto the agreed integration branch.
