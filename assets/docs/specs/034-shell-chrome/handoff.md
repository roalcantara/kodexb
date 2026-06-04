<!-- markdownlint-disable-file -->
# Shell chrome — Handoff

## Status

**Direction:** Proposal A chosen (2026-05-31). Refinements: Raycast width (~740px), no type hashtags, contextual footer, tag chroma.
**Spec:** Written — [`requirements.md`](requirements.md), [`design.md`](design.md), [`tasks.md`](tasks.md).
**Prototype:** [`shell_modals_redesign_prototype.html`](../../../wireframe/prototypes/shell_modals_redesign_prototype.html) tab A.
**Implementation:** 🔲 Blocked until `PROTOTYPE APPROVED: implement shell-chrome`.

## Agent execution prompt

```txt
Implement shell-chrome per assets/docs/specs/shell-chrome/.

Read requirements SC-1–SC-7, design.md decisions D-SC-001–006, tasks Phase 1–6.

Goal: Remove ListQuickActions row; refactor ListFooter to show selected entry
primary action (e.g. Paste in Terminal ↵) + Actions ⌘K — not static shortcut
chips. Unify command palette, sync modal, and task sheet on 560px overlay shell
matching cmp-app-shell. Update e2e RunSync to use palette "Sync sources". Do not
add search-row icons (Proposal B) or hub (C).

Load app-context and react:components skills. Run gate.sh before done.
```

Suggested commit:

```txt
feat(ui): Unify shell chrome and drop action row
```
