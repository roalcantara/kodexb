<!-- markdownlint-disable-file -->

# Entry Action Panel — requirements

Central **entry action catalog** and **executor** for kb (Raycast Action Panel *pattern*, no Raycast dependency). **Return** and **⌘Return** run **primary** and **secondary** entry actions in **List**, **Split**, and **Detail** view whenever an entry is in context and focus is not in a text field (decision **A**). Successful entry actions **shall** record frecency via existing `recordEntryVisit` RPC.

Normative contract: [design.md](design.md). List ordering and score model: [list-frecency-sort/requirements.md](../list-frecency-sort/requirements.md).

**Extends** [list-frecency-sort R2](../list-frecency-sort/requirements.md#r2--visit-signals) visit signals; does not change R3–R8 ordering or storage.

## R1 — Single action catalog

- The renderer **shall** expose one function **`buildEntryActionPanel(ctx)`** that returns the ordered action list for the current context (`selectedEntry` or library-only).
- **Command palette**, **list Return / ⌘Return**, and **detail/split action affordances** (phase 4) **shall** consume this catalog — not duplicate per-type `switch` blocks.
- Action **order** and **section** labels **shall** match [command-palette-filter-ux/design.md](../command-palette-filter-ux/design.md) §Command palette sections (entry → clipboard → source → library → app).

## R2 — Primary and secondary actions

- Each entry type **shall** define exactly one **primary** and one **secondary** action (stable `id` values in design §3).
- **Primary** **shall** be invokable with **Return** when **entry action shortcuts are allowed** (R3) and a **current entry** is in context (`selectedId` / `detailEntry` for the active row).
- **Secondary** **shall** be invokable with **⌘Return** on macOS and **Ctrl+Return** on other platforms under the same conditions (`metaKey || ctrlKey` and `key === 'Enter'`).
- Row hint text **shall** be derived from the same primary/secondary definitions (not a separate hard-coded switch).

## R3 — Entry shortcuts in List, Split, and Detail (decision A)

- **Return** and **⌘Return** **shall** run primary/secondary actions in all three view states: **`list`**, **`split`**, and **`detail`** (`viewState` from `view_reducer.util.ts`).
- The **current entry** **shall** be: the list **selected** row when `viewState` is `list` or `split`, and **`detailEntry`** when `viewState` is `detail` (split may use selected row when list panel has focus; when detail panel has focus, use `detailEntry` if set, else selected row).
- **Return** and **⌘Return** **shall not** run when focus is in: **search** input, **filter overlay** fields, **command palette** search, **task sheet** fields, **settings**, or any other **text entry** control (`input`, `textarea`, `contenteditable`).
- Decision **A** means: shortcuts are **not** tied to “list surface DOM focus only”; they **are** suppressed while the user is typing in search or other fields above — not while viewing detail/split.
- **ArrowRight** **shall** remain **open detail / split** from list (unchanged); **Return** **shall** run the type-specific **use** action, not “open detail” (none in v1).

## R4 — Executor and frecency

- **Visit eligibility** **shall** be defined in **`core`** via **`entryActionRecordsVisit(actionId)`** (pure); renderer **shall not** duplicate that policy.
- **Score persistence** **shall** remain in **`shell/app`** (`recordEntryVisit` → `bumpFrecency` in `core`).
- **`executeEntryAction(entry, actionId, ctx)`** **shall** run the action handler and, on **success**, call **`recordEntryVisitFireAndForget(entry.id)`** when **`entryActionRecordsVisit(actionId)`** is true.
- **Library** and **App** actions (`sync`, `new-task`, `quit`) **shall** set `recordsFrecency: false`.
- **Failed** handlers (rejected promise, clipboard error) **shall not** record a visit.
- **Detail display** **shall** still record a visit when an entry is shown in detail/split via **`useRecordDetailVisit`** (separate from Return); see design §6.

## R5 — Per-type primary / secondary matrix

| `entry.type` | Primary (`Return`) | Secondary (`⌘Return`) |
| ------------ | ------------------ | --------------------- |
| `bookmark`   | Open URL           | Copy                  |
| `command`    | Paste in Terminal  | Copy                  |
| `cheat`      | Copy               | Open in Editor        |
| `task`       | Edit Task          | Cycle Status          |

Additional actions (cycle priority, open editor for non-cheat types, etc.) remain in the palette without default list shortcuts.

## R6 — Visit signals (app-wide, via executor)

After implementation, a visit **shall** be recorded when the user successfully:

- Runs **primary** or **secondary** from list, split, or detail view (Return / ⌘Return);
- Runs any palette action that maps to an executor action with `recordsFrecency: true`;
- Copies via **⌘C / Ctrl+C** on the list (may delegate to executor `copy` action);
- Opens detail/split (**existing** navigation hook + **§6** detail hook).

**Open in Editor** for **cheat** (secondary) **shall** record a visit on success. **Open in Editor** from palette for bookmark/command/task **shall** record a visit on success (v1).

## R7 — Command palette

- Palette **Enter** **shall** invoke **`executeEntryAction`** (or library handler) for the highlighted row’s `id`.
- Palette action list **shall** equal **`buildEntryActionPanel`** output (mapped to existing `CommandPaletteAction` shape).
- **⌘P** / **⌘K** mutual exclusion **shall** remain unchanged.

## R8 — Testing

- **Pure:** action order per type; `primaryActionId` / `secondaryActionId` resolution; shortcut guard (list/split/detail vs search).
- **Executor:** success records visit (spy `recordEntryVisit`); failure does not.
- **Integration:** palette Enter uses executor; Return/⌘Return in list, split, and detail with current entry.
- Co-located `.spec.ts` for every new file under `src/`.

## R9 — Non-goals (v1)

- Raycast npm package or Action Panel React components.
- Custom user-configurable primary/secondary per type.
- Server-side action execution RPC.
- Replacing **ArrowRight** with Return for “open detail”.

## R10 — Quality gate

- Implementation **shall** pass **`bash .agents/skills/kb-quality-gate/scripts/gate.sh`** before merge.
