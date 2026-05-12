<!-- markdownlint-disable-file -->
# Phase 12 — Stats Panel — Design

## OVERVIEW

Phase 12 adds a "Stats" section to the existing Settings page showing entry
counts by type, total count, database path, and file size. The `getStats()` RPC
is extended to return `dbPath` and `dbSize`. Stats auto-refresh after sync via
the existing `syncComplete` handler.

No new RPC routes, no new pages, no DB changes. One RPC type extension + one UI section.

---

## SCOPE DECISIONS

| Decision | Choice | Rationale |
|---|---|---|
| Stats location | Settings page section (tab) | Reuses existing navigation; no new page component |
| DB path + size | Extend `getStats()` RPC | Single call; data is naturally co-located with counts |
| File size format | Human-readable (KB/MB) computed in renderer | `fs.stat.size` returns bytes; renderer formats |
| Auto-refresh | Reuse existing `refreshStats()` in sync handler | Already wired; no changes needed |

---

## ARCHITECTURE

### Data flow
```
Renderer (Settings → Stats section)
  → rpc.getStats().post({})
  → App.getStats()
  → entry.repository.getDbStats(db) → { total, byType }
  → fs.stat(dbPath) → { size }
  → Response: { total, byType, dbPath, dbSize }
  → Renderer formats and displays
```

### Auto-refresh
```
Sync completes → syncComplete push message
  → useListPageStatsSync: refreshStats()
  → Stats section re-renders with updated counts + size
```

---

## FILES AND RESPONSIBILITIES

### Type extension

**`src/shared/rpc/kb_rpc_schema.ts`**

Add to `RpcDbStats`:
```ts
export type RpcDbStats = {
  total: number
  byType: Record<string, number>
  dbPath: string
  dbSize: number
}
```

### App method

**`src/shell/app/app.ts`**

Extend `getStats()`:

```ts
import fs from 'node:fs/promises'

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

Note: `getStats()` changes from `Promise.resolve(...)` to `async` with `fs.stat`. The cache still works — first call populates cache, subsequent calls return cached value. `invalidateListCache()` clears `dbStatsCache`, so next call re-queries.

### Settings page

**`src/shell/renderer/pages/settings/settings.page.tsx`**

Add a "Stats" section after Display:

```tsx
{/* Stats Section */}
<section className="kb-settingsSection">
  <h2 className="kb-settingsSection-title">Stats</h2>
  <div className="kb-settingsRow">
    <table className="kb-statsTable">
      <tbody>
        <tr><td>Bookmarks</td><td className="kb-statsCount">{s.stats?.byType?.bookmark ?? 0}</td></tr>
        <tr><td>Commands</td><td className="kb-statsCount">{s.stats?.byType?.command ?? 0}</td></tr>
        <tr><td>Cheats</td><td className="kb-statsCount">{s.stats?.byType?.cheat ?? 0}</td></tr>
        <tr><td>Tasks</td><td className="kb-statsCount">{s.stats?.byType?.task ?? 0}</td></tr>
        <tr className="kb-statsTotal"><td>Total</td><td className="kb-statsCount">{s.stats?.total ?? 0}</td></tr>
      </tbody>
    </table>
  </div>
  <div className="kb-settingsRow">
    <label>Database Path</label>
    <div className="kb-settingsValue">{s.stats?.dbPath ?? '—'}</div>
  </div>
  <div className="kb-settingsRow">
    <label>Database Size</label>
    <div className="kb-settingsValue">{formatBytes(s.stats?.dbSize ?? 0)}</div>
  </div>
</section>
```

Add `formatBytes` utility to the settings page (or shared utils):
```ts
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
```

The settings page already receives `stats` from `useListPageStatsSync` through the shell hook.

### Settings types

**`src/shell/renderer/pages/settings/settings.types.ts`**

Update `SettingsRpc` if it doesn't already include `stats`/`dbStats`. May not need changes — verify the type already flows through from the shell hook.

### CSS

**`src/shell/renderer/styles/list.css`**

```css
.kb-statsTable { width: 100%; border-collapse: collapse; }
.kb-statsTable td { padding: 6px 12px; font-size: 0.875rem; color: var(--kb-text); }
.kb-statsCount { text-align: right; font-variant-numeric: tabular-nums; }
.kb-statsTotal td { border-top: 1px solid var(--kb-border); font-weight: 600; padding-top: 8px; }
```

---

## TESTING STRATEGY

| Layer | Approach | File |
|---|---|---|
| App.getStats | Assert response includes `dbPath` (matches config) and `dbSize` (≥ 0) | `app.spec.ts` (update) |
| RPC route | `POST /api/getStats` returns extended response with new fields | `server.spec.ts` (update) |
| Settings stats section | Render settings page, assert Stats section shows type counts, total, path, size | `settings.page.spec.tsx` (update) |
| formatBytes | Unit test: 0 → "0 B", 1024 → "1 KB", 1048576 → "1 MB" | `settings.page.spec.tsx` (update) |
