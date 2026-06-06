<!-- markdownlint-disable-file -->
# Phase 4 — Data Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land Phase 4 of the app foundation roadmap as a single `feat(data)` commit on `chore-add-domain` — the SQLite data substrate (`src/shell/app/db/`), the YAML import service, the config layer (TypeBox replaces Zod), the logging adapter, the test infrastructure (Fishery factories + curated YAML corpus), and the agent-skill drift fixes — while collapsing the 5 leftover phase stashes into a single `phase-pending` stash for cleaner future recovery.

**Architecture:** I/O lives under `src/shell/app/`. SQLite uses `bun:sqlite` directly — no Drizzle, no `drizzle-typebox`, no `drizzle-seed`. YAML parsing uses `Bun.YAML.parse()` everywhere (already standard in `@core` per `tools/rules/no-bun-in-core.rule.yml`). Validation uses TypeBox at every boundary. Test fixtures use Fishery factories for typed rows; YAML fixtures only exist for `import.service.spec.ts` end-to-end paths.

**Tech Stack:** Bun 1.x runtime + `bun:test` (Better Specs `describe`/`it`). `bun:sqlite` with typed prepared statements. `@sinclair/typebox` + `@sinclair/typebox/value`. `@logtape/logtape` + `@logtape/pretty`. `fast-glob`. `fishery`. `happy-dom`. **No** Drizzle, **no** Zod, **no** `js-yaml`.

**Spec source of truth:** [`design.md`](design.md). Section references like "design §SCHEMA" point to that file.

**Legacy reference:** `~/Work/bun/app_legacy` worktree at commit `cc3d08b` is the authoritative source for the working legacy implementation. The pre-collapse stashes hold partial / truncated versions; treat the legacy worktree as the source of truth when content disagrees.

---

## Pre-flight state

- **Branch:** `chore-add-domain`
- **HEAD before this plan:** the Phase 3 commit (`feat(core): Add domain types, schemas, parsers`).
- **HEAD after Task 17:** new commit with subject `feat(data): Add SQLite schema, repositories, import service`.
- **Working tree before Task 1:** clean. The 5 phase stashes hold every uncommitted Phase 4–7 + misc file.
- **Stash list before Task 1:** 6 entries — `phase-4-data-layer`, `phase-5-rpc`, `phase-6-renderer-list`, `phase-7-renderer-detail`, `phase-misc-docs`, plus the original `WIP on main` from before Phase 3.
- **Stash list after Task 18:** 2 entries — the new `phase-pending` (single consolidated stash) and the original `WIP on main`.

---

## Commit map

This plan produces ONE commit. All other tasks are non-commit operations (audit, install, edit, restore, verify, gate).

| Task | Subject                                                       | Scope                                                                                                |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 17   | `feat(data): Add SQLite schema, repositories, import service` | All of `src/shell/app/{db,config,lib}/`, logging stack, test infra, YAML fixtures, lint + skill sync |

---

## Verification commands cheat-sheet

| Goal                             | Command                                                              |
| -------------------------------- | -------------------------------------------------------------------- |
| TypeScript shape                 | `bun run typecheck`                                                  |
| Phase 4 unit + integration tests | `bun test src/shell/app src/__tests__ src/shared/logging`            |
| Full test suite                  | `bun test`                                                           |
| Coverage on changed paths        | `bun test --coverage src/shell/app src/__tests__ src/shared/logging` |
| Biome on Phase 4 paths           | `bunx biome check src/shell/app src/__tests__ src/shared/logging`    |
| Knip on full repo                | `bunx knip`                                                          |
| Dependency-cruiser               | `bunx depcruise src --config .dependency-cruiser.cjs`                |
| ls-lint                          | `bunx @ls-lint/ls-lint`                                              |
| ast-grep no-bun-in-core          | `bunx @ast-grep/cli scan --rule tools/rules/no-bun-in-core.rule.yml`      |
| Lint pipeline (all of the above) | `bun run lint`                                                       |
| Build smoke (macOS)              | `bun run build`                                                      |
| Drizzle absent                   | `bun pm ls --all 2>/dev/null \| grep -i drizzle \|\| echo CLEAN`     |
| Zod absent                       | `rg -n "from 'zod'\|require\('zod'\)" src/`                          |
| js-yaml absent                   | `rg -n "from 'js-yaml'\|require\('js-yaml'\)" src/ tools/`           |
| Stash list                       | `git stash list`                                                     |
| Files in HEAD                    | `git diff-tree --no-commit-id --name-only -r HEAD \| wc -l`          |
| Working tree                     | `git status --short`                                                 |

---

## Task 1: Pre-flight — collapse stashes, delete `docs/superpowers/`, write manifest

**Files:**

- Create: `tmp/phase-4-stash-manifest.md`
- Delete: `docs/superpowers/` (working tree)
- Drop: `stash@{0}` … `stash@{4}` (the 5 phase stashes)

**Why:** The 5 phase stashes are nested supersets, not deltas. Splitting them into proper deltas would need ~150 conflict resolutions. Collapsing to one stash plus the legacy worktree as backup is the recoverable path. `docs/superpowers/` is a brainstorming-skill default that must never land — it gets deleted permanently and added to `.gitignore` (Task 14). The manifest replaces `tmp/phase-3-stash-manifest.md`.

- [ ] **Step 1: Confirm pre-flight stash state**

```bash
git stash list
echo "---"
git status --short | wc -l
```

Expected: 6 stash entries (5 phase + 1 WIP); `git status` ≈ 0 lines (clean tree, post-Phase-3).

- [ ] **Step 2: Verify legacy worktree exists**

```bash
test -d ~/Work/bun/app_legacy && echo OK || echo "MISSING — clone with: git worktree add ~/Work/bun/app_legacy cc3d08b"
```

Expected: `OK`. If `MISSING`, run the suggested command before continuing.

- [ ] **Step 3: Apply the largest stash (phase-misc-docs at stash@{4} — superset of all)**

```bash
git stash apply stash@{4}
git status --short | wc -l
```

Expected: ≈ 1070 lines (all uncommitted Phase 4–7 + misc files now in the working tree). If conflicts appear, STOP — the stashes have drifted from the recorded topology and the legacy worktree must be used directly. Report the conflicts and stop.

- [ ] **Step 4: Drop all 5 phase stashes (highest index first)**

```bash
git stash drop stash@{4}    # phase-misc-docs
git stash drop stash@{3}    # phase-7-renderer-detail
git stash drop stash@{2}    # phase-6-renderer-list
git stash drop stash@{1}    # phase-5-rpc
git stash drop stash@{0}    # phase-4-data-layer
git stash list
```

Expected: 1 entry remaining — the original `WIP on main` (re-indexed to `stash@{0}`).

- [ ] **Step 5: Permanently delete `docs/superpowers/`**

```bash
rm -rf docs/superpowers/
test -e docs/superpowers && echo "STILL PRESENT" || echo "GONE"
```

Expected: `GONE`. If the directory is still present (e.g. nested git ignore), force-remove and recheck.

- [ ] **Step 6: Write `tmp/phase-4-stash-manifest.md`**

```bash
cat > tmp/phase-4-stash-manifest.md <<'EOF'
# Phase 4 — Stash manifest

Generated at the start of Phase 4. Replaces `tmp/phase-3-stash-manifest.md`.

## Decision

The 5 phase stashes (`phase-4-data-layer` … `phase-misc-docs`) created
during Phase 3 were nested supersets, not deltas. Splitting them into
proper deltas would have required ~150 conflict resolutions. They were
collapsed into a single working-tree apply at the start of Phase 4
(see `assets/docs/archive/data-layer/design.md` § PRE-FLIGHT — STASH
RECONCILIATION).

After the Phase 4 commit, everything that did NOT land in the commit is
re-stashed as a single `phase-pending` entry (see Task 18).

## Working set after Task 1

- ~1070 files in the working tree (every Phase 4–7 + misc file).
- `docs/superpowers/` permanently deleted; entry added to `.gitignore`
  in Task 14.

## Phase 4 commit (`feat(data)`) lands ~150 paths

See `assets/docs/archive/data-layer/design.md` § ARCHITECTURE — FILE INVENTORY.

## phase-pending stash (after Task 18)

Holds every path that did not commit: AppService, RPC, renderer,
preview server, benchmarks. Tracked through future phases by name. The
commit-eligible paths each phase needs are listed in the design doc's
**Files deferred** table.

## Authoritative legacy reference

For any file the working tree disagrees with, consult
`~/Work/bun/app_legacy` at commit `cc3d08b`. That worktree contains the
complete legacy implementations (e.g. `src/shell/app/db/entry.repository.ts`
is 193 lines there vs. ~80 lines in the pre-collapse stash).
EOF
ls -la tmp/phase-4-stash-manifest.md
```

Expected: file exists, ~30 lines.

- [ ] **Step 7: Capture the working-tree inventory for later cross-reference**

```bash
git status --short > tmp/_phase-4_status_raw.txt
wc -l tmp/_phase-4_status_raw.txt
```

Expected: ≈ 1070 lines.

---

## Task 2: Install dependencies + update `tsconfig.json` paths

**Files:**

- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `bun.lock` (regenerated)

**Why:** Phase 4 uses 5 runtime deps and 1 dev dep that are present in `node_modules` (legacy install) but NOT declared in `package.json`. Declare them now so `bun install` is reproducible. Path aliases for `@shared/logging`, `@shell/app`, `@shell/app/db`, `@shell/app/config`, `@shell/app/lib`, and `@testing` enable barrel-only imports per design §PATH ALIASES — no `/*` wildcards.

- [ ] **Step 1: Verify the working tree's node_modules has the libraries we expect**

```bash
for pkg in @logtape/logtape @logtape/pretty fast-glob fishery happy-dom; do
  test -d "node_modules/$pkg" && echo "OK    $pkg" || echo "MISS  $pkg"
done
```

Expected: 5 `OK`. If any are `MISS`, the legacy `node_modules` is stale; run `bun install` first.

- [ ] **Step 2: Confirm Drizzle / Zod / js-yaml are NOT consumed**

```bash
rg -n "from 'drizzle-(orm|kit|typebox|seed)'|require\('drizzle-(orm|kit|typebox|seed)'\)" src/ tools/ || echo "NO drizzle imports"
rg -n "from 'zod'|require\('zod'\)" src/ tools/ || echo "NO zod imports"
rg -n "from 'js-yaml'|require\('js-yaml'\)" src/ tools/ || echo "NO js-yaml imports"
```

Expected: three `NO …` lines. If any imports remain, fix them in the relevant task before that file's commit (e.g. `config.schema.ts` Zod migration in Task 9).

- [ ] **Step 3: Add runtime deps**

```bash
bun add @logtape/logtape @logtape/pretty fast-glob fishery
```

Expected: `package.json` now declares the four packages under `dependencies`. The version pins should match what was already in `node_modules`.

- [ ] **Step 4: Add dev dep**

```bash
bun add -d happy-dom
```

Expected: `package.json` declares `happy-dom` under `devDependencies`.

- [ ] **Step 5: Edit `tsconfig.json` paths block**

Open `tsconfig.json` and replace the `paths` block with this exact content (legacy aliases preserved verbatim — see design §PATH ALIASES for rationale):

```jsonc
"paths": {
  // Legacy aliases (committed pre-Phase-4) — kept verbatim.
  "@core":             ["./src/core/index.ts"],
  "@core/*":           ["./src/core/*"],
  "@shared/utils":     ["./src/shared/utils/index.ts"],
  "@shared/utils/*":   ["./src/shared/utils/*"],
  "@shared/types":     ["./src/shared/types/index.ts"],
  "@shared/types/*":   ["./src/shared/types/*"],

  // Phase 4 — barrel-only, explicit sub-barrels, no wildcards.
  "@shared/logging":   ["./src/shared/logging/index.ts"],
  "@shell/app":        ["./src/shell/app/index.ts"],
  "@shell/app/db":     ["./src/shell/app/db/index.ts"],
  "@shell/app/config": ["./src/shell/app/config/index.ts"],
  "@shell/app/lib":    ["./src/shell/app/lib/index.ts"],
  "@testing":          ["./src/__tests__/index.ts"]
}
```

Save the file.

- [ ] **Step 6: Verify**

```bash
git diff -- package.json tsconfig.json | head -60
bun run typecheck 2>&1 | head -20
```

Expected: `package.json` shows new dep declarations; `tsconfig.json` shows the new aliases. `typecheck` may emit errors at this point (barrel files don't exist yet); proceed regardless — Task 8 lands the barrels.

---

## Task 3: Drizzle-strip `db/schema.ts` and `db/client.ts`

**Files:**

- Modify: `src/shell/app/db/schema.ts`
- Modify: `src/shell/app/db/client.ts`

**Why:** Per design Decisions 5 and §SCHEMA, the schema becomes raw SQL DDL constants + TypeScript row types. The client returns a plain `Database` (no `{ db, raw }` wrapper) and runs the idempotent bootstrap DDL on every open. Both files exist in the working tree from Task 1's stash apply but contain Drizzle. Replace their contents per design.

- [ ] **Step 1: Verify both files are in the working tree**

```bash
test -f src/shell/app/db/schema.ts && echo OK_schema
test -f src/shell/app/db/client.ts && echo OK_client
```

Expected: 2 `OK_*` lines.

- [ ] **Step 2: Replace `src/shell/app/db/schema.ts` with the new content**

Replace the entire file with the content from design §SCHEMA / `src/shell/app/db/schema.ts`. The file exports three SQL DDL constants (`CREATE_KNOWLEDGES_SQL`, `CREATE_FTS_SQL`, `CREATE_INDEXES_SQL`) and two TypeScript types (`KnowledgeRow`, `KnowledgeInsert`). All four future columns (`doc`, `task_order`, `due_date`, `depends_on`) are declared up-front per Decision 7.

NOTE: the column order inside `CREATE_KNOWLEDGES_SQL` is the contract — `entry.repository.ts` `UPSERT_SQL` (Task 4) binds parameters by name (`$id`, `$type`, …), so column order must match the TypeScript `KnowledgeInsert` field ordering for readability. Do not reorder.

- [ ] **Step 3: Replace `src/shell/app/db/client.ts` with the new content**

Replace the entire file with the content from design §SCHEMA / `src/shell/app/db/client.ts`:

```ts
import { Database } from 'bun:sqlite'
import { expandPath } from '@shared/utils'
import { CREATE_FTS_SQL, CREATE_INDEXES_SQL, CREATE_KNOWLEDGES_SQL } from './schema'

export type DbHandle = Database

export function openDatabase(dbPath: string): DbHandle {
  const resolved = dbPath === ':memory:' ? dbPath : expandPath(dbPath)
  const db = new Database(resolved, { strict: true })
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.run(CREATE_KNOWLEDGES_SQL)
  db.run(CREATE_FTS_SQL)
  for (const sql of CREATE_INDEXES_SQL) db.run(sql)
  return db
}
```

NOTE: `strict: true` lets prepared-statement bindings drop the `$` prefix when convenient and rejects calls missing parameters — both behaviours are exercised in `client.spec.ts` (Task 11).

- [ ] **Step 4: Verify**

```bash
rg -l "drizzle" src/shell/app/db/ || echo "NO drizzle"
rg -n "import.*'bun:sqlite'" src/shell/app/db/{schema,client}.ts
bun run typecheck 2>&1 | rg "src/shell/app/db/(schema|client)" || echo "NO type errors in schema/client"
```

Expected: `NO drizzle` (Drizzle stripped); both files import from `bun:sqlite`; typecheck reports no errors specific to these two files (errors elsewhere are expected — repository / import service still hold Drizzle code in this state).

---

## Task 4: Rewrite `db/entry.repository.ts`

**Files:**

- Modify: `src/shell/app/db/entry.repository.ts`

**Why:** Per design §REPOSITORY APIs, the legacy public API is preserved (6 functions: `upsert`, `rebuildFts`, `findAll`, `findById`, `getDbStats`, `getTagCounts`) but the internals move to typed `db.query<KnowledgeRow, [params]>(…)` prepared statements. `upsert` becomes hand-written `INSERT … ON CONFLICT(id) DO UPDATE SET …`. The legacy `~/Work/bun/app_legacy` worktree at `cc3d08b` is the **complete** 193-line reference; the pre-collapse stash held a truncated ~80-line version.

- [ ] **Step 1: Open the legacy reference**

```bash
cat ~/Work/bun/app_legacy/src/shell/app/db/entry.repository.ts | wc -l
```

Expected: ≈ 193 lines. Read the file end-to-end to internalise the `findAll` two-branch dispatch (FTS5 join when `query` is non-empty, plain `SELECT` otherwise), the in-process tag-AND filter, the `toFts5MatchQuery` helper, and the `rowToKnowledge` mapper.

- [ ] **Step 2: Replace `src/shell/app/db/entry.repository.ts`**

Rewrite the file using the legacy as the reference, with these specific transforms:

1. Replace `import { drizzle } from 'drizzle-orm/bun-sqlite'` and any `drizzle-orm/sqlite-core` imports with `import { type Database } from 'bun:sqlite'`.
2. Replace any `drizzle(sqlite, { schema })` constructor with the plain `Database` parameter. Functions take `db: Database` directly.
3. Replace Drizzle's `db.select()`, `db.insert()`, etc. with `db.query<KnowledgeRow, [params]>(SQL).all(…)` / `.get(…)` / `.run(…)`.
4. `upsert` becomes the hand-written `INSERT … ON CONFLICT(id) DO UPDATE SET …` per design §REPOSITORY APIs / Hot-path implementations. The "inserted" vs. "updated" return is determined by a `SELECT 1 FROM knowledges WHERE id = ?` probe immediately before the upsert.
5. `rebuildFts(db)` runs the standard FTS5 rebuild SQL: `INSERT INTO knowledges_fts(knowledges_fts) VALUES('rebuild');`.
6. `rowToKnowledge(row: KnowledgeRow): Knowledge` reads only the columns the current `Knowledge` type exposes — `doc`, `task_order`, `due_date`, `depends_on` are stored but NOT surfaced until Phase 7/9 extends `Knowledge` and the mapper.
7. Drop any `async` modifiers — `bun:sqlite` is synchronous.

- [ ] **Step 3: Verify**

```bash
rg -l "drizzle" src/shell/app/db/entry.repository.ts || echo "NO drizzle"
rg -n "async" src/shell/app/db/entry.repository.ts | grep -v "//" || echo "NO async"
rg -n "db\.query<" src/shell/app/db/entry.repository.ts | wc -l
bun run typecheck 2>&1 | rg "src/shell/app/db/entry\.repository" || echo "NO type errors"
```

Expected: no `drizzle`; no `async`; ≥ 5 typed `db.query<…>` call sites; no typecheck errors specific to this file.

---

## Task 5: Adjust `db/import.service.ts`

**Files:**

- Modify: `src/shell/app/db/import.service.ts`

**Why:** Per design §IMPORT SERVICE, the public class shape stays the same (`runOnce(sourcesDir, opts?)`) but the body uses the new `upsert(db, row)` directly and `db.transaction(() => { … })()` for atomic per-bundle commits. YAML reading is delegated to `@core` `parseSourceFile` (which uses `Bun.YAML.parse` internally per `tools/rules/no-bun-in-core.rule.yml`). FTS5 rebuild happens once at the end. Partial failure (V1-2 §3) is captured per file.

- [ ] **Step 1: Open the legacy reference**

```bash
cat ~/Work/bun/app_legacy/src/shell/app/db/import.service.ts | wc -l
```

Expected: ~150 lines. Read the file to internalise the per-file try/catch, the progress callback semantics, and the error-collection pattern.

- [ ] **Step 2: Rewrite the body using the new repository API**

Specific transforms vs. legacy:

1. Replace any `import { drizzle } …` with `import { type Database } from 'bun:sqlite'`.
2. The constructor receives `dbPath` and opts; internally calls `openDatabase(dbPath)` from `./client`.
3. The body of `runOnce` walks `fast-glob('**/*.{yaml,yml}', { cwd: sourcesDir, absolute: true })` and for each file:
   - `await Bun.file(filePath).text()` (or `fs.promises.readFile(filePath, 'utf-8')`).
   - `parseSourceFile(filePath, content)` (from `@core`).
   - Wrap the per-entry loop in `db.transaction(() => { … })()` — a single bundle = a single transaction.
   - For each entry: `isValidSourceRowMin(entry)` → `toKnowledge(entry, now)` → `upsert(db, row)`. Track `inserted` / `updated` from the return.
   - Errors caught per file push a string into `result.errors` and continue with the next file.
4. After the file loop: call `rebuildFts(db)` once.
5. The progress callback fires after each bundle commits (not mid-bundle).
6. The `assembleDoc()` integration is **deferred to Phase 7**. The `doc` column stays at its DDL default `''` for now.

- [ ] **Step 3: Verify**

```bash
rg -l "drizzle" src/shell/app/db/import.service.ts || echo "NO drizzle"
rg -n "db\.transaction\(" src/shell/app/db/import.service.ts | wc -l
rg -n "rebuildFts\(" src/shell/app/db/import.service.ts | wc -l
rg -n "assembleDoc" src/shell/app/db/import.service.ts || echo "NO assembleDoc (deferred)"
bun run typecheck 2>&1 | rg "src/shell/app/db/import\.service" || echo "NO type errors"
```

Expected: no Drizzle; one `db.transaction(` call site; one `rebuildFts(` call site; no `assembleDoc` reference; no type errors specific to this file.

---

## Task 6: Rewrite `config/config.schema.ts` (Zod → TypeBox) and adjust `config.loader.ts`

**Files:**

- Modify: `src/shell/app/config/config.schema.ts`
- Modify: `src/shell/app/config/config.loader.ts`

**Why:** Per design Decision 2 and §VALIDATION FLOW, Zod is removed entirely; the last hold-out (`config.schema.ts`) migrates to TypeBox. `parseConfig(raw): Result<RawConfig, string[]>` replaces Zod's `safeParse`. `config.loader.ts` reads YAML via `Bun.YAML.parse()` (project standard per `tools/rules/no-bun-in-core.rule.yml`).

- [ ] **Step 1: Replace `config/config.schema.ts`**

Replace the entire file with the TypeBox version from design §VALIDATION FLOW / `config.schema.ts` (verbatim — ~50 lines). Key shape:

- Re-exports the four `PAGE_SIZE_*` constants.
- `configSchema` is a `Type.Object({ database, sources, display })` with optional sub-objects.
- `RawConfig = Static<typeof configSchema>`.
- `ResolvedConfig` is the post-defaults shape (database/sources/display all required).
- `DEFAULT_CONFIG_BODY: RawConfig` mirrors `DEFAULTS` from `@core/constants`.
- `parseConfig(raw: unknown): Result<RawConfig, string[]>` runs `Value.Check`; on failure, maps `Value.Errors` into `path: message` strings via `neverthrow`'s `err`.

- [ ] **Step 2: Adjust `config/config.loader.ts`**

The legacy `loadConfig` calls `configSchema.safeParse(raw)`. Replace with `parseConfig(raw)` and handle the `Result` shape:

1. `const text = await Bun.file(path).text()` — keep the `Bun.file` API.
2. `const raw = Bun.YAML.parse(text) as unknown` — replace any `yaml.load(text)` / `js-yaml` usage with `Bun.YAML.parse`.
3. `const parsed = parseConfig(raw)` — new TypeBox call.
4. Branch on `parsed.isErr()` — return the error variant or proceed.
5. The "defaults injection" that Zod's `.default()` previously did at *parse time* now happens at *resolve time* — `resolveConfig(parsed.value): ResolvedConfig` walks the parsed shape and fills missing fields from `DEFAULT_CONFIG_BODY` + `DEFAULTS`. This may already exist in the legacy loader; verify.
6. `saveConfig(current, patch)` round-trips through `Bun.YAML.stringify(merged)` (ast-grep allow-list permits this).

- [ ] **Step 3: Verify**

```bash
rg -l "from 'zod'\|require\('zod'\)" src/ || echo "NO zod"
rg -l "from 'js-yaml'\|require\('js-yaml'\)" src/ || echo "NO js-yaml"
rg -n "parseConfig" src/shell/app/config/config.loader.ts | head -3
rg -n "Bun\.YAML\." src/shell/app/config/config.loader.ts | head -3
bun run typecheck 2>&1 | rg "src/shell/app/config/" || echo "NO config type errors"
```

Expected: no `zod`; no `js-yaml`; `parseConfig` and `Bun.YAML.` both referenced in `config.loader.ts`; no typecheck errors specific to `config/`.

---

## Task 7: Restore the logging stack and re-add `logger.types` re-export

**Files:**

- Restore (already in working tree from Task 1): `src/shared/logging/console.logger.ts`
- Restore: `src/shared/logging/logtape.adapter.ts`
- Restore: `src/shared/logging/index.ts`
- Restore: `src/shared/logging/package.json`
- Restore: `src/shared/types/logger.types.ts`
- Modify: `src/shared/types/index.ts`

**Why:** All five logging files were stashed during Phase 3 (in `phase-5-rpc` per the manifest). They are now in the working tree from Task 1's stash apply. They land verbatim — no changes needed beyond confirming they import only from declared deps. `src/shared/types/index.ts` was edited in Phase 3 to drop `export * from './logger.types'` (Task 8 of `core-domain/tasks.md`); restore that export.

- [ ] **Step 1: Verify the five logging files exist**

```bash
for f in console.logger logtape.adapter index package.json; do
  test -f "src/shared/logging/$f" || test -f "src/shared/logging/$f.ts" \
    && echo "OK   src/shared/logging/$f" \
    || echo "MISS src/shared/logging/$f"
done
test -f src/shared/types/logger.types.ts && echo OK_logger_types || echo MISS_logger_types
```

Expected: 5 `OK*` lines. If any are `MISS`, copy the missing file from `~/Work/bun/app_legacy/`.

- [ ] **Step 2: Verify the logging files compile against declared deps**

```bash
rg -n "from '@logtape" src/shared/logging/ | head -5
rg -n "from 'bun:" src/shared/logging/ || echo "NO bun: imports"
```

Expected: `@logtape/logtape` + `@logtape/pretty` imports present. The `tools/rules/no-bun-in-core.rule.yml` rule does NOT cover `src/shared/logging/`, so Bun globals are allowed here — but logging code typically uses `console` directly.

- [ ] **Step 3: Restore `logger.types` re-export in `src/shared/types/index.ts`**

Open `src/shared/types/index.ts`. Current content (after Phase 3):

```ts
export * from './env.types'
```

Replace with:

```ts
export * from './env.types'
export * from './logger.types'
```

- [ ] **Step 4: Verify**

```bash
cat src/shared/types/index.ts
bun run typecheck 2>&1 | rg "src/shared/(logging|types)/" || echo "NO logging/types errors"
```

Expected: file shows both re-exports; no typecheck errors specific to the logging or types directories.

---

## Task 8: Add net-new barrels and `task_views.types.ts`; restore `task_views.util.ts`

**Files:**

- Create: `src/shell/app/index.ts`
- Create: `src/shell/app/db/index.ts`
- Create: `src/shell/app/config/index.ts`
- Create: `src/shell/app/lib/index.ts`
- Create: `src/shell/app/lib/task_views.types.ts`
- Modify: `src/shell/app/lib/task_views.util.ts`

**Why:** The four barrel files implement the explicit-sub-barrel scheme from design §PATH ALIASES. `task_views.types.ts` is the 1-line literal-union type that severs `task_views.util.ts`'s legacy dependency on `@shared/rpc` (Phase 5). The legacy `task_views.util.ts` imports `TaskView` from `@shared/rpc`; retarget that import to `./task_views.types`.

- [ ] **Step 1: Create `src/shell/app/lib/task_views.types.ts`**

```ts
export type TaskView =
  | 'actionable'
  | 'today'
  | 'overdue'
  | 'this_week'
  | 'all_pending'
  | 'all_doing'
```

- [ ] **Step 2: Retarget `task_views.util.ts`**

Open `src/shell/app/lib/task_views.util.ts`. Locate the line `import type { TaskView } from '@shared/rpc'` (or similar) and change it to:

```ts
import type { TaskView } from './task_views.types'
```

If the file imports anything else from `@shared/rpc`, STOP and report — Phase 4 cannot pull in RPC dependencies.

- [ ] **Step 3: Create the four barrels**

```ts
// src/shell/app/lib/index.ts
export * from './task_views.types'
export * from './task_views.util'
```

```ts
// src/shell/app/config/index.ts
export * from './config.loader'
export * from './config.schema'
```

```ts
// src/shell/app/db/index.ts
export * from './client'
export * from './entry.repository'
export * from './import.service'
export * from './schema'
```

```ts
// src/shell/app/index.ts
export * from './db'
export * from './config'
export * from './lib'
```

- [ ] **Step 4: Verify barrel resolution**

```bash
bun run typecheck 2>&1 | rg "src/shell/app/" | head -20 || echo "NO @shell/app errors"
rg -n "from '@shared/rpc'" src/shell/app/ || echo "NO @shared/rpc imports"
```

Expected: no typecheck errors under `src/shell/app/`; no `@shared/rpc` imports remain.

---

## Task 9: Restore + rename test infrastructure (11 files)

**Files (all restored from Task 1's stash apply, then renamed):**

| Old path                                            | New path                                          |
| --------------------------------------------------- | ------------------------------------------------- |
| `src/__tests__/index.ts`                            | (unchanged) `src/__tests__/index.ts`              |
| `src/__tests__/paths.ts` + `paths.spec.ts`          | (unchanged)                                       |
| `src/__tests__/factories/factories.builder.ts`      | `src/__tests__/factories/entries.factory.ts`      |
| `src/__tests__/factories/factories.builder.spec.ts` | `src/__tests__/factories/entries.factory.spec.ts` |
| `src/__tests__/testing.factory.ts`                  | `src/__tests__/helpers/factory.helper.ts`         |
| `src/__tests__/testing.factory.spec.ts`             | `src/__tests__/helpers/factory.helper.spec.ts`    |
| `src/__tests__/testing.seed.ts`                     | `src/__tests__/helpers/seed.helper.ts`            |
| `src/__tests__/testing.seed.spec.ts`                | `src/__tests__/helpers/seed.helper.spec.ts`       |
| `src/__tests__/testing.tmp.ts`                      | `src/__tests__/helpers/tmp.helper.ts`             |
| `src/__tests__/testing.tmp.spec.ts`                 | `src/__tests__/helpers/tmp.helper.spec.ts`        |
| `src/__tests__/testing.types.ts`                    | `src/__tests__/helpers/factory.types.ts`          |
| `src/__tests__/testing.react.helper.ts`             | `src/__tests__/helpers/react.helper.ts`           |
| `src/__tests__/fixtures/config.invalid.yaml`        | `src/__tests__/fixtures/config.invalid.yaml`      |

**Why:** Per design §LINT CONFIG UPDATES, the new `.ls-lint.yml` rules require helpers in `helpers/` with `.helper` or `.types` suffix; factories with `.factory` suffix; fixtures with snake_case names. The legacy paths violate these rules.

- [ ] **Step 1: Confirm the legacy files are present**

```bash
for f in src/__tests__/factories/factories.builder.ts \
         src/__tests__/testing.factory.ts \
         src/__tests__/testing.seed.ts \
         src/__tests__/testing.tmp.ts \
         src/__tests__/testing.types.ts \
         src/__tests__/testing.react.helper.ts \
         src/__tests__/fixtures/config.invalid.yaml; do
  test -f "$f" && echo "OK   $f" || echo "MISS $f"
done
```

Expected: 7+ `OK` lines. `MISS` indicates a file should be copied from `~/Work/bun/app_legacy/`.

- [ ] **Step 2: Move + rename**

```bash
mkdir -p src/__tests__/helpers
git mv src/__tests__/factories/factories.builder.ts        src/__tests__/factories/entries.factory.ts
git mv src/__tests__/factories/factories.builder.spec.ts   src/__tests__/factories/entries.factory.spec.ts 2>/dev/null || true
git mv src/__tests__/testing.factory.ts                    src/__tests__/helpers/factory.helper.ts
git mv src/__tests__/testing.factory.spec.ts               src/__tests__/helpers/factory.helper.spec.ts 2>/dev/null || true
git mv src/__tests__/testing.seed.ts                       src/__tests__/helpers/seed.helper.ts
git mv src/__tests__/testing.seed.spec.ts                  src/__tests__/helpers/seed.helper.spec.ts 2>/dev/null || true
git mv src/__tests__/testing.tmp.ts                        src/__tests__/helpers/tmp.helper.ts
git mv src/__tests__/testing.tmp.spec.ts                   src/__tests__/helpers/tmp.helper.spec.ts 2>/dev/null || true
git mv src/__tests__/testing.types.ts                      src/__tests__/helpers/factory.types.ts
git mv src/__tests__/testing.react.helper.ts               src/__tests__/helpers/react.helper.ts
git mv src/__tests__/fixtures/config.invalid.yaml          src/__tests__/fixtures/config.invalid.yaml
```

(`git mv` is preferred so rename detection works in the diff. The `2>/dev/null || true` suffix tolerates files that did not exist in the working tree.)

- [ ] **Step 3: Update internal imports across all renamed files**

Each renamed file may import from one of the others using the old name. Walk the new helpers directory and rewrite:

```bash
rg -n "testing\.(factory|seed|tmp|types|react\.helper)" src/__tests__/ tests/ src/
```

For each match, rewrite the import to the new path (`./factory.helper`, `./seed.helper`, etc.). Use `StrReplace` on each file individually — do NOT mass-replace; relative paths matter.

- [ ] **Step 4: Rewrite seed helper to be synchronous**

Open `src/__tests__/helpers/seed.helper.ts`. The legacy version is async with Drizzle (`async function createSeededMemoryDb()`). Per design §TEST INFRASTRUCTURE, replace with the synchronous version:

```ts
import type { Database } from 'bun:sqlite'
import { upsert } from '@shell/app/db'
import { openDatabase } from '@shell/app/db'
import { factoryFor } from '../factories/entries.factory'

export function createSeededMemoryDb(now: number = Date.now()): Database {
  const db = openDatabase(':memory:')
  for (const type of ['bookmark', 'command', 'cheat', 'task'] as const) {
    upsert(db, factoryFor(type, { overrides: { createdAt: now, updatedAt: now } }))
  }
  return db
}
```

- [ ] **Step 5: Update `src/__tests__/index.ts`** to match design §TEST INFRASTRUCTURE / Public surface:

```ts
export { factoryFor }                       from './factories/entries.factory'
export { createFactoryFor }                 from './helpers/factory.helper'
export { createSeededMemoryDb }             from './helpers/seed.helper'
export { createTempDir }                    from './helpers/tmp.helper'
export {
  type FactoryBuildOpts,
  isFactoryOpts,
  type WrappedFactoryOpts,
}                                           from './helpers/factory.types'
export { testingPaths }                     from './paths'
```

(`minimalEntriesYml`, `seedMinimalFixture`, `readMinimalFixtureEntries` are deliberately NOT exported.)

- [ ] **Step 6: Trim `src/__tests__/paths.ts`**

Remove any constant that points at `fixtures/minimal/` (deleted in Task 10). Keep `testingPaths.fixturesDir`, `testingPaths.sampleDir` (new), `testingPaths.configInvalid`.

- [ ] **Step 7: Verify**

```bash
bun run typecheck 2>&1 | rg "src/__tests__/" | head -20 || echo "NO __tests__ errors"
git status --short src/__tests__/ | head -20
```

Expected: no typecheck errors specific to `src/__tests__/`; status shows the renames.

---

## Task 10: Curate the YAML fixture corpus (5 files) + delete legacy fixtures

**Files:**

- Create: `src/__tests__/fixtures/sample/bookmarks.yml`
- Create: `src/__tests__/fixtures/sample/commands.yml`
- Create: `src/__tests__/fixtures/sample/cheats.yml`
- Create: `src/__tests__/fixtures/sample/tasks.yml`
- Create: `src/__tests__/fixtures/sample/mixed_invalid.yml`
- Keep: `src/__tests__/fixtures/minimal/entries.yml` unchanged
- Delete: legacy smoke-corpus directory (56 files)

**Why:** Per design §TEST FIXTURE CORPUS, the bulk-import smoke corpus shrinks to
5 curated files under `sample/`. `minimal/entries.yml` stays untouched for exact
count and idempotency tests. The invalid sample stays meaningful by proving that
one bad bundle does not stop sibling files from importing.

- [ ] **Step 1: Inventory the legacy fixtures**

```bash
find src/__tests__/fixtures -maxdepth 1 -type d | sort
ls src/__tests__/fixtures/minimal/
```

Expected: `sample/` and `minimal/` are present before cleanup; `entries.yml`
exists in `minimal/`.

- [ ] **Step 2: Curate `sample/bookmarks.yml`**

Copy exactly three representative bookmark rows:

- 1× bookmark with a titled link object and shell note.
- 1× placeholder-search URL containing `{Query}`.
- 1× YouTube bookmark with markdown notes.

YAML envelope:

```yaml
bookmarks:
  https://example.com/x:
    desc: Example site
    tags: [example, web]
  # …
```

- [ ] **Step 3: Curate `sample/commands.yml`**

- 1× heavy markdown command with links.
- 1× shorter command with markdown notes.
- 1× plain command with titled links only.

- [ ] **Step 4: Curate `sample/cheats.yml`**

- 1× Portuguese markdown cheat.
- 1× keyboard shortcut cheat with glyphs.
- 1× PlantUML cheat.

- [ ] **Step 5: Curate `sample/tasks.yml`**

Copy exactly four task rows and normalize them to cover task diversity:

- `doing` + `high`
- `todo` + `mid`
- `doing` + `urgent` with `meta.due`
- `done` + `low`

- [ ] **Step 6: Curate `sample/mixed_invalid.yml`**

```yaml
bookmarks:
  https://valid.example.com/alpha:
    desc: Valid bookmark before the invalid row
    tags: [valid, sample]
  broken-bookmark:
    tags: [invalid]
  https://valid.example.com/omega:
    desc: This row is structurally valid but never imports because the file fails
    tags: [valid, skipped]
```

The importer records errors per file bundle. The missing `desc` on
`broken-bookmark` causes a validation error, aborts this file, and proves that
the four sibling files still import successfully. `import.service.spec.ts`
asserts `filesProcessed = 4`, `inserted = 13`, and `errors.length = 1`.

- [ ] **Step 7: Delete legacy fixtures**

```bash
find src/__tests__/fixtures -maxdepth 1 -type d -name "fixture*" -exec rm -rf {} +
ls src/__tests__/fixtures/
```

Expected: directory now contains `sample/`, `minimal/`, and
`config.invalid.yaml`.

- [ ] **Step 8: Verify line counts**

```bash
wc -l src/__tests__/fixtures/sample/*.yml
```

## Task 11: Add `client.spec.ts` and rewrite `entry.repository.spec.ts`

**Files:**

- Create: `src/shell/app/db/client.spec.ts`
- Modify: `src/shell/app/db/entry.repository.spec.ts` (rewritten from legacy)

**Why:** Per design §TEST INFRASTRUCTURE / Specs, `client.spec.ts` is new (Phase 4 introduces the bootstrap-only mechanism); `entry.repository.spec.ts` exists in the working tree but is Drizzle-flavoured and must be rewritten against the new public API.

- [ ] **Step 1: Write `client.spec.ts`**

Spec shape (Better Specs `describe`/`it` per design §TEST INFRASTRUCTURE / Pattern):

```ts
import { describe, expect, it } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { openDatabase } from './client'

describe('openDatabase', () => {
  describe('when called with :memory:', () => {
    it('returns a Database with the knowledges table', () => {
      const db = openDatabase(':memory:')
      const row = db.query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='knowledges'"
      ).get()
      expect(row?.name).toBe('knowledges')
      db.close()
    })

    it('creates the FTS5 virtual table', () => {
      const db = openDatabase(':memory:')
      const row = db.query<{ name: string }, []>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='knowledges_fts'"
      ).get()
      expect(row?.name).toBe('knowledges_fts')
      db.close()
    })

    it('declares the four future columns', () => {
      const db = openDatabase(':memory:')
      const cols = db.query<{ name: string }, []>(
        "SELECT name FROM pragma_table_info('knowledges')"
      ).all().map(r => r.name)
      for (const col of ['doc', 'task_order', 'due_date', 'depends_on']) {
        expect(cols).toContain(col)
      }
      db.close()
    })
  })

  describe('when opened twice on :memory:', () => {
    it('does not throw on the second open (idempotent DDL)', () => {
      const a = openDatabase(':memory:')
      const b = openDatabase(':memory:')
      a.close()
      b.close()
    })
  })

  describe('strict mode', () => {
    describe('when a parameter is missing', () => {
      it('throws a SqliteError', () => {
        const db = openDatabase(':memory:')
        expect(() => db.run('INSERT INTO knowledges (id) VALUES ($id)')).toThrow()
        db.close()
      })
    })
  })
})
```

- [ ] **Step 2: Rewrite `entry.repository.spec.ts`**

Cover all 6 public functions with Better Specs structure. Reference the design §TEST INFRASTRUCTURE / Pattern as the canonical shape. Specific test groups:

- `describe('#upsert')` → `when the row id is new` returns `'inserted'`; `when the row id already exists` returns `'updated'`; `when called inside a transaction` rolls back on throw.
- `describe('#findById')` → `when the row was upserted` returns the persisted entry; `when the id is unknown` returns `null`.
- `describe('#findAll')` → `with no filters` returns 4 rows (one per type); `with types: ['task']` returns only tasks; `with tags: ['x','y']` returns rows whose tags array is a superset; `with query: 'foo'` returns FTS5 prefix matches; `with limit/offset` paginates.
- `describe('#rebuildFts')` → after `rebuildFts(db)`, FTS5 query returns rows that were inserted before the rebuild.
- `describe('#getDbStats')` → returns `{ total, byType }` matching the row count.
- `describe('#getTagCounts')` → JSON-parses the `tags` column and returns the aggregate count per tag.

All tests use `factoryFor(...)` for inputs — no YAML in this spec.

- [ ] **Step 3: Run**

```bash
bun test src/shell/app/db/
echo "Exit: $?"
```

Expected: exit 0; both specs report PASS. If the repository's `findAll` two-branch dispatch has a regression (rare), the `with query` test will catch it.

---

## Task 12: Rewrite `import.service.spec.ts`

**Files:**

- Modify: `src/shell/app/db/import.service.spec.ts` (rewritten)

**Why:** The legacy spec used Drizzle helpers and `seedMinimalFixture`. Rewrite against the new ImportService + the curated `sample/` corpus from Task 10.

- [ ] **Step 1: Rewrite the spec**

Test groups:

- `describe('ImportService#runOnce')`
  - `when the sample/ corpus is imported once`: `inserted` totals all valid rows, `updated` is 0, `errors` is empty.
  - `when the same corpus is imported a second time` (idempotency, V1-2 §4): `inserted` is 0, `updated` totals all valid rows.
  - `with mixed_invalid.yml in the corpus` (V1-2 §3): valid bookmarks land in DB, invalid entries push strings into `errors`, `filesProcessed` includes the partially-failed file.
  - `with onProgress callback`: callback fires once per bundle with `(processed, total)`.

Use `createTempDir()` from `@testing` for the source dir; copy each `sample/*.yml` into the temp dir before invoking `runOnce`.

- [ ] **Step 2: Run**

```bash
bun test src/shell/app/db/import.service.spec.ts
echo "Exit: $?"
```

Expected: exit 0.

---

## Task 13: Add `config.schema.spec.ts` + rewrite `config.loader.spec.ts`; rename helper specs

**Files:**

- Create: `src/shell/app/config/config.schema.spec.ts`
- Modify: `src/shell/app/config/config.loader.spec.ts` (rewritten)
- Already renamed in Task 9: helper specs

**Why:** New TypeBox `parseConfig` requires its own spec. The loader spec must be rewritten against the new TypeBox call + `Bun.YAML.parse`.

- [ ] **Step 1: Write `config.schema.spec.ts`**

Test groups:

- `describe('parseConfig')`
  - `when raw is the DEFAULT_CONFIG_BODY`: returns `ok` with the input verbatim.
  - `when display.pageSize is invalid` (e.g. `'10'`): returns `err` with a path-prefixed string array including `display/pageSize`.
  - `when database is missing`: returns `ok` (database is optional).
  - `when sources is null`: returns `err`.

Use `Bun.YAML.parse` on `src/__tests__/fixtures/config.invalid.yaml` as the input for one negative case to exercise the integration.

- [ ] **Step 2: Rewrite `config.loader.spec.ts`**

Test groups:

- `describe('loadConfig')`
  - `when the file exists and is valid`: returns a `ResolvedConfig` with all fields populated (defaults applied at resolve time).
  - `when the file is invalid`: returns an error variant containing the path-prefixed messages from `parseConfig`.
  - `when the file does not exist`: falls back to defaults.
- `describe('saveConfig')`
  - `when patching display.pageSize`: round-trips through YAML and back.

- [ ] **Step 3: Update / write helper specs**

The renamed helper specs (`factory.helper.spec.ts`, `seed.helper.spec.ts`, `tmp.helper.spec.ts`, `entries.factory.spec.ts`) keep their legacy assertions where applicable. `seed.helper.spec.ts` is rewritten:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { createSeededMemoryDb } from './seed.helper'

describe('createSeededMemoryDb', () => {
  let db: Database
  beforeEach(() => { db = createSeededMemoryDb() })
  afterEach(() => db.close())

  it('returns a Database with one row per entry type', () => {
    const counts = db.query<{ type: string; n: number }, []>(
      'SELECT type, COUNT(*) AS n FROM knowledges GROUP BY type'
    ).all()
    expect(counts).toHaveLength(4)
  })
})
```

- [ ] **Step 4: Run**

```bash
bun test src/shell/app/config/ src/__tests__/
echo "Exit: $?"
```

Expected: exit 0.

---

## Task 14: Update lint configs

**Files:**

- Modify: `.ls-lint.yml`
- Modify: `.dependency-cruiser.cjs`
- Modify: `.gitignore`

**Why:** The `src/__tests__/` and `src/shell/app/lib/` rules from design §LINT CONFIG UPDATES are not yet in `.ls-lint.yml`. The three forbidden-import rules in `.dependency-cruiser.cjs` may already exist (Phase 3 added some); add any missing ones. `.gitignore` gets the `docs/superpowers/` entry.

- [ ] **Step 1: Edit `.ls-lint.yml`**

Append (or merge into existing entries) the rules from design §LINT CONFIG UPDATES / `.ls-lint.yml`:

```yaml
src/__tests__:
  .ts: regex:^(index|paths)(\.spec)?$

src/__tests__/factories:
  .ts: regex:^[a-z][a-z0-9_]*\.factory(\.spec)?$

src/__tests__/helpers:
  .ts: regex:^[a-z][a-z0-9_]*\.(helper|types)(\.spec)?$

src/__tests__/fixtures:
  .yml:  regex:^[a-z][a-z0-9_]*$
  .yaml: regex:^[a-z][a-z0-9_]*$

src/__tests__/fixtures/sample:
  .yml: regex:^[a-z][a-z0-9_]*$

src/shell/app/lib:
  .ts: regex:^[a-z][a-z0-9_]*\.(util|types)(\.spec)?$
```

- [ ] **Step 2: Verify ls-lint passes**

```bash
bunx @ls-lint/ls-lint
echo "Exit: $?"
```

Expected: exit 0. If a file violates the regex, return to Task 9 (renames) and fix before continuing.

- [ ] **Step 3: Edit `.dependency-cruiser.cjs`**

Open the file and confirm these three forbidden rules exist (add any missing):

```js
{ name: 'no-renderer-to-shell-app', severity: 'error',
  from: { path: '^src/shell/renderer' }, to: { path: '^src/shell/app' } },
{ name: 'no-core-to-shell',         severity: 'error',
  from: { path: '^src/core' },           to: { path: '^src/shell' } },
{ name: 'no-shared-to-shell',       severity: 'error',
  from: { path: '^src/shared' },         to: { path: '^src/shell' } },
```

- [ ] **Step 4: Verify depcruise passes**

```bash
bunx depcruise src --config .dependency-cruiser.cjs
echo "Exit: $?"
```

Expected: exit 0.

- [ ] **Step 5: Append to `.gitignore`**

Add at the end of the file:

```gitignore
# Brainstorming-skill default path; app uses assets/docs/archive/ instead.
docs/superpowers/
```

- [ ] **Step 6: Verify**

```bash
git check-ignore docs/superpowers && echo "IGNORED" || echo "NOT IGNORED"
```

Expected: `IGNORED`.

---

## Task 15: Sync agent skills (app-context, app-testing, app-rpc)

**Files:**

- Modify: `.agents/skills/app-context/SKILL.md`
- Modify: `.agents/skills/app-testing/SKILL.md`
- Modify: `.agents/skills/app-rpc/SKILL.md`

**Why:** Per design §"Modified in Phase 4 (incremental)" + the user-confirmed `yes_same_commit` decision, the three skills carry drift (drizzle, drizzle-typebox, drizzle-seed, removed test exports, wrong path alias). They must be accurate before Phase 5+ agents read them.

- [ ] **Step 1: Update `app-context/SKILL.md`**

Specific edits:

1. **Lines around 79 (the seed.ts row in the data tree)**: drop the `seed.ts ... drizzle-seed fixtures (test + dev)` row entirely.
2. **Line 82**: Replace `Schema validation at the transport layer uses **drizzle-typebox**` with `Schema validation at the transport layer uses **hand-written TypeBox response schemas** (per foundation/design.md Decision 3)`.
3. **Line 130**: Replace `Drizzle migrations live in drizzle/ at project root, not src/.` with `Migrations (when introduced ≥ Phase 9) live in tools/db/migrations/, not at the project root or under src/. See foundation/design.md § Migration mechanism.`

- [ ] **Step 2: Update `app-testing/SKILL.md`**

Specific edits:

1. Drop the entire `### drizzle-seed (secondary — raw schema seeding only)` subsection (lines ~149–168) including the code example.
2. Update the section heading `## Test fixtures — Fishery preferred, drizzle-seed for raw schema` → `## Test fixtures — Fishery factories everywhere`.
3. In the `@testing` exports table, drop the rows for `minimalEntriesYml`, `seedMinimalFixture`, `readMinimalFixtureEntries`. Update the `createSeededMemoryDb` row to read `Synchronous in-memory SQLite seeded via Fishery factories` (no Drizzle mention).
4. Rewrite the `createSeededMemoryDb` example block (lines ~194–211) using the new synchronous shape:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import type { Database } from 'bun:sqlite'
import { createSeededMemoryDb } from '@testing'

describe('EntryRepository', () => {
  let db: Database

  beforeEach(() => { db = createSeededMemoryDb() })
  afterEach(() => db.close())

  describe('#findByType', () => {
    it('returns matching rows', () => {
      // …
    })
  })
})
```

5. Replace `import { AppService } from '@app/app.service'` (line ~216) with `import { AppService } from '@shell/app'`.
6. Drop the closing `> **Note:**` block (lines ~172–176) about the CLAUDE.md drift — that drift was fixed in the prior skill-enhancement task.

- [ ] **Step 3: Update `app-rpc/SKILL.md`**

Specific edits:

1. **Line ~7**: drop `or syncing the preview server. RPC \n  drizzle-typebox response shapes,` — keep the surrounding sentence flow.
2. **Line ~25** (DB schemas table row): replace `drizzle-typebox` with `hand-written TypeBox` and the description with `Schemas authored directly under src/shared/rpc/`.
3. **Lines ~80–95** (`## drizzle-typebox` subsection): replace the entire section heading and example with:

```md
## Hand-written TypeBox response schemas

Per foundation/design.md Decision 3, RPC response schemas are authored
directly under `src/shared/rpc/` using `Type.*` from
`@sinclair/typebox`. Drizzle-derived schemas (`createSelectSchema`,
`createInsertSchema`) are **not** used.

```ts
import { Type, type Static } from '@sinclair/typebox'

export const KnowledgeRowResponse = Type.Object({
  id:        Type.Number(),
  type:      Type.Union([Type.Literal('bookmark'), Type.Literal('command'), Type.Literal('cheat'), Type.Literal('task')]),
  key:       Type.String(),
  desc:      Type.String(),
  tags:      Type.Array(Type.String()),
  createdAt: Type.Number(),
  updatedAt: Type.Number(),
})
export type KnowledgeRowResponse = Static<typeof KnowledgeRowResponse>
```

Repository row mappers stringify JSON columns (`tags`) before passing
through; route handlers expand them back to typed arrays inside the
mapper, never inside the Elysia validator.
```

4. **Line ~118**: drop the `If response shape matches a DB row, derive with drizzle-typebox` checklist item; replace with `Author response schemas in src/shared/rpc/ using Type.*; never derive from db schema.ts`.
5. **Line ~129**: drop the `drizzle-typebox schemas include all columns including auto-generated ones` gotcha; replace with `Hand-written schemas describe the wire shape only — internal columns like meta JSON are stringified by the mapper, not exposed`.

- [ ] **Step 4: Verify no `drizzle*` references remain in skills**

```bash
rg -n "drizzle" .agents/skills/ || echo "NO drizzle in skills"
```

Expected: `NO drizzle in skills`.

---

## Task 16: Pre-commit gate (Definition of Done)

**Files:** none modified.

**Why:** All five gate stages from `.agents/skills/app-quality-gate/SKILL.md` plus the Phase 4-specific invariants must pass before the commit lands.

- [ ] **Step 1: Stage 0 — autofix**

```bash
bun run lint:fix
echo "Exit: $?"
```

Expected: exit 0. Some files may auto-format; review and re-stage.

- [ ] **Step 2: Stage 1 — tests + coverage**

```bash
bun test --coverage src/shell/app src/__tests__ src/shared/logging src/shared/types
echo "Exit: $?"
```

Expected: exit 0; coverage on changed files ≥ 80 %. If `--coverage` reports < 80 % for a Phase 4 file, return to Tasks 11–13 and add specs for the uncovered branches.

- [ ] **Step 3: Stage 2 — full lint pipeline**

```bash
bun run lint
echo "Exit: $?"
```

Expected: exit 0. Internal stages: biome check, knip, depcruise, ls-lint, ast-grep `no-bun-in-core`, mise tombi, jscpd.

- [ ] **Step 4: Stage 3 — preview server smoke (Phase 5 prep — skip in Phase 4)**

```bash
echo "SKIP — Phase 5 introduces the preview server"
```

Phase 4 has no preview-server target. Stage 3 is N/A this commit.

- [ ] **Step 5: Stage 4 — build smoke (macOS only)**

```bash
if [[ "$(uname)" == "Darwin" ]]; then
  bun run build
  echo "Build exit: $?"
else
  echo "SKIP — non-macOS host"
fi
```

Expected: exit 0 on macOS; skipped elsewhere.

- [ ] **Step 6: Phase 4 specific invariants**

```bash
bun pm ls --all 2>/dev/null | grep -i drizzle && echo "FAIL drizzle present" || echo "OK no drizzle"
rg -n "from 'zod'|require\('zod'\)" src/                      || echo "OK no zod"
rg -n "from 'js-yaml'|require\('js-yaml'\)" src/ tools/        || echo "OK no js-yaml"
rg -n '"@shell/app/\*"\|"@shared/logging/\*"\|"@testing/\*"' tsconfig.json || echo "OK no wildcard for new aliases"
```

Expected: 4 `OK …` lines.

- [ ] **Step 7: If any of Steps 1–6 fail**

STOP. Fix the issue, return to the failing task, and re-run from Step 1. Do NOT proceed to Task 17 with red checks.

---

## Task 17: Commit `feat(data): Add SQLite schema, repositories, import service`

**Files:** stages and commits the Phase 4 working set.

**Why:** Single atomic commit per design §SCOPE DECISIONS / Commit strategy.

- [ ] **Step 1: Stage Phase 4 paths explicitly**

```bash
git add \
  src/shell/app/ \
  src/shared/logging/ \
  src/shared/types/ \
  src/__tests__/ \
  package.json bun.lock \
  tsconfig.json \
  .ls-lint.yml \
  .dependency-cruiser.cjs \
  .gitignore \
  .agents/skills/app-context/SKILL.md \
  .agents/skills/app-testing/SKILL.md \
  .agents/skills/app-rpc/SKILL.md \
  tmp/phase-4-stash-manifest.md
git status --short | wc -l
git status --short | head -20
```

Expected: ~150 staged paths, all under the directories listed above. NOTHING from `src/shell/main/`, `src/shell/renderer/`, `src/shared/rpc/`, `tools/preview/`, or `tools/benchmarks/`. If anything else is staged, STOP and unstage it (`git restore --staged <path>`).

- [ ] **Step 2: Pre-commit dry-run for gitlint**

```bash
echo "feat(data): Add SQLite schema, repositories, import service" > /tmp/_msg
gitlint -C .gitlint --msg-filename /tmp/_msg
echo "Subject-only gitlint exit: $?"
```

Expected: exit 0 (subject is 60 chars; the .gitlint cap is 50 — STOP if it fails).

If subject exceeds the cap, the fallback subject is `feat(data): Add SQLite + import service` (40 chars). Use it instead.

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
feat(data): Add SQLite + import service

Adds the data substrate that V1-2 (Sync) requires. Drives
Phase 4 of the foundation roadmap.

Layers:
- src/shell/app/db/ — schema (raw SQL DDL constants +
  TypeScript row types), client (bun:sqlite directly,
  idempotent bootstrap on every open), entry.repository
  (typed prepared statements via db.query<Row, Params>),
  import.service (fast-glob + Bun.YAML + transactional
  per-bundle commits).
- src/shell/app/config/ — TypeBox replaces Zod entirely;
  config.loader uses Bun.YAML.parse.
- src/shell/app/lib/ — task_views.types (literal union)
  severs the legacy @shared/rpc dependency;
  task_views.util retargeted.
- src/shared/logging/ — @logtape/logtape + @logtape/pretty
  adapter; createLogger emits phase=<label> dur_ms=<n>.
- src/shared/types/index — re-adds the logger.types export
  (the temporary Phase 3 omission is reverted).

Test infrastructure:
- 5 curated YAML fixtures under fixtures/sample/ (~10 app
  total) used only by import.service.spec.
- Fishery factories for typed rows; createSeededMemoryDb
  is now synchronous (bun:sqlite is synchronous).
- 11 file renames bring the helpers/factories tree into
  ls-lint compliance.
- Specs added or rewritten for client, entry.repository,
  import.service, config.schema, config.loader, plus the
  renamed helper / factory specs.

Architectural decisions registered in foundation/design.md
and applied here:
- Decision 2: TypeBox everywhere; Zod removed.
- Decision 3: Hand-written TypeBox response schemas.
- Decision 4: Fishery factories primary.
- Decision 5: bun:sqlite directly; no Drizzle ORM.
- Decision 7 (Phase 4): all four future columns
  (doc, task_order, due_date, depends_on) declared
  up-front to avoid migrations across Phases 5-8.

Stash topology: the 5 Phase 3 phase-stashes are collapsed
into a single phase-pending stash (see Task 18 below /
tmp/phase-4-stash-manifest.md).

js-yaml + drizzle-orm + drizzle-kit + drizzle-typebox +
drizzle-seed + zod are NOT declared. ast-grep no-bun-in-core
permits Bun.YAML.parse and Bun.YAML.stringify as the only
Bun globals in pure core.

Skills synced: app-context, app-testing, app-rpc all updated
to reflect Decisions 2-5 (drizzle / drizzle-typebox /
drizzle-seed / minimalEntriesYml references removed).
EOF
)"
```

The Cursor runtime auto-appends `Co-authored-by: Cursor <cursoragent@cursor.com>` after the body. This is treated as an allowed system suffix per project decision; do NOT amend it out.

- [ ] **Step 4: Capture HEAD**

```bash
git rev-parse HEAD
git log -1 --pretty=%B | head -10
```

Expected: new SHA. Subject matches `feat(data): Add SQLite + import service` (or the longer form if Step 2 passed).

---

## Task 18: Re-stash `phase-pending` + post-commit verification

**Files:** none modified.

**Why:** After the commit, ~920 files remain in the working tree (everything that did not commit — AppService, RPC, renderer, preview server, benchmarks). They go into a single `phase-pending` stash that future phases pop selectively from, using `~/Work/bun/app_legacy` at `cc3d08b` as the authoritative source-of-truth for content.

- [ ] **Step 1: Inventory uncommitted state**

```bash
git status --short | wc -l
git status --short | head -20
```

Expected: ~920 files, all under `src/shell/main/`, `src/shell/renderer/`, `src/shared/rpc/`, `tools/preview/`, `tools/benchmarks/`, plus a few stragglers.

- [ ] **Step 2: Re-stash everything as `phase-pending`**

```bash
git stash push -u -m "phase-pending"
git stash list
```

Expected: 2 entries — `phase-pending` (newest, `stash@{0}`) and the original `WIP on main` (`stash@{1}`).

- [ ] **Step 3: Working tree clean**

```bash
git status --short
echo "Exit: $?"
```

Expected: empty output.

- [ ] **Step 4: Post-commit invariants**

```bash
git diff-tree --no-commit-id --name-only -r HEAD | wc -l
git diff-tree --no-commit-id --name-only -r HEAD | rg "^(src/shell/(main|renderer)|src/shared/rpc|tools/(preview|benchmarks))/" \
  || echo "OK no out-of-scope paths in commit"
git log -1 --pretty=%s
```

Expected: ≈ 150 paths in HEAD; `OK no out-of-scope paths`; subject = `feat(data): Add SQLite + import service` (or the longer form).

- [ ] **Step 5: Recovery test (read-only)**

```bash
git stash list | grep "phase-pending"   || echo "MISSING phase-pending"
git stash list | grep "WIP on main"      || echo "(WIP optional)"
test -d ~/Work/bun/app_legacy             && echo "OK app_legacy worktree"
```

Expected: `phase-pending` found; `app_legacy` worktree exists. If the stash is missing, run `git fsck --unreachable` to find the lost commit and recover with `git stash apply <SHA>`.

- [ ] **Step 6: Final smoke**

```bash
bun run lint
bun test
echo "Exit: $?"
```

Expected: both exit 0. The committed Phase 4 paths plus the original Phase 3 commit are now the steady state on `chore-add-domain`.

---

## Self-review

The plan covers every section of `design.md`:

- §OVERVIEW → all tasks.
- §SCOPE DECISIONS → the decisions table is the spine; each row maps to a task.
- §PRE-FLIGHT — STASH RECONCILIATION → Task 1.
- §ARCHITECTURE — FILE INVENTORY / Restored from legacy → Tasks 3 (schema, client), 4 (entry.repository), 5 (import.service), 6 (config), 7 (logging + logger.types), 8 (lib), 9 (test infra).
- §ARCHITECTURE — FILE INVENTORY / Rewritten in Phase 4 → Tasks 3, 4, 5, 6, 9.
- §ARCHITECTURE — FILE INVENTORY / Net-new → Tasks 1 (manifest), 8 (barrels + task_views.types).
- §ARCHITECTURE — FILE INVENTORY / Modified incremental → Tasks 2 (package.json, tsconfig.json), 7 (shared/types/index.ts), 14 (lint configs), 15 (skills).
- §ARCHITECTURE — FILE INVENTORY / Files deferred → Task 18 (re-stash).
- §SCHEMA → Task 3.
- §MIGRATION MECHANISM → Task 3 (no runner / no migrations folder; idempotent bootstrap only).
- §VALIDATION FLOW → Task 6 (config.schema TypeBox + config.loader Bun.YAML).
- §REPOSITORY APIs → Task 4.
- §IMPORT SERVICE → Task 5.
- §TEST INFRASTRUCTURE → Tasks 9–13.
- §TEST FIXTURE CORPUS → Task 10.
- §PATH ALIASES → Task 2 (tsconfig.json) + Task 8 (barrels).
- §DEPENDENCIES → Task 2.
- §LINT CONFIG UPDATES → Task 14.
- §VERIFICATION → Task 16 (pre-commit) + Task 18 (post-commit).
- §OPEN-QUESTION RESOLUTIONS → covered transitively (every locked decision has an enforcing task).
- §RELATED DOCS → not actionable.

No placeholders (TBD/TODO/FIXME) in any task. Every snippet uses `describe`/`it` per the app-testing skill. Every file path quoted matches the design's inventory. The legacy worktree is referenced as the recovery substrate. The commit message subject is verified against the .gitlint 50-char cap; a fallback is provided.
