<!-- markdownlint-disable-file -->

# Compact filter overlay — requirements (rebuild)

Normative acceptance for replacing the compact (⌘K) filter panel implementation while **preserving the same visual layout** (dark card, section headers, row grid, accent highlight, checkmarks). Global filter semantics (live `onChange`, snapshot + Enter, Esc) remain as in [command-palette-filter-ux/requirements.md](../command-palette-filter-ux/requirements.md) **R3** unless this document explicitly overrides.

## R1 — Single scrollport for options

- The compact filter panel **shall** use **exactly one** vertical scroll container for **Quick**, **Task views**, **Types**, and **Tags** (the **option list** grid row).
- The **search** field **shall** sit **outside** that scrollport (grid row above the list) so it **does not move** when the user scrolls options; it **shall not** use a second `overflow-y: auto` region.
- The system **shall not** use a sibling split (separate non-scrolling column + flex `1fr` scroll sibling) that previously collapsed to **~0px** height in CEF.

## R2 — Sticky facet band (inside scrollport)

- Inside the option scrollport, **Quick** and **Task views** **shall** live in one **sticky** wrapper at **`top: 0`** with opaque background and edge treatment so **Types** / **Tags** scroll underneath.
- While **scrollTop === 0**, the user **shall** see Quick and Task views at the top of the card below the search row; scrolling down **shall** keep that band pinned until scrolled away per native sticky behavior.

## R3 — Fixed footer (approved option B)

- The **Close** control **shall** sit in a **fixed footer** row pinned to the **bottom** of the card (outside the scrollport), always visible.
- Types/Tags (and section headers inside the scrollport) **shall** scroll **above** the footer; the last visible row **shall never** be obscured by the footer (padding / safe inset in scroll math).

## R4 — Keyboard highlight always visible

- After any change to **highlight index**, **filter row set** (search query, stats-driven row visibility), or **scrollport size** (`ResizeObserver` on the scroll root), the system **shall** run **before paint** (`useLayoutEffect` or equivalent) a routine that adjusts **`scrollTop`** so the **highlighted row** is fully inside the scrollport’s **padded** visible rect.
- The routine **shall** prefer correcting **bottom** clipping before **top** clipping when both could apply (keyboard moving **down** into Types/Tags from task rows).
- If the highlighted row is **taller than** the padded scrollport, the system **shall** align the **top** of the row to the padded top (documented exception).
- The routine **shall** apply a **last-mile nudge** loop for sub-pixel / CEF residual clipping until gaps are below a fixed epsilon or a hard iteration cap is reached.

## R5 — Search typing uninterrupted

- While the overlay is open, the user **shall** be able to **continue typing** in the search field without losing focus when using **ArrowUp** / **ArrowDown** to move highlight (highlight moves; focus **may** remain on the search input unless an explicit product rule moves roving focus to a row).
- **Tab** from search (if retained) **shall** behave per existing product spec; tests **shall** lock the chosen behavior.

## R6 — Visual distinction

- **Applied filter** state (checkmark / “on” styling) and **keyboard highlight** state **shall** remain visually distinct; highlight **shall** meet contrast requirements on dark chrome (accent rail + background tint).

## R7 — Portal geometry

- The portal shell **shall** set a **definite `height`** on the card (same numeric cap as `maxHeight` from `compactFilterPortalBox`) so inner `minmax(0, 1fr)` / scroll layout has a defined main-axis size.

## R8 — Testing

- Pure **scroll delta** helpers **shall** have unit tests (rect math, bottom-first ordering, asymmetric padding).
- Renderer tests **shall** assert: scroll root exists; **Close** is outside scroll root; first **Types** row is a descendant of scroll root; after simulated **ArrowDown** from last task row, **scrollTop** increases or the highlighted row’s `getBoundingClientRect()` lies inside the scroll root’s padded box (choose one strategy that is stable in **jsdom**; supplement with manual Electrobun check in DoD).
