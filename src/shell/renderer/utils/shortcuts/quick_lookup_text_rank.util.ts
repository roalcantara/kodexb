import { QUICK_LOOKUP_ROW_LIMIT } from '@shared/constants/quick_lookup_row_limit.const'
import type { BindingRef } from '@shared/rpc'
import { fuzzyScore } from './quick_lookup_chord_search.util'

const sortByFrecencyThenAction = (a: BindingRef, b: BindingRef): number => {
  const scoreA = (a as BindingRef & { frecencyScore?: number }).frecencyScore ?? 0
  const scoreB = (b as BindingRef & { frecencyScore?: number }).frecencyScore ?? 0
  if (scoreB !== scoreA) return scoreB - scoreA
  return a.action.localeCompare(b.action)
}

export function rankQuickLookupTextRows(bindings: BindingRef[], query: string): BindingRef[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return [...bindings].sort(sortByFrecencyThenAction).slice(0, QUICK_LOOKUP_ROW_LIMIT)
  }

  return bindings
    .filter(binding => {
      const actionLower = binding.action.toLowerCase()
      const appLower = binding.app.toLowerCase()
      const groupLower = (binding as BindingRef & { group?: string }).group?.toLowerCase() ?? ''
      return actionLower.includes(q) || appLower.includes(q) || groupLower.includes(q)
    })
    .sort((a, b) => {
      const scoreA = fuzzyScore(a.action, q)
      const scoreB = fuzzyScore(b.action, q)
      if (scoreB !== scoreA) return scoreB - scoreA
      return sortByFrecencyThenAction(a, b)
    })
    .slice(0, QUICK_LOOKUP_ROW_LIMIT)
}
