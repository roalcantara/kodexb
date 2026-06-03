**Presentation Architecture Review**
The renderer is healthy but has reached an inflection point. Its current layer-first organization was reasonable for the initial scale, but feature ownership is increasingly fragmented across `components/`, `hooks/`, `utils/`, `actions/`, `pages/`, and centralized CSS.

The main issue is not React complexity. It is navigation cost: a contributor must reconstruct a feature by searching across several roots.

**What To Preserve**
- Keep local React state. A global store would add ceremony without solving the current ownership problem.
- Preserve the token pipeline in [app.css](/Users/roalcantara/Work/bun/kb/src/shell/renderer/styles/app.css:8) and [theme.css](/Users/roalcantara/Work/bun/kb/src/shell/renderer/styles/theme.css:3).
- Keep RPC infrastructure centralized.
- Keep narrow lifecycle hooks such as virtualization, pagination sentinels, and `useSyncExternalStore` bindings.
- Preserve FCIS isolation: the renderer should consume domain decisions, not become the authoritative source for them.

**Key Concerns**
1. **Feature ownership is scattered.**
   The list context spans 54 production artifacts across three roots; shortcuts span 36. Tasks, sync, settings, and command-palette behavior are also distributed across unrelated directories.

2. **The list workspace has two oversized composition roots.**
   [list.page.tsx](/Users/roalcantara/Work/bun/kb/src/shell/renderer/pages/list/list.page.tsx:6) is appropriately thin, but [list_main.component.tsx](/Users/roalcantara/Work/bun/kb/src/shell/renderer/components/list/list_main.component.tsx:34) still combines effects, keyboard routing, virtualization, scrolling, selection, drag-and-drop, and rendering.
   [use_list_page_shell.hook.ts](/Users/roalcantara/Work/bun/kb/src/shell/renderer/hooks/list/use_list_page_shell.hook.ts:24) is effectively a second controller with a broad return object.

3. **Modal and keyboard coordination is becoming brittle.**
   [list_overlay_hosts.component.tsx](/Users/roalcantara/Work/bun/kb/src/shell/renderer/components/list/list_overlay_hosts.component.tsx:17) hosts task, settings, palette, sync, toast, and quick-lookup surfaces. Their priority is coordinated through distributed booleans and manual blocking checks.

4. **Some hooks are extraction boundaries rather than useful abstractions.**
   Hooks are justified when they encapsulate stateful lifecycle behavior. Pure transformations should remain models, selectors, or utilities. Files such as `use_keymap_groups.util.ts` use hook naming without being hooks, which harms discoverability.

5. **Type ownership sometimes flows backward.**
   Hooks and utilities import stable models from component files. For example, sync handlers import UI state from [sync_modal.component.tsx](/Users/roalcantara/Work/bun/kb/src/shell/renderer/components/shared/sync_modal.component.tsx:7). Shared feature models should live in `.model.ts` or `.types.ts` files.

6. **`shared/` has become a miscellaneous bucket.**
   It currently mixes reusable widgets, entry visuals, toast infrastructure, and the sync feature. “Shared” should mean reusable across bounded contexts, not merely outside the list folder.

7. **Some deterministic domain behavior remains in presentation code.**
   [task_state.util.ts](/Users/roalcantara/Work/bun/kb/src/shell/renderer/utils/shared/task_state.util.ts:9) defines overdue and blocked predicates. If these are authoritative rules, move them into Core with time passed explicitly.

**Concrete Simplifications**
- Consolidate the derived keymap model. [shortcut_keymap.component.tsx](/Users/roalcantara/Work/bun/kb/src/shell/renderer/components/shortcuts/shortcut_keymap.component.tsx:29) recomputes filtering and tabs despite [use_keymap_view.hook.ts](/Users/roalcantara/Work/bun/kb/src/shell/renderer/hooks/shortcuts/use_keymap_view.hook.ts:40) already doing related work.
- Replace the overlay booleans with a small discriminated surface model and explicit keyboard priority rules.
- Introduce only a few proven primitives: `OverlayDialog`, a basic `Kbd`, and task-specific status visuals. Avoid building a generic component library.
- Split the 893-line shortcuts stylesheet by surface while retaining the existing central CSS entry point.
- Audit likely superseded artifacts before deletion: `detail_panel.component.tsx`, `sync_progress.component.tsx`, `sync_toast.component.tsx`, `styles/list.css`, `styles/components/shared.css`, and possibly `confirm_dialog.css`. This is an inference from reachability searches, not a confirmed deletion list.
- Remove inline task-sheet styles that bypass the documented styling convention.

**Recommended Structure**
Adopt a pragmatic hybrid structure incrementally:

```text
renderer/
  app/                 # application workspace and surface coordination
  features/
    actions/
    shortcuts/
    sync/
    tasks/
    settings/
  entities/
    entry/             # reusable entry visuals and presentation models
  ui/                  # genuinely reusable primitives
  rpc/                 # centralized transport boundary
  styles/              # tokens, build entry, feature partials
```

Keep pages as thin exported entry points where useful. Co-locate components, hooks, models, utilities, and feature CSS when they change together. Do not adopt a strict taxonomy merely for symmetry.

**Options**
| Strategy | Tradeoff | Recommendation |
|---|---|---|
| Keep layer-first folders | Lowest release risk, but navigation cost continues growing | Acceptable only during the v0.10.0 freeze |
| Incremental feature-owned modules | Better discoverability without a rewrite | **Recommended** |
| Full Feature-Sliced Design migration | Strong formal conventions, high churn | Not justified at the current scale |

**Refactoring Roadmap**
High-impact / low-effort:
- Create stable feature model files and remove component-owned shared types.
- Rename false `use_*` utilities.
- Consolidate shortcut keymap derivation.
- Split shortcuts CSS and remove verified stale artifacts.
- Document a short renderer placement convention.

High-impact / higher-effort:
- Add the surface coordinator and centralized keyboard-routing policy.
- Move tasks, sync, and settings into feature-owned modules.
- Split `ListMain` into a workspace controller and a mostly presentational view.
- Move authoritative task predicates into Core.

Nice-to-have:
- Organize shortcut subfeatures such as keymap, chord detail, and quick lookup.
- Extract primitives only as repeated behavior becomes concrete.
- Rename the list page toward `workspace` if it remains the true application shell.

**Useful References**
These are useful heuristics, not prescriptions:
- React: [Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure)
- React: [Extracting State Logic into a Reducer](https://react.dev/learn/extracting-state-logic-into-a-reducer)
- React: [Reusing Logic with Custom Hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
- Martin Fowler: [Presentation Model](https://martinfowler.com/eaaDev/PresentationModel.html)
- Kent C. Dodds: [Colocation](https://kentcdodds.com/blog/colocation)
- Feature-Sliced Design: [Layers](https://feature-sliced.design/docs/reference/layers) and [Slices and Segments](https://feature-sliced.design/docs/reference/slices-segments)
