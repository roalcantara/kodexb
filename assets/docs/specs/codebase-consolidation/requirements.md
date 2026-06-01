<!-- markdownlint-disable-file -->

# Codebase consolidation — Requirements

## OVERVIEW

This document fixes the audit findings recorded in [`report.md`](report.md)
into testable requirements. Implementation lives in **one** clone on the
integration branch (today: `feat-add-stats-panel`).

**Goal:** Reduce file count, eliminate duplicate constants and types, and
move leaked domain logic into `src/core/` — **without changing any
user-visible behaviour and without weakening any quality tool**.

**Non-goal:** Removing Biome suppressions
(owned by [`../codebase-quality-audit/`](../codebase-quality-audit/)).
Adding guards / tests / mise tasks for past findings
(owned by [`../codebase-best-practices-audit/`](../codebase-best-practices-audit/)).

## REQUIREMENTS

### R1 — `src/core/` remains pure

**The system SHALL** keep `src/core/` free of any import from
`src/shell/`, `src/shared/logging`, `react`, `react-dom`, `bun:sqlite`,
`node:fs`, `node:fs/promises`, `node:path`, `node:os`, or any other I/O
module. Spec files MAY import `bun:test`. This is already enforced by
`.dependency-cruiser.cjs` rule `no-app-core-importing-shell`; **R1 SHALL
NOT weaken that rule**.

### R2 — Pure domain logic lives in `src/core/`

**The system SHALL** move every pure-domain module listed in
[`report.md` §A3–A7](report.md) out of `src/shell/app/lib/` and into
the matching new `src/core/` location specified in
[`design.md`](design.md). After the move:

- `rg "STOP_WORDS|extractKeywords|computeCooccurrence" src/shell/` returns
  zero matches.
- `rg "rankSuggestedTags" src/shell/` returns zero matches.
- `rg "filterKnowledgeByTaskView|countTasksByView|isOverdue|isActionablePlaceholder" src/shell/` returns zero matches except inside `src/shell/__tests__/` integration callers (acceptable).
- `rg "OG_IMAGE_RE|YOUTUBE_ID_RE|previewImageFromHtml|youtubePreviewImage" src/shell/` returns zero matches except inside the I/O wrapper that fetches the HTML.
- `rg "stableListCacheKey|toFindAllOpts|DEFAULT_LIST_PAGE_SIZE" src/shell/` returns zero matches except inside repositories that re-export the constant.

### R3 — Domain types live in `src/core/`, not inside component files

**The system SHALL** remove every domain type and pure helper from
`src/shell/renderer/components/list/filter_dropdown.component.tsx`,
specifically:

- `ENTRY_TYPES`, `EntryTypeOption` — replaced by `EntryType` from
  `src/core/domain/types/entry.types.ts` everywhere.
- `TASK_VIEWS` — replaced by `TASK_VIEW_ORDER` exported from the new
  `src/core/domain/models/knowledges/task_views/` barrel.
- `sortedTags(tags, q, selectedTags)` — moved to
  `src/core/domain/models/knowledges/tags/sorted_tags.util.ts`.
- `showTaskSection(types)` — moved to
  `src/core/domain/models/knowledges/task_views/show_task_section.util.ts`.

After the move, `grep -rn "from '../../components/list/filter_dropdown.component'"
src/shell/renderer/{utils,hooks}/` returns zero matches; the file
imports `EntryType` directly from `@core` (or relative path).

### R4 — Duplicated literals collapse to a single owner

**The system SHALL** keep exactly one definition of:

- `TASK_VIEW_ORDER` (replaces the three `TASK_VIEWS` arrays).
- `ENTRY_TYPE_GLYPH` (replaces `typeGlyphChar` + the duplicate `'◆'`
  in `icons.const.ts`).

Validation:

- `rg "\['actionable', 'today', 'overdue', 'this_week', 'all_pending', 'all_doing'\]" src/`
  returns one hit (the definition).
- `rg "'◆'" src/ --glob '!*.spec.*'` returns one hit (the
  `ENTRY_TYPE_GLYPH` definition or a bookmark-tag-glyph mapping; not
  both).

### R5 — Fire-and-forget is named

**The system SHALL** route every `.catch(() => undefined)` through a
single helper `fireAndForget(promise, log?)` exported from
`src/shared/utils/`. After implementation,
`rg "\.catch\(\(\) => undefined\)" src/ --glob '!*.spec.*'` returns
zero matches.

### R6 — `src/shell/renderer/utils/list/` consolidates to 7 modules

**The system SHALL** reduce the 17 non-spec `.util.ts` files under
`src/shell/renderer/utils/list/` to **exactly the 7 modules listed in
[`design.md` Track D](design.md#track-d----utilslist-consolidation-map)**.
Specs MAY be merged or kept per-symbol; spec count is not asserted, only
non-spec count.

After implementation,
`find src/shell/renderer/utils/list -type f -name '*.util.ts' ! -name '*.spec.*' | wc -l`
returns `7`.

### R7 — Over-extracted single-caller hooks are inlined

**The system SHALL** inline the bodies of
`use_compact_filter_overlay_focus.hook.ts` and
`use_compact_filter_overlay_scroll.hook.ts` into
`use_compact_filter_overlay.hook.ts`, and **delete** both source files
plus their specs.

Validation:

- `ls src/shell/renderer/hooks/list/use_compact_filter_overlay*.hook.ts`
  returns `use_compact_filter_overlay.hook.ts` and
  `use_compact_filter_overlay_rows.hook.ts` only.
- `bun test src/shell/renderer/hooks/list/` passes.

### R8 — `.util.ts` files move out of `components/`

**The system SHALL** move every `.util.ts` file currently under
`src/shell/renderer/components/list/` to
`src/shell/renderer/utils/list/`. After implementation,
`find src/shell/renderer/components -name '*.util.ts' ! -name '*.spec.*' | wc -l`
returns `0`.

### R9 — Existing `scheduleDoubleRaf` is reused

**The system SHALL** replace the two inline
`queueMicrotask → raf → raf` chains in
`src/shell/renderer/components/list/list_main.component.tsx` with calls
to `scheduleDoubleRaf` (exported from the consolidated
`virtual_list_scroll.util.ts`).

Validation: in `list_main.component.tsx`,
`rg "queueMicrotask|requestAnimationFrame"` returns zero matches.

### R10 — Hook return types do not cross layers

**The system SHALL** replace
`type ListData = ReturnType<typeof useListPageData>` in
`src/shell/renderer/utils/list/list_page_empty_flags.util.ts` with an
explicit `ListEmptyFlagsInput` type accepting only the fields the
function reads. After implementation, that file imports zero hook
modules.

### R11 — No user-visible behaviour change

**The system SHALL NOT** change any user-facing behaviour. Validation
is by green test suite: every task in `tasks.md` ends with
`bun test <touched-folder>` and the closing track runs `bun test`,
`bun run typecheck`, `bun run lint`, `bun run build` plus the app
quality gate (`bash .agents/skills/app-quality-gate/scripts/gate.sh`)
and they all pass.

### R12 — No weakening of quality tools

**The system SHALL NOT** add Biome suppressions, broaden
`biome.jsonc` overrides, lower severities, expand knip
`ignore*` lists, or weaken `.dependency-cruiser.cjs` /
`.ls-lint.yml` / `sgconfig.yml` / `.jscpd.json` thresholds. If a tool
flags something the task author cannot resolve in-code, **stop and
report** per the handoff's stop conditions; do not edit configs.

### R13 — One commit per track

**The system SHALL** ship each of the six tracks (A–F in `tasks.md`)
as exactly one Conventional-Commits commit on the integration branch,
in order. A track's commit body lists every file moved, renamed, or
deleted. No commit batches more than one track.

### R14 — Specs follow the code they cover

**For every** source file that moves, **the system SHALL** move its
co-located `.spec.ts(x)` together. When two utils merge, their two
specs SHALL be merged into one `.spec.ts` placed next to the merged
util. After implementation,
`bash .agents/skills/app-quality-gate/scripts/gate.sh` reports zero
missing co-located specs (the spec-audit stage that already runs in
the gate).

## ACCEPTANCE

- **A1** — Every file path listed in [`report.md` Closure metrics](report.md#closure-metrics) reaches the target value.
- **A2** — `bun test` exits zero with the same or greater test count as the pre-audit baseline (no skipped or deleted behavioural specs).
- **A3** — `bun run typecheck` exits zero.
- **A4** — `bun run lint` exits zero.
- **A5** — `bun run build` exits zero.
- **A6** — `bash .agents/skills/app-quality-gate/scripts/gate.sh` exits zero (with the host-permission caveat already documented in the best-practices audit).
- **A7** — `git log --oneline feat-add-stats-panel..HEAD` lists exactly six commits for this work, each titled `refactor(scope): ...` per [`assets/guides/GIT_COMMITS_GUIDE.md`](../../guides/GIT_COMMITS_GUIDE.md).
- **A8** — `tasks.md` shows every checkbox checked; each phase's "Verification" line is filled in with the captured command output (commit hash + pass/fail).
