<!-- markdownlint-disable-file -->

# Shortcuts — Design

Companion to [requirements.md](requirements.md) and [tasks.md](tasks.md).
Implementation handoff lives at [handoff.md](handoff.md). Visual prototypes
under `prototype.*.html` next to this file.

## OVERVIEW

A fifth entry type, `shortcut`, peer of `bookmark | command | cheat | task`.
Each entry holds the keymap of one app (e.g. `vscode`, `amethyst`, `macos`).
The entry's `key` is the canonical app slug. Inside the entry, a `bindings:`
array stores structured rows: `chord ↦ action`, scoped `global` or `local`,
with optional `when`, `group`, `tags`, `notes`, `links`.

Two surfaces consume the data:

1. **Quick-lookup overlay** opened by `⌘/` — modal, full-height column,
   search-first. Auto-switches between *text mode* (fuzzy search of action
   names) and *chord mode* (reverse-lookup of who's bound to a chord).

2. **List page integration** — `shortcut` is a regular entry type in the
   existing list. Detail pane renders the keymap. Pressing `↵` (Primary) on
   a binding row advances to a **chord detail** view that shows every
   binding using that chord across all apps, with collision analysis.

Both surfaces feed off the same renderer-side bindings cache, populated once
from new RPC methods on `App` and invalidated on import-success.

### Supersedes

This spec **supersedes** [`keyboard-shortcuts-view/design.md`](../keyboard-shortcuts-view/design.md)
for the **`⌘/`** trigger:

| Old (`keyboard-shortcuts-view`)                      | New (`shortcuts`)                                            |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `⌘/` opens kb's own App Keyboard Shortcuts reference | `⌘/` opens the **quick-lookup overlay** for imported keymaps |
| Cheat `shortcuts.yml` structured table (prototype)   | `shortcut` entry type + list/detail integration              |

**App Keyboard Shortcuts** (navigation, palette, window) remain reachable via
Settings and Command palette → App. They are **not** bound to `⌘/` in v1.

### Related specs

- E2e acceptance criteria: [S-10](requirements.md#requirement-s-10-end-to-end-acceptance)
  and [e2e Phase 7](../e2e/tasks.md#phase-7---shortcuts-feature-p1).
- Global keyboard precedence: [§ 4 — Keyboard precedence](#keyboard-precedence-global-vs-overlay).

## ARCHITECTURE — FCIS LAYERS

| Layer          | Where                             | Files added                                                                                                                                             |
| -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core (pure)    | `src/core/domain/models/entries/` | `schemas/shortcut.schema.ts`, `parsers/shortcut.parser.ts`, `parsers/chord.parser.ts`, `parsers/chord_hash.util.ts`, `collisions/collision.detector.ts` |
| Core constants | `src/core/domain/constants/`      | extend `entry.const.ts` only                                                                                                                            |
| Shell (I/O)    | `src/shell/app/db/`               | `schema.ts` extension, `binding.repository.ts`, `binding_frecency.repository.ts`, `import.service.ts` extension; **`App` methods** in `app.ts`          |
| Main RPC       | `src/shell/main/rpc/`             | extend `server.ts` + `schemas.ts` (no separate GET `/bindings` router)                                                                                  |
| Preview        | `tools/preview/server.ts`         | same `createRpcServer(app)` — no route fork                                                                                                             |
| Renderer       | `src/shell/renderer/`             | components, hooks, css for both surfaces                                                                                                                |

No new top-level module boundaries. No new validation library. No ORM. All
new code follows the existing CLAUDE.md non-negotiables.

## DECISIONS (lock-in)

| #   | Decision                                                                                                                                       | Rationale                                                                                                                 |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | One YAML keymap = one `shortcut` entry; the entry's `key` IS the canonical app slug                                                            | Reuses the existing `parseSourceFile` importer; no fork; matches 1-file-1-entry convention                                |
| 2   | Chord is a first-class ordered sequence of chord-steps                                                                                         | Ghostty / VS Code keymap edit (`⌘K ⌘S`) use chains; modelling them as length-N arrays keeps the schema uniform            |
| 3   | Modifier canon: `meta · ctrl · alt · shift · hyper`; parser accepts `cmd command opt option windows super` as input aliases                    | `meta` is the W3C spec cross-platform name; `hyper` covers Karabiner remaps                                               |
| 4   | Key canon: Raycast-aligned camelCase named keys plus letters/digits/punctuation                                                                | Aligns muscle memory with a popular keyboard-driven app users likely already know                                         |
| 5   | Collision rules: hard for `global × *` and `local × same-app`; soft for `local × different-app` and `global × local-different-app`             | Matches user mental model: globals preempt; same-app duplicates are bugs; cross-app overlaps are coexistence not conflict |
| 6   | Sequence-prefix shadowing is a hard collision                                                                                                  | Otherwise the longer chord is unreachable                                                                                 |
| 7   | Two surfaces: `⌘/` overlay (primary, fast) and list-page integration (secondary, browsable)                                                    | User's stated needs split across "find quickly" and "compose with existing filters"                                       |
| 8   | Binding-level Primary action = "open chord detail"; Secondary = "reveal source"                                                                | Aligns with existing list/split/detail Primary-Secondary convention; the unique value-add is the cross-app view           |
| 9   | OS-default seed shipped as `macos.yml` / `linux.yml` curated YAML                                                                              | Brittle to auto-detect; YAML is editable and version-controlled                                                           |
| 10  | Bindings denormalised into their own table (`entry_bindings`), index keyed on `chord_hash`                                                     | Collision queries become O(log N) per index probe; the renderer cache reads it all once                                   |
| 11  | Schema migrations follow the existing `CREATE … IF NOT EXISTS` idempotent pattern                                                              | Project convention; no versioned migration runner                                                                         |
| 12  | Visual variants: A (Raycast Compact + collision icon + frecency sort) is the daily driver; C (Conflicts-First Cards) is the chord-mode default | A is dense and scannable; C makes collision detection the centrepiece in the case where it matters                        |

## § 1 — Data model

### Entry-level schema

`src/core/domain/models/entries/schemas/shortcut.schema.ts`:

```ts
import { type Static, Type } from '@sinclair/typebox'
import type { Simplify } from 'type-fest'
import { sourceBaseEntryRowObjectSchema } from './base.schema'
import { linkItemSchema } from './link.schema'
import { tagsSchema } from './tags.schema'
import { noteBlockSchema } from './base.schema'

const nonEmpty = Type.String({ minLength: 1, pattern: '\\S' })

export const modifierSchema = Type.Union([
  Type.Literal('meta'),
  Type.Literal('ctrl'),
  Type.Literal('alt'),
  Type.Literal('shift'),
  Type.Literal('hyper')
])

export const chordStepSchema = Type.Object({
  modifiers: Type.Array(modifierSchema, { uniqueItems: true }),
  key: nonEmpty,                         // canonical lowercased: 'space', 'p', 'arrowLeft', 'f3'
  display: Type.Optional(Type.String())  // original glyph form, e.g. '⌘ ␣'
})

export const platformSchema = Type.Union([
  Type.Literal('macos'),
  Type.Literal('linux'),
  Type.Literal('windows'),
  Type.Literal('any')
])

export const scopeSchema = Type.Union([Type.Literal('global'), Type.Literal('local')])

export const bindingSchema = Type.Object({
  id: Type.Optional(nonEmpty),                                // auto-slugified from action if absent
  chord: Type.Array(chordStepSchema, { minItems: 1 }),
  scope: scopeSchema,
  platform: Type.Optional(platformSchema),                    // overrides entry-level platform
  action: nonEmpty,
  when: Type.Optional(nonEmpty),
  group: Type.Optional(nonEmpty),
  intent: Type.Optional(nonEmpty),                            // reserved for Common-actions catalog
  tags: Type.Optional(tagsSchema),
  links: Type.Optional(Type.Array(linkItemSchema, { minItems: 1 })),
  notes: Type.Optional(Type.Array(noteBlockSchema, { minItems: 1 }))
})

export const shortcutEntrySchema = Type.Composite([
  sourceBaseEntryRowObjectSchema,                             // key, source, desc, tags, links, notes, meta
  Type.Object({
    type: Type.Literal('shortcut'),
    platform: Type.Optional(platformSchema),                  // default for all bindings
    bindings: Type.Array(bindingSchema, { minItems: 1 })
  })
])

export type ChordStep = Simplify<Static<typeof chordStepSchema>>
export type Binding = Simplify<Static<typeof bindingSchema>>
export type ShortcutEntry = Simplify<Static<typeof shortcutEntrySchema>>
```

Add `shortcutEntrySchema` to `entrySchema`'s union in `entry.schema.ts`.

### YAML format

```yaml
# assets/sources/vscode.yml — or any file under assets/sources/
shortcuts:
  vscode:                                  # ← entry.key AND app slug for all bindings inside
    desc: "VS Code keymap"
    platform: any                          # default for all bindings
    tags: [editor, ide]
    links:
      - VS Code Keybindings docs: https://code.visualstudio.com/docs/getstarted/keybindings
    bindings:
      - id: go-to-file
        chord: "⌘P"                        # accepts glyphs, words, or '+'-joined
        scope: local
        action: "Go to File"
        group: Navigation
      - id: command-palette
        chord: "⌘⇧P"
        scope: local
        action: "Show All Commands"
        group: Navigation
      - id: open-keymap
        chord:
          macos: "⌘K ⌘S"                  # per-platform override (sequence)
          linux: "ctrl+k ctrl+s"
        scope: local
        action: "Open Keyboard Shortcuts"
```

### Normalisation rules (`chord.parser.ts`)

| Input                                        | Canonical output                                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `"⌘P"`, `"Cmd+P"`, `"meta+p"`, `"command+p"` | `[{ modifiers: ['meta'], key: 'p' }]`                                                          |
| `"⌘⌥T"`, `"opt+cmd+t"`, `"alt+meta+T"`       | `[{ modifiers: ['meta','alt'], key: 't' }]` (sorted by precedence)                             |
| `"f3 shift+arrowLeft"`                       | `[{ key: 'f3' }, { modifiers: ['shift'], key: 'arrowLeft' }]`                                  |
| `{ macos: "⌘K ⌘S", linux: "ctrl+k ctrl+s" }` | two bindings, `platform: 'macos'` and `platform: 'linux'`, each with their respective sequence |

Modifier precedence (sort order): `hyper > meta > ctrl > alt > shift`.
Canonical key tokens and display glyphs live in `key.const.ts` as `KEY_GLYPHS`
(e.g. `arrowUp: '↑'`, `esc: '⎋'`). Modifier aliases (`opt` → `alt`) stay in
`key_modifier.util.ts`.

### `chord_hash`

`src/core/domain/models/entries/parsers/chord_hash.util.ts`:

```ts
// single step: 'meta+alt+t'
// sequence  : 'f3>shift+arrowLeft'
export function hashChord(chord: ChordStep[]): string {
  return chord.map(stepHash).join('>')
}
function stepHash(step: ChordStep): string {
  const mods = [...step.modifiers].sort(precedenceCompare)
  return mods.length === 0 ? step.key : `${mods.join('+')}+${step.key}`
}
```

## § 2 — Collision detection

### Rules (recap)

| Pair (same `chord_hash`, overlapping platforms)                                                                        | Class                         |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `global × any-other`                                                                                                   | **hard**                      |
| `local × local`, same `app`                                                                                            | **hard**                      |
| `local × local`, different `app`                                                                                       | **soft** (cross-app advisory) |
| `global × local`, different `app`                                                                                      | **soft**                      |
| Sequence prefix `A` shadowed by single-step or sub-sequence equal to a prefix of `A` (with matching scope rules above) | **hard**                      |
| Disjoint `platform` values                                                                                             | not a collision               |

### Pure detector

`src/core/domain/models/entries/collisions/collision.detector.ts`:

```ts
export type BindingRef = {
  bindingId: string                       // '<entry_key>:<binding_id>'
  entryKey: string                        // also the app slug
  app: string                             // == entryKey for shortcut entries
  scope: 'global' | 'local'
  chordHash: string
  chordPrefix: string | null              // for sequences; null on single-step
  platform: 'macos' | 'linux' | 'windows' | 'any'
  action: string
}

export type Collision = {
  kind: 'hard' | 'soft'
  against: BindingRef
  reason: 'global-x-any' | 'local-same-app' | 'cross-app-local' | 'global-x-local-cross-app' | 'sequence-shadow'
}

export function detect(candidate: BindingRef, existing: BindingRef[]): Collision[]
```

The detector is the **single source of truth** for collision rules and is
called by:

- the importer (to record diagnostics per entry),
- the renderer-side cache builder (to compute per-row badges on cache load).

### Storage

```sql
CREATE TABLE IF NOT EXISTS entry_bindings (
  id            TEXT PRIMARY KEY,         -- '<entry_key>:<binding_id>'
  entry_key     TEXT NOT NULL,
  app           TEXT NOT NULL,            -- = entry_key for shortcut entries
  platform      TEXT NOT NULL DEFAULT 'any',
  scope         TEXT NOT NULL,
  chord_hash    TEXT NOT NULL,
  chord_prefix  TEXT,
  action        TEXT NOT NULL,
  intent        TEXT,
  when_clause   TEXT,
  tags_json     TEXT
);
CREATE INDEX IF NOT EXISTS idx_bindings_chord       ON entry_bindings(chord_hash);
CREATE INDEX IF NOT EXISTS idx_bindings_chord_app   ON entry_bindings(chord_hash, app);
CREATE INDEX IF NOT EXISTS idx_bindings_chord_scope ON entry_bindings(chord_hash, scope);
CREATE INDEX IF NOT EXISTS idx_bindings_app         ON entry_bindings(app);
CREATE INDEX IF NOT EXISTS idx_bindings_prefix      ON entry_bindings(chord_prefix) WHERE chord_prefix IS NOT NULL;

CREATE TABLE IF NOT EXISTS binding_frecency (
  binding_id    TEXT PRIMARY KEY,         -- matches entry_bindings.id
  score         REAL NOT NULL DEFAULT 0,
  last_event_at TEXT NOT NULL             -- ISO-8601 UTC
);
CREATE INDEX IF NOT EXISTS idx_binding_frecency_score ON binding_frecency(score DESC);
```

No `FOREIGN KEY` constraint — the bindings table is a derived index (same
philosophy as `knowledges_fts`). Cascade behaviour comes from the importer's
delete-then-bulk-insert per `entry_key`. `binding_frecency` rows are keyed by
stable `binding_id`; they are **not** migrated when an action is renamed (see
§ 6).

## § 3 — Storage, RPC, import pipeline

### YAML location

Flat under `assets/sources/`. Same place as everything else.
Either one `shortcuts.yml` holding many keymaps, or split per app
(`vscode.yml`, `amethyst.yml`). The importer doesn't care; both produce
identical `entry_bindings` rows.

### Parser registration

Two-line registry surgery in `src/core/domain/constants/entry.const.ts`:

```ts
export const ENTRY_TYPE_VALUES = ['bookmark', 'command', 'cheat', 'task', 'shortcut'] as const
export const SECTION_ENTRY_TYPE_VALUES = ['bookmarks', 'commands', 'cheats', 'tasks', 'shortcuts'] as const

// extend the existing two maps:
export const ENTRY_TYPE_SECTIONS = { …, shortcut: 'shortcuts' } as const
export const SECTION_ENTRY_TYPES  = { …, shortcuts: 'shortcut' } as const

// glyph + default icon
export const ENTRY_TYPE_GLYPH    = { …, shortcut: '⌨' }
export const DEFAULT_ENTRY_ICONS = { …, shortcut: 'command' }
```

`toEntryWithSourceHint` in `entry.factory.ts` gains a switch arm for
`type === 'shortcut'` that delegates to `parseShortcutEntry`.

### Import pipeline

The existing `ImportService` (`src/shell/app/db/import.service.ts`) already
walks all `.yml` files, calls `parseSourceFile`, and upserts entries inside
`db.transaction`. Two changes:

1. The transaction body, after upserting a shortcut entry, calls
   `bindingRepository.upsertBindings(entry.key, projectBindings(entry))` —
   which deletes existing rows for that `entry_key` and bulk-inserts the
   new ones.
2. After the transaction, the detector runs once over the full bindings
   table to compute per-binding collision badges; these are not persisted
   (they are recomputed cheaply by the renderer-side cache builder on every
   import-success).

### RPC

New methods on **`App`** (`src/shell/app/app.ts`), registered in the existing
Elysia app (`src/shell/main/rpc/server.ts`) using the project transport shape
**`POST /api/<method>`** with TypeBox body schemas — same as every other RPC
(see [`app-service-rpc/design.md`](../app-service-rpc/design.md)). Handlers
**delegate to `App` only**; route files MUST NOT import repositories directly.

| Method                | Body schema                      | Returns                             | App delegate                         |
| --------------------- | -------------------------------- | ----------------------------------- | ------------------------------------ |
| `listBindings`        | `emptyBodySchema`                | `BindingRef[]` with `frecencyScore` | `app.listBindings()`                 |
| `listBindingsByChord` | `{ hash: string }`               | `BindingRef[]`                      | `app.listBindingsByChord(hash)`      |
| `recordBindingVisit`  | `{ id: string; weight: number }` | `{ ok: true }`                      | `app.recordBindingVisit(id, weight)` |

Example registration (normative shape):

```ts
.post('/listBindings', () => appInstance.listBindings(), { body: emptyBodySchema })
.post('/listBindingsByChord', ({ body }) => appInstance.listBindingsByChord(body.hash), {
  body: t.Object({ hash: t.String() })
})
.post('/recordBindingVisit', ({ body }) => appInstance.recordBindingVisit(body.id, body.weight), {
  body: t.Object({ id: t.String(), weight: t.Number() })
})
```

The Eden Treaty client (`src/shell/renderer/rpc/client.ts`) exposes thin
wrappers (e.g. `listBindings()`, `listBindingsByChord(hash)`,
`recordBindingVisit(id, weight)`).

Per the **non-negotiable rule** in CLAUDE.md, `tools/preview/server.ts` mounts
the **same** `createRpcServer(app)` — no duplicate route table. Bindings in
preview/e2e come from the SQLite DB after import (fixture sources or dev
sources), not a parallel mock router.

### Renderer cache

`src/shell/renderer/hooks/shortcuts/use_bindings_cache.hook.ts` is the single
owner of the cached bindings. It holds:

```ts
type BindingsCache = {
  all: BindingRef[]
  byHash: Map<string, BindingRef[]>      // chord lookup
  byApp:  Map<string, BindingRef[]>      // app filtering
  collisionsById: Map<string, Collision[]>
}
```

Populated once via `listBindings()` on mount; refilled on the existing
import-success event. Everything downstream reads from this cache
synchronously — no per-keystroke RPC.

## § 4 — Renderer surfaces

### Keyboard precedence (global vs overlay)

Normative interaction with [`command-palette-filter-ux`](../command-palette-filter-ux/requirements.md):

| Key             | When overlay **closed**        | When quick-lookup overlay **open**                   |
| --------------- | ------------------------------ | ---------------------------------------------------- |
| `⌘P` / `Ctrl+P` | Toggle command palette         | Same suppression as other modals (no palette)        |
| `⌘K` / `Ctrl+K` | Toggle list **filter** overlay | Toggle overlay **filter modal** only (scope-local)   |
| `⌘/` / `Ctrl+/` | Open quick-lookup overlay      | Close and reopen resets filter to `All` (S-4 AC17)   |
| `Esc`           | Context-specific               | Close innermost modal first (filter modal → overlay) |

While the overlay is open, `⌘K` MUST NOT open the list filter overlay. While
settings or task sheet is open, `⌘/` MUST NOT open the quick-lookup overlay
(same suppression family as palette/filter).

### Surface 1 — Quick-lookup overlay (`⌘/`)

Component: `src/shell/renderer/components/shortcuts/quick_lookup_overlay.component.tsx`.
Modal sheet, full height column, takes focus on open, dismisses on `Esc`.

Single input → mode auto-detection (text vs chord) → rendering variant.

| Input shape                                                | Mode  | Layout                                                                |
| ---------------------------------------------------------- | ----- | --------------------------------------------------------------------- |
| Empty                                                      | text  | Variant A — top 50 bindings by `binding_frecency.frecency_score DESC` |
| Parses as chord (≥ 1 modifier + key, or a named key alone) | chord | Variant C — Conflicts-First Cards, grouped by `chord_hash`            |
| Plain text                                                 | text  | Variant A — fuzzy match on `action` then `app` then `group`           |

`⇧⇥` toggles between modes when the heuristic guesses wrong (e.g. user
typing just `p` — ambiguous as either a letter or a key).

#### Filter chip + centred modal dropdown (Raycast-style)

A small filter chip sits on the right side of the search input. The chip is
a passive label — clicking or typing `⌘K` opens a **centred modal dropdown**
on top of the overlay, following the same `surface` + `lg` (8px) radius +
shadow + `rgba(0,0,0,0.35)` backdrop pattern documented in
[DESIGN.md](../../../../DESIGN.md) for floating overlays (filter dropdown /
settings overlay).

**Chip:**

| Element    | Behaviour                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Chip label | Current filter — `All` by default (muted), the app slug when an app is selected, or `Globals` when scope-only-global is selected. |
| Caret      | `▾` muted, indicates a dropdown is available.                                                                                     |

**Modal dropdown (centred, max-width 480 px):**

| Element       | Behaviour                                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Title bar     | `Filter bindings` heading + key-hint line on the right.                                                                                                                                                                                                |
| Search row    | `Filter apps…` text input that fuzzy-filters the list below.                                                                                                                                                                                           |
| List sections | `All` (default, count = all bindings) → divider → **Scope** header + `Globals only` (count = global bindings across every app) → divider → **Apps** header + one row per app slug present in the bindings cache, each showing the app's binding count. |
| Selection     | Single-select. Picking an item filters the result list and closes the modal.                                                                                                                                                                           |

Visual style is the standard `filter-dropdown` component from
[DESIGN.md](../../../../DESIGN.md) §Components: `surface` fill, `border`
stroke, `lg` (8px) radius, drop shadow `0 8px 24px rgba(0,0,0,0.45)`,
backdrop `rgba(0,0,0,0.35)`. Row hover and selected styles use the standard
`row-hover` (`#1c2537`) / `row-selected` (`#0f2535`) tokens plus a `3px`
primary left-border on the selected item (matching the entry-row pattern).

**Keyboard (inside the overlay):**

| Key                         | Action                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `⌘K`                        | Toggle the modal dropdown open/closed. Scoped to overlay context only — outside the overlay, `⌘K` retains its existing application meaning. |
| `↓` inside modal            | Move highlight to next item (skips the section-header rows).                                                                                |
| `↑` inside modal            | Move highlight to previous item (skips headers).                                                                                            |
| `⇥` inside modal            | Apply highlighted filter, close modal, return focus to search input.                                                                        |
| `Esc` inside modal          | Cancel without applying, close modal, return focus to search input.                                                                         |
| Type-ahead in modal's input | Filter the visible options.                                                                                                                 |

Semantics: the filter is applied **on top of** whatever mode (text / chord)
is active. `All` is the no-op default. `Globals only` is
`WHERE scope = 'global'`. Apps filter by `WHERE app = '<slug>'`. The filter
persists for the lifetime of the overlay session (closing and reopening the
`⌘/` overlay resets it to `All`).

The chip and modal are pure renderer-side filters over the cache; they do
not trigger any new RPC.

#### Variant A row (text mode and empty state)

```
[scope-prefix] [icon] [action]                                  [chord]
```

| Slot         | Width         | Content                                                                |
| ------------ | ------------- | ---------------------------------------------------------------------- |
| scope-prefix | flex          | `<app> · <scope> · ` muted prefix                                      |
| icon         | 1 char fixed  | empty / `·` (soft, only if `display.advisories === true`) / `⚠` (hard) |
| action       | flex          | the binding's `action` text                                            |
| chord        | right-aligned | `<KbdChip>` rendering of the chord                                     |

Selection (`↑↓`) just moves the highlight. Footer line gets one extra slot
when selected row has a collision: `⚠ Also bound in: vscode, cursor — press
↵ for chord detail`. No popover, no hover state.

#### Variant C card (chord mode)

```
┌─ ⌘ P ──────────────────────────── 3 bindings ───────┐
│ ● global    (none)                                  │
│ ◯ local     vscode      → Go to File                │
│ ◯ local     cursor      → Go to File                │
│ ◯ local     browsers    → Print                     │
└─────────────────────────────────────────────────────┘
```

Cards are scoped by `chord_hash`. Scope marker `●` global, `◯` local. The
global slot reads `(none)` when no global binding exists — communicating "the
chord is free system-wide". `↵` opens the chord detail; `↑↓` picks a card;
`→` cycles between bindings within the selected card.

### Surface 2 — List page integration

| Existing primitive     | Change for `shortcut`                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| Type filter chip       | gains `Shortcut` option (multi-selectable)                                     |
| Entry row glyph        | `⌨` for `type === 'shortcut'`                                                  |
| Detail pane            | renders `<KeymapBody>` for shortcut entries (binding list with `group` tabs)   |
| FTS5 index             | shortcut entry indexed text includes binding actions and chord display strings |
| Tag filter (`#editor`) | works as today; entry-level + binding-level tags merged into the tag pool      |
| `app:<slug>` syntax    | extended to match shortcut entry `key`                                         |

#### List search bar vs filter dropdown (Task 15)

Do not confuse these paths — agents often grep `detail_view` or invent a
`#tag` parser in the renderer; neither is correct for `app:`.

| Mechanism                   | Where it lives today                                                                                          | Behaviour                                                                                                                                                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`#tag` in filter UI**     | `filter_dropdown.component.tsx`, `use_list_page_filters` → `ListOpts.tags`                                    | User picks tags in the filter overlay; labels like `#editor` in `compact_filter_overlay_build_rows.util.ts`. **Not** typed into the main search input.                                                                                                       |
| **Free-text search**        | `use_list_page_rows.hook.ts` → RPC `list` with `query` → `entry.repository.ts` `findAll` → `toFts5MatchQuery` | Whole search string becomes FTS5 prefix tokens. No `app:` or `#` prefix parsing in v1 list code today.                                                                                                                                                       |
| **`app:<slug>` (S-5 AC 6)** | **To implement in Task 15** — `findAll` (or a small pure helper in `src/core/` called from the repository)    | When `query` matches `app:<slug>` (optional trailing FTS remainder), restrict shortcut rows to `key === slug` (and apply any remainder via FTS). Mirror the requirements wording “tag-style” as **colon-prefix in the search bar**, not the `#` filter chip. |

Normative implementation locus: **`src/shell/app/db/entry.repository.ts`** inside
`findAll` before `findAllRowsFts` / `findAllRowsPlain`. Renderer passes `query`
through unchanged via `listOptsFromListFilters`.

Also required for Task 15: add `shortcut` to `entryTypeSchema` in
`src/shell/main/rpc/schemas.ts` (today only `ENTRY_TYPE_VALUES[0..3]`).

#### Cache + entry join (keymap detail, chord detail `ⓘ`)

`BindingRef` rows from `listBindings()` are denormalised for search, collisions,
and frecency. They do **not** include `group`, chord steps, `when`, `notes`, or
`links`.

For a shortcut entry open in the detail pane:

1. **Rows for this keymap:** `cache.all.filter(b => b.entryKey === entry.key)`.
2. **Collisions / frecency:** from `cache.collisionsById` and each row’s
   `frecencyScore` on `BindingRef` (when present on the RPC response).
3. **Group tabs, `KbdChip` chords, `ⓘ` popover:** join each cache row to
   `entry.bindings[]` by binding id (`bindingId` === `entry.key` + `:` +
   binding `id`, same rule as import’s `projectEntryBindings`).
4. **Overlay-only surfaces** may use the cache alone; keymap/chord detail
   MUST load the full `ShortcutKnowledge` via `getEntry` (or equivalent) and
   apply this join — no extra RPC per binding.

Extending `entry_bindings` / `BindingRef` with `group` (and chord) is optional
later; v1 normative path is cache + entry join.

#### Detail page orchestration (Tasks 13–14)

Shortcut detail is **not** implemented inside `detail_view.component.tsx`.
That component stays the generic bookmark/command/cheat/task chrome (header,
`doc`, links, task graph). **Orchestration lives in**
`src/shell/renderer/pages/detail/detail.page.tsx` (per [tasks.md](tasks.md)
Tasks 13–14): load the entry, branch on `entry.type === 'shortcut'`, and swap
the **body** between keymap and chord detail (handoff locked decision **#14** —
same Detail Page level, not a new navigation stack).

Optional pattern: pass a `bodySlot` (or equivalent) into `DetailPageView` so
the header/sidebar stay shared; do **not** fork shortcut-only logic into
`detail_view` unless the spec owner approves a layout change.

**Local state** (names are illustrative; one hook file is fine):

```ts
type ShortcutDetailBody =
  | { mode: 'keymap' }
  | { mode: 'chord'; chordHash: string; restoreBindingId: string }
```

| Event                                                             | State                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Open shortcut detail / change `entryId`                           | `{ mode: 'keymap' }`                                                    |
| Keymap Primary (`↵`) via `onChordDetailNavigate(hash, bindingId)` | `{ mode: 'chord', chordHash, restoreBindingId: bindingId }`             |
| Chord detail `←` / `onBack`                                       | `{ mode: 'keymap' }` and restore `restoreBindingId` as keymap selection |

Reset body mode when `entryId` changes. `ShortcutKeymap` already exposes
`onChordDetailNavigate` and `onRevealSource`; the parent owns the mode switch.

**Data sources (do not mix keymap and chord rules):**

| Body             | Rows                                                                             | Collisions / sort                                                                                                      | Chord glyph (`KbdChip`)                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Keymap**       | `entry.bindings[]` for the open shortcut (tabs, list, `ⓘ`)                       | `cache.collisionsById` keyed by `bindingId`; see [cache + entry join](#cache--entry-join-keymap-detail-chord-detail-ⓘ) | Join cache row → `entry.bindings[]` by `bindingId`                                                                       |
| **Chord detail** | `cache.byHash.get(chordHash) ?? []` — **all apps**, not `entryKey === entry.key` | Same `collisionsById` per row `bindingId`                                                                              | Join `restoreBindingId` (or first row) to **this** entry’s `bindings[]` for steps; header chord is constant for the view |

Chord detail app tabs: one tab per distinct `app` in the hash group, plus a
**globals** tab (show `(none)` when no `scope === 'global'` row exists). This
matches the glossary (“every binding that uses one chord across all apps”) and
Variant C in the overlay. No per-keystroke RPC — read `useBindings()` only
(S-6).

**`display.advisories`:** load once via existing `getConfig()` (same pattern as
`use_list_page_filters.hook.ts` for `display.pageSize`). Pass
`displayAdvisories={cfg.display.advisories ?? false}` into `ShortcutKeymap` /
`BindingRow` (and chord detail if it shows soft icons). Default `false` (S-8,
Task 18). Do not search for a dedicated advisories hook — it does not exist yet.

**Reference implementations to read before editing:**

- `shortcut_keymap.component.tsx`, `use_keymap_view.hook.ts` — Task 13 UI
- `use_bindings_cache.hook.ts` — `all`, `byHash`, `collisionsById`
- `prototype.keymap.html`, `prototype.chord-detail.html` — visual ground truth

#### Detail pane — keymap body

Uses the [cache + entry join](#cache--entry-join-keymap-detail-chord-detail-ⓘ)
rule and [detail page orchestration](#detail-page-orchestration-tasks-1314).

Component: `src/shell/renderer/components/shortcuts/shortcut_keymap.component.tsx`.

```
VS Code keymap                                          ⌨ shortcut
Visual Studio Code — editor, ide                    platform: any

[ All  Navigation  Editor  Window  Conflicts ]       ← group tabs

  Go to File                                          ⌘ P
    no conflicts                                                  ⓘ
  Show All Commands                                   ⌘ ⇧ P
    also bound in: cursor                                         ⓘ
  Open Keyboard Shortcuts                  ⌘ K   ⌘ S
    no conflicts                                                  ⓘ

──────────────────────────────────────────────────────────────────
↵ chord detail    ⌘↵ reveal source    ⌘K palette
```

- Group tabs derived from binding-level `group` field.
- `Conflicts` tab appears when ≥ 1 hard collision exists.
- `ⓘ` popover holds per-binding `when` / `notes` / `links` (reuses existing
  markdown + link renderers).
- Inner selection uses a hook scoped to visible bindings — same shape as
  `use_list_selection`, just one level deeper.

#### Detail pane — chord detail

Uses [detail page orchestration](#detail-page-orchestration-tasks-1314): rows from
`cache.byHash.get(chordHash)`, not the keymap’s `entry.bindings`-only filter.

When the user presses `↵` (Primary) or `→` (advance) on a binding row, the
Detail Page body swaps to the chord detail for that chord:

```
⌘ P                                                  chord detail

[ globals  vscode  cursor  browsers ]                ← app tabs

Globals:    (none) — chord is free system-wide
vscode:     Go to File                                ⌘ P
cursor:     Go to File                                ⌘ P
browsers:   Print                                     ⌘ P

──────────────────────────────────────────────────────────────────
←  back to keymap   ⌘↵ reveal source   ⌘K palette
```

`←` returns to the keymap detail with the originally selected binding
restored.

### Cross-surface primitive

`src/shell/renderer/components/shortcuts/kbd_chip.component.tsx`:

```tsx
<KbdChip chord={ChordStep[]} platform={Platform} />
```

Single source of truth for chord rendering. Each step is a row of `<kbd>`
elements, glyph-substituted per platform (`⌘ ⇧ ⌥ ⌃` on macOS, `Ctrl Shift
Alt Meta` on Linux). Sequence steps separated by a thin spacer.

### Triggering

| Action                       | From                     | Trigger          |
| ---------------------------- | ------------------------ | ---------------- |
| Open overlay                 | anywhere                 | `⌘/`             |
| Open overlay scoped to chord | list-page kbd chip click | click            |
| Open chord detail            | binding row              | `↵` (Primary)    |
| Reveal source for binding    | binding row              | `⌘↵` (Secondary) |
| Close overlay                | overlay focused          | `Esc`            |
| Toggle overlay input mode    | overlay focused          | `⇧⇥`             |

Registered in `src/shell/renderer/hooks/list/use_global_shortcuts.hook.ts`
(extension).

## § 5 — Visual proposals

Three prototype HTML files live next to this doc:

- [prototype.overlay.a.html](prototype.overlay.a.html) — Variant A,
  Raycast Compact, collision icons inline, frecency-sorted. Default for
  empty input and text mode.
- [prototype.overlay.c.html](prototype.overlay.c.html) — Variant C,
  Conflicts-First Cards. Default for chord-mode input.
- [prototype.keymap.html](prototype.keymap.html) — keymap detail body
  derived from Variant A's row style.
- [prototype.chord-detail.html](prototype.chord-detail.html) — chord
  detail body derived from Variant C's card style.

All four are styled with the existing Andromeda Void + PowerToys-flat
language (see [raycast-redesign/design.md](../raycast-redesign/design.md) for
the colour and chip system).

Seed data across all prototypes: macOS + Amethyst + VS Code + ZSH + Ghostty,
including at least one hard collision and one cross-app advisory so every
state is exercised.

## § 6 — Out of scope, future hooks, risks

### Out of scope for v1

- Executing a shortcut from kb (injecting keystrokes into the target app).
  Future extension on binding-row action set; the `Primary` action is "open
  chord detail" not "execute".
- Mouse / trackpad / MIDI bindings.
- Auto-detecting OS-default chords from system files.
- Importing from VS Code JSON, JetBrains XML, Sublime sublime-keymap, etc.
- Conflict-resolution suggestions ("propose a free chord").
- Multi-user sync of personal keymaps.
- Recording chords by pressing keys.
- Localised app names / chord glyphs.

### Reserved schema fields

| Field                   | Future use                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| `bindings[].intent`     | Raycast `Common` style intent catalog for cross-app intent matching |
| `bindings[].id`         | stable for `binding_frecency` and future execution actions          |
| `entry_bindings.intent` | indexed column for the above when intent matching ships             |

### Known limitations

| Limit                                                                            | Note                                                                                                                                  |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Soft conflicts can be noisy                                                      | `display.advisories: false` default                                                                                                   |
| `when` clauses not evaluated                                                     | overlapping chords with different `when` are flagged as hard collisions; `when` text is surfaced in the `ⓘ` popover for manual triage |
| Sequence prefix detection is one-level                                           | enough for real keymaps                                                                                                               |
| No platform inheritance from `any` to bindings with explicit per-platform chords | explicit, not a bug                                                                                                                   |
| Frecency resets on action rename                                                 | by design — `id` is `slugify(action)` when not authored explicitly                                                                    |

### Risks & mitigations

| Risk                                                  | Mitigation                                                                                       |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Chord parser bugs silently corrupt the bindings index | parser is pure; property-style tests against the canonical glyph table in `chord.parser.spec.ts` |
| YAML authoring errors                                 | importer surfaces diagnostics; bad entries logged, processing continues                          |
| Renderer cache stale after import                     | reuse existing import-success event                                                              |
| `chord_hash` format change breaks frecency            | frecency is keyed on binding id, not chord hash                                                  |
| Every new file needs a co-located spec                | tasks.md enforces — same rule as the rest of the project                                         |
