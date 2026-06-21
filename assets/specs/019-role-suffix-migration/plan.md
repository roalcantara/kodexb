# Implementation Plan: Role-suffix conformance migration

**Branch**: `019-role-suffix-migration` | **Date**: 2026-06-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `assets/specs/019-role-suffix-migration/spec.md`

## Summary

Renames mis-roled `.util.ts` files across the 5 flagged directories (test helpers, app db, app lib, main window, main utils) to their true role suffixes (e.g. `.service`, `.repository`, `.client`, `.adapter`, `.helper`). Hardens the `role-conformance` detector to ignore type-only imports and treat pure Node modules (`node:path`, `node:url`, etc.) as pure, driving `mislabeledUtilCount` honestly to **0** and increasing the `enforcedDirRatio`. Per-directory `ls-lint` locks will be updated in lockstep. The entire work is behaviour-frozen with zero runtime change.

## Feature deltas

| Topic | Delta |
| ----- | ----- |
| RPC   | None (RPC schemas and route transport remain identical) |
| DB    | None (SQLite schemas and data formats remain identical) |
| E2e   | Out of scope (behaviour-frozen file renames and metadata updates only) |

## Technical Context

**Language/Version**: TypeScript / Bun 1.1+

**Primary Dependencies**: None (built-in Node and Bun standard library modules only)

**Storage**: None (metrics output baseline and JSON files only)

**Testing**: `bun:test`

**Target Platform**: macOS / Linux (Electrobun desktop app environment)

**Project Type**: desktop-app / ops-utility

**Performance Goals**: N/A (no runtime performance changes)

**Constraints**: Behaviour-frozen (renames and imports edits only, existing test suites must pass)

**Scale/Scope**: 8 file renames, 6 files retained, 5 directories with `.ls-lint.yml` rules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Directives / Verification |
| --------- | ------ | ------------------------- |
| **I. Product Identity** | Pass | No change to keyboard-first, local-first UX or startup speed. |
| **II. FCIS Architecture** | Pass | Renames clarify boundaries. I/O remains in shell, pure utils remain pure, and injected ports remain `.util` or `.helper`. |
| **III. YAML Source Honesty** | Pass | N/A (no persistence logic changes). |
| **IV. Type-Safe Contracts** | Pass | Transport schemas and Eden client are untouched. |
| **V. Test-First & Evidence** | Pass | Every renamed file keeps its co-located spec in lockstep. Specs run and pass on features branch. |
| **VI. Conventions** | Pass | Directory locks updated using additive `.ls-lint.yml` rules. Suffixes match approved vocabulary. |
| **VII. Design System** | Pass | N/A (no CSS/styling changes). |
| **VIII. Observability** | Pass | Logs use canonical `getLogger` (no console.* added). |
| **IX. Electrobun Security** | Pass | `mise run spec security` is run and must pass before closeout. |

## Project Structure

### Documentation (this feature)

```text
assets/specs/019-role-suffix-migration/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
└── checklists/
    └── requirements.md   # Spec quality checklist
```

### Source Code (repository root)

```text
src/
├── __tests__/
│   └── helpers/
│       └── rpc_route.helper.ts             # Renamed from rpc_route.spec.util.ts
├── shell/
│   ├── app/
│   │   ├── db/
│   │   │   └── import_bundle_persist.repository.ts # Renamed from import_bundle_persist.util.ts
│   │   └── lib/
│   │       ├── app_preview_fetch.client.ts # Renamed from app_preview_fetch.util.ts
│   │       ├── app_sync.service.ts         # Renamed from app_sync.util.ts
│   │       ├── app_task_mutation.service.ts # Renamed from app_task_mutation.util.ts
│   │       ├── app_task_source.service.ts  # Renamed from app_task_source.util.ts
│   │       └── frecency_snapshot.repository.ts # Renamed from frecency_snapshot.util.ts
│   └── main/
│       ├── utils/
│       │   └── shell_hooks.util.ts         # Kept as generic pure helper
│       └── window/
│           ├── darwin_window_frame.util.ts # Kept as pure geometry helper
│           ├── display_at_cursor.util.ts   # Kept as pure geometry helper
│           ├── launcher_frame_probe.adapter.ts # Renamed from launcher_frame_probe.util.ts
│           ├── launcher_window.util.ts     # Kept as pure helper (split is P3)
│           ├── load_window_state.util.ts   # Kept as pure helper
│           └── placement.util.ts           # Kept as pure geometry helper
packages/
└── ops/
    └── src/
        └── metrics/
            └── harnesses/
                └── role-conformance/
                    ├── role_conformance.script.ts       # touched script
                    └── role_conformance_core.script.ts  # touched script core
tools/
└── metrics/
    └── baselines/
        └── role-conformance/
            └── baseline.json               # baseline floor
```

**Structure Decision**: Monorepo/workspace-based workspace package and app structure. Changes map strictly to main app shell roots under `src/shell/` and the package `@kb/ops` under `packages/ops/`.

## E2e traceability

| Requirement | Feature file | Scenario | Notes |
| ----------- | ------------ | -------- | ----- |
| MIGR-1 to MIGR-6 | None         | None     | Behavior-frozen renames (out of scope for e2e) |
