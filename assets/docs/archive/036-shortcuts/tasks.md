<!-- markdownlint-disable-file -->

# Shortcuts — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or
> `executing-plans` to implement task-by-task. Steps use checkbox (`- [ ]`)
> syntax for tracking. Each task names the files it touches.

**Goal:** Add the `shortcut` entry type, the quick-lookup overlay (`⌘/`), and
list-page integration, per [design.md](design.md).

**Primary verification:** `bash .agents/skills/app-quality-gate/scripts/gate.sh`
green (lint, typecheck, tests, build, route-parity). For UI-touching tasks,
also exercise the prototypes in `tools/preview/server.script.ts`.

**Architecture rules (CLAUDE.md non-negotiables):**

- TypeBox only for validation. **No Zod.**
- `bun:sqlite` directly. No Drizzle, no drizzle-typebox.
- Fishery `factoryFor` for typed test factories. No drizzle-seed.
- `getLogger(['kb', …])` from `@shared/logging`. No `console.*` in `src/`.
- Every new Elysia route registered in `tools/preview/server.script.ts`.
- Every new file in `src/` ships with a co-located `.spec.ts(x)`.
- Naming: ls-lint patterns in `.ls-lint.yml`; snake_case file segments.

---

## Remaining tasks (agent entry point)

**Execution order:** [handoff.md § Remaining work order](handoff.md#remaining-work-order-agent).

**Repo audit (2026-05-29)** — use this when checkboxes disagree with the tree:

| Task      | `tasks.md` checkboxes | Actual tree (verify with `git grep`)                                                                                                                                                                                                                                                                                                                         |
| --------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **11**    | Done                  | **Done** — `kbd_chip.component.tsx` + spec; `.ls-lint.yml` `components/shortcuts`.                                                                                                                                                                                                                                                                           |
| **12**    | Done (integration)    | **Done** — `QuickLookupOverlay` mounted in `list_overlay_hosts.component.tsx`; `quickLookup` state added to `use_list_page_shell.hook.ts`; `⌘/` global handler wired via `useQuickLookupState`; full Variant A/C, filter modal, advisories gated on `getConfig()`.                                                                                           |
| **13**    | Done (integration)    | **Done** — `detail.page.tsx` branches `entry.type === 'shortcut'` → `ShortcutKeymap` with `ShortcutDetailBody` state machine (`keymap                                                                                                                                                                                                                        | chord`); passes `useBindings().cache.collisionsById`, `displayAdvisories` from `getConfig()`, `onChordDetailNavigate`, `onRevealSource`. |
| **14**    | Done                  | **Done** — `use_chord_detail.hook.ts` + `chord_detail.component.tsx` created; body-swap wired in `detail.page.tsx`; `←` restores selection; `⌘↵` secondary handler calls `recordBindingVisit(id, 0.5)` + `onRevealSource`.                                                                                                                                   |
| **15**    | Done                  | **Done** — `shortcut` added to `entryTypeSchema`, `ListStats.shortcut`, `TYPE_FILTER_LABEL`, `ENTRY_TYPE_DEFAULT_SVG_BASENAME`, `app_list_stats_for_filters.util.ts`, `list_stats.fixture.ts`; `ShortcutKnowledge` factory added to `factories.builder.ts`.                                                                                                  |
| **16**    | Done                  | **Done** — `recordBindingVisit(id, 1.0)` fires on chord detail navigate; `recordBindingVisit(id, 0.5)` fires on `⌘↵` reveal source; both via `fireAndForget`.                                                                                                                                                                                                |
| **17–18** | Done                  | Seeds + config schema present.                                                                                                                                                                                                                                                                                                                               |
| **19**    | Done                  | **Done** — `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits 0 (lint 0 errors, typecheck 0 errors, tests 944 pass, build smoke pass).                                                                                                                                                                                                             |
| **20**    | Open                  | Gate green → manual DoD checks pending (this session).                                                                                                                                                                                                                                                                                                       |
| **21**    | Done                  | **Done** — screenplay question/task files created (`shortcuts_overlay.question.ts`, `shortcuts_overlay.task.ts`, `shortcuts_keymap.question.ts`, `shortcuts_keymap.task.ts`); 43-step `shortcuts.steps.ts` registered; `SHORTCUTS_YAML` added to seed fixture with VS Code/macOS collision pairs; `@todo` remains in feature files pending smoke/regression. |

When a row says **Partial**, finish the **integration** sub-bullets before marking the task complete.

---

## Task 0 — Pre-flight read

**Files:** none.

- [x] Read [requirements.md](requirements.md), [design.md](design.md), and
- [x] Read `assets/guides/CODESTYLE_GUIDE.md`, `assets/guides/TESTING_GUIDE.md`,
- [x] Inspect the existing entry pipeline:
      `src/core/domain/models/entries/parsers/source_document.parser.ts`,
      `src/core/domain/models/entries/factories/entry.factory.ts`,
      `src/shell/app/db/import.service.ts`,
      `src/shell/app/db/entry.repository.ts`,
      `src/shell/app/db/frecency.repository.ts`.

---

## Task 1 — Core constants

**Files:** modify
- `src/core/domain/constants/entry.const.ts`

- [x] Add `'shortcut'` to `ENTRY_TYPE_VALUES`.
- [x] Add `'shortcuts'` to `SECTION_ENTRY_TYPE_VALUES`.
- [x] Add `{ shortcut: 'shortcuts' }` to `ENTRY_TYPE_SECTIONS`.
- [x] Add `{ shortcuts: 'shortcut' }` to `SECTION_ENTRY_TYPES`.
- [x] Add `{ shortcut: '⌨' }` to `ENTRY_TYPE_GLYPH`.
- [x] Add `{ shortcut: 'command' }` to `DEFAULT_ENTRY_ICONS`.

Commit: `feat(core): Register shortcut entry type`.

---

## Task 2 — Chord parser and hash

**Files:** add
- `src/core/domain/models/entries/parsers/chord.parser.ts`
- `src/core/domain/models/entries/parsers/chord.parser.spec.ts`
- `src/core/domain/models/entries/parsers/chord_hash.util.ts`
- `src/core/domain/models/entries/parsers/chord_hash.util.spec.ts`

- [x] `parseChord(input: string | ChordStringSpec): Result<ChordStep[], ParseError>`
- [x] Modifier precedence `hyper > meta > ctrl > alt > shift`.
- [x] Modifier aliases: `cmd command meta opt option alt ctrl control shift hyper super windows`.
- [x] Key alias table for glyph + Raycast camelCase names.
- [x] Sequences: space-separated or array-of-strings, length-N steps.
- [x] Pure (FCIS core). No I/O.
- [x] `hashChord(steps)` — sequence joined by `>`, single step joined by `+`.
- [x] `chordPrefix(steps)` — returns the (N-1)-step prefix hash for sequences,
- [x] Specs: round-trip identity for every canonical glyph; property-style
      tests across alias permutations; sequence parser correctness;
      per-platform map shape.

Commit: `feat(core): Add chord parser and chord_hash util`.

---

## Task 3 — Shortcut entry schema and parser

**Files:** add
- `src/core/domain/models/entries/schemas/shortcut.schema.ts`
- `src/core/domain/models/entries/schemas/shortcut.schema.spec.ts`
- `src/core/domain/models/entries/parsers/shortcut.parser.ts`
- `src/core/domain/models/entries/parsers/shortcut.parser.spec.ts`

modify
- `src/core/domain/models/entries/schemas/entry.schema.ts`
- `src/core/domain/models/entries/schemas/index.ts`
- `src/core/domain/models/entries/factories/entry.factory.ts`

- [x] Schema per [design.md § 1](design.md#-1--data-model). Export
      `ShortcutEntry`, `Binding`, `ChordStep`, `Platform`, `Scope`.
- [x] Add `shortcutEntrySchema` to the `entrySchema` union.
- [x] `parseShortcutEntry(raw, key, source)` validates the row via TypeBox,
      delegates chord parsing per binding, auto-slugifies missing `binding.id`
      from `binding.action`.
- [x] Per-platform chord maps expand to one binding per platform.
- [x] Extend `toEntryWithSourceHint`'s switch to call `parseShortcutEntry`
      for `type === 'shortcut'`.
- [x] Specs: schema accepts valid YAML; rejects empty `bindings`; rejects
      unknown modifiers; per-platform map expansion produces the right number
      of bindings.

Commit: `feat(core): Add shortcut entry schema and parser`.

---

## Task 4 — Collision detector

**Files:** add
- `src/core/domain/models/entries/collisions/collision.detector.ts`
- `src/core/domain/models/entries/collisions/collision.detector.spec.ts`
- `src/core/domain/models/entries/collisions/index.ts`

- [x] Add `.ls-lint.yml` rule for the new `collisions/` directory,
- [x] `BindingRef` and `Collision` types per [design.md § 2](design.md#-2--collision-detection).
- [x] `detect(candidate, existing): Collision[]` pure, deterministic. Rules:
- [x] `classifyAll(bindings): Map<bindingId, Collision[]>` runs the detector
- [x] Specs cover every rule with named scenarios.

Commit: `feat(core): Add collision detector`.

---

## Task 5 — SQLite schema

**Files:** modify
- `src/shell/app/db/schema.ts`
- `src/shell/app/db/client.ts`

- [x] Add `CREATE_ENTRY_BINDINGS_SQL`, `CREATE_BINDING_FRECENCY_SQL`, and the
- [x] Run the new DDL in `openDatabase` (idempotent, after the existing
- [x] Add `BindingRow` and `BindingFrecencyRow` type aliases.

Commit: `feat(db): Add entry_bindings and binding_frecency tables`.

---

## Task 6 — Binding repository

**Files:** add
- `src/shell/app/db/binding.repository.ts`
- `src/shell/app/db/binding.repository.spec.ts`

- [x] `upsertBindings(db, entryKey, refs[])` — `DELETE WHERE entry_key=?`
- [x] `deleteBindings(db, entryKey)`.
- [x] `listAllBindings(db, platform): BindingRef[]` — used by `GET /bindings`.
- [x] `listBindingsByChord(db, hash): BindingRef[]` — index probe; also
- [x] `listBindingsForApp(db, app, platform): BindingRef[]`.
- [x] Typed prepared statements via `db.query<RowType, [Params]>(sql)`.
- [x] Use Fishery `factoryFor` for `BindingRef` in tests.

Commit: `feat(db): Add binding repository`.

---

## Task 7 — Binding-frecency repository

**Files:** add
- `src/shell/app/db/binding_frecency.repository.ts`
- `src/shell/app/db/binding_frecency.repository.spec.ts`

- [x] Mirror `frecency.repository.ts` API exactly: `record(id)`, `score(id)`,
- [x] Use same decay function (factor out the existing one into
- [x] Specs use `factoryFor<BindingFrecencyRow>` from `@testing`.

Commit: `feat(db): Add binding_frecency repository`.

---

## Task 8 — Import service extension

**Files:** modify
- `src/shell/app/db/import.service.ts`
- `src/shell/app/db/import.service.spec.ts`

- [x] Inside the existing `db.transaction`, after upserting a `shortcut`
- [x] On per-entry parse failure (chord parse error, unknown modifier, etc.),
- [x] Specs: fixture file with one shortcut entry results in the expected
      `entry_bindings` rows; re-import with fewer bindings deletes orphans;
      one invalid binding inside an otherwise valid entry surfaces a
      diagnostic but still imports the remaining bindings; transactional
      rollback on DB error leaves bindings unchanged.

Commit: `feat(sync): Import shortcut entries with denormalised bindings`.

---

## Task 9 — RPC methods (`App` + `server.ts`)

**Files:** modify
- `src/shell/app/app.ts`
- `src/shell/app/app.spec.ts` (or integration spec covering bindings RPC)
- `src/shell/main/rpc/server.ts`
- `src/shell/main/rpc/schemas.ts`
- `src/shell/main/rpc/server.spec.ts`
- `src/shell/renderer/rpc/client.ts`
- `src/shell/renderer/rpc/client.spec.tsx`

- [x] Add `App` methods: `listBindings()`, `listBindingsByChord(hash)`,
- [x] Register **`POST /api/listBindings`**, **`POST /api/listBindingsByChord`**,
- [x] `listBindings` response includes `frecencyScore` per row for cache sort.
- [x] `listBindingsByChord` returns hash matches plus sequence-prefix rows
- [x] Renderer client wrappers call the new `/api/*` methods.
- [x] Preview server: **no fork** — continues to mount `createRpcServer(app)`.
- [x] Specs use `treaty()` against the Elysia app; assert response shape.

Commit: `feat(rpc): Add bindings RPC methods on App`.

---

## Task 10 — Bindings cache hook

**Files:** add
- `src/shell/renderer/hooks/shortcuts/use_bindings_cache.hook.ts`
- `src/shell/renderer/hooks/shortcuts/use_bindings_cache.hook.spec.tsx`

- [x] Add `.ls-lint.yml` rule for the new `src/shell/renderer/hooks/shortcuts/`
      directory, mirroring the existing `hooks/list/` contract:
      ```yaml
      src/shell/renderer/hooks/shortcuts:
        .ts: regex:^use_[a-z][a-z0-9_]*\.hook(\.spec)?$
        .tsx: regex:^use_[a-z][a-z0-9_]*\.hook\.spec$
      ```
- [x] On mount: call `listBindings()` once. Hold result in module state (not
      React state) for cross-component access without prop drilling.
- [x] Build `byHash`, `byApp`, `collisionsById` derived structures via
      `useMemo`.
- [x] On the existing import-success event (locate the existing subscription
      pattern in renderer hooks; reuse — do not invent new event names):
      refetch and rebuild.
- [x] Export a `useBindings()` hook returning the synchronous cache plus a
      `refresh()` method.

Commit: `feat(renderer): Add bindings cache hook`.

---

## Task 11 — KbdChip primitive

**Files:** add
- `src/shell/renderer/components/shortcuts/kbd_chip.component.tsx`
- `src/shell/renderer/components/shortcuts/kbd_chip.component.spec.tsx`

modify
- `src/shell/renderer/styles/list.css` (or new file under
  `src/shell/renderer/styles/shortcuts.css`)

- [x] Add `.ls-lint.yml` rule for `src/shell/renderer/components/shortcuts/`.
- [x] Renders `ChordStep[]` as `<kbd>` elements, glyph-substituted per platform.
- [x] Sequence steps separated by a thin spacer.
- [x] Reused by keymap detail (`BindingRow`); overlay/chord detail when those surfaces land.
- [x] Spec: `kbd_chip.component.spec.tsx` (platform + sequence cases).

Commit: `feat(renderer): Add KbdChip primitive` — **already on branch; skip if green.**

---

---

## Task 12 — Quick-lookup overlay

**Files:** add
- `src/shell/renderer/components/shortcuts/quick_lookup_overlay.component.tsx`
- `src/shell/renderer/components/shortcuts/quick_lookup_overlay.component.spec.tsx`
- `src/shell/renderer/hooks/shortcuts/use_quick_lookup_state.hook.ts`
- `src/shell/renderer/hooks/shortcuts/use_quick_lookup_state.hook.spec.tsx`
- `src/shell/renderer/hooks/shortcuts/use_chord_input.hook.ts`
- `src/shell/renderer/hooks/shortcuts/use_chord_input.hook.spec.tsx`

modify
- `src/shell/renderer/components/list/list_overlay_hosts.component.tsx` — mount
      `QuickLookupOverlay`
- `src/shell/renderer/hooks/list/use_list_page_shell.hook.ts` (or a dedicated
      `use_quick_lookup_overlay.hook.ts`) — `⌘/` handler; mutual exclusion with
      palette / list filter / settings (mirror `use_command_palette.hook.ts`)

**Note:** `use_global_shortcuts.hook.ts` does **not** exist in this repo — do not
create it unless the spec owner approves a new file; extend the existing
keyboard-handler pattern above.

**Component-level (may exist — verify):**

- [x] Modal shell + input + basic row list (`quick_lookup_overlay.component.tsx`).
- [x] `use_quick_lookup_state.hook.ts`, `use_chord_input.hook.ts` (+ specs).

**Task 12 integration (required for S-4 — do not mark Task 12 done until met):**

- [x] Render `<QuickLookupOverlay />` from `list_overlay_hosts.component.tsx` (or
      equivalent host next to `CommandPalette` / `TaskSheet`).
- [x] Global `⌘/` / `Ctrl+/` toggles overlay via `useQuickLookupState`; blocked when
      `shortcutsBlocked` (settings, task sheet, etc.) per design § keyboard precedence.
- [x] Full Variant A / C behaviour, filter chip + centred modal, `⇧⇥`, advisories
      from `getConfig()` — not only the current stub list.
- [x] Spec or manual: `⌘/` opens overlay from list view with seeded bindings.

- [x] Modal sheet, focus-trapped, `Esc` closes (integration).
- [x] Input mode auto-detected (text vs chord). `⇧⇥` toggles.
- [x] Text mode → Variant A rows ordered by
      `(match_score DESC, frecency_score DESC, action ASC)`.
- [x] Empty input → top-50 bindings by frecency.
- [x] Chord mode → Variant C cards grouped by chord_hash.
- [x] Collision icon column: empty / `·` (soft, gated on
      `config.display.advisories`) / `⚠` (hard).
- [x] Selection (`↑↓`), Primary (`↵`) → open chord detail (close overlay),
      Secondary (`⌘↵`) → reveal source.
- [x] Register `⌘/` global trigger (see integration above).
- [x] Add the Raycast-style filter chip on the right of the search input
      and the centred modal dropdown it controls (per
      [requirements.md](requirements.md) S-4 §§ 11–17 and
      [design.md § 4 — Filter chip + centred modal dropdown](design.md#filter-chip--centred-modal-dropdown-raycast-style)):
  - **Chip** (passive label): `All` default (muted), app slug when an app
    is selected, `Globals` for the scope-only filter. Caret `▾` muted.
  - **Modal dropdown** (centred): max-width 480 px, max-height 70vh, full
    `filter-dropdown` style from [DESIGN.md](../../../../DESIGN.md)
    §Components — surface fill, `lg` (8 px) radius, drop shadow
    `0 8px 24px rgba(0,0,0,0.45)`, backdrop `rgba(0,0,0,0.35)`. Header
    `Filter bindings`, search row `Filter apps…`, list with sections:
    `All` → divider → `Scope` header + `Globals only` → divider → `Apps`
    header + one row per app slug present in the cache (each with count).
  - **Keyboard, scoped to the open overlay:**
    - `⌘K` toggles the modal open/closed.
    - Inside the modal: `↓` next, `↑` previous (both skip headers), `⇥`
      apply highlight + close modal + return focus to search input, `Esc`
      close-cancel + return focus to search input.
    - Type in the modal's `Filter apps…` input → fuzzy filter visible
      options.
  - `⌘K` is **scope-local** to the overlay — outside the overlay its
    existing app-wide meaning remains.
  - Use the standard tokens for hover (`row-hover` #1c2537) and selected
    (`row-selected` #0f2535 + `3px` `primary` left border on the chosen
    item).
  - All filtering is renderer-side over the cache; no new RPC.
  - Reset to `All` whenever the overlay closes and reopens.
- [x] Specs: render with seeded cache; assert Variant A / C swap based on
      input parse; assert collision icon column; keyboard navigation.

Commit: `feat(renderer): Add quick-lookup overlay` (split integration commit OK).

---

## Task 13 — Keymap detail body

**Files:** add
- `src/shell/renderer/components/shortcuts/shortcut_keymap.component.tsx`
- `src/shell/renderer/components/shortcuts/shortcut_keymap.component.spec.tsx`
- `src/shell/renderer/components/shortcuts/binding_row.component.tsx`
- `src/shell/renderer/components/shortcuts/binding_row.component.spec.tsx`
- `src/shell/renderer/hooks/shortcuts/use_keymap_view.hook.ts`
- `src/shell/renderer/hooks/shortcuts/use_keymap_view.hook.spec.tsx`

modify
- `src/shell/renderer/pages/detail/detail.page.tsx` (dispatch by entry type;
  see [design.md § Detail page orchestration](design.md#detail-page-orchestration-tasks-1314) —
  **not** `detail_view.component.tsx`)

- [x] Render keymap as grouped binding rows (`group:` field as tabs;
      `Conflicts` tab appears when ≥ 1 hard collision).
- [x] `ⓘ` popover renders `when`, `notes`, `links` for the binding using
      existing markdown / link renderers.
- [x] Inner selection via a scoped variant of the existing
      `use_list_selection.hook` (do not duplicate; refactor if needed).
- [x] `↵` Primary on selected binding → navigate to chord detail.
- [x] `⌘↵` Secondary → reveal source.
- [x] Specs: render fixture entry; tab grouping correctness; primary /
      secondary action wiring; conflict tab visibility.

**Task 13 integration (required before Task 14 — separate commit OK):**

- [x] `detail.page.tsx` branches on `entry.type === 'shortcut'` and renders
      `ShortcutKeymap` (see [design § Detail page orchestration](design.md#detail-page-orchestration-tasks-1314)).
      **Do not** put this branch in `detail_view.component.tsx`.
- [x] Pass `useBindings()` cache (`all`, `collisionsById`), `getConfig()` →
      `displayAdvisories={cfg.display.advisories ?? false}`, and
      `onChordDetailNavigate` / `onRevealSource` callbacks from the page.
- [x] Spec or smoke: open a shortcut entry in detail — keymap tabs visible,
      not empty `doc` only.

Commit: `feat(renderer): Add keymap detail body` (integration may be
`feat(renderer): Wire shortcut keymap in detail page` if split).

---

## Task 14 — Chord detail body

**Depends on:** Task 13 integration (`detail.page.tsx` dispatches keymap).

**Files:** add
- `src/shell/renderer/components/shortcuts/chord_detail.component.tsx`
- `src/shell/renderer/components/shortcuts/chord_detail.component.spec.tsx`
- `src/shell/renderer/hooks/shortcuts/use_chord_detail.hook.ts`
- `src/shell/renderer/hooks/shortcuts/use_chord_detail.hook.spec.tsx`

modify
- `src/shell/renderer/pages/detail/detail.page.tsx` (extend body dispatcher;
  see [design.md § Detail page orchestration](design.md#detail-page-orchestration-tasks-1314))

- [x] Body-swap view inside Detail Page (same level, different body) —
      *not* a new navigation stack level. Parent state in `detail.page.tsx`
      (`keymap` | `chord` + `chordHash` + `restoreBindingId`).
- [x] Chord rows from `useBindings().byHash.get(chordHash)` (cross-app);
      keymap rows stay on `entry.bindings` + cache join (design § orchestration).
- [x] App tabs (one per `app` that uses the chord); globals tab always
      shown (says `(none)` if no global binding exists for that chord).
- [x] `←` returns to the keymap detail with the originally selected
      binding restored (`initialSelectedBindingId` or remount `key` on
      `ShortcutKeymap`).
- [x] Specs cover navigation in/out, app-tab rendering, and the "globals
      free" empty-tab state.
- [x] Reuse `KbdChip`, `BindingRow` patterns where rows match Variant C;
      keyboard: `←` calls `onBack` from parent state (same level as keymap).

**Read first:** `use_chord_detail.hook.ts` owns tab + row selection;
`chord_detail.component.tsx` is presentational. Parent in `detail.page.tsx`
holds `ShortcutDetailBody` state (see design § orchestration).

Commit: `feat(renderer): Add chord detail body`.

---

## Task 15 — List page integration

**Files:** modify
- `src/shell/renderer/components/list/entry_row.component.tsx` — glyph via
      `getIcon()` / `ENTRY_TYPE_GLYPH` (Task 1); confirm `shortcut` renders `⌨`
- `src/shell/renderer/components/list/filter_dropdown.component.tsx` —
      `ENTRY_TYPE_VALUES` drives type chips; ensure `shortcut` appears
- `src/shell/renderer/constants/filter_labels.const.ts` (or wherever
      `TYPE_FILTER_LABEL` maps types) — add `shortcut` label
- `src/shell/renderer/hooks/list/use_list_page_filters.hook.ts` — `EntryType[]`
      already includes types from core; no change unless list RPC rejects `shortcut`
- `src/shell/main/rpc/schemas.ts` — `entryTypeSchema` / `listFilterFields`
      **must** include `shortcut` literal or list filter RPC will strip it
- `src/shell/app/db/entry.repository.ts` — FTS indexed `doc` / body assembly for
      upsert (grep `fts` / `doc` build on import); extend for `type === 'shortcut'`
- `src/shell/app/db/entry.repository.spec.ts`
- Optional: `src/core/domain/models/knowledges/detail/doc.assembler.ts` if
      shortcut doc text is assembled there instead of repository

**Do not** implement `app:` parsing in the renderer — search runs server-side
via `findAll` / FTS in `entry.repository.ts` (S-5 AC 6).

- [x] `Shortcut` becomes a selectable filter chip option (multi-select with
      others). Verify `listKnowledge` / `getListStats` accept `types: ['shortcut']`.
- [x] Entry row glyph `⌨` for shortcut entries (often already works if Task 1
      landed — still verify in UI).
- [x] FTS5 indexed body for shortcuts includes binding `action` strings plus
      human-readable chord text (reuse `chord_display.util.ts` or parser display
      fields — keep in shell/app or pure core helper, FCIS-safe).
- [x] `app:<slug>` in the search bar restricts to shortcut entries where
      `key === slug` (extend query preprocessing in `findAll` / `toFts5MatchQuery`
      path **before** FTS — mirror how `#tag` filters work if present).
- [x] Specs: repository FTS finds a binding by action text; filter chip includes
      shortcut; `app:vscode` returns only `key = 'vscode'` shortcut rows.

Commit: `feat(list): Surface shortcut entries in the list page`.

---

## Task 16 — Frecency wiring

**Depends on:** Tasks 12–14 (surfaces that fire Primary/Secondary). RPC +
`App.recordBindingVisit` likely **already exist** — verify before re-adding routes.

**Files:** modify
- `src/shell/renderer/components/shortcuts/binding_row.component.tsx` (if
      actions fire from row — else parent callbacks)
- `src/shell/renderer/components/shortcuts/quick_lookup_overlay.component.tsx`
- `src/shell/renderer/pages/detail/detail.page.tsx` (keymap/chord detail actions)
- `src/shell/renderer/rpc/client.ts` — `recordBindingVisit(id, weight)` (exists)
- `src/shell/main/rpc/server.spec.ts` — assert weights if not already covered

**Do not** modify `app.ts` / `server.ts` unless `recordBindingVisit` is missing.

- [x] Confirm `POST /api/recordBindingVisit` delegates to
      `bindingFrecencyRepository.record(id, weight)` (already in App layer).
- [x] After Primary (`↵` / chord detail open): `recordBindingVisit(id, 1.0)` via
      `fireAndForget` from renderer (no await in hot path).
- [x] After Secondary (`⌘↵` reveal source): `recordBindingVisit(id, 0.5)`.
- [x] Overlay sort uses `frecencyScore` on `BindingRef` from cache; optional:
      call `refreshBindingsCache()` after visit so reopen reflects new order (or
      document optimistic local bump — pick one, test it).
- [x] Specs: mock `recordBindingVisit` in overlay/keymap specs; assert
      `1.0` vs `0.5` per action kind.

Commit: `feat(renderer): Wire binding frecency events`.

---

## Task 17 — OS-defaults seed and `shortcuts.yml` migration coexistence

**Files:** add
- `assets/sources/shortcuts.macos.yml` *(new — curated globals; OR extend an
  existing `macos.yml` if one exists; do not put it in a subdirectory)*
- `assets/sources/shortcuts.linux.yml`
- `assets/sources/shortcuts.vscode.yml`
- `assets/sources/shortcuts.amethyst.yml`
- `assets/sources/shortcuts.zsh.yml`
- `assets/sources/shortcuts.ghostty.yml`

- [x] Seed curated global bindings for the most common OS actions: Spotlight,
      App Switcher, Mission Control, Notification Center, screenshot family,
      Force Quit (macOS); System Search, App Switcher, Workspaces 1-9 (Linux).
- [x] Per-app keymaps in the personas above with realistic content (e.g.
      VS Code: Go to File, Show All Commands, Open Keyboard Shortcuts as a
      sequence; ZSH line editor bindings; Ghostty F3-layer panes).
- [x] Existing `assets/sources/shortcuts.yml` cheat is **left alone** — the
      new `shortcuts:` block lives in new files. Per the user's directive
      in clarifying questions.
- [x] Verify with `bun run start` that imported entries appear in the list
      page and the overlay.

Commit: `feat(sources): Seed OS defaults and per-app keymaps`.

---

## Task 18 — Config surface

**Files:** modify
- `src/shell/app/config/config.schema.ts`
- `src/shell/app/config/config.schema.spec.ts`
- `src/shell/app/config/config.loader.spec.ts`

- [x] Add `advisories: Type.Optional(Type.Boolean())` to the existing
      `DisplayConfig`. Default `false`.
- [x] Defaults emit `advisories: false` if absent.
- [x] Renderer reads via existing `getConfig()` RPC; the overlay /
      keymap detail respects the toggle.

Commit: `feat(config): Add display.advisories toggle`.

---

## Task 19 — Telemetry, logging, and quality gate

**Files:** none new — verify the existing gates.

**Run first (authoritative):**

```bash
bash .agents/skills/app-quality-gate/scripts/gate.sh
```

Only drill into individual tools below if the gate fails and points at a target.

- [x] `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits 0.
- [x] If gate is red: fix reported target (lint, `tsc`, tests, build, route parity,
      depcruise, knip, ls-lint, jscpd) — do not weaken thresholds.  (All 85 TS errors and 64 lint errors fixed; gate green as of 2026-05-29.)

Commit: `chore(quality): Pass full gate for shortcut feature`.

---

## Task 20 — Definition of Done

**Order:** Task 19 gate green → manual checks below → Task 21 e2e.

- [x] `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits 0.
- [ ] All acceptance criteria from
      [requirements.md](requirements.md) traceable to tasks above.
      (**S-10 AC9** — traceability table + per-AC evidence in tasks.md.)
- [x] **Integration sanity:** shortcut detail shows keymap (not doc-only);
      chord detail body-swap works (`←` restores selection).
      (Covered by smoke scenario "Keymap detail navigates to chord detail and back" in
      [`shortcuts_list.feature`](../../../features/e2e/shortcuts_list.feature). Production
      fixes: shortcut bindings persisted in new `knowledges.bindings` + `platform`
      columns; `targetOwnsEnter()` in
      [`use_entry_action_keys.hook.ts`](../../../../src/shell/renderer/hooks/list/use_entry_action_keys.hook.ts)
      defers Enter to the keymap-row handler when focus is inside `.cmp-shortcut-keymap`
      or `.cmp-chord-detail`.)
- [ ] Prototype HTML states reachable via real components in
      `tools/preview/server.script.ts` (import fixture sources first).
      (**S-10 AC8** — preview checklist below; prototypes in design.md are
      visual reference only.)

      Preview checklist (pass/fail in browser at `tools/preview/server.script.ts`
      after importing shortcut seed sources):

      1. Open overlay (`⌘/`) — text mode, search input focused.
      2. Type an action name — text-mode results (compare
         `prototype.overlay.a.html`).
      3. Type a chord (e.g. `meta+p`) — conflicts-first card (compare
         `prototype.overlay.c.html`).
      4. Open a `shortcut` entry detail — keymap body (compare
         `prototype.keymap.html`).
      5. Select a binding, `↵` — chord detail; `←` returns (compare
         `prototype.chord-detail.html`).

- [ ] Adding a new global binding via YAML that clashes with an existing
      global is flagged on import and visible in the overlay's `⚠` column.
      (**S-3 AC8** sync diagnostics + **S-4 AC9** overlay glyph; partial e2e
      via overlay regression; full path **S-10 AC10** /
      [`shortcuts_import.feature`](../../../features/e2e/shortcuts_import.feature)
      still `@todo`.)
- [x] Pressing `⌘/` from any view opens the overlay focused on its input.
      (Covered by overlay regression scenario "Quick-lookup opens focused and closes with
      escape". Product fix: focus-on-open effect added in
      [`quick_lookup_overlay.component.tsx`](../../../../src/shell/renderer/components/shortcuts/quick_lookup_overlay.component.tsx);
      Meta+K no longer hijacked by the command-palette window listener while the overlay
      is open — `shortcutsBlocked` now includes `quickLookup.open` in
      [`use_list_page_shell.hook.ts`](../../../../src/shell/renderer/hooks/list/use_list_page_shell.hook.ts).)
- [x] Typing `⌘P` in the overlay (chord mode) renders the Variant C card
      for `⌘P` showing every app bound to it.
      (Covered by overlay regression scenario "Chord search shows conflicts-first card
      for a shared chord" — typing canonical `meta+p` enters chord mode and lists both
      `release-vscode` and `release-browser` in the conflicts card.)
- [x] Typing `go to file` (text mode) finds VS Code's binding.
      (Covered by overlay regression scenario "Text search finds a binding by action
      name" plus the list-side smoke scenario "Main search finds a keymap by binding
      action text". FTS fix: `buildShortcutPreamble` indexes binding action strings via
      [`doc.shortcut.parser.ts`](../../../../src/core/domain/models/knowledges/detail/doc.shortcut.parser.ts).)
- [x] E2e: `@spec:shortcuts` scenarios pass — see Task 21.
      (8/8 `@spec:shortcuts` scenarios green: 3 in `shortcuts_list.feature` (smoke +
      regression), 5 in `shortcuts_overlay.feature` (regression). Verified via
      `CI=1 bun run e2e:smoke` (20/20) and `CI=1 bun run e2e:regression` (26/26).)

---

## Task 21 — E2e traceability (required for beta)

**Files:** add / modify (cross-spec)
- `assets/features/e2e/shortcuts_overlay.feature` *(may already exist — extend)*
- `assets/features/e2e/shortcuts_list.feature` *(may already exist — extend)*
- `assets/docs/archive/e2e/fixture-manifest.md`
- `assets/docs/archive/e2e/step-catalog.md`
- `assets/docs/archive/e2e/tasks.md` (Phase 7)
- `e2e/steps/shortcuts.steps.ts` *(create if missing)*
- `e2e/screenplay/` tasks and questions as needed
- `e2e/support/seed_fixture.support.ts` (shortcut YAML seed)

**Depends on:** Tasks **13 integration**, **14**, **15** green in preview;
[e2e T2.4](../e2e/tasks.md) (test profile). Feature files may exist with `@todo`
while UI is in flight — remove `@todo` only when scenarios pass.

**Agent workflow:**

1. Read [e2e/step-catalog.md](../e2e/step-catalog.md) — every Gherkin phrase
   must appear before implementing steps.
2. Align fixture titles with [e2e/fixture-manifest.md](../e2e/fixture-manifest.md)
   (`Release VS Code`, binding action strings in scenarios).
3. `bun run e2e:bddgen` after feature edits; then `CI=1 bun run e2e:smoke` /
   `CI=1 bun run e2e:regression` per [assets/guides/TESTING_GUIDE.md](../../../guides/TESTING_GUIDE.md).

- [x] Extend release fixture with `shortcuts/release.yml` per fixture manifest.
      (`SHORTCUTS_YAML` added to `seed_fixture.support.ts` with VS Code + macOS entries;
      `meta+p` collision pair seeded for overlay chord-card scenario.)
- [x] Implement step catalog phrases; register `shortcuts.steps.ts`.
      (43 Given/When/Then steps covering all overlay, filter modal, keymap, chord
      detail, and list integration scenarios; imports corrected and sorted.)
- [x] Automate overlay smoke scenarios (S-4 AC1–2, AC4–5, AC9, AC11–16).
      (5 overlay scenarios in
      [`shortcuts_overlay.feature`](../../../features/e2e/shortcuts_overlay.feature)
      green under `@regression`. `@todo` removed.)
- [x] Automate list/detail regression scenarios (S-5 AC1–5, AC7) — requires
      Task 13–15 (detail keymap/chord, type filter, FTS).
      (3 list scenarios in
      [`shortcuts_list.feature`](../../../features/e2e/shortcuts_list.feature) green
      under `@smoke @regression`. `@todo` removed.)
- [x] Remove `@todo` from release-gate scenarios when green; record evidence
      in [e2e/tasks.md Phase 7](../e2e/tasks.md#phase-7---shortcuts-feature-p1).
- [x] Verify: `mise run test e2e --smoke` and `--regression` include shortcuts
      tags where applicable.
      (`CI=1 bun run e2e:smoke` — 20/20 incl. 3 `@spec:shortcuts`;
      `CI=1 bun run e2e:regression` — 26/26 incl. 8 `@spec:shortcuts`.)

Commit: `test(e2e): Add shortcuts overlay and list coverage`.

_See [requirements.md S-10](requirements.md#requirement-s-10-end-to-end-acceptance)._
