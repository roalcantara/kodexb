<!-- markdownlint-disable-file -->
# Handoff — KB v0 Design Polishing

> **You are a fresh agent. You have no memory of how this spec was produced. Everything you need to execute it is in this folder. Do not skim — read `requirements.md`, `design.md`, and `tasks.md` in full before touching code.**

---

## Session metadata

| Field                           | Value                                                 |
| ------------------------------- | ----------------------------------------------------- |
| Created                         | 2026-05-27                                            |
| Project                         | `/Users/roalcantara/Work/bun/kb`                      |
| Spec slug                       | `design-polishing`                                    |
| Spec folder                     | `assets/docs/archive/design-polishing/`                 |
| Planning agent                  | Planner (specs-only; **no implementation performed**) |
| Implementor agent               | YOU                                                   |
| Working branch at planning time | `feat-add-stats-panel` (unrelated WIP — see §1)       |

---

## 1. Current state summary

A planning pass produced four spec artifacts under `assets/docs/archive/design-polishing/`:

1. `requirements.md` — 31 EARS-format requirements organised into 5 epics.
2. `design.md` — the normative technical contract: 12 decisions (`D-001` … `D-012`), Surface Inventory (§3), DESIGN.md vs wireframe conflict-resolution table (§4), build-pipeline shape (§5), full `@theme` token skeleton (§6), migration playbook (§7).
3. `tasks.md` — 13 ordered tracer-bullet tasks, each with REQ traceability and binary completion conditions.
4. `handoff.md` — this file.

**No code changes have been made.** The renderer still imports `./styles/list.css` only. Tailwind is NOT installed.

The current git branch (`feat-add-stats-panel`) is **unrelated WIP**. Create a fresh branch before starting (see §2 step 0).

---

## 2. Agent bootstrap sequence

Run these steps **in order** before doing anything else.

### Step 0 — Branch

```bash
cd /Users/roalcantara/Work/bun/kb
git status                # confirm working tree state
git stash --include-untracked  # if you find unrelated WIP
git switch -c feat-design-polishing main   # or fork from main
```

If the four spec files are not present after switching, restore them from the planning branch / stash before proceeding — they are mandatory inputs.

### Step 1 — Load skills

Load these in order (in the order listed):

1. **`app-context`** — always (architecture + naming + design system); per project `CLAUDE.md`.
2. **`tailwindcss`** — primary styling primitive guide.
3. **`tailwind-css-patterns`** — utility composition patterns; consult for `@apply` decisions.
4. **`tailwindcss-advanced-layouts`** — use when migrating list/detail/settings layouts.
5. **`electrobun-core`** + **`electrobun-config`** — when wiring Tailwind into the Electrobun build.
6. **`electrobun-dev`** — for dev/watch flow integration.
7. **`mise-tasks`** — when adding `[tasks.styles]` and `[tasks."styles:watch"]`.
8. **`app-testing`** — when updating `.spec.tsx` files in each task.
9. **`subagent-driven-development`** — to orchestrate the per-task execution (delegate each `tasks.md` task to a fresh sub-agent).
10. **`test-driven-development`** — for sub-agents implementing each task.
11. **`app-quality-gate`** — before declaring any task complete.

Optional but recommended when blockers appear:
- `systematic-debugging` — if a test fails after a migration slice.
- `receiving-code-review` — if review feedback comes back on the migration.

### Step 2 — Read the spec

```
1. assets/docs/archive/design-polishing/requirements.md   (full)
2. assets/docs/archive/design-polishing/design.md         (full)
3. assets/docs/archive/design-polishing/tasks.md          (full)
4. DESIGN.md                                            (source-of-truth tokens)
5. assets/docs/archive/design-polishing/wireframe.html    (layout/spacing reference)
6. src/shell/renderer/styles/list.css                   (the monolith you are decomposing)
7. assets/guides/DoD.md                                 (acceptance gate)
8. assets/guides/GIT_COMMITS_GUIDE.md                   (commit format)
9. assets/guides/CODESTYLE_GUIDE.md                     (file naming)
10. assets/guides/TESTING_GUIDE.md                      (bun:test, no mocks, Fishery)
```

### Step 3 — Execute `tasks.md`

Use the `subagent-driven-development` skill to delegate each task. For each task chunk to a sub-agent, give them:

- The task definition + completion conditions (copy from `tasks.md`).
- The requirement IDs listed under "Requirements satisfied" (copy text from `requirements.md`).
- The migration playbook from `design.md` §7 if they're migrating a surface.
- The conflict-resolution table from `design.md` §4 if a colour/layout choice arises.
- The directive to load `test-driven-development` and verify against the criteria.

**Definition of "task done":** ALL completion conditions in the task block are observably met. `bun run test` + `mise run lint` + `bun run dev` (manual smoke) green. Partial completion is not done. "Looks right" is not done.

### Step 4 — Hand back

When Task 13 completes (single atomic commit), report to the user:

- Working branch name
- Commit SHA + subject
- Links to the four spec artifacts in `assets/docs/archive/design-polishing/`
- Any deviation from the spec (there should be none — if there is, see §7 "Escalation rule")

---

## 3. Codebase understanding (compressed)

### Architecture

- **Stack:** Bun runtime + Electrobun desktop framework + React 19 renderer + Elysia/Eden Treaty RPC + TypeBox validation + bun:sqlite.
- **Layout:** FCIS — `src/core/` (pure), `src/shared/` (pure utils), `src/shell/app/` (DB + AppService), `src/shell/main/` (Electrobun main, hosts Elysia), `src/shell/renderer/` (React + Eden Treaty client).
- **Renderer entry:** `src/shell/renderer/index.ts` → imports `./styles/list.css` + `./app.tsx`. After Task 1, this becomes `./styles/generated/app.css` + `./app.tsx`.
- **Renderer HTML shell:** `src/shell/renderer/index.html` — loads `index.css` (Bun.build output) + `index.js`. **Do not edit.**
- **Two Bun.build views:** `bun` (main process) + `shell` (renderer). Tailwind output lands inside the `shell` graph via the `index.ts` import.

### Critical files

| File                                                | Purpose                                                                            | Relevance                                                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `DESIGN.md`                                         | Andromeda Void design system (colours, type, spacing, semantic styles, components) | Source of truth for tokens. Mapped 1:1 into `theme.css` `@theme` block.      |
| `assets/docs/archive/design-polishing/wireframe.html` | Single-screen prototype for List view                                              | Source of truth for *layout/spacing* per D-006 / §4 conflict table.          |
| `src/shell/renderer/styles/list.css`                | 2,276-line monolith with ~75 `theme-*` classes across 10+ surfaces                 | The thing you are decomposing.                                               |
| `src/shell/renderer/index.ts`                       | Renderer entry; imports CSS                                                        | Edit in Task 1 to swap `./styles/list.css` for `./styles/generated/app.css`. |
| `src/shell/renderer/index.html`                     | Renderer HTML shell                                                                | Untouched.                                                                   |
| `electrobun.config.ts`                              | Bun.build pipeline config                                                          | Untouched per D-002.                                                         |
| `mise.toml`                                         | Task orchestration                                                                 | Add `[tasks.styles]` + `[tasks."styles:watch"]` per REQ-005.                 |
| `.ls-lint.yml`                                      | File-naming contract                                                               | Update in Task 12 for `src/shell/renderer/styles/components/`.               |
| `knip.jsonc`                                        | Dead-export checker                                                                | Update in Task 1 to ignore `src/shell/renderer/styles/generated/`.           |
| `.dependency-cruiser.cjs`                           | Forbidden-import checker                                                           | Verify generated path is not flagged.                                        |
| `assets/guides/DoD.md`                              | Definition of Done                                                                 | Every box must be ticked before commit.                                      |
| `assets/guides/GIT_COMMITS_GUIDE.md`                | Conventional Commits + ≤50-char subject                                            | Followed in Task 13.                                                         |

### Key patterns / conventions

- **No `console.*`** in `src/`; use `getLogger(['kb', 'renderer', ...])` from `@shared/logging`.
- **TypeBox only** for validation (no Zod — it is not a dependency).
- **Fishery `factoryFor`** for test factories (no `drizzle-seed`, no Drizzle ORM).
- **Co-located `.spec.ts(x)`** for every `src/` file. When you update a `.tsx`, update the `.spec.tsx` in the same task.
- **snake_case** file naming (machine-checked by Biome and `@ls-lint/ls-lint`). Suffix vocabulary in `assets/guides/CODESTYLE_GUIDE.md` §File Naming.
- **Component file pattern:** `<noun>.component.tsx` + `<noun>.component.spec.tsx`. Hooks: `use_<noun>.hook.ts`. Pages: `<noun>.page.tsx`. Utils: `<noun>.util.ts`.
- **Renderer talks to main only via `@rpc/client`** (Eden Treaty). Layer-crossing imports are forbidden and enforced by `dependency-cruiser`.

---

## 4. Decision log (NORMATIVE — do not re-litigate)

All 12 decisions live in `design.md` §2. Summary for quick reference:

| ID        | Decision                                                                                     | Brief rationale                                                      |
| --------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **D-001** | Tailwind **v4** (not v3, not CDN)                                                            | CSS-first config + Lightning CSS + no PostCSS infra debt.            |
| **D-002** | `@tailwindcss/cli` orchestrated by mise (not a Bun plugin)                                   | Officially supported, separates concerns, transparent failure modes. |
| **D-003** | Generated CSS imported via `index.ts`, not `<link>` in `index.html`                          | Keeps CSS in Bun.build graph; HTML untouched.                        |
| **D-004** | Token mapping via `@theme` in `theme.css`; **no `tailwind.config.js`**                       | Single source of truth co-located with styles; v4 idiomatic.         |
| **D-005** | Incremental tracer-bullet slices, one task per surface                                       | Reviewable, reversible, behaviour-preserving.                        |
| **D-006** | Conflict resolution: **wireframe wins on layout/spacing, DESIGN.md wins on semantic colour** | Per §4 table. Default: DESIGN.md wins.                               |
| **D-007** | Helper-class taxonomy: `.cmp-*` (component) + `.semantic-*` (DESIGN.md semantic styles)      | Clear naming separation from legacy `.theme-*`.                      |
| **D-008** | No new hex literals outside `theme.css`                                                      | Forces drift back to design system.                                  |
| **D-009** | **Font loading: system stack only**; remove all Google Fonts `@import` URLs                  | Aligns with DESIGN.md "native precision"; removes network dep.       |
| **D-010** | `list.css` reduced to ≤ 200 lines of `/* RETAIN: <reason> */` escape hatches (or deleted)    | Allows justified residuals without rule-massaging.                   |
| **D-011** | Tests assert on `.cmp-*` class or role/text — **never on raw Tailwind utility fragments**    | Decouples tests from class-name churn.                               |
| **D-012** | Single atomic conventional commit at Task 13                                                 | Subject ≤ 50 chars; body explains WHAT + WHY + spec path.            |

---

## 5. Ambiguity register

All ambiguities surfaced during planning were resolved. **Confirmed** decisions are binding. **Provisional** items list the fallback if the assumption proves wrong.

| ID    | Item                                                                                                                                                                | Status          | If wrong, do this                                                                                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A-001 | Tailwind v4 + `@tailwindcss/cli` works cleanly with Electrobun's two-view Bun.build                                                                                 | **Provisional** | If the CLI watcher conflicts with `electrobun dev --watch`, fall back to a Bun.build custom plugin wrapping the Tailwind JS API; document in a `decision.md` addendum and STOP for user signoff before implementing. Do not silently substitute. |
| A-002 | `headline-lg` per DESIGN.md names `Inter` but D-009 picks system stack                                                                                              | **Confirmed**   | If a stakeholder later requires true Inter, bundle the font asset locally (out of v0 scope).                                                                                                                                                     |
| A-003 | `list.css` palette comment says "Vivid Gothic Command" but DESIGN.md is "Andromeda Void"; current accent `#d7baff` differs from DESIGN's `primary #5ecfbe`          | **Confirmed**   | DESIGN.md wins. Migration overrides current renderer colours. Do not preserve "Vivid Gothic Command" values.                                                                                                                                     |
| A-004 | Wireframe shows a body gradient and a floating "Alt+Space Command Center" hint not in DESIGN.md                                                                     | **Confirmed**   | Both are **out of scope for v0**. Document the floating hint in §6 below as a candidate for v1. Use DESIGN.md's flat `--color-background` instead of the gradient.                                                                               |
| A-005 | `apps/kb/` does not exist in this repo despite a memory note suggesting all code should live there                                                                  | **Confirmed**   | Treat the memory note as outdated for this repo. Renderer code stays in root `src/shell/renderer/`.                                                                                                                                              |
| A-006 | Surfaces S11 (Command Palette), S12 (Sync), S13 (Action Toasts) are referenced by `theme-*` class prefix but the owning components were not located during planning | **Provisional** | Use `grep -r "theme-command-palette\|theme-sync-\|theme-action-toast" src/shell/renderer --include="*.tsx" -l` to find them. Treat the discovered files as the targets for Tasks 10 and 11.                                                      |
| A-007 | Existing tests may assert on `theme-*` class names                                                                                                                  | **Provisional** | When updating each component, also update its `.spec.tsx` per D-011. Do NOT skip or mark `todo` any test.                                                                                                                                        |
| A-008 | `mise.toml` may already define `dev` and `build` tasks                                                                                                              | **Confirmed**   | Inspect `mise.toml` first; compose `styles:watch` into existing `dev` (do not duplicate Electrobun invocations).                                                                                                                                 |

---

## 6. Out-of-scope items deferred to v1 (do NOT implement)

- **Floating "Alt+Space — Summon the Command Center" hint** below the main panel (wireframe lines 217-229). Document but skip.
- **Body gradient** `#1E1B33 → #161722 → #10111A` (wireframe line 16). Use flat `--color-background` from DESIGN.md.
- **`Inter` web font** for headline-lg. Use system stack until a bundled-font story is needed.
- **`@tailwindcss/forms`** / **`@tailwindcss/container-queries`** plugins. Tailwind v4 covers most of their behaviour natively; only add a plugin if a concrete need surfaces during migration — STOP and document before adding.
- **WCAG accessibility audit** (REQ-031.4 only commits to focus rings + keyboard-first preservation, not full conformance).
- **Pixel-perfect visual regression testing.**
- **Migration of root `src/` to `apps/kb/`.**
- **New Playwright e2e flows** beyond existing `e2e:preview`.

---

## 7. Escalation rule

> If, during execution, you encounter a situation NOT covered by `design.md` decisions, the `requirements.md` acceptance criteria, the `§4 conflict-resolution table`, or `§5 ambiguity register` — **STOP**. Do not guess.
>
> Surface the situation as a question to the user, describing:
> 1. The specific decision you cannot make (with file path and line numbers).
> 2. The 2–3 options you see.
> 3. Your recommended option and why.
>
> Wait for the user's call before proceeding. Document the resolution in this `handoff.md` so future readers see the lineage.

---

## 8. Important context (read before first task)

- **The Andromeda Void palette is the contract**, not the current code. The renderer today uses `#d7baff` (lavender) as accent because of historical drift to a "Vivid Gothic Command" palette. Your migration **overrides** that with `--color-primary: #5ecfbe` (Supernova Cyan) and `--color-color-cheat: #a855f7` (selection rail). Don't preserve the old colours.
- **The wireframe is one screen.** Most of the app (Detail, Settings, TaskSheet, CommandPalette, Sync flows, ConfirmDialog, CompactFilter overlay) has no wireframe counterpart. For those surfaces, apply the wireframe's *rhythm* (gap-4, px-6, py-4, 52px input height, kbd chip style) and DESIGN.md's *semantic colour*. Don't invent new layouts.
- **Selection rail behaviour matters.** The current `data-list-selection='true'` hover-suppression keeps the UI from showing two "selected-looking" rows when the pointer rests on one row while another is keyboard-selected. Preserve this in Task 5.
- **Window drag stripe matters.** `use_window_drag.hook.ts` captures `mousedown` on the top 10px stripe and drives `BrowserWindow.setPosition` via RPC because WKWebView ignores `-webkit-app-region: drag`. Preserve in Task 3.
- **The detail panel slide animation is 180ms ease-out.** Preserve in Task 7.
- **The metadata sidebar is hidden < 1300px viewport.** Preserve in Task 7.
- **`theme-*` selectors number ~75**; not every one maps cleanly to a single Tailwind utility. The `@apply` partial pattern (`.cmp-<noun>` in `components/<noun>.css`) is the canonical home for the messy ones.
- **No new hex literals in JSX or in non-theme CSS files.** This is REQ-007.3 + D-008. Pick the closest `@theme` colour or extend `@theme` (with rationale).

---

## 9. Potential gotchas

1. **Watch process orphaning.** `@tailwindcss/cli --watch` is a long-lived child. Make sure `mise run dev:kill` (which today calls `mise run app --kill`) also terminates the CSS watcher. If not, add the watcher to the kill graph in `mise.toml`.
2. **`@theme` token name collisions with Tailwind built-ins.** Token names like `primary` will collide with Tailwind v4's expectations if you don't use the prefixed form (`--color-primary`). Always use the documented `--color-<name>`, `--text-<name>`, `--radius-<name>`, `--spacing-<name>`, `--font-<name>` prefixes.
3. **`text-color-task` reads strangely.** Because DESIGN.md uses `color-task` as the token name, the Tailwind utility resolves to `text-color-task` (double "color"). This is correct — do not rename to `text-task`; the rename would diverge from DESIGN.md's frontmatter keys (REQ-007.1 binds you to DESIGN.md's names).
4. **`color-mix()` calls in `list.css`** (e.g. `color-mix(in srgb, var(--theme-accent) 20%, transparent)`) translate to Tailwind opacity utilities like `bg-accent/20`. Use those instead of preserving the raw CSS.
5. **`backdrop-filter` for the compact-filter overlay** needs both `backdrop-filter` and `-webkit-backdrop-filter`. Tailwind v4's `backdrop-blur-*` only handles the standard property; retain the vendor prefix as raw CSS in the partial with `/* RETAIN: -webkit-backdrop-filter required for WKWebView. */`.
6. **`position: sticky` for sticky-facets** behaves correctly only inside an `overflow-y: auto` parent. Don't change the parent's overflow during migration.
7. **`-webkit-app-region: drag` / `no-drag`** is vendor-prefixed and Tailwind v4 does not express it. Retain as raw CSS in the affected partials with `/* RETAIN: ... */`.
8. **HK pre-commit may run additional gates** beyond `lint` + `test`. If commit fails, read the hook output and fix the underlying issue. **Never use `--no-verify`** (REQ-031 and project policy).
9. **Single commit at the end.** Do not commit per-task. Stage incrementally on the working branch; verify locally; commit once at Task 13. If you accidentally commit per task, you'll need to squash before merging.
10. **`grep -r "console\."` should return zero new occurrences** in renderer source after migration. If you added a `console.log` for debugging, remove it before commit.

---

## 10. Environment state

### Tools required
- `bun` (per `mise.toml`)
- `mise` (task runner)
- `git` + `hk` (pre-commit hook engine — `hk.pkl` at repo root)

### Active processes after `mise run dev`
- `@tailwindcss/cli --watch` (background, started by `styles:watch`)
- `electrobun dev --watch` (foreground, the app process)

Both should terminate cleanly with `⌃C` and `mise run dev:kill`.

### Environment variables that matter
- `LOG_LEVEL` — `verbose`/`debug`/`trace` enables Tailwind CLI output alongside Electrobun logs.
- `ELECTROBUN_RENDERER=cef` — opt-in CEF renderer; verify Tailwind output still reaches it.
- `NODE_TLS_REJECT_UNAUTHORIZED` — used by `build:insecure-local`; not relevant here.

**Do not** add or commit values for `ELECTROBUN_DEVELOPER_ID`, `ELECTROBUN_APPLEID`, `ELECTROBUN_APPLEIDPASS`, `ELECTROBUN_TEAMID` — those are signing secrets and stay out of source.

---

## 11. Artifacts index

| Artifact                    | Path                                                 | Role                                                                                                                    |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Requirements                | `assets/docs/archive/design-polishing/requirements.md` | EARS-format acceptance criteria; 31 REQ-IDs across 5 epics.                                                             |
| Design                      | `assets/docs/archive/design-polishing/design.md`       | Normative technical contract: decisions, Surface Inventory, token map, migration playbook.                              |
| Tasks                       | `assets/docs/archive/design-polishing/tasks.md`        | 13 ordered tracer-bullet slices with REQ traceability and completion conditions.                                        |
| Handoff                     | `assets/docs/archive/design-polishing/handoff.md`      | This file. Bootstrap + decision log + ambiguity register + gotchas.                                                     |
| Wireframe                   | `assets/docs/archive/design-polishing/wireframe.html`  | Single-screen prototype; authoritative for layout/spacing per D-006.                                                    |
| Design system               | `DESIGN.md`                                          | Andromeda Void colour, type, spacing, semantic-style and component tokens; authoritative for semantic colour per D-006. |
| Legacy CSS                  | `src/shell/renderer/styles/list.css`                 | 2,276-line monolith being decomposed.                                                                                   |
| DoD                         | `assets/guides/DoD.md`                               | The acceptance gate every task must clear.                                                                              |
| Commit format               | `assets/guides/GIT_COMMITS_GUIDE.md`                 | Conventional Commits + ≤50-char subject.                                                                                |
| File naming                 | `assets/guides/CODESTYLE_GUIDE.md`                   | snake_case + suffix conventions.                                                                                        |
| Test guide                  | `assets/guides/TESTING_GUIDE.md`                     | bun:test, no mocks, Fishery `factoryFor`.                                                                               |
| Style guide (NEW, optional) | `assets/guides/STYLING_GUIDE.md`                     | Create per REQ-030.4 during Task 12 if you prefer a dedicated guide.                                                    |

---

## 12. Immediate next steps

1. **Run §2 Step 0** — branch off `main`, restore the four spec files if needed.
2. **Run §2 Step 1** — load `app-context`, `tailwindcss`, `electrobun-core`, `subagent-driven-development`.
3. **Read** `requirements.md`, `design.md`, `tasks.md`, `DESIGN.md`, `wireframe.html`, `src/shell/renderer/styles/list.css` (skim) in that order.
4. **Begin Task 1** in `tasks.md` (install Tailwind v4 + wire build). Delegate to a sub-agent if using `subagent-driven-development`; otherwise execute directly.
5. **After every task**, run the per-task verification command sequence before advancing.
6. **At Task 13**, produce the single atomic commit per the template in `tasks.md`.
7. **Hand back** to the user with: branch name, commit SHA, links to the four spec artifacts, and any escalations encountered.

Good luck. The spec is precise. Follow it.
