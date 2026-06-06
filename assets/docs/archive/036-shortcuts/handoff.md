<!-- markdownlint-disable-file -->

# Shortcuts — Implementation Handoff

> Hand this document to the implementation agent. It is **self-contained** —
> the agent should not need any prior conversation context to execute the
> plan. All decisions are locked; deviations require approval from the
> spec owner.

## Scope

Add a fifth entry type, `shortcut`, plus the surfaces that consume it (a
`⌘/` quick-lookup overlay and list-page integration). Authoritative
documents:

- [requirements.md](requirements.md) — EARS-style acceptance criteria, S-1
  through S-9 (S-4 carries §§ 1–17 for the overlay including the centred
  filter dropdown).
- [design.md](design.md) — architecture, data model, collision rules,
  RPC, renderer surfaces, prototype references, out-of-scope.
- [tasks.md](tasks.md) — task-by-task implementation plan with file paths
  and commit messages.
- [prototype.overlay.a.html](prototype.overlay.a.html),
  [prototype.overlay.c.html](prototype.overlay.c.html),
  [prototype.keymap.html](prototype.keymap.html),
  [prototype.chord-detail.html](prototype.chord-detail.html) — visual
  ground-truth for the four UI states.

## Mode of execution

For each task, use `subagent-driven-development` to
work [tasks.md](tasks.md) one task at a time. Tasks are ordered to keep
each intermediate state shippable: core changes first, then DB, then RPC,
then renderer, then sources. Do not reorder unless you have a concrete
reason and surface it back to the spec owner before committing.

For each task:

1. Read the named files in the task header before editing.
2. Write the co-located `.spec.ts(x)` first (TDD is the project default —
   see `assets/guides/TESTING_GUIDE.md`).
3. Make the smallest change that turns the test green.
4. Commit at the boundary the task specifies; use Conventional Commits
   (`assets/guides/GIT_COMMITS_GUIDE.md`).
5. Re-run the local gate after each meaningful change, not only at the end.

## Project non-negotiables — must read once and remember

Verbatim from `CLAUDE.md`; the agent will not inherit it from elsewhere.

- **Validation everywhere uses TypeBox** (`t.*` in Elysia routes,
  `Type.Object` + `Value.Check` in core / config). **Never `z.*`** —
  `zod` is not a dependency.
- **SQLite is direct via `bun:sqlite`** with typed prepared statements
  (`db.query<RowType, [Params]>(sql)`). No Drizzle ORM, no drizzle-kit,
  no drizzle-typebox.
- **Test factories use Fishery `factoryFor`** from `@testing` for typed
  domain rows. YAML fixtures only for end-to-end import specs. No
  drizzle-seed.
- **Logging uses `getLogger(['kb', …])` from `@shared/logging`.** No `console.*`
  in `src/`.
- **Every new RPC method** is registered on `src/shell/main/rpc/server.ts` as
  **`POST /api/<method>`** delegating to **`App`** — no repository imports in
  route handlers; preview uses the same `createRpcServer(app)`.
- **Every new file under `src/` ships with a co-located `.spec.ts(x)`.**
- **Naming is machine-checked.** Biome enforces snake_case on every
  dot-separated segment of filenames; `@ls-lint/ls-lint` enforces the
  directory ↔ suffix contract (see `.ls-lint.yml`). Components are
  `<snake_case>.component.tsx`; hooks `use_<snake_case>.hook.ts(x)`;
  Elysia route files `<snake_case>.routes.ts`; tests `<basename>.spec.ts(x)`.
- **FCIS forbidden imports**, enforced by dependency-cruiser + ast-grep:
  - `renderer/` → `shell/app/` ❌ — use the Eden Treaty client only.
  - `core/` → `shell/` ❌ — pure functions must not import I/O.
  - `shared/` → `shell/` ❌ — shared utilities must not import I/O.
  - `*.routes.ts` → `*.repository.ts` directly ❌ — must go through
    `AppService`.
- **Unused exports are a `knip` error** — delete or use before committing.

## Locked decisions (do not relitigate)

| #   | Decision                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | One YAML keymap = one `shortcut` entry. The entry's `key` IS the canonical app slug — `app:` is **not** a separate schema field.                                                                                                                                                                                               |
| 2   | The chord is a first-class ordered sequence of chord-steps. Single chord = length-1 sequence.                                                                                                                                                                                                                                  |
| 3   | Modifier canon: `meta · ctrl · alt · shift · hyper`. Parser accepts `cmd command opt option windows super` as input aliases.                                                                                                                                                                                                   |
| 4   | Key vocabulary is Raycast-aligned camelCase. See `chord.parser.ts` for the full alias table.                                                                                                                                                                                                                                   |
| 5   | Collision rules: `global × any` = **hard**; `local × same-app` = **hard**; sequence-prefix shadow = **hard**; `local × different-app` = **soft**; `global × local-different-app` = **soft**; disjoint platforms = not a collision.                                                                                             |
| 6   | Two surfaces: `⌘/` overlay (modal, primary) and list-page integration (browsable, secondary).                                                                                                                                                                                                                                  |
| 7   | Binding-row Primary action = "open chord detail". Secondary = "reveal source". No "copy chord" action.                                                                                                                                                                                                                         |
| 8   | OS defaults shipped as curated `assets/sources/shortcuts.macos.yml` / `shortcuts.linux.yml`.                                                                                                                                                                                                                                   |
| 9   | Existing `assets/sources/shortcuts.yml` cheat is **left alone** — new shortcuts go in new files.                                                                                                                                                                                                                               |
| 10  | Bindings denormalised into `entry_bindings` table with a `chord_hash` index. Renderer caches the full table once on mount.                                                                                                                                                                                                     |
| 11  | Schema migrations follow the `CREATE TABLE IF NOT EXISTS …` idempotent pattern. No versioned migration runner.                                                                                                                                                                                                                 |
| 12  | `display.advisories` config field, default `false`. Controls soft-advisory visibility. Hard collisions are always shown.                                                                                                                                                                                                       |
| 13  | Variant A (Raycast Compact + collision icon + frecency) is the overlay default. Variant C (Conflicts-First Cards) is the chord-mode default. `⇧⇥` toggles modes.                                                                                                                                                               |
| 14  | Chord detail is a **body-swap** of the Detail Page, not a new navigation level. `←` returns to keymap detail with original binding selection restored.                                                                                                                                                                         |
| 15  | Execution of shortcuts (firing keystrokes into other apps) is **out of scope** for v1.                                                                                                                                                                                                                                         |
| 16  | Mouse / trackpad / gesture bindings are **out of scope** for v1. Schema is keyboard-only.                                                                                                                                                                                                                                      |
| 17  | The overlay's filter chip opens a **centred modal dropdown** (not a chip-anchored popover). Trigger is `⌘K` (scope-local to the open overlay). Inside the modal: `↓` next, `↑` prev, `⇥` apply-and-close, `Esc` close-cancel. Visual style is the standard `filter-dropdown` component per [DESIGN.md](../../../../DESIGN.md). |
| 18  | **E2e is part of Definition of Done** — Task 21 + [e2e Phase 7](../e2e/tasks.md#phase-7---shortcuts-feature-p1). Feature/refactor specs MUST ship Gherkin scenarios before beta.                                                                                                                                               |

## Skills to load (implementor)

Load **before** the task range that needs them. Project skills live under
`.agents/skills/`; optional globals under `$HOME/.agents/skills/`.

| Phase / task                  | Skill                                                                                                                  | Why                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Always**                    | `app-context`                                                                                                          | FCIS layers, naming, RPC shape, design system |
| **Always before done**        | `app-quality-gate`                                                                                                     | Executable DoD                                |
| **T1–T4** (core)              | `app-testing`, `test-driven-development`                                                                               | Parser/detector specs first                   |
| **T5–T8** (DB + import)       | `app-testing`, `functional-core-imperative-shell`                                                                      | Repository + import boundaries                |
| **T9–T10, T16** (RPC + cache) | `app-rpc`, then `elysia`                                                                                               | `POST /api/*` on `App`, Eden client           |
| **T11–T15** (renderer)        | `app-testing`, `test-driven-development`, `electrobun-testing`, `react:components` or `frontend-design`, `tailwindcss` | Overlay + detail surfaces                     |
| **T21 / e2e Phase 7**         | `app-testing`, `electrobun-testing`, `playwright-bdd-gherkin-syntax`, `bdd-scenarios`                                  | Gherkin + Screenplay steps                    |
| **Stuck tests / gate**        | `systematic-debugging`, `verification-before-completion`                                                               | Evidence before claims                        |
| **Multi-task execution**      | `subagent-driven-development`                                                                                          | Task-by-task with commits                     |

Also read: [`assets/guides/TESTING_GUIDE.md`](../../../assets/guides/TESTING_GUIDE.md),
[`assets/guides/BDD_GUIDE.md`](../../../assets/guides/BDD_GUIDE.md),
[`assets/docs/archive/e2e/fixture-manifest.md`](../e2e/fixture-manifest.md),
[`assets/docs/archive/e2e/step-catalog.md`](../e2e/step-catalog.md).

**E2e policy:** every release-facing feature (including shortcuts) MUST satisfy
[requirements.md S-10](requirements.md#requirement-s-10-end-to-end-acceptance)
and the cross-feature rule in [e2e/requirements.md R11](../e2e/requirements.md#r11---cross-feature-e2e-acceptance).

## What success looks like

The Definition-of-Done checklist in [tasks.md § Task 20](tasks.md#task-20--definition-of-done)
is the evidence ledger. Normative pass/fail criteria live in
[requirements.md](requirements.md):

- **S-10 AC9** — every AC S-1–S-10 maps to a task with verification evidence.
- **S-10 AC8** — preview server exposes all four shortcut UI states (real
  components).
- **S-3 AC8** + **S-4 AC9** + **S-10 AC10** — YAML sync reports hard global
  collisions and overlay shows `⚠` (e2e:
  [`shortcuts_import.feature`](../features/e2e/shortcuts_import.feature)).
- **S-10 AC1–AC7** — automated `@spec:shortcuts` scenarios (Task 21).

Also:

- `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits 0.

## Working with the spec owner

- **Ask before changing a locked decision** in the table above. Surfacing
  is cheap; relitigation in a PR is expensive.
- **Surface ambiguity in EARS criteria** as a comment on the spec, not
  as a unilateral interpretation in the code. The criteria are versioned.
- **Performance numbers** that the spec doesn't pin (e.g. overlay first
  paint, cache build time) — measure and report; the spec owner will
  set the bar after seeing the first numbers.

## Test data and fixtures

- Per-app keymap YAML in `assets/sources/shortcuts.<app>.yml` for the
  five seed apps (macOS, Amethyst, VS Code, ZSH, Ghostty).
- Fishery factories under `src/__tests__/factories/`:
  - `binding.factory.ts` (`factoryFor<BindingRef>`).
  - `binding_frecency.factory.ts` (`factoryFor<BindingFrecencyRow>`).
  - `shortcut_entry.factory.ts` (`factoryFor<ShortcutEntry>`).
- End-to-end import fixture YAMLs under
  `src/__tests__/fixtures/sample/shortcuts/`:
  - `valid.yml` — multi-app valid keymaps.
  - `invalid.yml` — malformed chord, unknown modifier, empty bindings.
  - `collisions.yml` — staged hard and soft collisions for the detector
    spec.

## Risks the implementation must watch for

| Risk                                                           | Watch-for                                                                                                                        |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Chord parser silently corrupting the bindings index            | Property-style tests against the canonical glyph table; specs for round-trip identity per alias permutation.                     |
| Renderer cache stale after import                              | Subscribe to the existing import-success event; do not invent a new event channel.                                               |
| Forbidden cross-layer imports                                  | Run `bunx depcruise` after every task that adds files.                                                                           |
| RPC method added without preview parity                        | Same `createRpcServer(app)` in preview — verify new `/api/*` methods respond after fixture import.                               |
| Frecency reset on action rename                                | Documented in §6 as accepted behaviour. Do not invent migration logic.                                                           |
| Sequence-prefix collision misclassified                        | Spec explicitly covers `F3` vs `F3 ←`; check both directions.                                                                    |
| Shortcut logic added to `detail_view` instead of `detail.page` | Tasks 13–14 wire `detail.page.tsx`; see [design.md § Detail page orchestration](design.md#detail-page-orchestration-tasks-1314). |
| Chord detail filtered by `entry.key` only                      | Chord detail rows MUST come from `cache.byHash.get(chordHash)` (all apps). Keymap uses `entry.bindings`.                         |
| Task 13 checked in tasks.md but `detail.page` unwired          | Verify `detail.page.tsx` dispatches `ShortcutKeymap` before Task 14; components alone are insufficient.                          |

## Remaining work order (agent)

**Status table:** [tasks.md § Remaining tasks (agent entry point)](tasks.md#remaining-tasks-agent-entry-point) — repo audit dated 2026-05-27; refresh if your branch diverges.

Execute in this order to avoid dead ends:

| Order | Task               | Why                                                                           |
| ----- | ------------------ | ----------------------------------------------------------------------------- |
| 1     | **12 integration** | Overlay not mounted; no `⌘/` — S-4 blocked.                                   |
| 2     | **13 integration** | `detail.page.tsx` still generic; blocks 14 + e2e detail scenarios.            |
| 3     | **14**             | Chord body-swap depends on parent state from 13.                              |
| 4     | **15**             | RPC `shortcut` type + FTS + `app:` in `entry.repository` — unblocks list e2e. |
| 5     | **16**             | Wire `recordBindingVisit` on surfaces (RPC already done).                     |
| 6     | **19**             | `gate.sh` before manual DoD.                                                  |
| 7     | **21**             | E2e after 12–15; feature files may exist with `@todo`.                        |
| 8     | **20**             | Checklist after gate + e2e.                                                   |

**11** (`KbdChip`) is done on branch — skip unless specs fail.

**Checkbox drift:** If `tasks.md` marks a task done but the [audit table](tasks.md#remaining-tasks-agent-entry-point) says **Partial**, finish **integration** sub-bullets first.

## Continue: Task 12 (overlay integration)

If `quick_lookup_overlay.component.tsx` exists but `⌘/` does nothing, mount the
overlay in `list_overlay_hosts.component.tsx`, wire `useQuickLookupState`, and add
a `⌘/` handler alongside `use_command_palette.hook.ts` (that file owns `⌘P` /
`⌘K` today — there is no `use_global_shortcuts.hook.ts`).

## Continue: Tasks 13–14 (detail integration)

If keymap/chord components exist but the detail pane still shows only `doc`,
finish integration per [design.md § Detail page orchestration](design.md#detail-page-orchestration-tasks-1314).
Copy the **agent prompt** below into a new session.

### Agent prompt (Tasks 13–14 detail integration)

```text
You are implementing kb shortcuts Tasks 13–14 (keymap + chord detail on the list
Detail Page). Read first:

1. assets/docs/archive/shortcuts/handoff.md (locked decisions)
2. assets/docs/archive/shortcuts/design.md — § Detail page orchestration (Tasks 13–14),
   § Cache + entry join, § Detail pane keymap/chord
3. assets/docs/archive/shortcuts/tasks.md — Tasks 13–14
4. Prototypes: prototype.keymap.html, prototype.chord-detail.html

Non-negotiable wiring (do not relitigate):

- Orchestration in src/shell/renderer/pages/detail/detail.page.tsx — NOT in
  detail_view.component.tsx (generic entry chrome only).
- Shortcut body state: keymap | chord(chordHash, restoreBindingId). Reset on
  entryId change. Primary on keymap → onChordDetailNavigate → chord mode.
  ← on chord → keymap + restore restoreBindingId selection.
- Keymap data: entry.bindings[] + cache.collisionsById + cache+entry join for
  KbdChip/ⓘ. Pass displayAdvisories from getConfig().display.advisories ?? false
  (see use_list_page_filters.hook.ts pattern).
- Chord detail data: useBindings().byHash.get(chordHash) — ALL apps, not
  filter(entryKey === entry.key). App tabs + globals (none) per design.
- Reuse: ShortcutKeymap, use_keymap_view, use_bindings_cache, BindingRow,
  KbdChip. Add: chord_detail.component.tsx, use_chord_detail.hook.ts (+ specs).

Before claiming Task 13 done: detail.page.tsx renders ShortcutKeymap for
type === 'shortcut' with cache + getConfig advisories.

Task 14: body-swap only; specs for back navigation, globals empty, multi-app tabs.

After edits: co-located specs, bun test on touched files, gate when task boundary
says commit. Follow assets/guides/TESTING_GUIDE.md and FCIS import rules.
```

## When in doubt

The order of precedence for resolving conflicts in this codebase is:

1. `assets/guides/*.md` — the canonical guides.
2. `CLAUDE.md` — project conventions in this repo.
3. The spec files in this directory.
4. The user's directives in a paired conversation.

If something contradicts, surface it. Do not paper over.
