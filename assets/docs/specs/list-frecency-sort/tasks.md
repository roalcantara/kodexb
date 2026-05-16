<!-- markdownlint-disable-file -->

# List frecency sort — tasks

Requirements: [requirements.md](requirements.md). Design: [design.md](design.md). Plan: [implementation-plan.md](implementation-plan.md).

## T1 — Core bump util

- [x] `bump_frecency.util.ts` + `.spec.ts` with fixed `nowMs` cases (first visit, decay, repeat visits).

## T2 — Schema + repository

- [x] `entry_frecency` table + index in `openDatabase`.
- [x] `frecency.repository.ts` `recordEntryVisit`; spec for upsert and cascade.

## T3 — List ordering

- [x] `findAll` plain + FTS `LEFT JOIN` and `ORDER BY` per design.
- [x] `entry.repository.spec.ts` proves frecency order and FTS secondary sort.

## T4 — App + RPC

- [x] `App.recordEntryVisit` + cache invalidation.
- [x] `POST /recordEntryVisit` on `RpcApp`.
- [x] Eden `recordEntryVisit` on renderer client.

## T5 — Renderer visits

- [x] Fire-and-forget on detail open + copy success.
- [x] `use_view_navigation_record_visit.hook.spec.tsx` coverage.

## T6 — Quality gate

- [ ] `bun test` on touched specs (manual run before merge).
- [ ] Full `gate.sh` before commit (maintainer / PR).
