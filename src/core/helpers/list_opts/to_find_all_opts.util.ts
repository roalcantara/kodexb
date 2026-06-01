import type { ListOpts } from '@shared/rpc'
import type { FindAllOpts } from './find_all_opts.types'

export function toFindAllOpts(opts: ListOpts): FindAllOpts {
  return {
    query: opts.query,
    tags: opts.tags,
    types: opts.types,
    limit: opts.limit,
    offset: opts.offset
  }
}
