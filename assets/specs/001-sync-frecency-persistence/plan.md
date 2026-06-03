<!-- markdownlint-disable-file -->

# Implementation Plan: Sync frecency persistence

**Branch**: `001-sync-frecency-persistence` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

## Summary

Snapshot `entry_frecency` and `binding_frecency` before DB unlink, rebuild YAML
projection via existing import, restore learned rows with stable-key id remap.

## Technical Context

**Language/Version**: TypeScript / Bun 1.3
**Storage**: `bun:sqlite` — projection vs learned table classes
**Testing**: `bun test` integration specs under `src/shell/app/lib/`
**Target Platform**: Electrobun desktop (macOS + Linux)

## Constitution Check

- FCIS: snapshot/restore pure structs in core or shell lib; I/O in `app_sync.util.ts`
- TypeBox-only validation on RPC surfaces
- Co-located `.spec.ts` for every new file

## Project Structure

### Documentation

```text
assets/specs/001-sync-frecency-persistence/
├── spec.md
├── plan.md
├── tasks.md
└── handoff.md
```

### Source Code

```text
src/shell/app/lib/
├── app_sync.util.ts              # orchestration
├── frecency_snapshot.types.ts
├── frecency_snapshot.util.ts
├── frecency_restore.util.ts
└── app_sync_frecency.spec.ts     # milestone proof
```

**Structure Decision**: Extend existing sync pipeline in shell/app; no new RPC routes.

## Design (from legacy design.md)

### Target behavior

```text
closeDb()
→ snapshotFrecencyState(dbPath)
→ unlink projection files
→ ImportService.run
→ restoreFrecencyState(dbPath, snapshot, idMap)
→ emit complete
```

**Decision:** Option 1 — snapshot + restore on same DB file (not separate durable DB).

### Components

| Unit                        | Change                       |
| --------------------------- | ---------------------------- |
| `runSourceImportSync`       | orchestrate snapshot/restore |
| `frecency_snapshot.util.ts` | read before unlink           |
| `frecency_restore.util.ts`  | write after import           |

## E2e traceability

| Requirement | Feature file                                | Scenario               | Notes                                                           |
| ----------- | ------------------------------------------- | ---------------------- | --------------------------------------------------------------- |
| SF-1        | `assets/features/e2e/sync_frecency.feature` | Frecency survives sync | `@spec:sync-frecency` — stretch; integration tests gate release |

Normative Gherkin: [`assets/features/e2e/sync_frecency.feature`](../../features/e2e/sync_frecency.feature)

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | —          | —                                    |
