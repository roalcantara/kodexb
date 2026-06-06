<!-- markdownlint-disable-file -->
# Phase 11 — Sync UI — Implementation Plan

> **For agentic workers:** Use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual progress bar, auto-dismissing completion toast with error details, and concurrent sync prevention to the sync workflow.

**Architecture:** Two new shared components (`SyncProgress`, `SyncToast`) plus hook updates. No new RPC routes, no DB changes. The existing `syncProgress`/`syncComplete` push messages already carry all needed data.

**Primary verification:** `bun test && bun run lint && bun run build` are green. Sync button shows progress bar, toast appears on completion, errors are expandable.

---

## Task 0: Pre-flight read

**Files:** none

- [ ] Read `assets/docs/archive/sync-ui/design.md`
- [ ] Read `assets/docs/archive/sync-ui/requirements.md`
- [ ] Read `assets/docs/archive/foundation/requirements.md` — V1-2 §4–5

---

## Task 1: SyncProgress component

**Files:** Create `src/shell/renderer/components/shared/sync_progress.component.tsx`

```tsx
type SyncProgressProps = {
  processed: number
  total: number
}

export function SyncProgress({ processed, total }: SyncProgressProps) {
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0
  return (
    <div className="app-syncProgress">
      <progress className="app-syncProgress-bar" value={processed} max={total} />
      <span className="app-syncProgress-label">Processing file {processed} of {total}</span>
    </div>
  )
}
```

- [ ] Verify: `bun run typecheck`
- [ ] Commit: `feat(renderer): add SyncProgress component`

---

## Task 2: SyncToast component

**Files:** Create `src/shell/renderer/components/shared/sync_toast.component.tsx`

```tsx
import { useState, useEffect } from 'react'
import type { RpcImportResult } from '@shared/rpc'

type SyncToastProps = {
  result: RpcImportResult | null
  onDismiss: () => void
}

export function SyncToast({ result, onDismiss }: SyncToastProps) {
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!result) return
    setShowErrors(false)
    const delay = result.errors.length > 0 ? 8000 : 5000
    const timer = setTimeout(onDismiss, delay)
    return () => clearTimeout(timer)
  }, [result, onDismiss])

  if (!result) return null

  const { filesProcessed, inserted, updated, errors } = result

  return (
    <div className="app-syncToast">
      <div className="app-syncToast-body">
        <span className="app-syncToast-summary">
          {errors.length === 0
            ? `${filesProcessed} files: ${inserted} inserted, ${updated} updated`
            : `Sync completed with ${errors.length} error${errors.length === 1 ? '' : 's'}`}
        </span>
        {errors.length > 0 && (
          <button type="button" className="app-syncToast-toggle" onClick={() => setShowErrors(!showErrors)}>
            View errors ({errors.length})
          </button>
        )}
      </div>
      {showErrors && errors.length > 0 && (
        <ul className="app-syncToast-errors">
          {errors.map((err, i) => (
            <li key={i}>{err}</li>
          ))}
        </ul>
      )}
      <button type="button" className="app-syncToast-close" onClick={onDismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}
```

- [ ] Verify: `bun run typecheck`
- [ ] Commit: `feat(renderer): add SyncToast component`

---

## Task 3: Hook updates — toast state + concurrent guard

**Files:** Modify `src/shell/renderer/hooks/list/use_list_page_stats_sync.hook.ts`

- [ ] Add `toastResult` state and `dismissToast`:

```ts
import type { RpcImportResult } from '@shared/rpc'

const [toastResult, setToastResult] = useState<RpcImportResult | null>(null)
const dismissToast = useCallback(() => setToastResult(null), [])
```

- [ ] Update `syncComplete` handler to set `toastResult`:

```ts
onComplete: (result: RpcImportResult) => {
  setSyncing(false)
  setSyncProg(undefined)
  setToastResult(result)
  refreshStats().catch(() => undefined)
  refreshList(false).catch(() => undefined)
}
```

- [ ] Add concurrent guard to `onSync` and clear toast on new sync:

```ts
const onSync = () => {
  if (syncing) return
  setSyncing(true)
  setSyncProg(undefined)
  setToastResult(null)
  syncRpc().catch(() => {
    setSyncing(false)
  })
}
```

- [ ] Add `toastResult`, `dismissToast` to return object.

- [ ] Verify: `bun run typecheck`
- [ ] Commit: `feat(hook): add toast state and concurrent sync guard`

---

## Task 4: Integration — shell hook, list_main, CSS

**Files:** Modify `use_list_page_shell.hook.ts`, `list_main.component.tsx`, `styles/list.css`

- [ ] **`use_list_page_shell.hook.ts`**: Add `toastResult`, `dismissToast` to returned shell object and `ListPageShell` type.

- [ ] **`list_main.component.tsx`**: Import and render `SyncProgress` and `SyncToast`:

```tsx
import { SyncProgress } from '../shared/sync_progress.component'
import { SyncToast } from '../shared/sync_toast.component'

{p.data.syncing && p.data.syncProg !== undefined && (
  <SyncProgress processed={p.data.syncProg.processed} total={p.data.syncProg.total} />
)}
<SyncToast result={p.data.toastResult} onDismiss={p.data.dismissToast} />
```

- [ ] **`styles/list.css`**: Add CSS for `.app-syncProgress`, `.app-syncToast`, `.app-syncToast-*`, `@keyframes app-slideUp`.

```css
.app-syncProgress { display: flex; align-items: center; gap: 8px; padding: 4px 12px; background: var(--app-surface); border-top: 1px solid var(--app-border); }
.app-syncProgress-bar { flex: 1; height: 4px; accent-color: var(--app-accent); }
.app-syncProgress-label { font-size: 0.75rem; color: var(--app-muted); white-space: nowrap; }
.app-syncToast { position: fixed; bottom: 16px; right: 16px; background: var(--app-surface); border: 1px solid var(--app-border); border-radius: 6px; padding: 12px 16px; min-width: 320px; max-width: 480px; z-index: 200; animation: app-slideUp 200ms ease; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
.app-syncToast-body { display: flex; flex-direction: column; gap: 4px; }
.app-syncToast-summary { font-size: 0.875rem; color: var(--app-text); }
.app-syncToast-toggle { background: none; border: none; color: var(--app-accent); cursor: pointer; padding: 0; font-size: 0.75rem; text-align: left; }
.app-syncToast-errors { margin: 8px 0 0; padding: 8px; background: rgba(0,0,0,0.2); border-radius: 4px; max-height: 160px; overflow-y: auto; font-size: 0.75rem; color: var(--app-muted); list-style: none; }
.app-syncToast-errors li { padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.app-syncToast-errors li:last-child { border-bottom: none; }
.app-syncToast-close { position: absolute; top: 8px; right: 8px; background: none; border: none; color: var(--app-muted); cursor: pointer; font-size: 0.875rem; }
@keyframes app-slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
```

- [ ] Verify: `bun run typecheck && bun test src/shell/renderer/components/list/`
- [ ] Commit: `feat(renderer): integrate SyncProgress and SyncToast`

---

## Task 5: Component specs

**Files:** Create `src/shell/renderer/components/shared/sync_progress.component.spec.tsx`, `src/shell/renderer/components/shared/sync_toast.component.spec.tsx`

### sync_progress.component.spec.tsx

```tsx

import { expect, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { SyncProgress } from './sync_progress.component'

test('renders progress bar with correct values', () => {
  render(<SyncProgress processed={3} total={10} />)
  const bar = screen.getByRole('progressbar') as HTMLProgressElement
  expect(bar.value).toBe(3)
  expect(bar.max).toBe(10)
})

test('shows processing file label', () => {
  render(<SyncProgress processed={5} total={12} />)
  expect(screen.getByText('Processing file 5 of 12')).toBeTruthy()
})
```

### sync_toast.component.spec.tsx

```tsx

import { expect, mock, test } from 'bun:test'
import { render, screen, fireEvent } from '@testing-library/react'
import { SyncToast } from './sync_toast.component'

const success = { filesProcessed: 10, inserted: 3, updated: 7, errors: [] }
const withErrors = { filesProcessed: 5, inserted: 1, updated: 2, errors: ['bad.yml: parse error', 'other.yml: validation'] }

test('renders nothing when result is null', () => {
  render(<SyncToast result={null} onDismiss={() => {}} />)
  expect(screen.queryByText(/files/)).toBeNull()
})

test('shows success summary', () => {
  render(<SyncToast result={success} onDismiss={() => {}} />)
  expect(screen.getByText('10 files: 3 inserted, 7 updated')).toBeTruthy()
})

test('shows error summary and toggle', () => {
  render(<SyncToast result={withErrors} onDismiss={() => {}} />)
  expect(screen.getByText('Sync completed with 2 errors')).toBeTruthy()
  expect(screen.getByText('View errors (2)')).toBeTruthy()
})

test('toggle expands error list', () => {
  render(<SyncToast result={withErrors} onDismiss={() => {}} />)
  fireEvent.click(screen.getByText('View errors (2)'))
  expect(screen.getByText('bad.yml: parse error')).toBeTruthy()
})

test('dismiss button calls onDismiss', () => {
  const onDismiss = mock(() => {})
  render(<SyncToast result={success} onDismiss={onDismiss} />)
  fireEvent.click(screen.getByLabelText('Dismiss'))
  expect(onDismiss).toHaveBeenCalledTimes(1)
})
```

- [ ] Run: `bun test src/shell/renderer/components/shared/sync_progress.component.spec.tsx src/shell/renderer/components/shared/sync_toast.component.spec.tsx`
- [ ] Expected: 7 pass, 0 fail.
- [ ] Commit: `test(renderer): add SyncProgress and SyncToast specs`

---

## Task 6: Full test suite + quality gate

**Files:** none (verification only)

- [ ] Run: `bun test && bun run lint && bun run build`
- [ ] Expected: all green.
- [ ] Commit: `chore: Phase 11 verification — all tests green, lint clean`

---

## Task 7: Mark Phase 11 complete in roadmap

**Files:** Modify `assets/docs/archive/foundation/roadmap.md`

- [ ] Update: `⬜ pending` → `✔ done` for Phase 11.
- [ ] Commit: `docs(roadmap): Mark Phase 11 Sync UI as done`
