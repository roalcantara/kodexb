import type { EntryType } from '../../domain/types/entry.types'

export type FindAllOpts = {
  query?: string
  tags?: string[]
  types?: EntryType[]
  limit?: number
  offset?: number
}
