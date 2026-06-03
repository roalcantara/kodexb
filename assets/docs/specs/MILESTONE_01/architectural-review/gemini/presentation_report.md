<!-- markdownlint-disable-file -->
# Presentation Layer Architectural Review & Sustainability Report (v0.10.0)

## 1. Executive Summary

This report provides a critical architectural evaluation of the presentation layer (React 19) in the Electrobun-based workspace. The frontend represents a high-fidelity, keyboard-driven utility interface implementing the "Andromeda Void" design language.

### Current Presentation Architecture

The UI follows a strict **Separation of View from Coordination** paradigm:

* **Views/Pages (`shell/renderer/pages/`)**: Pure components that act as visual entry points.
* **Component Presentation (`shell/renderer/components/`)**: Composes CSS grid/flex structures and Tailwind v4 themes, drawing from prop payloads.
* **Page Controller Hooks (`shell/renderer/hooks/`)**: Custodian hooks (like `useListPageShell` and `useListPageData`) that house state, RPC queries, keyboard listeners, and event handlers.
* **Visual Tokens (`shell/renderer/styles/`)**: Centralized Tailwind v4 variables inside `theme.css` dictating the Andromeda Void specification.

While the segregation of JSX representation from state logic is exceptionally clean and prevents "god components," the presentation layer suffers from **excessive abstraction and hook fragmentation**, leading to high cognitive load, indirection, and minor performance gotchas.

---

## 2. Key Strengths to Preserve

1. **Decoupled Renderers (JSX is Pure)**: React components are generally stateless templates. They take computed props from hooks and render DOM elements, making them highly predictable, visually readable, and easy to adjust.
2. **Tailwind v4 Theme Design System**: The centralized `@theme` inside [theme.css](file:///Users/roalcantara/Work/bun/kb/src/shell/renderer/styles/theme.css) cleanly maps the Andromeda Void specification into semantic variables (e.g. `--color-color-command`, `--color-glyph-task-tile`). The UI is strictly governed by CSS variables, preventing ad-hoc styling.
3. **Rigorous Component Memoization**: Core elements like [EntryRow](file:///Users/roalcantara/Work/bun/kb/src/shell/renderer/components/list/entry_row.component.tsx#L167) implement strict custom `memo` logic, asserting equality of keys, scores, and tag counts before triggering heavy DOM repaints.
4. **Co-located Specs**: Every hook and component is paired with a matching `.spec.tsx` file in the same directory, maintaining a high level of test coverage and preventing regressions.

---

## 3. Architectural Concerns & Code Smells

### 3.1 Extreme Hook Fragmentation (46 Files for 1 View)

The directory [src/shell/renderer/hooks/list/](file:///Users/roalcantara/Work/bun/kb/src/shell/renderer/hooks/list) contains **46 separate files**.

* **The Smell**: To manage a single list view page, the codebase breaks every minor behavior (wheel scroll, arrow keys, page data, focus ring, sentinel pagination, scroll restore) into its own custom hook and co-located spec file.
* **The Consequences**:
  1. **Indirection**: Tracing a keydown event requires looking across 5 files: `ListResultsBody` $\rightarrow$ `ListMain` $\rightarrow$ `useListPageShell` $\rightarrow$ `useListSurfaceKeyDown` $\rightarrow$ `useListSelection`.
  2. **Orchestration Boilerplate**: `useListPageShell` has to import 18 files and write extensive plumbing to pass states, setters, and refs between these tiny hooks.
  3. **High Onboarding Friction**: A new contributor must open 10-15 files to make a simple adjustment to how the list scrolls or selects items.

### 3.2 Gotcha React Performance Leak: Empty Object Literals

In [list_main.component.tsx](file:///Users/roalcantara/Work/bun/kb/src/shell/renderer/components/list/list_main.component.tsx#L250), tag counts are supplied to the `ListResultsBody` using a fallback:

```typescript
tagCounts={p.data.stats?.tags ?? {}}
```

* **The Smell**: Every time the parent component renders while `stats` is loading or undefined, a *new empty object literal* `{}` is created in memory.
* **The Consequences**: In JavaScript, `{}` !== `{}`. Even though [EntryRow](file:///Users/roalcantara/Work/bun/kb/src/shell/renderer/components/list/entry_row.component.tsx#L176) has custom `memo` checks that include `prev.tagCounts === next.tagCounts`, the reference change on `{}` forces **every single list row to break memoization and re-render**.
* **The Solution**: Declare a static empty object helper at the file scope and reuse it:

  ```typescript
  const EMPTY_TAG_COUNTS = {};
  // ...
  tagCounts={p.data.stats?.tags ?? EMPTY_TAG_COUNTS}
  ```

### 3.3 Lack of Core UI Primitives (Component Sprawl)

The codebase lacks generic atomic UI primitives (e.g. `<Button>`, `<Modal>`, `<Overlay>`).

* **The Smell**: Modal structures, progress bars, and backdrop overlays are re-implemented by copy-pasting visual styles and DOM structures (e.g. [sync_modal.component.tsx](file:///Users/roalcantara/Work/bun/kb/src/shell/renderer/components/shared/sync_modal.component.tsx) vs `CommandPalette`).
* **The Consequences**: If the visual design of modal dialogs or buttons changes in Andromeda Void, the changes must be manually propagated across multiple files, increasing visual inconsistency.

---

## 4. Co-location vs. Centralization

The current folder structure is strictly **Layer-Based** at the root (`components/`, `hooks/`, `pages/`, `utils/`), but **Feature-Based** at the sub-directory level (`components/list/`, `hooks/list/`, `pages/list/`).

### Tradeoff Analysis: Layer-Based vs. Feature-Based

* **Current Layer-Based Structure**:
  * *Pros*: Highly predictable. A developer looking for a hook knows exactly to go to `src/shell/renderer/hooks/`.
  * *Cons*: Promotes directory hopping. Modifying the list filter UI requires opening `src/shell/renderer/components/list/`, `src/shell/renderer/hooks/list/`, and `src/shell/renderer/styles/`.
* **Proposed Feature-Based Structure (Screaming Architecture)**:
  * We should transition toward grouping code by **domain feature** rather than technical layer. For instance, the "Sync" or "List" capability should group its view, sub-components, and state controllers together under:

    ```tree
    src/shell/renderer/features/list/
    ├── list.component.tsx          # Main entry component
    ├── list_hooks.ts               # Consolidated state hooks (controllers)
    ├── entry_row.component.tsx     # Private sub-component
    └── list.styles.css             # Component-specific overrides
    ```

  * *Pros*: High co-location. Everything about the list is contained in one directory. Easier deleting or refactoring of features.
  * *Cons*: Requires updating import aliases and path conventions.

---

## 5. Pragmatic Strategies to Avoid Sprawl

To optimize developer velocity while staying within the **FCIS + React** design boundaries, we should apply three organizational heuristics:

### Heuristic 1: Group Hooks by Architectural Concerns (Horizontal Consolidation)

Instead of dividing hooks by their *event triggers* (e.g. `useListSurfaceWheelScroll`, `useListSurfaceKeyDown`), we should group them by **Core Interaction Slices**. For the List View, we can consolidate the 46 hooks into 4 high-level state managers:

1. **`useListQuery`**: Owns pagination, search query, debouncing, and RPC syncing (`refreshList`).
2. **`useListKeyboardSelection`**: Owns selection index, wheel scroll alignment, key capture, and page navigation.
3. **`useListOverlays`**: Orchestrates mutually exclusive modals (Sync Modal, Command Palette, Task Sheet).
4. **`useTaskOperations`**: Owns drag-and-drop ordering, priority cycling, status cycling, and delete operations.

This consolidation reduces the hook count from 46 files to **4 highly cohesive files**, drastically lowering import statements and prop plumbing.

### Heuristic 2: Sub-Component Co-location

If a component (e.g., `EntryRowFrecencyIndicator` or `BadgeAccessory`) is only used by a single parent component (`EntryRow`), it should **not** live in the centralized `components/shared/` folder. It should be co-located directly adjacent to its parent in the same directory, or defined in the same file if under 100 lines. This keeps the centralized folders clean and highly discoverable.

---

## 6. Prioritized Recommendations & ROI

| Priority | Recommendation | Effort | Impact | ROI  |
| :------- | :------------- | :----- | :----- | :--- ||
| **1**    | **Fix the Empty-Object `{}` Gotcha**: Declare `EMPTY_TAG_COUNTS = {}` and consume it in `ListMain` to prevent broken re-render memoizations on the entry list.                                         | Very Low | High   | **Very High** |
| **2**    | **Consolidate Hook Slices**: Merge the 46 highly-fragmented list hooks into 4 high-level interaction controllers (`useListQuery`, `useListKeyboardSelection`, `useListOverlays`, `useTaskOperations`). | Medium   | High   | **High**      |
| **3**    | **Extract Atomic UI Primitives**: Create lightweight, reusable primitives for `<Button>`, `<Modal>`, `<Overlay>`, and `<Input>` in `src/shell/renderer/components/shared/primitives/`.                 | Low      | Medium | **High**      |
| **4**    | **Standardize Feature Directories**: Move from layer-based directories (`components/list/`, `hooks/list/`) to unified feature directories (`src/shell/renderer/features/list/`).                       | Medium   | Medium | **Medium**    |

---

## 7. Refactoring Roadmap

### Phase 1: High-Impact / Low-Effort (v0.10.0 Polish)

1. **Fix Memo Leak**: Change the fallback values in `list_main.component.tsx` to reference static constant placeholders (e.g. `EMPTY_TAG_COUNTS`, `EMPTY_ARRAY`) instead of `{}` and `[]` literals.
2. **Clean Central Folders**: Move components like `BadgeAccessory` and `FrecencyIndicator` into the direct scope of the components that consume them, removing them from centralized shared folders if they have single consumers.

### Phase 2: High-Impact / Medium-to-High Effort (v0.11.0 Transition)

1. **Consolidate interaction hooks**:
   * Combine `useListSelection`, `useListPointerSelection`, `useListSurfaceKeyDown`, `useListSurfaceWheelScroll`, and `useVirtualListWindow` into a unified `useListNavigation` state controller.
   * Combine pagination, filter dropdown stats, and data loading into a unified `useListLoader`.
2. **Build Core Primitive Folder**:
   * Standardize the backdrop overlay and dialog chrome into a single reusable `<OverlayShell>` component, consumed by both the `SyncModal` and the `CommandPalette`.

### Phase 3: Nice-to-Have (Future Architecture Evolution)

1. **Adopt Screaming Directory Structure**:
   * Migrate the renderer codebase structure from the layer-centric `components/` vs `hooks/` layout to `features/list/`, `features/settings/`, and `features/detail/`.

---

## 8. Literature & Industry References

* **Gary Bernhardt's "Boundaries" (2012)**: The foundation of the FCIS architecture. The React components are pure, stateless templates of the UI; the custodian hooks act as the Imperative Shell managing browser state and RPC boundaries.
* **Kent C. Dodds' "Colocation" Guidelines**: *"Things that change together should be kept close together."* Promotes moving private hooks, tests, and styles directly into the directory of the consuming component rather than segregating them by file extension across the repo.
* **Dan Abramov's "Presentational and Container Components"**: While Abramov later updated this post, the concept of separating pure markup rendering (e.g. `ListResultsBody`) from behavioral state orchestration (e.g. `useListPageShell`) remains the industry standard for highly testable frontend applications.
