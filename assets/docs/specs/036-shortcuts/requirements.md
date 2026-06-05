<!-- markdownlint-disable-file -->

# Shortcuts — Requirements

## INTRODUCTION

This spec adds a fifth entry type, `shortcut`, to kb. A `shortcut` entry is the
keymap for one application (e.g. VS Code, Amethyst, macOS system). Its body
holds many structured **binding** rows — each row pairs a key chord with an
action under a defined scope (`global` or `local`).

Two surfaces consume the data:

- a `⌘/` **quick-lookup overlay** for finding a shortcut by chord or action
  text from anywhere in the app, and
- the **existing list page**, where `shortcut` filters and renders like the
  other entry types.

The motivating problem (paraphrasing the project owner): different apps use
the same chords for different actions, and personal globals (e.g. Amethyst
window manager hotkeys) collide silently with app-local bindings (e.g. VS Code,
ZSH). The user wants (a) fast recall and (b) collision detection.

The feature is keyboard-driven, consistent with the rest of kb (Raycast UX /
PowerToys aesthetic).

## OUT OF SCOPE (v1)

- Executing a shortcut from kb (firing keystrokes into another app). Reserved
  as a future extension on the binding-row action set.
- Mouse / trackpad gesture bindings. The schema is keyboard-only; gestures
  would land as a separate entry type later.
- Auto-detecting OS-default chords from macOS plists / Linux desktop files. v1
  ships curated `macos.yml` / `linux.yml` seed data instead.
- Importing keymaps from app-specific formats (VS Code JSON, JetBrains XML,
  Sublime sublime-keymap). YAML is the only input format v1 accepts.
- Conflict-resolution suggestions ("propose a free chord"). Detection is in;
  resolution is future work.
- Recording chords by pressing keys ("capture mode"). Authoring is via YAML.

## REQUIREMENT SYNTAX (EARS)

Same as the foundation spec. Acceptance criteria use:

- `WHEN <trigger>, THEN <system> SHALL <response>.`
- `IF <state>, THEN <system> SHALL <response>.`
- `WHILE <state>, THEN <system> SHALL <response>.`

Each `## REQUIREMENT S-N` block maps to a section in
[design.md](design.md) and one or more tasks in [tasks.md](tasks.md).

**Verifiable acceptance:** every behavior someone must validate before release
(including “manual” dogfood) MUST appear as at least one numbered AC in this
file and/or a Gherkin scenario under `assets/features/e2e/` tagged
`@spec:shortcuts`. Do not leave orphan checks only in `tasks.md` or handoff
prose — see [`assets/docs/specs/README.md`](../README.md#verifiable-acceptance-no-orphan-checks).

## GLOSSARY

| Term               | Meaning                                                                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **chord**          | One or more chord-steps. A single chord-step is a set of modifiers plus a key, e.g. `meta+alt+t`. A sequence is an ordered list of steps, e.g. `f3 ← shift+→`.                |
| **binding**        | One `chord ↦ action` pair scoped under an app, with optional `when`, `notes`, `links`, `tags`.                                                                                |
| **keymap**         | The set of bindings owned by one app. Stored as one `shortcut` entry.                                                                                                         |
| **scope**          | `global` (system-wide capture, fires when any app is frontmost) or `local` (fires only when the binding's parent app is frontmost).                                           |
| **hard collision** | Two bindings that, given their scopes, cannot both fire reliably: same chord, both global; or same chord, both local in same app.                                             |
| **soft advisory**  | Two bindings with the same chord that can coexist (different apps, both local). Surfaced as informational when `display.advisories === true`.                                 |
| **chord hash**     | Deterministic string representation of a canonicalised chord, used as the SQLite index key. Single-step: `meta+alt+t`. Sequence: steps joined with `>`, e.g. `f3>shift+left`. |
| **chord detail**   | A view that shows every binding that uses one chord across all apps, with collision analysis. Reached from a binding row via `↵` (Primary) or `→` (advance navigation).       |

---

## REQUIREMENT S-1: Shortcut Entry Type

**User story:** As a user, I want a `shortcut` entry type so that I can store
each app's keymap as a single, importable, version-controllable artefact.

### Acceptance criteria

1. WHEN a YAML source file under the configured sources directory contains a
   top-level `shortcuts:` block, THEN the system SHALL import each
   map-key inside it as a `shortcut` entry whose `key` equals the map-key (the
   canonical app slug, e.g. `vscode`, `amethyst`, `macos`).
   - **Measure:** import of fixture
     `src/__tests__/fixtures/sample/shortcuts/valid.yml` (or e2e
     `shortcuts/release.yml`) produces N entries of type `shortcut` where N
     matches the count of map-keys under `shortcuts:`.
   - **Note:** existing `assets/sources/shortcuts.yml` is a **cheat** entry;
     it is **not** converted. New keymaps live in `shortcuts.*.yml` files
     (see Task 17).

2. WHEN a `shortcut` entry is upserted, THEN the system SHALL validate its
   body against `shortcutEntrySchema` (TypeBox) and reject any entry whose
   `bindings:` array is empty or whose `bindings[*].chord` fails canonical
   parsing.
   - **Measure:** fixture `shortcuts.invalid.yml` produces ≥ 1 import error
     and does not insert the invalid entry.

3. WHEN a `shortcut` entry imports, THEN every `binding` it contains SHALL be
   denormalised into the `entry_bindings` table with its computed `chord_hash`
   and inherited `app` (= the entry's `key`).
   - **Measure:** after import of an entry with K bindings, `SELECT COUNT(*)
     FROM entry_bindings WHERE entry_key = ?` returns K.

4. WHEN a `shortcut` entry is re-imported with fewer / different bindings,
   THEN the system SHALL delete all of that entry's existing
   `entry_bindings` rows before inserting the new ones (within the same
   transaction as the entry upsert).
   - **Measure:** re-import of a modified entry leaves no orphan binding rows
     for that `entry_key`.

5. WHEN the schema is extended with the `shortcut` type, THEN existing
   bookmark / command / cheat / task entries and their parsers SHALL continue
   to work without modification.
   - **Measure:** the existing `parseSourceFile` test suite passes unchanged.

---

## REQUIREMENT S-2: Chord parsing and normalisation

**User story:** As a user, I want to write chords the way I think about them
(glyphs, words, Raycast-style names, sequences) and have kb canonicalise them
behind the scenes so collision queries are consistent.

### Acceptance criteria

1. WHEN a chord is given as a string, THEN the parser SHALL accept any
   combination of: modifier glyphs (`⌘ ⌥ ⌃ ⇧`), modifier words
   (`cmd | command | meta | ctrl | alt | opt | option | shift | hyper |
   super | windows`), `+` or space separators, and named keys aligned with
   Raycast (`arrowUp arrowDown arrowLeft arrowRight pageUp pageDown home end
   space tab escape backspace delete deleteForward return enter f1..f24`),
   letters `a..z`, digits `0..9`, and the punctuation set Raycast supports.

2. WHEN a chord parses, THEN the parser SHALL emit a `ChordStep[]` whose
   modifier arrays are sorted by the fixed precedence `hyper > meta > ctrl
   > alt > shift` and whose key tokens are lowercased and alias-collapsed
   (`return ↔ enter` are preserved as distinct; `↑ → up`, `esc → escape`,
   `cmd → meta`, `opt → alt`, etc.).
   - **Measure:** `parseChord("⌘⇧P") = parseChord("Shift+Cmd+p") =
     parseChord("meta+shift+p")` all yield `[{ modifiers: ['meta','shift'],
     key: 'p' }]`.

3. WHEN a chord contains a space-separated or array-of-strings sequence,
   THEN the parser SHALL emit one `ChordStep` per step, preserving order.
   - **Measure:** `parseChord("F3 ⇧ →") = [{ key: 'f3' }, { modifiers:
     ['shift'], key: 'arrowRight' }]`.

4. WHEN a chord is given as a per-platform map (`{ macos: "...", linux: "..."
   }`), THEN the parser SHALL emit one binding per platform key with
   `platform` set accordingly.
   - **Measure:** a single `chord:` map produces two `entry_bindings` rows,
     one with `platform = 'macos'` and one with `platform = 'linux'`.

5. WHEN a chord cannot be canonicalised, THEN the import SHALL record an
   error citing the entry key, binding action, and the rejected chord text;
   it SHALL NOT crash and SHALL continue processing remaining entries.
   - **Measure:** fixture with one unparseable chord yields exactly one
     diagnostic referencing the offending action.

---

## REQUIREMENT S-3: Collision detection

**User story:** As a user, I want kb to tell me when a chord I'm about to use
or already use clashes with another binding so I can decide what to do about
it.

### Acceptance criteria

1. WHEN two bindings exist in the `entry_bindings` table with the same
   `chord_hash` and both `scope = 'global'` (regardless of app, on overlapping
   platforms), THEN the system SHALL classify the pair as a **hard
   collision**.

2. WHEN two bindings exist with the same `chord_hash`, both `scope =
   'local'`, and the same `app`, THEN the system SHALL classify the pair as
   a **hard collision**.

3. WHEN two bindings exist with the same `chord_hash`, both `scope =
   'local'`, and different `app` values, THEN the system SHALL classify the
   pair as a **soft advisory** (cross-app overlap).

4. WHEN two bindings exist with the same `chord_hash` where one is `global`
   and the other is `local` (different apps), THEN the system SHALL classify
   the pair as a **soft advisory**.

5. WHEN a binding's chord is a sequence and another binding's chord_hash
   equals a strict prefix of that sequence (with matching scope rules from
   the previous clauses), THEN the system SHALL classify the pair as a
   **hard collision** (sequence-shadowing).
   - **Measure:** binding `F3` (single step, local, app vscode) collides
     hard with binding `F3 ←` (sequence, local, app vscode).

6. WHEN two bindings share `chord_hash` and `scope` but their `platform`
   values are disjoint (e.g. `macos` vs `linux`), THEN the system SHALL NOT
   classify them as a collision.

7. WHEN the renderer requests collisions for a candidate chord, THEN the
   bindings repository SHALL return all matching rows in O(log N) per index
   lookup using the indexes defined in [design.md](design.md) § 3.

8. WHEN sync completes after shortcut YAML under the configured sources
   introduces or updates bindings that participate in a **hard** collision
   (per AC1–AC5, including global-vs-global on overlapping platforms), THEN
   sync diagnostics SHALL report at least one collision naming the
   `chord_hash`, both `app` slugs, and kind `hard`.
   - **Measure:** extend the release fixture with a new global binding whose
     `chord_hash` matches an existing global; run sync; sync modal or import
     summary lists the hard collision. Overlay visibility is S-4 AC9; e2e
     coverage is S-10 AC11.

---

## REQUIREMENT S-4: Quick-lookup overlay (`⌘/`)

**User story:** As a user, I want a single keystroke to open a focused
search surface that lets me find any shortcut by chord or by action text from
anywhere in the app.

### Acceptance criteria

1. WHEN the user presses `⌘/` from any view, THEN the system SHALL open the
   quick-lookup overlay with the search input focused.
   - **Measure:** focus is on the input on first paint; the underlying view
     is dimmed but visible.

2. WHEN the overlay is open and the user presses `Esc`, THEN the system
   SHALL close the overlay and restore focus to the previously focused
   element.

3. WHEN the overlay is open and the input is empty, THEN the system SHALL
   show the top-N bindings ordered by `binding_frecency.frecency_score DESC`
   (N configurable, default 50).

4. WHEN the user types text that does not parse as a chord, THEN the overlay
   SHALL be in **text mode** and SHALL filter the cached bindings by fuzzy
   substring match against `action` (primary), `app` (secondary), and
   `group` (tertiary), ordered by `(match_score DESC,
   frecency_score DESC, action ASC)`.

5. WHEN the user types text that parses as a chord (≥ 1 modifier glyph/word
   followed by a key, or a named key alone), THEN the overlay SHALL switch
   to **chord mode** and SHALL render the **Conflicts-First Cards** variant
   (per [design.md](design.md) § 5).

6. WHEN the user presses `⇧⇥` inside the overlay, THEN the system SHALL
   toggle the input mode (text ↔ chord) for the current session.

7. WHEN a row is selected and the user presses `↵`, THEN the system SHALL
   execute the binding's **Primary** action — open the chord detail for
   that binding's chord (closing the overlay first).
   - The chord detail opens as the Detail Page of the underlying list view.

8. WHEN a row is selected and the user presses `⌘↵`, THEN the system SHALL
   execute the binding's **Secondary** action — reveal the source YAML
   file at the binding's line in the configured editor.

9. WHEN a row has any **hard** collision, THEN the overlay SHALL render a
   `⚠` glyph in the icon column of that row.

10. WHEN a row has any **soft** advisory and `display.advisories === true`,
    THEN the overlay SHALL render a muted `·` glyph in the icon column.
    Otherwise the icon column SHALL be empty.

11. WHEN the overlay opens, THEN a filter chip SHALL appear on the right
    side of the search input showing the current scope filter (`All` by
    default).

12. WHEN the user presses `⌘K` while the overlay is open, THEN the system
    SHALL toggle a **centred modal dropdown** on top of the overlay. The
    modal SHALL render as the standard `filter-dropdown` floating overlay
    per [DESIGN.md](../../../../DESIGN.md) §Components (surface fill, `lg`
    radius, drop shadow, `rgba(0,0,0,0.35)` backdrop), centred horizontally
    with `max-width: 480px` and capped at `70vh` of available height.

13. WHEN the modal is open, THEN it SHALL list: `All` (default), a `Scope`
    header section containing `Globals only`, and an `Apps` header section
    containing one row per app slug present in the bindings cache. Each
    selectable row SHALL display the binding count.

14. WHEN the modal is open, THEN the system SHALL respond to keys as
    follows:
    - `↓` SHALL move highlight to the next selectable item (skipping
      section-header rows).
    - `↑` SHALL move highlight to the previous selectable item (skipping
      section-header rows).
    - `⇥` SHALL apply the highlighted filter, close the modal, and return
      focus to the search input.
    - `Esc` SHALL close the modal without applying any change and return
      focus to the search input.

15. WHEN the user types in the modal's `Filter apps…` text input, THEN the
    modal SHALL fuzzy-filter the visible options.

16. WHEN a filter is applied, THEN the chip's label SHALL update to reflect
    the selection (`All`, `Globals`, or the app slug), and the result list
    SHALL re-filter accordingly (`All` removes the filter; `Globals only`
    applies `WHERE scope = 'global'`; an app selection applies
    `WHERE app = '<slug>'`).

17. WHEN the user closes and reopens the overlay (via `⌘/`), THEN the
    filter SHALL reset to `All`. The filter does not persist across overlay
    sessions in v1.

---

## REQUIREMENT S-5: List page integration

**User story:** As a user, I want `shortcut` entries to be first-class in the
existing list page so I can filter, search, and browse them alongside other
entry types.

### Acceptance criteria

1. WHEN the list page's type filter is open, THEN `Shortcut` SHALL appear
   alongside `Bookmark`, `Command`, `Cheat`, and `Task` and SHALL be
   multi-selectable with them.

2. WHEN the list page renders an entry of type `shortcut`, THEN it SHALL
   show the `⌨` glyph in the row icon slot.

3. WHEN the user opens the detail of a `shortcut` entry, THEN the detail
   pane SHALL render the keymap (list of binding rows, grouped by the
   `group` field, with a `Conflicts` tab visible when ≥ 1 hard collision
   exists for that entry).

4. WHEN the user is in the keymap detail with a binding row selected and
   presses `↵`, THEN the system SHALL navigate (within the same Detail
   Page) to the chord detail for that binding's chord.

5. WHEN the user is in the chord detail and presses `←`, THEN the system
   SHALL return to the keymap detail with the originally selected binding
   restored as the selection.

6. WHEN the user types `app:vscode` (existing tag-style filter syntax) in
   the search bar, THEN the list SHALL show only shortcut entries whose
   `key = 'vscode'` (in addition to the existing filter semantics for other
   entry types).

7. WHEN the FTS5 index is rebuilt, THEN every shortcut entry's indexed
   body SHALL include the concatenation of each binding's `action` text
   and rendered chord display string, so that typing an action name in the
   main search bar finds the keymap that contains it.

---

## REQUIREMENT S-6: Bindings cache and RPC

**User story:** As a user, I want the overlay to respond instantly when I
type, with no perceptible network round trip per keystroke.

### Acceptance criteria

1. WHEN the renderer mounts, THEN it SHALL fetch the full bindings list via
   `POST /api/listBindings` exactly once and hold it in a module-scoped cache.

2. WHEN the import-success event fires (existing signal), THEN the cache
   SHALL be invalidated and refetched.

3. WHEN the overlay or keymap-detail filters / queries the bindings, THEN it
   SHALL read from the cache only — no per-keystroke RPC.
   - **Measure:** opening the overlay and typing 20 characters in chord mode
     produces exactly zero additional `listBindings` RPC calls after the
     initial mount.

4. WHEN `POST /api/listBindingsByChord` is called with a hash, THEN the
   server SHALL return all rows in `entry_bindings` whose `chord_hash`
   matches, plus prefix rows per design § 3 (sequence-shadowing).

5. WHEN the renderer calls `POST /api/listBindings`, THEN the response SHALL
   include every denormalised binding row plus its current
   `binding_frecency` score for cache sorting.

6. WHEN the renderer calls `POST /api/listBindingsByChord`, THEN the server
   SHALL apply the same hash and sequence-prefix rules as the repository
   probe in design § 3.

7. WHEN the renderer calls `POST /api/recordBindingVisit`, THEN the server
   SHALL persist a weighted frecency event for the binding id.

8. WHEN a new RPC method is added to `server.ts`, THEN the preview server
   SHALL expose it through the same `createRpcServer(app)` bundle (no forked
   route table).

---

## REQUIREMENT S-7: Binding frecency

**User story:** As a user, I want the bindings I use most to surface first in
the overlay so my muscle memory pays off.

### Acceptance criteria

1. WHEN the user executes the Primary action on a binding row (overlay,
   keymap detail, or chord detail), THEN the system SHALL record a +1.0
   weighted event against that binding's `binding_frecency` row.

2. WHEN the user executes the Secondary action on a binding row, THEN the
   system SHALL record a +0.5 weighted event.

3. WHEN ranking results in the overlay or list, THEN the system SHALL apply
   the same decay function as `entry_frecency` (existing repository).

4. WHEN a binding's `id` changes (e.g. the user renames an action in YAML),
   THEN the frecency entry SHALL NOT be migrated. Frecency for the
   renamed binding resets to zero. This is explicit accepted behaviour.

---

## REQUIREMENT S-8: Configuration

**User story:** As a user, I want to toggle soft-advisory visibility globally.

### Acceptance criteria

1. WHEN the config file is read, THEN `config.display.advisories` SHALL
   default to `false` if absent.

2. WHEN the user sets `display.advisories: true` in `config.yaml`, THEN the
   overlay and keymap-detail SHALL render the `·` muted-dot icon for rows
   with cross-app advisories.

3. WHEN the user sets `display.advisories: false`, THEN no soft advisories
   SHALL be rendered. Hard collisions are always rendered regardless.

---

## REQUIREMENT S-9: Seeded OS defaults

**User story:** As a user, I want `⌘ Space` and the other OS-default chords
detected as Spotlight / system bindings from day one, without authoring my
own.

### Acceptance criteria

1. WHEN the repository ships, THEN it SHALL include curated OS default files
   `assets/sources/shortcuts.macos.yml` and
   `assets/sources/shortcuts.linux.yml` (top-level `shortcuts:` blocks) with
   global bindings for the most common OS actions (Spotlight, App Switcher,
   Mission Control, screenshot family, …). v1 beta targets **macOS and Linux**
   seeds; Windows chords parse but curated OS seed is optional.

2. WHEN the curated YAML is imported, THEN collision queries SHALL detect
   user-defined global chords that clash with the OS defaults and surface
   them as **hard** collisions.

---

## REQUIREMENT S-10: End-to-end acceptance

**User story:** As a release maintainer, I want shortcuts behavior covered by
the Gherkin e2e suite so beta regressions in overlay, list, and detail flows
are caught before ship.

### Acceptance criteria

1. WHEN the shortcuts feature is declared complete, THEN
   `assets/features/e2e/shortcuts_overlay.feature` and
   `assets/features/e2e/shortcuts_list.feature` SHALL exist with scenarios
   tagged `@spec:shortcuts` mapping to S-4 and S-5.

2. WHEN e2e fixture seeding runs, THEN it SHALL import
   `shortcuts/release.yml` per [`e2e/fixture-manifest.md`](../e2e/fixture-manifest.md)
   including at least one hard collision and one cross-app advisory binding
   pair.

3. WHEN `mise run test e2e --regression` runs after shortcuts implementation,
   THEN all implemented `@spec:shortcuts` scenarios SHALL pass without
   `@todo` on release-gate scenarios.

4. WHEN overlay scenarios run, THEN they SHALL assert user-visible outcomes
   (overlay open/close, text vs chord mode, collision glyph, filter modal)
   using steps registered in [`e2e/step-catalog.md`](../e2e/step-catalog.md).

5. WHEN list/detail scenarios run, THEN they SHALL cover type filter `Shortcut`,
   keymap detail, chord detail navigation (`↵` / `←`), and FTS search by
   binding action text.

6. WHEN a shortcuts scenario requires a chord keystroke in Playwright, THEN
   step implementations SHALL use platform-aware modifiers (`Meta+Slash` on
   macOS CI, `Control+Slash` on Linux CI) via
   [`press_shortcut.interaction.ts`](../../../e2e/screenplay/press_shortcut.interaction.ts),
   as documented in the step catalog.

7. WHEN shortcuts tasks are complete, THEN evidence SHALL be recorded in
   [`e2e/tasks.md` Phase 7](../e2e/tasks.md#phase-7---shortcuts-feature-p1)
   and shortcuts Task 21.

8. WHEN a maintainer validates shortcuts in the preview harness, THEN
   `tools/preview/server.script.ts` (with shortcut seed sources imported per
   [design.md](design.md) § Preview) SHALL expose all four UI states using
   **real renderer components** (not static prototype HTML): quick-lookup
   overlay in text mode, overlay in chord mode (conflicts-first card),
   keymap detail for a `shortcut` entry, and chord detail reached from that
   keymap.
   - **Measure:** follow the preview checklist in [tasks.md Task 20](tasks.md#task-20--definition-of-done)
     (prototype filenames in [design.md](design.md) § Prototypes are visual
     reference only). Pass/fail is observable in the browser without reading
     implementation source.

9. WHEN shortcuts is declared beta-ready, THEN every numbered AC in S-1
   through S-10 in this file SHALL map to at least one task id in
   [tasks.md](tasks.md) with recorded verification evidence (unit spec, e2e
   scenario, or the preview checklist in AC8).
   - **Measure:** traceability table below is complete; no AC lacks a task
     row and evidence note.

10. WHEN shortcuts e2e coverage is complete, THEN
    `assets/features/e2e/shortcuts_import.feature` SHALL include a scenario
    tagged `@spec:shortcuts` that, after mutating fixture YAML and running
    sync, asserts hard-collision diagnostics (S-3 AC8) and overlay `⚠` rows
    (S-4 AC9) for the clashing global binding.
    - **Measure:** scenario passes under `@regression` without `@todo`.

---

## Traceability

| Requirement             | Design section                                                     | Tasks         |
| ----------------------- | ------------------------------------------------------------------ | ------------- |
| S-1 Entry type          | § 1, § 3                                                           | T1, T3, T8    |
| S-2 Chord parser        | § 1                                                                | T2            |
| S-3 Collision detection | § 2                                                                | T4, T6, T8    |
| S-4 Overlay             | § 4 — Surface 1, § 5                                               | T11, T12      |
| S-5 List page           | § 4 — Surface 2                                                    | T13, T14, T15 |
| S-6 Cache + RPC         | § 3                                                                | T9, T10       |
| S-7 Frecency            | § 4 § 6                                                            | T7, T16       |
| S-8 Config              | § 6                                                                | T18           |
| S-9 OS seed             | § 3 § 6                                                            | T17           |
| S-10 E2e acceptance     | § 4, [e2e Phase 7](../e2e/tasks.md#phase-7---shortcuts-feature-p1) | T21, e2e T7.x |
