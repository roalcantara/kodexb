# Visual References

## Canonical UI Reference: PowerToys Run

PowerToys Run is the definitive visual reference for app's list + detail layout.
It is Windows-only — no competitive or ethical conflict with app (macOS).

### Why PowerToys Run

- Keyboard-first, search-centred, information-dense — identical goals to app
- Two-panel layout (list left, detail right) already matches app's wireframe
- Left-border selected state, bottom action bar with keyboard shortcuts — exact pattern
- Clean dark surfaces, clear typography hierarchy, confident density

### Files in this directory

| Filename                             | Source        | Content                                                        |
| ------------------------------------ | ------------- | -------------------------------------------------------------- |
| `powertoys.list_detail_markdown.png` | PowerToys Run | List + detail two-panel view with markdown body                |
| `powertoys.list_detail_video.png`    | PowerToys Run | List + detail two-panel view with video entry                  |
| `powertoys.list_filtering.png`       | PowerToys Run | Filter/type selector panel open                                |
| `powertoys.search.png`               | PowerToys Run | Search / command palette floating overlay                      |
| `stitch.list_detail.png`             | Google Stitch | Palette-applied reference (Andromeda Void on PowerToys layout) |
| `raycast.list.png`                   | Raycast       | Supplementary: row-level detail, tag pill styling              |
| `raycast.list_filter.png`            | Raycast       | Supplementary: filter interaction                              |
| `raycast.list_filter_opened.png`     | Raycast       | Supplementary: filter panel open state                         |
| `gemini.00_colour_palette.png`       | Gemini        | Historical: palette exploration (Andromeda Void was chosen)    |
| `gemini.06_andromeda_void.png`       | Gemini        | Historical: winning palette proposal                           |

---

## How to use these references with Cursor

When implementing any screen, point Cursor at:

1. **`powertoys.list_detail_markdown.png`** — layout, spacing, selected state, bottom bar
2. **`/Users/roalcantara/Work/bun/app/DESIGN.md`** — exact palette tokens (Andromeda Void)
3. **`stitch.list_detail.png`** — palette applied to the PowerToys layout structure

**Instruction to include in every Cursor phase plan:**

> Match the layout and information hierarchy of `assets/wireframe/references/powertoys.list_detail_markdown.png`
> exactly. Apply the Andromeda Void palette from `DESIGN.md`. Entry titles use type accent colours:
> commands `#5ecfbe`, bookmarks `#3399ff`, tasks `#ffae57`, cheats `#a855f7`.

---

## Per-phase reference map

| Phase                  | Primary reference                    | Notes                                           |
| ---------------------- | ------------------------------------ | ----------------------------------------------- |
| Phase 5 — Detail view  | `powertoys.list_detail_markdown.png` | Right panel layout and typography               |
| Phase 7 — Task modal   | Stitch (generate fresh)              | PowerToys has no task creation modal equivalent |
| Phase 8 — ⌘K palette   | `powertoys.search.png`               | PowerToys search IS the ⌘K pattern              |
| Phase 9 — Sync UI      | `powertoys.list_detail_markdown.png` | Bottom bar area, status indicators              |
| Phase 10 — Stats panel | Stitch (generate fresh)              | No PowerToys equivalent                         |

---

## Supplementary references (row-level detail)

The Raycast screenshots remain useful for **row-level detail**: tag pill styling, favicon badge
treatment, accessory badge layout. They are superseded by PowerToys for overall layout and panel
structure.

The Gemini screenshots (`gemini.00_colour_palette.png` through `gemini.07_glitch_protocol.png`)
document the palette exploration phase. Andromeda Void (`gemini.06_andromeda_void.png`) was chosen.
These are historical artifacts — not actively referenced during implementation.
