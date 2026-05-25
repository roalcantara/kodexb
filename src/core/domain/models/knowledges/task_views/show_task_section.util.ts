import type { EntryType } from '../../../types/entry.types'

export function showTaskSection(types: EntryType[]): boolean {
  return types.length === 0 || types.includes('task')
}
