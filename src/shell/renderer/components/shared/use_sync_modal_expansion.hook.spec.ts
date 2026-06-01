import { describe, expect, it } from 'bun:test'
import type { RpcImportResult, RpcSyncFileResult } from '@shared/rpc'
import { renderHook, waitFor } from '@testing-library/react'
import { useSyncModalExpansion } from './use_sync_modal_expansion.hook'

type HookProps = {
  open: boolean
  phase: string
  fileLog: RpcSyncFileResult[]
  summary: RpcImportResult | null
  processed: number
}

describe('useSyncModalExpansion', () => {
  it('auto-expands the first file with issues when sync completes', async () => {
    const initialProps: HookProps = {
      open: true,
      phase: 'active',
      fileLog: [{ path: '/src/bad.yml', label: 'bad.yml', ok: false, inserted: 0, updated: 0, error: 'fail' }],
      summary: null,
      processed: 1
    }

    const { result, rerender } = renderHook((props: HookProps) => useSyncModalExpansion(props), {
      initialProps
    })

    rerender({
      ...initialProps,
      phase: 'done',
      summary: {
        filesProcessed: 1,
        inserted: 0,
        updated: 0,
        errors: ['/src/bad.yml: fail'],
        warnings: []
      }
    } satisfies HookProps)

    await waitFor(() => {
      expect(result.current.expandedPath).toBe('/src/bad.yml')
    })
  })
})
