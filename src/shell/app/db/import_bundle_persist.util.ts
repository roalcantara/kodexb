import type { Database } from 'bun:sqlite'
import type { RpcImportResult } from '@shared/rpc'
import type { Entry, Knowledge } from '../../../core'
import { isValidSourceRowMin, toKnowledge } from '../../../core'
import { projectEntryBindings } from '../../../core/domain/models/entries/parsers/shortcut.parser'
import { upsertBindings } from './binding.repository'
import { upsert } from './entry.repository'

export function upsertKnowledgeBundleInTransaction(
  db: Database,
  bundle: { filePath: string; items: Entry[] },
  result: RpcImportResult,
  now: number
): { insertedInFile: number; updatedInFile: number } {
  let insertedInFile = 0
  let updatedInFile = 0
  const toUpsert: Knowledge[] = []

  for (const entry of bundle.items) {
    if (!isValidSourceRowMin({ desc: entry.desc, tags: entry.tags })) {
      result.errors.push(`${bundle.filePath}: entry "${entry.key}" failed validation`)
      continue
    }
    toUpsert.push(toKnowledge(entry, now))
  }

  for (const row of toUpsert) {
    const action = upsert(db, row)
    if (action === 'inserted') {
      result.inserted += 1
      insertedInFile += 1
    } else {
      result.updated += 1
      updatedInFile += 1
    }
    if (row.type === 'shortcut') {
      const refs = projectEntryBindings(row as Parameters<typeof projectEntryBindings>[0])
      if (refs.length > 0) {
        upsertBindings(db, row.key, refs)
      }
    }
  }

  return { insertedInFile, updatedInFile }
}
