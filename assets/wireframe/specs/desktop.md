<!-- markdownlint-disable-file -->
# Wireframe Proposal C — "Arkn Desktop"

**Theme:** Dark-first, adaptive. Direct desktop port of the Raycast arkn extension.
**Reference:** `/Users/roalcantara/Work/raycast/arkn` — inspected source, matched feature by feature.
**App icon:** `/Users/roalcantara/Work/bun/kodexb/.assets/icons/kodexb-logo.icns`
**Rationale:** The Raycast version already has a refined UX — keyboard-first, search-centred,
smart task views, rich badge accessories, context-sensitive action bar. This proposal ports
that UX verbatim into a desktop window with **no size constraint**, adding only what the
larger canvas enables: simultaneous list + detail view, resizable panels, a persistent
metadata sidebar, and a task form as a native sheet — not a separate Raycast push-navigation.

---

## Layout Overview

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [kb]  Search your knowledge base...                    [kb All (3846) ▼]  [⚙]  [⟳]  │  ← TopBar
├──────────────────────────────────┬─────────────────────────────────────────────────  ┤
│                                  │                                                    │
│        LIST PANEL (~420px)       │               DETAIL PANEL (flex)                 │
│                                  │                                                    │
├──────────────────────────────────┼─────────────────────────────────┬─────────────────┤
│  3846 Knowledges found           │                                 │                 │
│  Showing 50 entries (page 1/77)  │     CONTENT (markdown)         │   METADATA      │
│  ─────────────────────────────   │                                 │   SIDEBAR       │
│                                  │                                 │   (~240px)      │
│  [yt]  Gemini | Excelling at…    │  Gemini | Excelling at         │                 │
│        competitive programming   │  competitive programming        │  Type           │
│        [#ai]               [▶yt] │                                 │  [yt] Bookmark  │
│                                  │  [YouTube embed / OG image]     │                 │
│  [12f] https://12factor.net      │                                 │  Tags           │
│        Methodology for building… │  ─────────────────────────────  │  [#ai]          │
│        [#devop] [#arch]    [◇12] │                                 │                 │
│                                  │  ## Description                 │  Title          │
│  [▶]   https://refactoring.guru  │  Gemini 2.0 — Google's most    │  Gemini | Ex… ↗ │
│        Refactoring & Design…     │  capable model yet. Excels at   │                 │
│        [#patterns]         [◇rf] │  competitive programming…       │  Url            │
│                                  │                                 │  youtu.be/… ↗   │
│  [E]   https://experiments.wi…   │  ─────────────────────────────  │                 │
│        Chrome Experiments        │                                 │  Source         │
│        [#google] [#chrome] [◇E]  │  ## Notes                       │  [🔧] bookmarks │
│                                  │                                 │                 │
│  [ms]  https://mise.jdx.dev      │  ```sh                          │  Links          │
│        Like asdf but for any…    │  # install                      │  ─────────────  │
│        [#devop] [#pkgmgr]  [◇ms] │  bun install                   │  ↗ Homepage     │
│                                  │  ```                            │  ↗ GitHub       │
│  [aq]  https://aquaproj.github…  │                                 │                 │
│        Aqua is a tool for…       │                                 │                 │
│        [#devop] [#pkgmgr]  [◇aq] │                                 │                 │
│                                  │                                 │                 │
│  ─── Load more (27 remaining) ── │                                 │                 │
├──────────────────────────────────┴─────────────────────────────────┴─────────────────┤
│ [kb]  Gemini | Excelling at competitive programming  [⎘]  │  Toggle Details ↵  │ Actions ⌘K │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Filter Dropdown (top-right)

Exactly the arkn dropdown, no size limit:

```
┌─────────────────────────────────────────┐
│  🔍 Search filters...                   │
│  ─────────────────────────────────────  │
│  [kb]  All                     (3846)   │
│                                         │
│  Task Views                             │
│  →  🎯  Actionable                 (1)  │
│  →  📅  Today                      (0)  │
│  →  🔴  Overdue                    (0)  │
│  →  📆  This Week                  (0)  │
│  →  ⏸   All Pending               (12)  │
│  →  ▶   All Doing                   (3) │
│                                         │
│  Types                                  │
│  →  ⊕   Bookmark              (1057)   │
│  →  ■   Command                   (8)  │
│  →  ~   Cheat                     (5)  │
│  →  ✓   Task                     (15)  │
│                                         │
│  Tags                                   │
│  →  #   ai                      (306)  │
│  →  #   bun                      (42)  │
│  →  #   devop                    (38)  │
│  →  #   architecture             (21)  │
│  →  #   typescript               (18)  │
│       ··· (scroll for more) ···        │
└─────────────────────────────────────────┘
```

---

## List Row Anatomy

Three row variants — one per entry type density:

### Bookmark Row

```
┌────────────────────────────────────────────────────────────────────────┐
│  [favicon/OG] Title or URL            desc…      [#tag] [#tag]  [◇ic] │
└────────────────────────────────────────────────────────────────────────┘

 favicon = fetched asynchronously (500ms delay, 5s timeout, like arkn)
 [◇ic]  = brand icon badge if tag matches known brand (e.g. yt, gh, aws)
```

### Command Row

```
┌────────────────────────────────────────────────────────────────────────┐
│  [■ term] bun install                 runs bun pkg install    [#bun]  │
└────────────────────────────────────────────────────────────────────────┘
```

### Task Row (rich accessories)

```
┌────────────────────────────────────────────────────────────────────────┐
│  [✓/▶/⏸/✗] Review Bun PR             check open PRs  [#review] [🔴HIGH] [▶ doing] [📅 Apr 28] │
└────────────────────────────────────────────────────────────────────────┘

 [🔴] = OVERDUE badge (red)
 [⛓] = BLOCKED badge (orange, if waiting on dependency)
 [🎯] = ACTIONABLE badge (green, if all deps done)
 Priority chip: LOW (gray) / MID (blue) / HIGH (orange) / URGENT (red)
 Status chip:   ⏸ pending / ▶ doing / ✅ done / ✗ cancelled
```

### Done/Cancelled Task Row (faded)

```
┌────────────────────────────────────────────────────────────────────────┐
│  [✅] ~~Setup bun project~~           opacity: 0.45, strikethrough    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Detail Panel — Per Type

### Bookmark Detail

```
┌─────────────────────────────────────────────────┬─────────────────────┐
│  CONTENT                                        │  METADATA           │
│                                                 │  ─────────────────  │
│  # Gemini | Excelling at competitive            │  Type               │
│    programming                                  │  [yt] Bookmark      │
│                                                 │                     │
│  ┌───────────────────────────────────────────┐  │  Tags               │
│  │  [OG IMAGE / YouTube embed thumbnail]     │  │  [#ai]              │
│  │  loaded async, 500ms delay                │  │                     │
│  └───────────────────────────────────────────┘  │  Title              │
│                                                 │  Gemini | Ex…    ↗  │
│  Gemini's latest model — achieves gold medal    │                     │
│  performance on competitive programming…        │  Url                │
│                                                 │  youtu.be/LvGm…  ↗  │
│  ## Notes                                       │                     │
│                                                 │  Source             │
│  ```sh                                          │  [🔧] bookmarks.yml │
│  # related                                      │                     │
│  gemini api --model=gemini-2.0-flash            │  Links              │
│  ```                                            │  ─────────────────  │
│                                                 │  ↗ Homepage         │
│                                                 │  ↗ Docs             │
└─────────────────────────────────────────────────┴─────────────────────┘
```

### Task Detail (with dependency graph)

```
┌─────────────────────────────────────────────────┬─────────────────────┐
│  CONTENT                                        │  METADATA           │
│                                                 │  ─────────────────  │
│  # Review Bun PR                                │  Type               │
│                                                 │  [✓] Task           │
│  Check open pull requests for the bun repo      │                     │
│  before the Monday standup.                     │  Tags               │
│                                                 │  [#review] [#bun]   │
│  ## Notes                                       │                     │
│                                                 │  Status             │
│  > Check: oven-sh/bun/pulls                     │  ▶ doing            │
│  > Notify team if anything critical             │                     │
│                                                 │  Priority           │
│                                                 │  🔴 high            │
│                                                 │                     │
│                                                 │  Due Date           │
│                                                 │  Apr 28, 2026       │
│                                                 │                     │
│                                                 │  State              │
│                                                 │  🎯 Actionable      │
│                                                 │                     │
│                                                 │  Depends on         │
│                                                 │  ─────────────────  │
│                                                 │  ✅ Setup project   │
│                                                 │                     │
│                                                 │  Blocking           │
│                                                 │  ─────────────────  │
│                                                 │  ⏸ Write changelog  │
│                                                 │                     │
│                                                 │  Source             │
│                                                 │  [🔧] tasks.yml     │
└─────────────────────────────────────────────────┴─────────────────────┘
```

### Detail Hidden (Toggle Details off)

```
┌───────────────────────────────────────────────────────────────────────┐
│  LIST (wider, ~600px)              │  (detail hidden)                 │
│                                   │                                   │
│  More columns visible per row;    │  ← drag handle to show detail    │
│  subtitle truncates less          │                                   │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Task Form (native sheet modal)

Opens on "Edit Task" action (replaces Raycast push-navigation):

```
┌────────────────────────────────────────────────────────────────────────┐
│  Edit Task                                                    [Cancel] │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Title *                                                               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Review Bun PR                                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Description                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Check open pull requests for the bun repo...                    │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Priority              Status                 Due Date                │
│  [🔴 high      ▼]     [▶ doing       ▼]     [2026-04-28]            │
│                                                                        │
│  Tags * (comma-separated)                                              │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  review, bun                                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Notes (markdown)                                                      │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  > Check: oven-sh/bun/pulls                                      │  │
│  │  > Notify team if anything critical                              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Depends on                                                            │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  ☑ Setup project   ○ Write docs   ○ Deploy to prod               │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  Max dependency depth: 3. Circular deps detected automatically.        │
│                                                                        │
├────────────────────────────────────────────────────────────────────────┤
│                               [Save  ⌘↵]                              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Bottom Action Bar (context-sensitive, always visible)

Exactly mirrors Raycast's bottom bar — content changes per selected entry:

```
Bookmark selected:
│ [kb]  github/bun  [⎘]  │  Open in Browser ⌘↵  │  Toggle Details ↵  │  Actions ⌘K  │

Command selected:
│ [kb]  bun install  [⎘]  │  Paste in Terminal ⌘↵  │  Run ⌘⌥↵  │  Toggle Details ↵  │  Actions ⌘K  │

Task selected:
│ [kb]  Review PR  [⎘]  │  Edit ⌘⇧↵  │  Cycle Status ⌘⌥↵  │  Toggle Details ↵  │  Actions ⌘K  │

Empty / no selection:
│ [kb]  ─  │  Sync ⌘R  │  Settings ⌘,  │
```

---

## Actions Panel (⌘K)

Opens as a floating palette (like Raycast's Action Panel) — keyboard navigable:

```
┌──────────────────────────────────────────────────┐
│  Actions                                    [Esc] │
│  ─────────────────────────────────────────────── │
│  ↗  Open in Browser              ⌘↵              │
│                                                   │
│  Copy                                             │
│  ⎘  Copy Title                   ⌘C              │
│  ⎘  Copy Description             ⌘⌥C             │
│  ⎘  Copy Notes →                 (submenu)        │
│  ⎘  Copy Tags                    ⌘⇧C             │
│                                                   │
│  Links                                            │
│  ↗  Open Homepage                                 │
│  ↗  Open GitHub                                   │
│                                                   │
│  AI                                               │
│  ✦  Suggest Tags                 ⌘⇧T             │
│                                                   │
│  Manage                                           │
│  ✎  Open Source in Editor        ⌘O              │
│  ⟳  Refresh                      ⌘R              │
└──────────────────────────────────────────────────┘

Task-specific additions:
│  ▶  Cycle Status                 ⌘⌥↵             │
│  ↑  Cycle Priority Forward       ⌘⇧[             │
│  ↓  Cycle Priority Backward      ⌘⇧]             │
│  ↑  Move Up                      ⌘⇧↑             │
│  ↓  Move Down                    ⌘⇧↓             │
│  +  Create Dependent Task        ⌘⌥N             │
│  ✗  Delete Task                  ⌘⌥⌫             │
```

---

## Smart Task Views (Actionable / Today / Overdue / This Week)

The four task-view filters from arkn, unchanged:

| **View**       | **Query**                                                    |
| -------------- | ------------------------------------------------------------ |
| Actionable     | status=pending OR doing; no unfinished deps; not cancelled   |
| Today          | task_due = today; not done/cancelled                         |
| Overdue        | task_due < today; not done/cancelled                         |
| This Week      | task_due within next 7 days; not done/cancelled              |
| All Pending    | status = pending                                             |
| All Doing      | status = doing                                               |

---

## Component Map

```
App (renderer/app.tsx)
├── TitleBar (native Electrobun)
└── AppLayout (CSS grid, 3 rows: topbar / main / actionbar)
    ├── TopBar (renderer/components/layout/top_bar.component.tsx)
    │   ├── AppIcon                      ← kodexb-logo icon (PNG exported from .icns)
    │   ├── SearchInput                  ← debounce 300ms; calls rpc.list({ query })
    │   ├── FilterDropdown               ← dropdown: All / Task Views / Types / Tags
    │   │   ├── FilterSearch             ← search within the dropdown list
    │   │   ├── AllOption
    │   │   ├── TaskViewsSection × 6     ← Actionable, Today, Overdue, This Week, All Pending, All Doing
    │   │   ├── TypesSection × 4         ← Bookmark / Command / Cheat / Task (with counts)
    │   │   └── TagsSection (virtualised)← all tags with counts (scrollable)
    │   ├── SettingsButton               ← opens Settings sheet
    │   └── SyncButton                   ← calls rpc.sync(); pulse during sync
    ├── MainArea (CSS grid, columns: list / content / metadata)
    │   ├── ListPanel (renderer/components/list/list_panel.component.tsx)
    │   │   ├── ListHeader               ← "N Knowledges found · Showing M (page X/Y)"
    │   │   ├── EntryList (virtualised)  ← @tanstack/react-virtual
    │   │   │   └── EntryRow × N        ← bookmark.row / command.row / cheat.row / task.row
    │   │   └── LoadMoreButton
    │   ├── ContentPanel (renderer/pages/detail.page.tsx)
    │   │   ├── EmptyState
    │   │   ├── OgImage / YoutubeEmbed   ← for bookmarks; async 500ms delay
    │   │   ├── DescriptionText
    │   │   └── MarkdownView             ← entry.doc; highlight.js syntax
    │   └── MetadataPanel (renderer/components/detail/metadata_panel.component.tsx)
    │       ├── TypeField
    │       ├── TagsField
    │       ├── TypeSpecificFields       ← Title+Url (bookmark) / Status+Priority+Due (task)
    │       ├── TaskStateField           ← Actionable/Blocked/Overdue badges
    │       ├── DependenciesField        ← clickable dep list (navigate to dep entry)
    │       ├── BlockingField            ← tasks this entry blocks
    │       ├── SourceField              ← calls rpc.openInEditor(path)
    │       └── LinksField               ← calls rpc.openExternal(url) per link
    ├── ActionBar (renderer/components/layout/action_bar.component.tsx)
    │   ├── AppIcon + EntryTitle + CopyButton
    │   ├── PrimaryAction                ← context-sensitive label + shortcut
    │   ├── ToggleDetailsButton          ← shows/hides MetadataPanel; persists to localStorage
    │   └── ActionsButton                ← opens ActionsPanel floating palette
    └── ActionsPanel (renderer/components/actions/actions_panel.component.tsx)
        ├── UniversalActions             ← copy title/desc/notes/tags, open source, refresh
        ├── TypeSpecificActions          ← open URL / paste terminal / cycle status+priority / task form
        └── AiActions                    ← suggest tags (calls rpc.suggestTags())

TaskFormSheet (renderer/components/task/task_form.component.tsx)
    ← native <dialog> modal sheet; opens from action; closes on save/cancel
    ├── Fields: title, desc, priority, status, due_date, tags, notes, dependencies
    └── Validation: required title+tags; max dep depth 3; circular dep detection
```

---

## Design Tokens

```css
:root {
  /* Backgrounds — dark by default, matching Raycast's #1c1c1e palette */
  --bg-topbar:         #1c1c1e;
  --bg-list:           #1c1c1e;
  --bg-list-hover:     #2c2c2e;
  --bg-list-selected:  #3a3a3c;
  --bg-content:        #242426;
  --bg-metadata:       #1c1c1e;
  --bg-actionbar:      #1c1c1e;
  --bg-dropdown:       #2c2c2e;
  --bg-modal:          #1c1c1e;
  --bg-code:           #2c2c2e;

  /* Text */
  --text-primary:      #f2f2f7;
  --text-secondary:    #98989f;
  --text-faded:        #48484a;   /* done/cancelled tasks */
  --text-link:         #0a84ff;

  /* Borders */
  --border:            #3a3a3c;
  --divider:           #2c2c2e;

  /* Accent */
  --accent:            #ff6b35;   /* kb orange — matches app icon */
  --accent-hover:      #ff8c5a;

  /* Type colors (matching arkn) */
  --type-bookmark:     #ff9f0a;   /* orange */
  --type-command:      #bf5af2;   /* magenta */
  --type-cheat:        #5e5ce6;   /* purple */
  --type-task:         #0a84ff;   /* blue */

  /* Task status */
  --status-pending:    #98989f;
  --status-doing:      #0a84ff;
  --status-done:       #30d158;
  --status-cancelled:  #ff453a;

  /* Task priority */
  --priority-low:      #98989f;
  --priority-mid:      #0a84ff;
  --priority-high:     #ff9f0a;
  --priority-urgent:   #ff453a;

  /* Task state badges */
  --badge-overdue:     #ff453a;
  --badge-blocked:     #ff9f0a;
  --badge-actionable:  #30d158;

  /* Tags */
  --tag-bg:            #2c2c2e;
  --tag-text:          #98989f;
  --tag-border:        #3a3a3c;

  /* Shadows */
  --shadow-dropdown:   0 8px 32px rgba(0,0,0,0.6);
  --shadow-modal:      0 16px 48px rgba(0,0,0,0.7);
}

@media (prefers-color-scheme: light) {
  :root {
    --bg-topbar:         #f2f2f7;
    --bg-list:           #ffffff;
    --bg-list-hover:     #f2f2f7;
    --bg-list-selected:  #e5e5ea;
    --bg-content:        #f9f9fb;
    --bg-metadata:       #f2f2f7;
    --bg-actionbar:      #f2f2f7;
    --bg-code:           #e5e5ea;
    --text-primary:      #1c1c1e;
    --text-secondary:    #6c6c70;
    --text-faded:        #aeaeb2;
    --border:            #d1d1d6;
  }
}
```

---

## Icon System (port from arkn)

```ts
// renderer/utils/get_icon.util.ts — port of src/core/utils/get_icon.util.ts

// Bookmark: fetch favicon async (500ms delay, 5s timeout, fallback to ⊕)
// Command:  BRAND_ICONS['terminal'] or ■ glyph
// Cheat:    BRAND_ICONS['cheat'] or ~ glyph
// Task:     status icon (⏸/▶/✅/✗)

// Brand icons: 1000+ svg/png mapped to tag names
// Port src/core/constants/icons.const.ts → renderer/constants/icons.const.ts
// Served as static assets in renderer/assets/icons/
```

---

## Keyboard Shortcuts (full arkn parity)

| **Action**                  | **macOS**     | **Linux**     |
| --------------------------- | ------------- | ------------- |
| Focus search                | `Cmd+F`       | `Ctrl+F`      |
| Open Actions palette        | `Cmd+K`       | `Ctrl+K`      |
| Primary action (contextual) | `Cmd+↵`       | `Ctrl+↵`      |
| Toggle detail panel         | `↵`           | `↵`           |
| Open in Browser (Bookmark)  | `Cmd+↵`       | `Ctrl+↵`      |
| Paste in Terminal (Command) | `Cmd+↵`       | `Ctrl+↵`      |
| Run in Terminal             | `Cmd+⌥+↵`    | `Ctrl+Alt+↵`  |
| Edit Task                   | `Cmd+⇧+↵`    | `Ctrl+⇧+↵`   |
| Cycle Task Status           | `Cmd+⌥+↵`    | `Ctrl+Alt+↵`  |
| Cycle Priority Forward      | `Cmd+⇧+[`    | `Ctrl+⇧+[`   |
| Cycle Priority Backward     | `Cmd+⇧+]`    | `Ctrl+⇧+]`   |
| Move Task Up                | `Cmd+⇧+↑`    | `Ctrl+⇧+↑`   |
| Move Task Down              | `Cmd+⇧+↓`    | `Ctrl+⇧+↓`   |
| Create Dependent Task       | `Cmd+⌥+N`    | `Ctrl+Alt+N`  |
| Delete Task                 | `Cmd+⌥+⌫`    | `Ctrl+Alt+Del`|
| Copy Title                  | `Cmd+C`       | `Ctrl+C`      |
| Copy Description            | `Cmd+⌥+C`    | `Ctrl+Alt+C`  |
| Copy Tags                   | `Cmd+⇧+C`    | `Ctrl+⇧+C`   |
| AI Suggest Tags             | `Cmd+⇧+T`    | `Ctrl+⇧+T`   |
| Open Source in Editor       | `Cmd+O`       | `Ctrl+O`      |
| Sync / Refresh              | `Cmd+R`       | `Ctrl+R`      |
| Settings                    | `Cmd+,`       | `Ctrl+,`      |
| Navigate list               | `↑` / `↓`    | `↑` / `↓`    |
| Close sheet / palette       | `Esc`         | `Esc`         |

---

## Electrobun-Specific Implementation Notes

| **Concern**               | **Approach**                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Titlebar                  | Native Electrobun titlebar; custom TopBar as first row of CSS grid (not in title area)  |
| External links            | `rpc.openExternal(url)` — arkn's `actions.helper.ts` → main process `shell.openExternal` |
| Paste in Terminal         | `rpc.pasteInTerminal(cmd)` → main uses Electrobun shell + configured terminal app        |
| Open in Editor            | `rpc.openInEditor(path)` → main opens file in configured editor app                     |
| Clipboard                 | `navigator.clipboard.writeText()` in renderer — no RPC needed (browser API)             |
| OG image fetch            | `rpc.fetchOgImage(url)` → main fetches (no CORS); renderer shows async                  |
| YouTube embed             | Detect `youtu.be/` or `youtube.com/watch?v=` → render `<iframe>` embed in content panel |
| File picker (Settings)    | `rpc.showOpenDialog()` → Electrobun `dialog.showOpenDialog()` in main                   |
| Actions palette           | `<dialog>` with `position: fixed`; keyboard-navigable with arrow keys + Enter           |
| Task form sheet           | `<dialog>` modal; `showModal()` on open, `close()` on save/cancel                       |
| AI tag suggestion         | `rpc.suggestTags(entryId)` → main calls LLM API (configurable model/key in settings)    |
| Brand icon assets         | Port `icons.const.ts` (1000+ entries); serve as `renderer/assets/icons/*.svg`           |
| Linux WebKitGTK           | No `backdrop-filter` on dropdown/modal; use solid bg + box-shadow instead               |
| Panel persistence         | `localStorage` for: detail visible, panel widths, selected filter, page size            |
| Preferences (port arkn)   | Settings panel: db path, terminal app path, editor app path, page size (25/50/100/200)  |

---

## New Capabilities vs Raycast (desktop-only)

| **Feature**               | **Raycast arkn**                    | **kb Desktop (Proposal C)**            |
| ------------------------- | ----------------------------------- | -------------------------------------- |
| Screen real estate        | ~480px wide (constrained)           | Full window, resizable panels          |
| List + detail             | Push navigation (list OR detail)    | Simultaneous (list AND detail)         |
| Detail panel              | Toggleable, replaces list           | Toggleable, stays beside list          |
| Metadata sidebar          | Right column in Detail              | Persistent right sidebar in content    |
| Task dependency graph     | Text list in metadata               | Same + click dep to navigate to entry  |
| OG image                  | Full width in Detail                | Constrained in content area (max 400px)|
| YouTube embed             | OG thumbnail only                   | Live `<iframe>` embed                  |
| Task form                 | Separate Raycast push view          | `<dialog>` sheet over current view     |
| Actions panel             | Raycast Action Panel                | Floating `<dialog>` palette (⌘K)       |
| Window state              | Not applicable                      | Persisted position + size              |
| Settings                  | Raycast extension preferences       | Settings sheet in-app                  |
| Multi-window              | Not applicable                      | Future: open entry in separate window  |

---

## Tradeoffs vs Proposals A & B

| **Aspect**            | **A (Discord)**     | **B (Slack)**            | **C (Arkn Desktop)** ← recommended  |
| --------------------- | ------------------- | ------------------------ | ------------------------------------ |
| Existing UX reuse     | New design          | New design               | Port of validated Raycast UX         |
| Filter navigation     | Sidebar sections    | Icon rail                | Single dropdown (familiar to users)  |
| Task management       | Basic               | Basic                    | Full (status, priority, deps, forms) |
| Brand icons           | Type glyphs only    | Type glyphs only         | 1000+ brand icons (port from arkn)   |
| Actions               | Limited             | Limited                  | Full action system + ⌘K palette      |
| Smart task views      | Not planned         | Not planned              | 6 smart views from arkn              |
| Learning curve        | New UX to learn     | New UX to learn          | Existing arkn users already know it  |
| Implementation effort | ~15h                | ~20h                     | ~25h (rich feature set)              |

---

## Window Sizing Strategy

Raycast's constraint is ~480px fixed width — the single biggest UX limitation of the
arkn extension. kb desktop defaults to **820px wide** (just wide enough to comfortably
show a full entry row) and is **freely resizable**. As the window grows, the layout
responds at two breakpoints.

### Breakpoints

| **Width**      | **Layout**                           | **What's visible**                                |
| -------------- | ------------------------------------ | ------------------------------------------------- |
| 820px (default)| Compact — list only                  | Full-width list, no detail. Closest to Raycast.   |
| 820–1049px     | Compact — list only                  | List widens; each row shows more of subtitle/tags |
| ≥ 1050px       | Comfortable — list + content         | List (~400px) + content panel (flex)              |
| ≥ 1300px       | Expanded — list + content + metadata | Adds persistent metadata sidebar (~240px)         |

Toggle Details (`↵`) **overrides the breakpoint**: pressing it at any width forces the
detail panel open (or closed), and the window **smoothly animates** to the comfortable
width (1200px) if it was narrower. Pressing it again returns to compact.

### Window snap shortcuts

| **Action**                         | **macOS**    | **Linux**    |
| ---------------------------------- | ------------ | ------------ |
| Toggle detail (animate to 1200px)  | `↵`          | `↵`          |
| Snap to compact (820px)            | `⌘⇧C`       | `Ctrl+⇧+C`  |
| Snap to expanded (1400px)          | `⌘⇧E`       | `Ctrl+⇧+E`  |

Panel widths (list / content / metadata) are freely draggable and persist to
`localStorage`. Window position + size persist to `userData/window-state.json`.

---

## Compact Layout — Full Wireframe (820px default, detail hidden)

This is the default first-launch experience: a slightly wider Raycast, with no panel
constraint. The entire window width serves the list. Entries show more of their
subtitle and fit more tag accessories without truncation.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ [kb]  Search your knowledge base...                    [kb All (3846) ▼]  [⚡] [⟳] │  ← TopBar (56px)
├────────────────────────────────────────────────────────────────────────────────────┤
│  3667 Knowledges found  ·  Showing 50 entries (page 1 of 74)                       │  ← ListHeader
│  ─────────────────────────────────────────────────────────────────────────────────  │
│                                                                                    │
│  ▐ [≡] Logaritmo é o inverso da exponenciação    O logaritmo é o inverso da…  [Σ] │  ← selected
│                                                                                    │
│    [≡] Cynefin Framework    Navigating complexity in decision-making. Simple…      │
│                                                         [#decision_making]         │
│                                                                                    │
│    [≡] In Coordinate System x-axis is horizontal…    A coordinate system is…      │
│                                                    [#coor..ystem]  [#geometry] [Σ] │
│                                                                                    │
│    [≡] Keyboard Shortcuts writing order and best practices                         │
│         Keyboard Shortcuts writing order and best practices           [⌨]  [⎘]    │
│                                                                                    │
│    [≡] plantuml/sequence-diagram    PlantUML Sequence Diagram              [YA ML] │
│                                                                                    │
│    [≡] firestore/queries/OR    Firestore Query OR                         [<>] [🔥] │
│                                                                                    │
│    [≡] firestore/queries/IN    Firestore Query OR                         [<>] [🔥] │
│                                                                                    │
│    [≡] Azure DevOps    Principais features                      [#azure_devop]     │
│                                                                                    │
│    [≡] Google Spreadsheet Charts Explained    Breakdown of each chart…    [⎘]     │
│                                                                                    │
│    [▶] Gemini | Excelling at competitive programming                               │
│         Gemini's latest model achieves gold medal perf…               [#ai]  [▶yt] │
│                                                                                    │
│    [⊕] https://12factor.net    Methodology for building modern, scalable…          │
│                                                              [#devop]  [#arch]     │
│                                                                                    │
│    [⊕] https://refactoring.guru    Refactoring & Design Patterns                  │
│                                                              [#patterns]  [◇]      │
│                                                                                    │
│    [■] bun install    Install all dependencies from bun.lockb           [#bun]     │
│                                                                                    │
│    [■] bun test    Run the test suite with Bun's built-in runner        [#bun]     │
│                                                                                    │
│    [⏸] Review Bun PR    Check open PRs for the bun repo before standup            │
│                             [#review] [#bun]  [🔴 HIGH]  [⏸ pending]  [📅 Apr 28] │
│                                                                                    │
│    [▶] ~~Setup bun project~~    (faded — done)                 [#bun]  [✅ done]   │
│                                                                                    │
│    ─────────────────── Load more (3617 remaining) ─────────────────────────────── │
│                                                                                    │
├────────────────────────────────────────────────────────────────────────────────────┤
│ [kb]  Logaritmo é o inverso da exponenciação  [⎘]  │  Toggle Details ↵  │ Actions ⌘K │
└────────────────────────────────────────────────────────────────────────────────────┘
                                                                      ← drag right edge →
```

### Row anatomy at 820px

```
  [icon 32px]  Title (bold, ~320px)    Subtitle (muted, ~240px)     [accessories, right-aligned]

  Accessories right-to-left priority:
    1. Brand icon badge  (e.g. [▶yt], [🔥firebase], [◇], [⌨], [Σ sigma])
    2. Tag chips         (e.g. [#azure_devop], [#decision_making])
    3. Task badges       (priority [🔴 HIGH], status [⏸ pending], due [📅 Apr 28])
    4. Overdue/Blocked/Actionable state badge (leftmost of task accessories)

  Truncation rules at 820px:
    - Title:    max ~42 chars, then "…"
    - Subtitle: max ~38 chars, then "…"  (much more than Raycast's ~20)
    - Tags:     show up to 2 chips; overflow hidden (no "+ N more" at this width)

  Truncation rules at 1050px (list column ~400px):
    - Title:    max ~36 chars (list narrower, detail open)
    - Subtitle: max ~28 chars
    - Tags:     show up to 1 chip (more space in detail panel)
```

### Selection highlight

```
  ▐ ← 3px left accent bar (--accent color: #ff6b35)
  Background: --bg-list-selected (#3a3a3c)
  Text:        --text-primary (#f2f2f7)
  Cursor:      keyboard ↑/↓ moves selection; mouse hover also highlights
```

### Hover state (unselected row)

```
    [≡] Cynefin Framework    Navigating complexity…   [#decision_making]
    ↑ background: --bg-list-hover (#2c2c2e), no accent bar
```

---

## Compact → Comfortable Transition (Toggle Details)

When the user presses `↵` from compact view (820px), the detail panel slides in:

```
Step 1: Window at 820px, list only
┌───────────────────────────────────────────────────────────────────────────────────┐
│ [kb]  Search…                                          [kb All (3846) ▼]  [⚡][⟳] │
├───────────────────────────────────────────────────────────────────────────────────┤
│  ▐ [≡] Logaritmo é o inverso…      O logaritmo é o inverso…                  [Σ] │
│    [≡] Cynefin Framework            Navigating complexity…    [#decision_making]  │
│    ...                                                                            │
├───────────────────────────────────────────────────────────────────────────────────┤
│ [kb]  Logaritmo…  [⎘]  │  Toggle Details ↵  │  Actions ⌘K                        │
└───────────────────────────────────────────────────────────────────────────────────┘

   User presses ↵
   ↓ window animates width: 820px → 1200px over 180ms (ease-out)
   ↓ detail panel fades in from right

Step 2: Window at 1200px, list + content + metadata
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [kb]  Search…                                                      [kb All (3846) ▼]  [⚡][⟳]        │
├──────────────────────────┬──────────────────────────────────────────────────┬────────────────────────┤
│  ▐ [≡] Logaritmo…   [Σ] │  # Logaritmo é o inverso da exponenciação       │  Type                  │
│    [≡] Cynefin Fra…      │                                                  │  [≡] Cheat             │
│    [≡] In Coordinat…[Σ] │  O logaritmo é o inverso da exponenciação.       │                        │
│    [≡] Keyboard Sh… [⌨] │  Se `b` elevado a `y` é igual a `x`...          │  Tags                  │
│    [≡] plantuml/s… [YML] │                                                  │  [#math]               │
│    [≡] firestore/OR [🔥] │  ## Notes                                        │                        │
│    [≡] firestore/IN [🔥] │  ```                                             │  Source                │
│    [≡] Azure DevOps      │  log_b(x) = y ↔ b^y = x                        │  [🔧] cheats.yml       │
│    ...                   │  ```                                             │                        │
│                          │                                                  │                        │
├──────────────────────────┴──────────────────────────────────────────────────┴────────────────────────┤
│ [kb]  Logaritmo…  [⎘]  │  Toggle Details ↵  │  Actions ⌘K                                           │
└──────────────────────────────────────────────────────────────────────────────────────────────────────┘

   User presses ↵ again → window animates back to 820px, detail slides out
```

### Animation spec

```css
/* Window resize is handled by Electrobun's win.setSize() with animation */
/* Panel slide-in is CSS only (no layout shift) */

.detail-panel {
  width: 0;
  overflow: hidden;
  transition: width 180ms ease-out, opacity 180ms ease-out;
  opacity: 0;
}

.detail-panel.visible {
  width: var(--detail-width, 380px);  /* or flex: 1 in expanded layout */
  opacity: 1;
}

/* Drag handle between list and detail */
.resize-handle {
  width: 4px;
  cursor: col-resize;
  background: var(--border);
  opacity: 0;
  transition: opacity 150ms;
}
.resize-handle:hover,
.resize-handle.dragging {
  opacity: 1;
  background: var(--accent);
}
```

---

## All Four Window States Side by Side

```
820px — Compact (default)
┌─────────────────────────────────────────┐
│ TopBar                                  │
├─────────────────────────────────────────┤
│                                         │
│   LIST  (full width)                    │
│   entry row ──────────── [tags] [icon]  │
│   entry row ──────────── [tags] [icon]  │
│   entry row ──────────── [tags]         │
│   entry row ──────────── [#tag] [icon]  │
│                                         │
├─────────────────────────────────────────┤
│ ActionBar                               │
└─────────────────────────────────────────┘

1050px — Comfortable (detail slides in)
┌──────────────────────────────────────────────────────┐
│ TopBar                                               │
├────────────────────┬─────────────────────────────────┤
│                    │                                 │
│   LIST (~400px)    │   CONTENT (flex)                │
│   entry ── [tags]  │   # Title                       │
│   entry ── [tags]  │                                 │
│   entry ── [icon]  │   Description…                  │
│   entry            │                                 │
│                    │   ## Notes                      │
│                    │   ```sh                         │
│                    │   code here                     │
│                    │   ```                           │
│                    │                                 │
├────────────────────┴─────────────────────────────────┤
│ ActionBar                                            │
└──────────────────────────────────────────────────────┘

1300px — Expanded (metadata sidebar appears)
┌──────────────────────────────────────────────────────────────────────────┐
│ TopBar                                                                   │
├────────────────────┬───────────────────────────────────┬─────────────────┤
│                    │                                   │                 │
│   LIST (~400px)    │   CONTENT (flex)                  │  METADATA(240px)│
│   entry ── [tags]  │   # Title                         │  Type: Cheat   │
│   entry ── [tags]  │                                   │  Tags: [#math] │
│   entry ── [icon]  │   Description…                    │  Source: cheats│
│   entry            │                                   │  Links: ──── │
│                    │   ## Notes                        │  ↗ ref 1      │
│                    │   ```sh                           │                │
│                    │   code here                       │                │
│                    │   ```                             │                │
├────────────────────┴───────────────────────────────────┴─────────────────┤
│ ActionBar                                                                │
└──────────────────────────────────────────────────────────────────────────┘

1400px+ — Expanded (all panels roomy)
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ TopBar                                                                               │
├────────────────────────┬──────────────────────────────────────┬──────────────────────┤
│                        │                                      │                      │
│   LIST (~420px)        │   CONTENT (flex)                     │   METADATA (~260px)  │
│   entry ─── [t] [t]   │   # Title                            │   Type               │
│   entry ─── [t] [ic]  │                                      │   [≡] Cheat          │
│   entry ─── [ic]      │   Description paragraph here. More   │                      │
│   entry ─── [t]       │   text fits because the content      │   Tags               │
│                        │   panel is now wider.                │   [#math]            │
│                        │                                      │                      │
│                        │   ## Notes                           │   Source             │
│                        │                                      │   [🔧] cheats.yml   │
│                        │   ```sh                              │                      │
│                        │   log_b(x) = y ↔ b^y = x           │   Links              │
│                        │   ```                                │   ─────────────────  │
│                        │                                      │   ↗ Wikipedia        │
├────────────────────────┴──────────────────────────────────────┴──────────────────────┤
│ ActionBar                                                                            │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
