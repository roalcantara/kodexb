<!-- markdownlint-disable-file -->
# Phase 12 — Stats Panel — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checappox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Stats" section to the Settings page showing entry counts by type, total count, database path, and file size, with auto-refresh after sync.

**Architecture:** Extend `RpcDbStats` type and `App.getStats()` to include `dbPath`/`dbSize`, then render a Stats section in the existing Settings page. Auto-refresh is free — the existing `syncComplete` handler already calls `refreshStats()`.

**Primary verification:** `bun test && bun run lint && bun run build` are green. Settings page has a Stats section with live data.

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/specs/stats-panel/design.md`
- [ ] Read `assets/docs/specs/stats-panel/requirements.md`
- [ ] Read `assets/docs/specs/foundation/requirements.md` — V1-5 section

---

## Task 1: Extend `RpcDbStats` type

**Files:** Modify `src/shared/rpc/app_rpc_schema.ts`

- [ ] Add `dbPath: string` and `dbSize: number` to `RpcDbStats`:

```ts
export type RpcDbStats = {
  total: number
  byType: Record<string, number>
  dbPath: string
  dbSize: number
}
```

- [ ] Verify: `bun run typecheck`
- [ ] Commit: `feat(rpc): add dbPath and dbSize to RpcDbStats`

---

## Task 2: Extend `App.getStats()`

**Files:** Modify `src/shell/app/app.ts`

- [ ] Add `import fs from 'node:fs/promises'` (if not already imported)
- [ ] Extend `getStats()`:

```ts
async getStats(): Promise<RpcDbStats> {
  if (this.dbStatsCache) return this.dbStatsCache
  const { raw } = this.getDb()
  const stats = getDbStats(raw)
  let dbSize = 0
  try {
    const stat = await fs.stat(this.loaded.database.path)
    dbSize = stat.size
  } catch {
    dbSize = 0
  }
  this.dbStatsCache = {
    total: stats.total,
    byType: stats.byType,
    dbPath: this.loaded.database.path,
    dbSize
  }
  return this.dbStatsCache
}
```

- [ ] Verify: `bun run typecheck && bun test src/shell/app/app.spec.ts`
- [ ] Update app spec to assert new fields
- [ ] Commit: `feat(app): extend getStats with dbPath and dbSize`

---

## Task 3: Add Stats section to Settings page

**Files:** Modify `src/shell/renderer/pages/settings/settings.page.tsx`, `src/shell/renderer/pages/settings/settings.types.ts`, `src/shell/renderer/styles/list.css`

- [ ] Add `formatBytes` utility at the top of settings.page.tsx:

```ts
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'app', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
```

- [ ] Add Stats section after the Display section:

```tsx
{/* Stats Section */}
<section className="app-settingsSection">
  <h2 className="app-settingsSection-title">Stats</h2>
  <div className="app-settingsRow">
    <table className="app-statsTable">
      <tbody>
        <tr><td>Bookmarks</td><td className="app-statsCount">{s.stats?.byType?.bookmark ?? 0}</td></tr>
        <tr><td>Commands</td><td className="app-statsCount">{s.stats?.byType?.command ?? 0}</td></tr>
        <tr><td>Cheats</td><td className="app-statsCount">{s.stats?.byType?.cheat ?? 0}</td></tr>
        <tr><td>Tasks</td><td className="app-statsCount">{s.stats?.byType?.task ?? 0}</td></tr>
        <tr className="app-statsTotal"><td>Total</td><td className="app-statsCount">{s.stats?.total ?? 0}</td></tr>
      </tbody>
    </table>
  </div>
  <div className="app-settingsRow">
    <label>Database Path</label>
    <div className="app-settingsValue">{s.stats?.dbPath ?? '—'}</div>
  </div>
  <div className="app-settingsRow">
    <label>Database Size</label>
    <div className="app-settingsValue">{formatBytes(s.stats?.dbSize ?? 0)}</div>
  </div>
</section>
```

- [ ] Verify `stats` is available in the settings page via `s.stats` (from shell hook). If not, update `SettingsRpc` type in `settings.types.ts` to include `stats?: RpcDbStats`.

- [ ] Add CSS to `styles/list.css`:

```css
.app-statsTable { width: 100%; border-collapse: collapse; }
.app-statsTable td { padding: 6px 12px; font-size: 0.875rem; color: var(--app-text); }
.app-statsCount { text-align: right; font-variant-numeric: tabular-nums; }
.app-statsTotal td { border-top: 1px solid var(--app-border); font-weight: 600; padding-top: 8px; }
```

- [ ] Verify: `bun run typecheck && bun test src/shell/renderer/pages/settings/`
- [ ] Commit: `feat(renderer): add Stats section to Settings page`

---

## Task 4: Update RPC server spec

**Files:** Modify `src/shell/main/rpc/server.spec.ts` (if needed)

The existing test for `POST /api/getStats` already asserts `{ total, byType }`. Update to also assert `dbPath` and `dbSize`:

```ts
const data = (await res.json()) as { total: number; byType: Record<string, number>; dbPath: string; dbSize: number }
expect(typeof data.total).toBe('number')
expect(typeof data.byType).toBe('object')
expect(typeof data.dbPath).toBe('string')
expect(typeof data.dbSize).toBe('number')
```

- [ ] Verify: `bun test src/shell/main/rpc/server.spec.ts`
- [ ] Commit: `test(rpc): extend getStats spec for dbPath and dbSize`

---

## Task 5: Full test suite + quality gate

**Files:** none (verification only)

- [ ] Run: `bun test && bun run lint && bun run build`
- [ ] Expected: all green.
- [ ] Commit: `chore: Phase 12 verification — all tests green, lint clean`

---

## Task 6: Mark Phase 12 complete in roadmap

**Files:** Modify `assets/docs/specs/foundation/roadmap.md`

- [ ] Update: `⬜ pending` → `✔ done` for Phase 12.
- [ ] Commit: `docs(roadmap): Mark Phase 12 Stats Panel as done`
