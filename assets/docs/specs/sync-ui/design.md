<!-- markdownlint-disable-file -->
# Phase 11 — Sync UI — Design

## OVERVIEW

Phase 11 adds visual sync feedback to the renderer: an animated progress bar
below the toolbar and an auto-dismissing completion toast with error details.
The sync pipeline (`ImportService` → `SyncEmitter` → Electrobun push messages)
already works — this phase only adds UI components.

No new RPC routes, no DB changes, no core type changes.

---

## SCOPE DECISIONS

| Decision | Choice | Rationale |
|---|---|---|
| Progress bar placement | Below toolbar, full width | Non-intrusive, visible, already wired |
| Toast style | Auto-dismissing, bottom-right | Non-blocking, matches VS Code pattern |
| Error details | Inline expandable in toast | Keep errors accessible without a separate panel |
| Progress detail | Animated file-level label ("Processing file X of Y") | Rich feedback without scope creep |

---

## ARCHITECTURE

### Progress bar flow
```
ImportService → onProgress(processed, total)
  → SyncEmitter.syncProgress
  → renderer: setSyncProg({ processed, total })
  → SyncProgress component: <progress value={processed} max={total} />
  → CSS transition: width 150ms ease
```

### Toast flow
```
ImportService.runOnce() → ImportResult { filesProcessed, inserted, updated, errors }
  → SyncEmitter.syncComplete(result)
  → renderer: setToastResult(result)
  → SyncToast component renders with summary counts
  → if errors > 0: "View errors (N)" expandable list
  → auto-dismiss after 5s (success) or 8s (errors)
```

### Concurrent prevention
```
onSync → if (syncing) return → setSyncing(true) → syncRpc()
Sync button: disabled={syncing}
```

---

## FILES AND RESPONSIBILITIES

### New components

**`src/shell/renderer/components/shared/sync_progress.component.tsx`**

```tsx
type SyncProgressProps = {
  processed: number
  total: number
}

export function SyncProgress({ processed, total }: SyncProgressProps) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0
  return (
    <div className="kb-syncProgress">
      <progress className="kb-syncProgress-bar" value={processed} max={total} />
      <span className="kb-syncProgress-label">Processing file {processed} of {total}</span>
    </div>
  )
}
```

**`src/shell/renderer/components/shared/sync_toast.component.tsx`**

```tsx
type SyncToastProps = {
  result: RpcImportResult | null
  onDismiss: () => void
}

export function SyncToast({ result, onDismiss }: SyncToastProps) {
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!result) return
    const delay = result.errors.length > 0 ? 8000 : 5000
    const timer = setTimeout(onDismiss, delay)
    return () => clearTimeout(timer)
  }, [result, onDismiss])

  if (!result) return null

  const { filesProcessed, inserted, updated, errors } = result

  return (
    <div className="kb-syncToast">
      <div className="kb-syncToast-body">
        <span className="kb-syncToast-summary">
          {errors.length === 0
            ? `${filesProcessed} files: ${inserted} inserted, ${updated} updated`
            : `Sync completed with ${errors.length} error${errors.length === 1 ? '' : 's'}`}
        </span>
        {errors.length > 0 && (
          <button type="button" className="kb-syncToast-toggle" onClick={() => setShowErrors(!showErrors)}>
            View errors ({errors.length})
          </button>
        )}
      </div>
      {showErrors && errors.length > 0 && (
        <ul className="kb-syncToast-errors">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
      <button type="button" className="kb-syncToast-close" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
```

### Modified files

**`src/shell/renderer/hooks/list/use_list_page_stats_sync.hook.ts`**

Add `toastResult` state and `dismissToast`:

```ts
const [toastResult, setToastResult] = useState<RpcImportResult | null>(null)

// In syncComplete handler:
onComplete: (result) => {
  setSyncing(false)
  setSyncProg(undefined)
  setToastResult(result)       // ← new
  refreshStats().catch(() => undefined)
  refreshList(false).catch(() => undefined)
}

// New:
const dismissToast = useCallback(() => setToastResult(null), [])

// In onSync:
const onSync = () => {
  if (syncing) return            // ← concurrent guard
  setSyncing(true)
  setSyncProg(undefined)
  setToastResult(null)           // ← clear previous toast
  syncRpc().catch(() => {
    setSyncing(false)
  })
}

return { stats, dbStats, refreshStats, syncing, syncProg, onSync, toastResult, dismissToast }
```

**`src/shell/renderer/hooks/list/use_list_page_shell.hook.ts`**

Add `toastResult`, `dismissToast` to returned shell object and `ListPageShell` type.

**`src/shell/renderer/components/list/list_main.component.tsx`**

Render the new components:

```tsx
{p.data.syncing && p.data.syncProg !== undefined && (
  <SyncProgress processed={p.data.syncProg.processed} total={p.data.syncProg.total} />
)}
<SyncToast result={p.data.toastResult} onDismiss={p.data.dismissToast} />
```

Import `SyncProgress`, `SyncToast` from `../shared/`.

### CSS

**`src/shell/renderer/styles/list.css`**

```css
.kb-syncProgress { display: flex; align-items: center; gap: 8px; padding: 4px 12px; background: var(--kb-surface); border-top: 1px solid var(--kb-border); }
.kb-syncProgress-bar { flex: 1; height: 4px; accent-color: var(--kb-accent); transition: width 150ms ease; }
.kb-syncProgress-label { font-size: 0.75rem; color: var(--kb-muted); white-space: nowrap; }

.kb-syncToast { position: fixed; bottom: 16px; right: 16px; background: var(--kb-surface); border: 1px solid var(--kb-border); border-radius: 6px; padding: 12px 16px; min-width: 320px; max-width: 480px; z-index: 200; animation: kb-slideUp 200ms ease; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.kb-syncToast-body { display: flex; flex-direction: column; gap: 4px; }
.kb-syncToast-summary { font-size: 0.875rem; color: var(--kb-text); }
.kb-syncToast-toggle { background: none; border: none; color: var(--kb-accent); cursor: pointer; padding: 0; font-size: 0.75rem; text-align: left; }
.kb-syncToast-errors { margin: 8px 0 0; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; max-height: 160px; overflow-y: auto; font-size: 0.75rem; color: var(--kb-muted); list-style: none; }
.kb-syncToast-errors li { padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.kb-syncToast-errors li:last-child { border-bottom: none; }
.kb-syncToast-close { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--kb-muted); cursor: pointer; font-size: 0.875rem; }

@keyframes kb-slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
```

---

## TESTING STRATEGY

| Layer | Approach | File |
|---|---|---|
| SyncProgress | Render with progress values, assert label text and bar attributes | `sync_progress.component.spec.tsx` (new) |
| SyncToast (success) | Render with result (no errors), assert summary text, test auto-dismiss timing | `sync_toast.component.spec.tsx` (new) |
| SyncToast (errors) | Render with result (has errors), assert toggle shows error list | `sync_toast.component.spec.tsx` (new) |
| Hook guard | Call onSync while syncing=true, assert syncRpc not called | `use_list_page_stats_sync.hook.spec.tsx` (new) |
| Toolbar integration | Toolbar renders SyncProgress child when syncing=true | `toolbar.component.spec.tsx` (update) |
