<!-- markdownlint-disable-file -->
<!-- Shipped: catalog key @command_palette. Normative behaviour: Gherkin + unit specs. -->

# Command palette and filter UX — requirements

Normative behavior for keyboard-first **command palette** (⌘P) and **filter overlay** (⌘K). Visual reference (non-normative): [raycast.list_filter_opened.png](../../../wireframe/references/raycast.list_filter_opened.png).

## R1 — Shortcuts and mutual exclusion

- The system **shall** map **⌘P** (Ctrl+P on non-Mac) to **toggle** the command palette.
- The system **shall** map **⌘K** (Ctrl+K) to **toggle** the filter overlay.
- When the user opens the palette **while** the filter is open, the system **shall** **close** the filter first, then open the palette.
- When the user opens the filter **while** the palette is open, the system **shall** **close** the palette first, then open the filter.
- While **settings** or **task sheet** is open, **⌘P** and **⌘K** **shall** **not** open palette or filter (same suppression family as existing list nav; no new overlay).

## R2 — Command palette

- When the palette opens, the system **shall** save the **previously focused** `HTMLElement` and **shall** restore that focus after the palette closes via **Esc** or after running an action that closes the palette.
- While the palette is open, **ArrowUp** / **ArrowDown** **shall** keep **current** behavior: they move the **palette** action selection (including from the search input), **not** the main list selection.
- When **`selectedId` is null**, the palette **shall** list **global** actions only: **Sync**, **New Task**, **Quit app**, in that order, under **Library** then **App** section headers per [design.md](design.md).
- When **`selectedId` is non-null**, the palette **shall** build actions from the row **`rows.find(id === selectedId)`** in **entry-first** order and section grouping defined in [design.md](design.md) (This entry → Clipboard → Source → Library → App).
- **Clipboard** with a row selected **shall** expose exactly one **Copy** action; payload and toast rules **shall** match [design.md](design.md) (single `entry.key` vs `entry.doc` table; quoted preview toast; empty and failure cases). List **⌘C** / **Ctrl+C** (when not typing in an input or contenteditable) **shall** use the same payload and success toasts for the selected row.
- Each action **shall** expose a **`section`** discriminator for rendering; section headers **shall** be non-selectable and **shall not** receive keyboard highlight.
- **Enter** on a highlighted palette action **shall** run its handler and close the palette (existing pattern).

## R3 — Filter overlay (live apply)

- Filter changes **shall** apply **immediately** via existing `onChange` (live); **Esc** and **click-outside** **shall** only hide the overlay — **no rollback** of filter state.
- While the filter overlay is open, **ArrowUp** / **ArrowDown** **shall** move a **single highlight index** in a **flat** list of filter rows (Raycast-style ordering defined in `design.md`). They **shall not** change main list **`selectedId`**.
- On overlay **open**, the system **shall** record a **snapshot** of `{ types, tags, taskView }` with **tags sorted** for stable comparison.
- On **Enter** while the overlay is open: if **current** filter state **equals** the snapshot, the system **shall** show a **neutral** toast, close the overlay, and restore pre-open focus; **shall not** treat this as “filters applied.”
- On **Enter** while the overlay is open: if **current** filter state **differs** from the snapshot, the system **may** show an optional **success** toast, **shall** close the overlay, and **shall** restore pre-open focus.

## R4 — Full detail and filter

- From **`viewState === 'detail'`**, **⌘K** **shall** still open the filter overlay even when main search chrome is hidden.
- When the user closes the filter with **Enter** and the filter state **differs** from the open-time snapshot, and **`viewState === 'detail'`**, the system **shall additionally** leave full detail for **list view** (use the same primitive as “back to list”: e.g. `closeToList` / equivalent so list + search UI is visible).
- When the user closes the filter with **Enter** and state **equals** snapshot, or closes with **Esc** / **⌘K** toggle / **click-outside**, the system **shall not** force a layout change away from full detail solely because of filter close.

## R5 — Naming and discoverability

- All legacy **`cmdk_palette`** / **`CmdkPalette`** / **`app-cmdk-*`** identifiers **shall** be renamed per `design.md` migration table.
- Footer and toolbar shortcut hints **shall** show **⌘P** for palette and **⌘K** for filter after implementation.

## R6 — Keyboard delivery

- **⌘P** / **⌘K** handling **shall** use **`keydown` capture** on `window` (or a single coordinator) so behavior is consistent in the Electrobun webview and does not lose to bubbling/focus traps.
