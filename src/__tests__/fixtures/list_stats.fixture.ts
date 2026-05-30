import type { ListStats } from '@shared/rpc'

export function sampleListStats(overrides: Partial<ListStats> = {}): ListStats {
  return {
    total: 3,
    bookmark: 1,
    command: 0,
    cheat: 0,
    shortcut: 0,
    task: 2,
    taskViews: {
      actionable: 0,
      today: 0,
      overdue: 0,
      this_week: 0,
      all_pending: 2,
      all_doing: 0
    },
    tags: {},
    byType: { bookmark: 1, command: 0, cheat: 0, shortcut: 0, task: 2 },
    ...overrides
  }
}
