<!-- markdownlint-disable-file -->

# List frecency sort — requirements

Rank **entry rows** in List View and Split View by **frecency** (frequency + recency), similar to [Raycast `useFrecencySorting`](https://developers.raycast.com/utilities/react-hooks/usefrecencysorting). Normative contract: [design.md](../../MILESTONE_01/list-frecency-sort/design.md).

**Supersedes** foundation [V1-3 acceptance #1](../../MILESTONE_01/foundation/requirements.md) (type → alphabetical browse order) for list display.

## R1 — Frecency on every list

- The system **shall** apply frecency ordering to **all** list queries: unfiltered browse, type/tag filters, **FTS search results**, and **task views** (Today, Doing, etc.).
- List View and Split View **shall** share the same ordering (single `findAll` / `listKnowledgeForOpts` path).

## R2 — Visit signals

- The system **shall** record a visit when the user **opens an entry in detail** (list or split: Enter, click, in-panel dependency navigation that sets `detailEntry`).
- The system **shall** record a visit on **successful ⌘C / Ctrl+C copy** of the selected row’s copy payload (list surface and window capture).
- The system **shall** record a visit on **successful command-palette Copy** and **Paste in Terminal** (clipboard actions for the selected entry).
- The system **shall not** record a visit for row highlight alone or filter changes alone.

**Extended by [Entry Action Panel](../../MILESTONE_01/entry-action-panel/requirements.md)** (R4–R6): primary/secondary list actions, palette actions via `executeEntryAction`, and consolidated detail/copy visit paths. Ordering (R3–R8) unchanged.

## R3 — Browse and filter ordering

- When **no FTS query** is active, rows **shall** sort by:
  1. `frecency_score` descending (0 if never visited),
  2. `task_order` ascending, NULLs last,
  3. `updated_at` descending,
  4. `id` descending.

## R4 — Search ordering

- When an FTS **query** is active, rows **shall** sort by:
  1. `bm25(knowledges_fts)` ascending (better match first),
  2. `frecency_score` descending,
  3. `task_order` ascending, NULLs last,
  4. `updated_at` descending,
  5. `id` descending.

## R5 — Persistence

- Frecency data **shall** live in SQLite table `entry_frecency` (local index), **not** in YAML sources.
- Deleting a knowledge row **shall** remove its frecency row (`ON DELETE CASCADE`).
- Rebuilding the DB from sources **may** clear frecency (acceptable v1).

## R6 — Score model

- Each visit **shall** update score using half-life decay on the previous score plus a fixed bump (see design §3).
- Default half-life **shall** be **7 calendar days**; bump weight **1** (constants in `core`, unit-tested).

## R7 — Cache invalidation

- After `recordEntryVisit`, the shell **shall** invalidate the list result cache so the next list fetch reflects new order.

## R8 — RPC

- The renderer **shall** call `POST /api/recordEntryVisit` with `{ id }` via Eden Treaty; route **shall** mirror in `tools/preview/server.ts` through the shared `RpcApp`.

## R9 — Testing

- `core`: pure `bumpFrecency` tests with fixed clocks.
- `shell`: repository upsert; `findAll` order with plain + FTS; task_view path with `task_order` tie-break.
- `renderer`: navigation/copy invokes `recordEntryVisit` (spy RPC client per testing guide).

## R10 — List row indicator

- Each list row **shall** include `frecencyScore` and `visitCount` from the list RPC.
- When `visitCount > 0` (or score &gt; 0), the list row **shall** show a compact **3-bar** frecency indicator (height tiers relative to the max score on the current loaded list), with an accessible label (e.g. “Used N times”).

## R11 — Non-goals (v1)

- Reset-ranking UI, configurable half-life in settings, analytics dashboard, YAML export of usage.
