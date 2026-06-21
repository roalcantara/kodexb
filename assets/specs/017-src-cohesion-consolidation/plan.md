# src cohesion consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development`
> (recommended) or `executing-plans` to implement this plan task-by-task. Steps
> use checkbox (`- [ ]`) syntax. This plan is the authority for *how*;
> [`spec.md`](./spec.md) is the authority for *what*/*why*. Every task ends with an
> **Acceptance gate** naming the spec criterion + exact command + expected value.
> Do not mark a task done until its gate passes; do not add scope beyond it.

**Goal:** Regroup fragmented `src/` modules so each file is one concern — merging
only genuine abstractions (dispatch families) or single-orchestrator encapsulation
— led by `src/shared/logging`, plus a gated ls-lint strengthening spike.

**Architecture:** Pure structural refactor. Behaviour frozen: every modify/merge
task baselines the existing spec green, then re-runs it green. `src/shared/**`
isn't ls-lint-pinned, so COH-1 is free; COH-2 targets keep their suffix in
unpinned dirs; COH-3 is the only thing that may touch `.ls-lint.yml`, additively.

**Tech Stack:** Bun (`bun test`, `bun run`), TypeBox, Elysia, LogTape, Biome +
ls-lint + dependency-cruiser + knip.

**Conventions (do not violate):**
- Tests: `bun:test`, `it(...)`, co-located `*.spec.ts(x)`. Run one file: `bun test <path>`.
- Logging: `getLogger([...])` from `@shared/logging`; never `console.*` in `src/`.
- Commits: Conventional Commits, **capitalized** subject ≤ 50 chars, `chore` for tooling. Commit after every green task.
- **Never** edit `biome.jsonc`, `.dependency-cruiser.cjs`, `knip.jsonc`. `.ls-lint.yml` only in Phase C (COH-3), additively.
- Merges move **existing code verbatim** (drop the `export` keyword where a symbol becomes private); they do not rewrite logic.

---

## File Structure

**COH-1 — `src/shared/logging` (10 → 7 non-spec):**
- Create `rpc.plugin.ts` ← merge `rpc.middleware.ts` + `rpc_common.plugin.ts` + `rpc_error.contract.ts` (delete the three).
- Create `rpc.plugin.spec.ts` ← merge the three old specs (delete them).
- Modify `renderer.config.ts` ← absorb `renderer_build_env.ts` (delete it + its spec, fold into `renderer.config.spec.ts`).
- Modify `index.ts` ← re-export logtape from `./logger` (kill the duplicate `@logtape` lines).
- Unchanged: `logger.ts`, `log_verbosity.ts`, `main.config.ts`, `db_query.logger.ts` (+ their specs).

**COH-2 — abstraction merges (8 non-spec deletions):**
- Create `…/knowledges/detail/doc.parser.ts` ← 5 `doc.*.parser.ts` builders + the `buildPreamble` dispatcher (moved out of `doc.assembler.ts`).
- Modify `…/detail/doc.assembler.ts` ← import `buildPreamble`; drop local dispatcher + 5 imports.
- Modify `…/knowledges/tags/rank_suggested_tags.util.ts` ← absorb `extract_keywords.util.ts` + `cooccurrence.util.ts` as private (delete those two).
- Modify `…/knowledges/task_views/filter_by_view.util.ts` ← absorb `is_actionable.util.ts` + `is_overdue.util.ts` as private (delete those two).
- Create `assets/specs/017-src-cohesion-consolidation/cohesion-inventory.md`.

**COH-3 — ls-lint spike:**
- Create `assets/specs/017-src-cohesion-consolidation/lslint-spike.md`.
- Conditionally modify `.ls-lint.yml` (additive only).

**Closeout:**
- Create `closeout-metrics.txt`; modify `assets/catalog/catalog.yaml` (register `src_cohesion`).

**Phase order:** A (COH-1) → B (COH-2) → C (COH-3) → D (closeout).

---

## Phase A — COH-1 `src/shared/logging` regroup

### Task 1: Merge the three RPC-logging plugins into `rpc.plugin.ts`

**Files:**
- Create: `src/shared/logging/rpc.plugin.ts`, `src/shared/logging/rpc.plugin.spec.ts`
- Delete: `rpc.middleware.ts`, `rpc_common.plugin.ts`, `rpc_error.contract.ts` (+ their `.spec.ts`)
- Modify: `src/shared/logging/index.ts`

- [ ] **Step 1: Baseline the existing specs (must be green first)**

Run: `bun test src/shared/logging`
Expected: PASS. If not, STOP and investigate before merging.

- [ ] **Step 2: Create `rpc.plugin.ts` by concatenating the three modules**

`src/shared/logging/rpc.plugin.ts` — move the bodies verbatim; one `Elysia`
import; preserve the `rpcLogger → rpcErrorContract` ordering comment:

```ts
import { Elysia } from 'elysia'
import { getLogger, withContext } from './logger'

const rpcLog = getLogger(['kb', 'rpc'])

/** Max chars for RPC parameter/body previews in debug logs (main + renderer). */
export const RPC_LOG_PREVIEW_MAX_LEN = 2048
const OK_STATUS = 200
const DURATION_PRECISION = 10
const HTTP_INTERNAL_ERROR = 500

type RequestContext = { requestId: string; action: string; method: string; path: string }

function inspectParams(input: { body?: unknown; query?: unknown }): string {
  const result = input.body === undefined ? (input.query ?? {}) : input.body
  const text = Bun.inspect(result, { depth: 3 })
  return text.length > RPC_LOG_PREVIEW_MAX_LEN ? `${text.slice(0, RPC_LOG_PREVIEW_MAX_LEN)}…(truncated)` : text
}

// ── request logger (was rpc.middleware.ts) ───────────────────────────────────
export const rpcLogger = new Elysia({ name: 'kb-rpc-logger' })
  // ... move the full body of rpcLogger verbatim from rpc.middleware.ts ...
  .as('global')

// ── error contract (was rpc_error.contract.ts) ──────────────────────────────
export const rpcErrorContract = new Elysia({ name: 'rpc-error' }).onError({ as: 'global' }, ({ error, set }) => {
  const message = error instanceof Error ? error.message : String(error)
  set.status = HTTP_INTERNAL_ERROR
  return { error: message }
})

// Order matters: rpcLogger.onError logs without returning a value, so Elysia's
// onError chain proceeds to rpcErrorContract.onError, which converts the error
// to the { error: string } / HTTP 500 envelope. Mounting rpcErrorContract first
// would short-circuit the logger's error hook before the error was recorded.
export const rpcCommonPlugins = new Elysia({ name: 'kb-rpc-common' })
  .use(rpcLogger)
  .use(rpcErrorContract)
  .as('global')
```

> Copy the elided `rpcLogger` body (the `.derive/.onTransform/.onBeforeHandle/.onAfterResponse/.onError` chain) **verbatim** from `rpc.middleware.ts`. Do not change any log string or hook.

- [ ] **Step 3: Merge the three specs into `rpc.plugin.spec.ts`**

Concatenate the test bodies of `rpc.middleware.spec.ts`, `rpc_common.plugin.spec.ts`,
`rpc_error.contract.spec.ts` into `src/shared/logging/rpc.plugin.spec.ts`, updating
the import to `from './rpc.plugin'`. Keep every assertion unchanged.

- [ ] **Step 4: Delete the old files**

```bash
git rm src/shared/logging/rpc.middleware.ts src/shared/logging/rpc.middleware.spec.ts \
       src/shared/logging/rpc_common.plugin.ts src/shared/logging/rpc_common.plugin.spec.ts \
       src/shared/logging/rpc_error.contract.ts src/shared/logging/rpc_error.contract.spec.ts
```

- [ ] **Step 5: Update `index.ts` re-export paths**

In `src/shared/logging/index.ts`, change the three lines that import from
`./rpc.middleware`, `./rpc_common.plugin`, `./rpc_error.contract` to all import
from `./rpc.plugin`:

```ts
export { RPC_LOG_PREVIEW_MAX_LEN, rpcCommonPlugins, rpcErrorContract } from './rpc.plugin'
```

- [ ] **Step 6: Fix the one internal consumer + verify**

`src/shell/main/rpc/server.ts` imports `rpcCommonPlugins` from `@shared/logging`
(the barrel) — unchanged. Confirm no file imports the deleted paths:

Run: `rg -rn "rpc\.middleware|rpc_common\.plugin|rpc_error\.contract" src`
Expected: 0 matches.
Run: `bun test src/shared/logging && bun test src/shell/main/rpc && bun run typecheck`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Merge RPC logging plugins into rpc.plugin.ts"
```

**Acceptance gate (COH-1 AC1):** `ls src/shared/logging/rpc*.ts` → `rpc.plugin.ts` + `rpc.plugin.spec.ts` only; 0 stale imports; `bun test src/shared/logging src/shell/main/rpc` green.

---

### Task 2: Fold `renderer_build_env.ts` into `renderer.config.ts`

**Files:**
- Modify: `src/shared/logging/renderer.config.ts`, `src/shared/logging/renderer.config.spec.ts`
- Delete: `renderer_build_env.ts`, `renderer_build_env.spec.ts`

- [ ] **Step 1: Move `RENDERER_BUILD_ENV` into `renderer.config.ts`**

At the top of `src/shared/logging/renderer.config.ts`, add the binding moved
verbatim from `renderer_build_env.ts` (keep its doc comment), and delete the
`import { RENDERER_BUILD_ENV } from './renderer_build_env'` line:

```ts
const buildTimeEnv: Record<string, string | undefined> = typeof process === 'undefined' ? {} : process.env

/** Environment snapshot taken when Electrobun builds the `shell` view bundle. (…doc…) */
export const RENDERER_BUILD_ENV: Readonly<Record<string, string | undefined>> = {
  LOG_LEVEL: buildTimeEnv.LOG_LEVEL,
  NODE_ENV: buildTimeEnv.NODE_ENV
}
```

> Keep `RENDERER_BUILD_ENV` **exported** — `renderer.config.spec.ts` references it. If knip later flags it as unused outside this file, make it module-private then (Task: covered by Step 4 knip check).

- [ ] **Step 2: Merge the spec**

Move the test bodies from `renderer_build_env.spec.ts` into
`renderer.config.spec.ts` (import from `./renderer.config`), keeping assertions.

- [ ] **Step 3: Delete the old files**

```bash
git rm src/shared/logging/renderer_build_env.ts src/shared/logging/renderer_build_env.spec.ts
```

- [ ] **Step 4: Verify**

Run: `rg -rn "renderer_build_env" src`
Expected: 0 matches.
Run: `bun test src/shared/logging && bun run typecheck && bun run lint:knip`
Expected: PASS; knip reports no new unused export (if `RENDERER_BUILD_ENV` is now unused outside the file, drop its `export` and re-run).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Fold renderer build-env into renderer config"
```

**Acceptance gate (COH-1 AC2):** `renderer_build_env.ts` gone; 0 stale imports; `bun test src/shared/logging` + `bun run lint:knip` green.

---

### Task 3: De-duplicate `index.ts` (single logtape boundary)

**Files:**
- Modify: `src/shared/logging/index.ts`, `src/shared/logging/logger.ts`

- [ ] **Step 1: Ensure `logger.ts` exports all five logtape symbols**

`src/shared/logging/logger.ts` currently exports `getLogger`, `withContext`,
`LogRecord`, `Sink`. Add `Logger` so the barrel can source it here too:

```ts
export type { LogRecord, Sink } from '@logtape/logtape'
export { getLogger, type Logger, withContext } from '@logtape/logtape'
```

- [ ] **Step 2: Re-export from `./logger` in `index.ts`**

Replace the first two lines of `src/shared/logging/index.ts` (which import from
`@logtape/logtape`) with a single re-export from `./logger`:

```ts
export { getLogger, type Logger, type LogRecord, type Sink, withContext } from './logger'
```

Leave the other barrel lines (db_query, log_verbosity, main.config, renderer.config,
and the `./rpc.plugin` line from Task 1) intact.

- [ ] **Step 3: Verify the duplicate is gone and surface is identical**

Run: `rg -c "from '@logtape/logtape'" src/shared/logging/index.ts`
Expected: `0`.
Run: `rg '^export' src/shared/logging/index.ts`
Expected: the same exported names listed in `baseline-metrics.txt`.
Run: `bun test src/shared src/shell && bun run typecheck && bun run lint:knip`
Expected: PASS.

- [ ] **Step 4: Confirm file counts hit target**

Run: `ls src/shared/logging/*.ts | grep -v spec | wc -l` → **7**;
`ls src/shared/logging/*.spec.ts | wc -l` → **5**.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Route logging barrel through logger boundary"
```

**Acceptance gate (COH-1 AC3, AC4, AC5):** `index.ts` has 0 `@logtape/logtape` imports; barrel names unchanged; logging non-spec=7 / spec=5; full `src/shared` + `src/shell` suites green.

---

## Phase B — COH-2 abstraction merges

### Task 4: Cohesion inventory

**Files:**
- Create: `assets/specs/017-src-cohesion-consolidation/cohesion-inventory.md`

- [ ] **Step 1: Write the inventory with the merge-bar verdicts**

For each of `knowledges/detail`, `knowledges/tags`, `knowledges/task_views`,
`core/helpers/list_opts`, `shared/constants`: list every non-spec file, its
bar verdict — **(A) dispatch family**, **(B) encapsulation**, or **keep** — and
the importer evidence. Required verdicts (from `baseline-metrics.txt`):
- `detail/doc.*.parser.ts` → **(A)** merge into `doc.parser.ts`.
- `tags/extract_keywords`, `tags/cooccurrence` → **(B)** (only `rank_suggested_tags` imports them); `sorted_tags` → keep (renderer imports it); `stop_words`/`suggest_max_results` consts → keep (data).
- `task_views/is_actionable`, `is_overdue` → **(B)** (only `filter_by_view`); `show_task_section` → keep (renderer); `task_date`/`count_by_view`/`task_view_order` → keep.
- `list_opts/stable_cache_key` + `to_find_all_opts` → **keep** (unrelated transforms; fail A and B).
- `shared/constants` → **keep** (unrelated domains).

- [ ] **Step 2: Verify importer claims**

For each "(B)" / "keep-because-external" claim, run the supporting `rg` and paste
its output into the inventory, e.g.:
`rg -rn '\bextractKeywords\b' src --glob '!*.spec.*'` (expect: only rank_suggested_tags),
`rg -rn '\bsortedTags\b' src --glob '!*.spec.*'` (expect: renderer importers).

- [ ] **Step 3: Commit**

```bash
git add assets/specs/017-src-cohesion-consolidation/cohesion-inventory.md
git commit -m "Add cohesion merge-bar inventory"
```

**Acceptance gate (COH-2 AC1):** every candidate file bucketed with importer evidence; merges cite bar (A)/(B), keeps cite external importer or distinct concern.

---

### Task 5: `doc.parser.ts` dispatch-family abstraction (bar A)

**Files:**
- Create: `…/knowledges/detail/doc.parser.ts`, `…/detail/doc.parser.spec.ts`
- Delete: `doc.bookmark.parser.ts`, `doc.cheat.parser.ts`, `doc.command.parser.ts`, `doc.shortcut.parser.ts`, `doc.task.parser.ts` (+ specs)
- Modify: `…/detail/doc.assembler.ts`

- [ ] **Step 1: Baseline**

Run: `bun test src/core/domain/models/knowledges/detail`
Expected: PASS.

- [ ] **Step 2: Build `doc.parser.ts`**

Move the five `build*Preamble` function bodies verbatim into
`src/core/domain/models/knowledges/detail/doc.parser.ts` as **module-private**
(no `export`), then move the `buildPreamble` dispatcher out of `doc.assembler.ts`
and **export** it:

```ts
import type { Knowledge } from '../schemas/knowledge.schema'
// move any imports the five builders need (preview/youtube helpers etc.) here

const buildBookmarkPreamble = (knowledge: Knowledge, previewImageUrl?: string) => { /* verbatim */ }
const buildCheatPreamble = (knowledge: Knowledge) => { /* verbatim */ }
const buildCommandPreamble = (knowledge: Knowledge) => { /* verbatim */ }
const buildShortcutPreamble = (knowledge: Knowledge) => { /* verbatim */ }
const buildTaskPreamble = (knowledge: Knowledge, now: Date) => { /* verbatim */ }

/** Build the type-specific document preamble for a knowledge entry. */
export function buildPreamble(knowledge: Knowledge, now: Date, previewImageUrl?: string): string {
  if (knowledge.type === 'command') return buildCommandPreamble(knowledge)
  if (knowledge.type === 'cheat') return buildCheatPreamble(knowledge)
  if (knowledge.type === 'bookmark') return buildBookmarkPreamble(knowledge, previewImageUrl)
  if (knowledge.type === 'task') return buildTaskPreamble(knowledge, now)
  return buildShortcutPreamble(knowledge)
}
```

- [ ] **Step 3: Update `doc.assembler.ts`**

Delete the five `import { build*Preamble } from './doc.*.parser'` lines and the
local `const buildPreamble = …` definition; add
`import { buildPreamble } from './doc.parser'`. Every existing call site of
`buildPreamble(knowledge, now, previewImageUrl)` stays identical.

- [ ] **Step 4: Merge the specs**

Combine the five `doc.*.parser.spec.ts` into `doc.parser.spec.ts`. Because the
builders are now private, assert through the public `buildPreamble(...)` for each
`knowledge.type` (the old specs' inputs/expected outputs move over unchanged,
wrapped to call `buildPreamble`).

- [ ] **Step 5: Delete old files + verify**

```bash
git rm src/core/domain/models/knowledges/detail/doc.bookmark.parser.ts \
       src/core/domain/models/knowledges/detail/doc.cheat.parser.ts \
       src/core/domain/models/knowledges/detail/doc.command.parser.ts \
       src/core/domain/models/knowledges/detail/doc.shortcut.parser.ts \
       src/core/domain/models/knowledges/detail/doc.task.parser.ts
# plus any co-located specs that existed
```

Run: `rg -rn 'doc\.(bookmark|cheat|command|shortcut|task)\.parser' src`
Expected: 0.
Run: `rg -n 'buildPreamble' src/core/domain/models/knowledges/detail/doc.assembler.ts`
Expected: an `import` line, not a `const buildPreamble =` definition.
Run: `bun test src/core/domain/models/knowledges/detail && bun run typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Unify doc preambles behind buildPreamble"
```

**Acceptance gate (COH-2 AC2):** only `doc.parser.ts` remains; `buildPreamble` exported there and imported by the assembler; detail suite green; output byte-identical.

---

### Task 6: Encapsulate tag-ranking helpers (bar B)

**Files:**
- Modify: `…/knowledges/tags/rank_suggested_tags.util.ts`, `…/tags/rank_suggested_tags.util.spec.ts`
- Delete: `extract_keywords.util.ts`, `cooccurrence.util.ts` (+ specs)

- [ ] **Step 1: Baseline**

Run: `bun test src/core/domain/models/knowledges/tags`
Expected: PASS.

- [ ] **Step 2: Inline the two helpers as private functions**

In `rank_suggested_tags.util.ts`, delete the imports
`from './cooccurrence.util'` and `from './extract_keywords.util'`, and paste the
function bodies of `extractKeywords`, `computeCooccurrence` (and its helper
`countCooccurrence`) **verbatim** into the file as **non-exported** functions
above `rankSuggestedTags`. The `rankSuggestedTags` body is unchanged (it already
calls `extractKeywords(...)` and `computeCooccurrence(...)`).

- [ ] **Step 3: Merge specs**

Move any direct unit tests from `extract_keywords.util.spec.ts` /
`cooccurrence.util.spec.ts` into `rank_suggested_tags.util.spec.ts`. If they
tested the now-private functions directly, re-express them through
`rankSuggestedTags` outputs, or drop only if fully covered by the ranking tests
(note which in the commit).

- [ ] **Step 4: Delete + verify**

```bash
git rm src/core/domain/models/knowledges/tags/extract_keywords.util.ts \
       src/core/domain/models/knowledges/tags/extract_keywords.util.spec.ts \
       src/core/domain/models/knowledges/tags/cooccurrence.util.ts \
       src/core/domain/models/knowledges/tags/cooccurrence.util.spec.ts
```

Run: `rg -rn 'extract_keywords|cooccurrence' src --glob '!*rank_suggested*'`
Expected: 0 (no importer outside the orchestrator).
Run: `rg -rn '\bsortedTags\b' src --glob '!*.spec.*'`
Expected: still resolves (renderer importers intact — `sorted_tags.util.ts` untouched).
Run: `bun test src/core/domain/models/knowledges/tags && bun test src/shell/app && bun run typecheck`
Expected: PASS (`App.suggestTags` unchanged).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Encapsulate tag-ranking helpers"
```

**Acceptance gate (COH-2 AC3):** `extract_keywords`/`cooccurrence` exist only inside `rank_suggested_tags.util.ts`; `sorted_tags.util.ts` intact; tags + app suites green.

---

### Task 7: Encapsulate task-view predicates (bar B)

**Files:**
- Modify: `…/knowledges/task_views/filter_by_view.util.ts`, `…/task_views/filter_by_view.util.spec.ts`
- Delete: `is_actionable.util.ts`, `is_overdue.util.ts` (+ specs)

- [ ] **Step 1: Baseline**

Run: `bun test src/core/domain/models/knowledges/task_views`
Expected: PASS.

- [ ] **Step 2: Inline the two predicates**

In `filter_by_view.util.ts`, delete the imports `from './is_actionable.util'`
and `from './is_overdue.util'`, and paste the `isActionablePlaceholder` and
`isOverdue` bodies **verbatim** as **non-exported** functions. The existing
`Record<TaskView, predicate>` keeps calling them unchanged.

- [ ] **Step 3: Merge specs**

Fold `is_actionable.util.spec.ts` / `is_overdue.util.spec.ts` assertions into
`filter_by_view.util.spec.ts`, expressed through the view predicates.

- [ ] **Step 4: Delete + verify**

```bash
git rm src/core/domain/models/knowledges/task_views/is_actionable.util.ts \
       src/core/domain/models/knowledges/task_views/is_actionable.util.spec.ts \
       src/core/domain/models/knowledges/task_views/is_overdue.util.ts \
       src/core/domain/models/knowledges/task_views/is_overdue.util.spec.ts
```

Run: `rg -rn 'is_actionable|is_overdue' src --glob '!*filter_by_view*'`
Expected: 0.
Run: `rg -rn '\bshowTaskSection\b' src --glob '!*.spec.*'`
Expected: still resolves (renderer importers intact — `show_task_section.util.ts` untouched).
Run: `bun test src/core/domain/models/knowledges/task_views && bun run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Encapsulate task-view predicates"
```

**Acceptance gate (COH-2 AC4, AC5, AC6):** `is_actionable`/`is_overdue` live only in `filter_by_view.util.ts`; `show_task_section.util.ts` intact; `list_opts`/`shared/constants` untouched; net COH-2 non-spec deletions = **8**; rule files unchanged; all gates green.

---

## Phase C — COH-3 ls-lint strengthening spike

### Task 8: Spike — expressibility + blast radius

**Files:**
- Create: `assets/specs/017-src-cohesion-consolidation/lslint-spike.md`

- [ ] **Step 1: Test expressibility for a single-segment suffix (`.util.ts`)**

In a scratch copy of `.ls-lint.yml`, add to one well-scoped dir (e.g.
`src/shell/renderer/utils/shared`) a rule keyed by the multi-segment extension
and run the linter:

```yaml
  src/shell/renderer/utils/shared:
    .util.ts: regex:^[a-z][a-z0-9_]*$
```

Run: `bun run lint:ls 2>&1 | tee tmp/lslint_probe.txt`
Record in `lslint-spike.md`: did ls-lint accept a `.util.ts` rule key at all, and
did it govern the suffixed files? (This answers whether the first-dot model lets
the suffix vocabulary be enforced.)

- [ ] **Step 2: Measure blast radius per suffix**

For each suffix where Step 1 proves enforcement is possible, add the strengthening
rule across its dirs, run `bun run lint:ls`, and count NEW failures. Record a table:

```
suffix   | enforceable? | new failures | offending files
util     | …            | …            | …
hook     | …            | …            | …
component| …            | …            | …
const … (etc.)
```

Revert the scratch `.ls-lint.yml` after measuring (`git checkout .ls-lint.yml`).

- [ ] **Step 3: Write the decision**

In `lslint-spike.md`, state the verdict:
- **PROCEED** if enforcement is expressible AND total new failures ≤ **10**.
- **DEFER** otherwise (record the failure count + a recommended follow-up spec).

- [ ] **Step 4: Commit the spike**

```bash
git add assets/specs/017-src-cohesion-consolidation/lslint-spike.md
git commit -m "Spike ls-lint suffix-contract strengthening"
```

**Acceptance gate (COH-3 AC1, AC2):** `lslint-spike.md` records expressibility + a per-suffix failure table + an explicit PROCEED/DEFER verdict; `.ls-lint.yml` unchanged at this point.

---

### Task 9: Conditional strengthening (only if Task 8 = PROCEED)

**Files:**
- Modify: `.ls-lint.yml` (additive), plus any ≤10 offending filenames + their import sites.

- [ ] **Step 1: If DEFER — stop here**

If the spike verdict is DEFER, make **no** `.ls-lint.yml` change. Confirm
`git diff .ls-lint.yml` is empty and proceed to Phase D. (COH-3 AC4 satisfied by
the committed spike doc.)

- [ ] **Step 2: If PROCEED — add the strengthening rules**

Apply the exact additive rules validated in the spike to `.ls-lint.yml`. Permit
the pre-existing suffixless `src/shared/logging/logger.ts` per the spike's
recommendation (either an allowance in its dir rule or a documented rename).

- [ ] **Step 3: Fix the ≤10 offenders**

Rename each offending file to the contract-valid name and update its importers
(`rg` the old basename → update). Keep co-located specs renamed in lockstep.

- [ ] **Step 4: Verify green + additive-only**

Run: `bun run lint:ls && bun test && bun run typecheck`
Expected: PASS.
Run: `git diff .ls-lint.yml`
Expected: only additions (no rule removed or loosened).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Strengthen ls-lint suffix contract"
```

**Acceptance gate (COH-3 AC3 or AC4):** PROCEED → `.ls-lint.yml` additive, `bun run lint:ls` green, ≤10 files renamed; DEFER → `.ls-lint.yml` unchanged, spike doc states deferral.

---

## Phase D — Closeout

### Task 10: Closeout metrics, catalog key, full gate

**Files:**
- Create: `assets/specs/017-src-cohesion-consolidation/closeout-metrics.txt`
- Modify: `assets/catalog/catalog.yaml`

- [ ] **Step 1: Record actuals**

Re-run each command in `baseline-metrics.txt`; write results + baseline + target
into `closeout-metrics.txt`. Verify: logging non-spec=7/spec=5; index `@logtape`
imports=0; COH-2 deletions=8; `detail/doc.*.parser.ts`=1.

- [ ] **Step 2: Register the catalog key**

Add `src_cohesion:` to `assets/catalog/catalog.yaml`, mirroring the shape of the
existing `ops_cli_dry:` / `src_kernel_dry:` entries, pointed at
`assets/specs/017-src-cohesion-consolidation`.

- [ ] **Step 3: Full gate**

Run: `mise run spec ready assets/specs/017-src-cohesion-consolidation --key src_cohesion`
Expected: PASS (`bun test`, typecheck, depcruise, ls-lint, biome, knip + catalog validation).

- [ ] **Step 4: Confirm frozen rule files**

Run: `git diff --name-only biome.jsonc .dependency-cruiser.cjs knip.jsonc`
Expected: empty. (`.ls-lint.yml` changed only if COH-3 PROCEEDed.)

- [ ] **Step 5: Commit**

```bash
git add assets/specs/017-src-cohesion-consolidation/closeout-metrics.txt assets/catalog/catalog.yaml
git commit -m "Record 017 closeout metrics and catalog key"
```

**Acceptance gate (DoD 1–6):** all target floors met; `mise run spec ready … --key src_cohesion` green; non-ls-lint rule files unchanged.

---

## Self-review checklist (run before handing off)

- [ ] Every COH-1/COH-2/COH-3 criterion maps to a task gate.
- [ ] No placeholders: each step shows real code or an exact verbatim-move instruction + command + expected result.
- [ ] Name consistency: `rpc.plugin.ts`, `buildPreamble`, `doc.parser.ts`, `rank_suggested_tags.util.ts`, `filter_by_view.util.ts`, `RENDERER_BUILD_ENV` used identically across tasks.
- [ ] Behaviour frozen: every merge task baselines green then re-verifies green.
- [ ] Only `.ls-lint.yml` may change (COH-3 PROCEED); biome/depcruise/knip never.
