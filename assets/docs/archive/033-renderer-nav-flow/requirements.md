<!-- markdownlint-disable-file -->
<!-- Shipped: catalog key @list_navigation. Normative behaviour: Gherkin + unit specs. -->
# Renderer — List / Split / Detail Keyboard Navigation — Requirements

## INTRODUCTION

Users navigate the list page with the keyboard: **ArrowRight** advances the view
(list → split → detail), **ArrowLeft** retreats. They may alternate keys at will
along that ladder (see RNF-2b). After the detail panel closes, **ArrowRight** must
still advance again.

A prior investigation is captured in
[`handoff.md`](handoff.md).
This folder is the **normative** contract for the fix.

**Traceability:**

- Technical contract: [`design.md`](design.md)
- Ordered work: [`tasks.md`](tasks.md)

---

## OUT OF SCOPE

- Changing the pure view state machine (`view_reducer.util.ts`) unless a defect
  is proven there (it is covered by unit tests today).
- Changing list data fetching, filters, or RPC.
- Adding Playwright or other browser E2E harnesses (optional future work).

---

## REQUIREMENT SYNTAX (EARS)

- **WHEN** _condition_, **THEN** the system **SHALL** _behaviour_.
- **IF** _condition_, **THEN** the system **SHALL** _behaviour_.

---

## GLOSSARY

- **List surface:** The focusable results container (`app-pt-results`) that hosts
  vertical arrow navigation.
- **Renderer-first fix:** ArrowLeft/ArrowRight handling lives on the focused
  React subtree (or a deliberate `tabIndex={-1}` shell), not on a `document`
  capture listener as the sole dependency.
- **Main shortcut fallback:** Electrobun main-process registration of global
  shortcuts, used only if renderer-first is proven insufficient, with strict
  focus guards.

---

## REQUIREMENT RNF-1: ArrowRight / ArrowLeft cycle after detail closes

### Acceptance criteria

1. WHEN the user is on the list page with at least one entry, THEN pressing
   ArrowRight, ArrowLeft (to close split), and ArrowRight again SHALL advance
   the view again (at least to split), in the real Electrobun webview build.
2. WHEN the user focuses the search field or another text input, THEN
   ArrowRight and ArrowLeft SHALL NOT trigger view navigation (same guard as
   today for `input` / `textarea` / `contenteditable`).

---

## REQUIREMENT RNF-2: Renderer-first implementation

### Acceptance criteria

1. WHEN the fix ships, THEN ArrowRight / ArrowLeft navigation SHALL be driven
   primarily from the same keyboard path as ArrowUp / ArrowDown on the list
   surface (or from an explicit focusable shell element documented in
   [`design.md`](design.md)), not from a `document`-level listener alone.
2. WHEN detail closes (`detailEntry` becomes null), THEN the list surface SHALL
   receive focus again before the next paint where the user is likely to press
   an arrow key (see focus-restore algorithm in [`design.md`](design.md)).

---

## REQUIREMENT RNF-2b: Arbitrary horizontal ladder

Users may move between **list**, **split**, and **full detail** in any order
allowed by the reducer, not only the “open then close once” path.

### Acceptance criteria

1. WHEN the list surface (or the documented focusable shell) is focused and at
   least one entry exists, THEN the following key sequence SHALL produce the
   listed `ViewState` after each step (see `view_reducer.util.ts`):
   **ArrowRight** → split, **ArrowLeft** → list, **ArrowRight** → split,
   **ArrowRight** → detail, **ArrowLeft** → split, **ArrowRight** → detail,
   **ArrowLeft** → split, **ArrowLeft** → list.
2. WHEN the user alternates ArrowRight and ArrowLeft at will within those
   rules, THEN each keypress SHALL apply at most one `ADVANCE` or `RETREAT`
   transition and SHALL NOT skip an intermediate state (for example, split
   SHALL not be skipped when moving from list to detail).

---

## REQUIREMENT RNF-3: Tests match production semantics

### Acceptance criteria

1. WHEN `bun test` runs for navigation hooks, THEN keyboard tests SHALL dispatch
   events in a way that matches production (target the list surface / React
   handlers), not only `document.dispatchEvent` if that diverges from the real
   webview path.
2. WHEN `bun test` runs for `use_view_navigation.hook.spec.tsx`, THEN the suite
   SHALL assert `ViewState` through at least one multi-step ladder including
   RNF-2b (split ↔ detail ↔ list), so split and full detail are not conflated
   with `detailEntry` alone.

---

## REQUIREMENT RNF-4: Optional main-process shortcut fallback

### Acceptance criteria

1. IF AND ONLY IF instrumentation (see [`tasks.md`](tasks.md)) shows Arrow keys
   still do not reach the renderer after the renderer-first fix, THEN the
   system MAY register **main-process** global shortcuts as a fallback.
2. IF main-process shortcuts are enabled, THEN they SHALL be disabled whenever
   an `HTMLInputElement`, `HTMLTextAreaElement`, or `contenteditable` element has
   focus in the focused webview (or an equivalent guard documented in
   [`design.md`](design.md)).
3. IF main-process shortcuts are enabled, THEN they SHALL be implemented using
   official Electrobun APIs read from the Electrobun skills / docs — no guessed
   IPC or OS APIs.
