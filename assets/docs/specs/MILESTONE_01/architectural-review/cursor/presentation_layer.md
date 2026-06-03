<!-- markdownlint-disable-file -->
# Presentation layer review — kb v0.10.0 (Cursor)

**Date:** 2026-06-02 · **Prompt:** [`../requirements/presentation.md`](../../../MILESTONE_01/architectural-review/requirements/presentation.md)
**Scope:** `src/shell/renderer/` — components, pages, hooks, utils, actions, styles.
**Parent architecture review:** [`report.md`](../../../MILESTONE_01/architectural-review/cursor/report.md)
**Literature synthesis:** [`../requirements/presentation-layer-literature-review.md`](../../../MILESTONE_01/architectural-review/requirements/presentation-layer-literature-review.md)

Other reviews: [`../claude/presentation_layer.md`](../../../MILESTONE_01/architectural-review/claude/presentation_layer.md), [`../gemini/presentation_report.md`](../../../MILESTONE_01/architectural-review/gemini/presentation_report.md).

---

## 1. Executive summary

The renderer is **well-behaved architecturally** and **tired organizationally**. FCIS holds: one RPC client, no `shell/app` imports, TypeBox on the wire, tests beside every file. The app **feels** fast and keyboard-native because the **logic is sound**.

What triggers “this isn’t quite there” — especially with a **Rails background** — is not missing patterns; it is **where files live**:

```text
Same feature "list" today:
  pages/list/           ← 25 LOC wrapper
  hooks/list/           ← 27 hook files
  components/list/      ← 12 components
  utils/list/           ← utilities
  styles/components/    ← list.css, list_row.css, footer.css, …
```

CSS already chose **feature/surface colocation** (`list.css`, `shortcuts.css`, `sync.css`). TypeScript still chose **kind-first** (`hooks/`, `components/`, `pages/`). That mismatch is the main presentation-layer story for v0.10.0.

**Second story:** **hook-as-private-method** — 17 of 27 `hooks/list/*` files have a single caller. They exist for lint relief and `renderHook` tests, not reuse. Rails would keep that logic as private methods on one object; React spreads it across files.

**Not broken:** Eden Treaty boundary, `cmp-*` / `.semantic-*` styling, memoized list rows, suffix vocabulary, shortcuts feature cohesion inside `components/shortcuts/`.

**Recommendation:** Hybrid **horizontal primitives + vertical screen slices** — not a Big Bang move to Bulletproof React. Align TS with CSS surfaces when touch count justifies it (list first). See literature review §9.

---

## 2. Key strengths to preserve

### 2.1 Layer purity (renderer as view)

```text
renderer/  ──Eden Treaty──►  main RPC  ──►  App  ──►  core + DB
```

No repository imports, no `bun:sqlite` in components. For a desktop app, this is **clean MVC** with hooks instead of controllers.

### 2.2 Suffix vocabulary + ls-lint

`*.component.tsx`, `*.hook.ts`, `*.page.tsx`, `*.util.ts` — filename tells artifact type. **Preserve absolutely.** Folder leaks (below) are fixable without touching suffix rules.

### 2.3 Styles already feature-oriented

[`STYLING_GUIDE.md`](../../../../guides/STYLING_GUIDE.md): tokens in `theme.css`, surfaces in `styles/components/*.css`. JSX uses `cmp-*`, not utility soup. **This half of the presentation layer is “there.”**

### 2.4 Screen hook pattern exists

[`use_list_page_shell.hook.ts`](../../../../../src/shell/renderer/hooks/list/use_list_page_shell.hook.ts) is the right **composition root** (TkDodo / literature “screen hook”). [`list.page.tsx`](../../../../../src/shell/renderer/pages/list/list.page.tsx) stays thin:

```tsx
export function ListPage() {
  const p = useListPageShell({ showSettings, onOpenSettings: () => setShowSettings(true) })
  const { onListPageKeyDownCapture } = useListPageFocusRing({ /* ... */ })
  return (
    <div className="cmp-list-page" onKeyDownCapture={onListPageKeyDownCapture}>
      <ListMain p={p} showSettings={showSettings} setShowSettings={setShowSettings} />
    </div>
  )
}
```

The **pattern** is correct; the **file count** around it is high.

### 2.5 Feature cohesion inside kind folders

`components/shortcuts/` (13 files) and `hooks/shortcuts/` (13 files) are internally coherent. The pain is **crossing** `components/` ↔ `hooks/` ↔ `utils/` for one workflow.

### 2.6 Test discipline

Co-located specs, role/`cmp-*` assertions in tests (not generated Tailwind classes). Matches Rails “spec the behavior at the boundary you own.”

---

## 3. Architectural concerns, risks, and code smells

### P1. Kind-first TS vs feature-first CSS

```text
styles/components/
├── list.css, list_row.css, footer.css      ← "list" surface
├── shortcuts.css
├── sync.css
└── task_sheet.css

hooks/list/          ← 27 files
components/list/     ← 12 files
utils/list/          ← ~13 files
```

**Risk:** Every list feature change hops 4–5 directories. **Change-amplification** for onboarding, not runtime bugs.

**Rails parallel:** Like putting `UserMailer`, `UsersController`, `user.rb`, and `users.scss` in four top-level trees instead of `app/users/`.

### P1. Single-caller hook proliferation (17 / 27)

| Pattern    | Example hooks                                   | Caller             |
| ---------- | ----------------------------------------------- | ------------------ |
| Shell-only | `use_list_surface_keydown`, `use_task_keyboard` | `useListPageShell` |
| Main-only  | `use_virtual_list_window`, `use_window_drag`    | `ListMain`         |
| Page-only  | `use_list_page_focus_ring`                      | `ListPage`         |

**Smell:** Extraction for **Biome line limits** and **isolated `renderHook` tests**, not second-caller reuse (Abramov / React docs bar).

**Evidence:** Only production `biome-ignore` for excessive function length in renderer sit on **`useListPageShell`** and **`ListMain`** — pressure pooled back into orchestrators.

### P1. Inconsistent “page” role

| Page                | LOC  | Role                             |
| ------------------- | ---- | -------------------------------- |
| `list.page.tsx`     | ~25  | Wrapper: shell hook + `ListMain` |
| `settings.page.tsx` | ~195 | Real orchestrator + markup       |
| `detail.page.tsx`   | ~76  | Partial composer                 |

**Risk:** No convention for “where does this screen’s logic live?” — bad for contributors and for AI agents routing work.

### P1. `ListMain` prop bag (`p`)

[`list_main.component.tsx`](../../../../../src/shell/renderer/components/list/list_main.component.tsx) spreads a large shell return through children — 80+ lines of `p.*` forwarding. **Container/presenter split is right; the API between them is fat.**

Literature alternative: compound `ListShell` + context ([`presentation-layer-literature-review.md`](../../../MILESTONE_01/architectural-review/requirements/presentation-layer-literature-review.md) §7).

### P2. `components/shared/` mixes primitives and features

```text
shared/
├── brand_icon_or_glyph, md_view, preview_image   ← primitives
├── sync_modal*, sync_toast, action_toast_host    ← sync FEATURE (8 files)
└── overlay_shell_layout.const.ts                 ← layout primitive
```

**Smell:** “Where is sync UI?” → grep `shared/`, not `features/sync/`.

### P2. Non-pages under `pages/`

- `pages/detail/detail_shortcut_body.component.tsx` → belongs in `components/detail/`
- `pages/settings/settings.types.ts` → acceptable but weakens `pages/` = routes only

### P2. Performance footgun (empty object literal)

```tsx
tagCounts={p.data.stats?.tags ?? {}}
```

New `{}` each render breaks `EntryRow` memo when stats undefined. Fix: module-scope `EMPTY_TAG_COUNTS` (Gemini review; still worth fixing — small, real).

### P3. `renderer/actions/` naming

Entry-action panel utilities — reads like HTTP actions. Rename to `entry_actions/` or nest under a future `features/entry_actions/` for discoverability.

### P3. Hook-shaped utils in `hooks/list/`

`list_sync_message_handlers.util.ts` etc. — not hooks; weaken “everything in `hooks/` starts with `use_`” signal.

---

## 4. Opportunities for simplification

1. **Document hook policy** in testing guide: extract on **second caller** or **bounded test surface worth isolation** — not “file got long.”
2. **Inline Tier-A single-caller hooks** into `useListPageShell` / `ListMain` (already has `biome-ignore` budget).
3. **Move sync cluster** out of `shared/` → `components/sync/` + `hooks/sync/` (or `features/sync/`).
4. **Fix `EMPTY_TAG_COUNTS`** — one line, measurable list perf when loading.
5. **Relocate misplaced page files** (detail shortcut body).
6. **Stop extracting** until `jscpd` shows real duplication (repo skill policy).

**Skip for now (literature + kb scale):**

- Global state library
- TanStack Query on Eden Treaty
- Atomic design layers
- Tailwind-in-TSX migration
- Storybook before `primitives/` exists

---

## 5. Opportunities for consolidation

| Area          | Consolidation                                                                |
| ------------- | ---------------------------------------------------------------------------- |
| List screen   | One orchestrator file OR two axes: `useListDataShell` + `useListInputShell`  |
| Sync UI       | Single `sync/` feature folder (TS mirrors `sync.css`)                        |
| Primitives    | `components/primitives/` from true shared atoms (kbd, brand icon, md view)   |
| Constants     | Renderer `constants/` maps icons/labels — keep; avoid duplicating core enums |
| Entry actions | `entry_actions/` module name                                                 |

**Target shape (discussion, not mandate):**

```text
renderer/
├── components/primitives/
├── features/
│   ├── list/
│   │   ├── hooks/
│   │   ├── components/
│   │   └── utils/
│   ├── shortcuts/
│   └── sync/
├── pages/              ← thin route entry only
├── hooks/shared/       ← use_debounced_value, use_action_toast
└── styles/             ← unchanged
```

Suffix rules (`*.hook.ts`) still apply inside `features/list/hooks/`.

---

## 6. Recommendations by priority and ROI

### Tier A — High impact, low effort

| #   | Item                                                         | Effort | Impact                       |
| --- | ------------------------------------------------------------ | ------ | ---------------------------- |
| PA1 | Move misplaced `.util.ts` from `hooks/list/` → `utils/list/` | XS     | Restores convention          |
| PA2 | Move `detail_shortcut_body` → `components/detail/`           | XS     | `pages/` clarity             |
| PA3 | Inline 3 `use_list_surface_*` into shell hook                | S      | −3 files to open per key fix |
| PA4 | Inline `use_list_page_focus_ring` into `ListPage`            | XS     | One less hop                 |
| PA5 | `EMPTY_TAG_COUNTS` constant                                  | XS     | List scroll perf             |
| PA6 | Document single-caller hook rule                             | XS     | Prevents recurrence          |
| PA7 | Split `shared/` → `primitives/` + `sync/`                    | M      | High discoverability         |

### Tier B — Structural (v0.11)

| #   | Item                                                    | Effort | Impact                    |
| --- | ------------------------------------------------------- | ------ | ------------------------- |
| PB1 | `ListPage` owns composition; `ListMain` layout-only     | M      | Clear container/presenter |
| PB2 | Rename `use_list_page_*` cluster (orchestrator vs data) | S      | Navigation                |
| PB3 | Pilot `features/list/` vertical slice                   | M      | Align TS with CSS         |
| PB4 | Evaluate compound `ListShell` if prop fan-out returns   | M      | API ergonomics            |

### Tier C — Strategic

| #   | Item                                                                          |
| --- | ----------------------------------------------------------------------------- |
| PC1 | Full feature-folder pivot when feature count ~8+ or onboarding pain spikes    |
| PC2 | ast-grep warning: `hooks/**/*.hook.ts` with exactly one importer outside spec |
| PC3 | Storybook for primitives after PB1                                            |

---

## 7. Refactoring roadmap

```text
v0.10.0     Ship UI as-is (functional, tested, FCIS-clean)

v0.10.x     Tier A — hygiene without architecture drama
              · misplaced files · EMPTY_TAG_COUNTS · hook policy doc
              · optional small inlines · shared/ → primitives + sync

v0.11       Tier B — one screen end-to-end (list OR sync)
              · page vs main responsibility
              · optional features/list/ pilot

v0.12+      Tier C — full feature folders if feature velocity demands it
```

**Parallel track (architecture):** Tier A enum consolidation in [`report.md`](../../../MILESTONE_01/architectural-review/cursor/report.md) reduces renderer/type churn when entry types change — presentation and architecture seams interact there.

---

## Rails lens on the presentation layer

| Rails feeling                         | What you see in kb               | Pragmatic response                       |
| ------------------------------------- | -------------------------------- | ---------------------------------------- |
| “I want `app/views/users`”            | `components/list` + `hooks/list` | Pilot `features/list/`                   |
| “Too many concerns in one controller” | `useListPageShell` 211 LOC       | Split into 2 shells OR inline satellites |
| “Helper per line is silly”            | 17 single-caller hooks           | Inline; keep tests on orchestrator       |
| “Styles live with views”              | Already true in CSS              | Mirror in TS                             |
| “Don’t touch fat models”              | Don’t put domain in renderer     | Already correct                          |

You are **not** wrong to want stronger conventions. kb already has **machine conventions** (ls-lint); what’s missing is **feature-scoped convention** for the renderer tree.

---

## Assumptions challenged

| Concern                        | Verdict                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------- |
| “Presentation layer is a mess” | **Overstated** — organized by 2018 React norms, not broken                            |
| “We need Redux”                | **No** — fragmentation ≠ state management gap                                         |
| “Pages should orchestrate”     | **Partially valid** — list page is unusually thin; settings proves pages can own more |
| “Compound components now”      | **Optional** — fix prop bag first or accept ceremony                                  |
| Core logic in renderer         | **Mostly no** — utils are display/filter transforms; domain stays core                |

---

## Cross-links

- Enum / `ListStats` duplication affects renderer props — fix on architecture track ([`report.md`](../../../MILESTONE_01/architectural-review/cursor/report.md) A1–A3).
- Literature trees and snippets: [`presentation-layer-literature-review.md`](../../../MILESTONE_01/architectural-review/requirements/presentation-layer-literature-review.md).
- Detailed file-level tables: [`../claude/presentation_layer.md`](../../../MILESTONE_01/architectural-review/claude/presentation_layer.md) §3.

---

*The app you shipped is good. The folder layout is one release behind the product. That is a normal v0.10 feeling — and a solvable one without throwing away FCIS.*
