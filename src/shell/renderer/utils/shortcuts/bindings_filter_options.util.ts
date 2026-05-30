// pattern: Functional Core

import type { BindingRef } from '@shared/rpc'

export type BindingsFilterOption = { id: string; label: string; count: number; section: string }

export function buildBindingsFilterOptions(bindings: BindingRef[], searchQ: string): BindingsFilterOption[] {
  const countsByApp = new Map<string, number>()
  let globalCount = 0
  for (const binding of bindings) {
    if (binding.scope === 'global') globalCount++
    const cnt = countsByApp.get(binding.app) ?? 0
    countsByApp.set(binding.app, cnt + 1)
  }

  const q = searchQ.trim().toLowerCase()
  const result: BindingsFilterOption[] = [
    { id: 'all', label: 'All', count: bindings.length, section: 'All' },
    { id: 'globals', label: 'Globals only', count: globalCount, section: 'Scope' }
  ]

  const sortedApps = [...countsByApp.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  for (const [app, count] of sortedApps) {
    if (q && !app.toLowerCase().includes(q)) continue
    result.push({ id: app, label: app, count, section: 'Apps' })
  }

  return result
}

export function groupBindingsFilterOptions(options: BindingsFilterOption[]): Map<string, BindingsFilterOption[]> {
  const map = new Map<string, BindingsFilterOption[]>()
  for (const opt of options) {
    const arr = map.get(opt.section) ?? []
    arr.push(opt)
    map.set(opt.section, arr)
  }
  return map
}
