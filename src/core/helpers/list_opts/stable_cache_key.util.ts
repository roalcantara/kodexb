import type { ListOpts } from '@shared/rpc'

export function stableListCacheKey(opts: ListOpts): string {
  return JSON.stringify(opts)
}
