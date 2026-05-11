import type { Database } from 'bun:sqlite'
import fs from 'node:fs/promises'
import glob from 'fast-glob'
import type { Entry, Knowledge } from '../../../core'
import { isValidSourceRowMin, parseSourceFile, toKnowledge } from '../../../core'
import { createLogger } from '../../../shared/logging'
import { openDatabase } from './client'
import { rebuildFts, upsert } from './entry.repository'

export type ImportResult = {
  filesProcessed: number
  inserted: number
  updated: number
  errors: string[]
}

type ParsedSourceBundle = { filePath: string; items: Entry[] } | { filePath: string; error: string }

function formatBundleError(filePath: string, message: string): string {
  const trimmed = message.trimStart()
  if (trimmed.startsWith(filePath)) return message
  return `${filePath}: ${message}`
}

export class ImportService {
  private readonly dbPath: string
  private readonly log: ReturnType<typeof createLogger>

  constructor(dbPath: string, debug = false) {
    this.dbPath = dbPath
    this.log = createLogger({ debug })
  }

  private async loadParsedSourceBundles(sourcesDir: string): Promise<ParsedSourceBundle[]> {
    const files = await glob('**/*.{yaml,yml}', { cwd: sourcesDir, absolute: true })
    return Promise.all(files.map(filePath => this.loadParsedSourceBundleForPath(filePath)))
  }

  private async loadParsedSourceBundleForPath(filePath: string): Promise<ParsedSourceBundle> {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      return { filePath, items: parseSourceFile(filePath, content) }
    } catch (err) {
      return {
        filePath,
        error: err instanceof Error ? err.message : String(err)
      }
    }
  }

  private persistParsedSourceBundle(db: Database, bundle: ParsedSourceBundle, result: ImportResult): void {
    const t0 = performance.now()
    if ('error' in bundle) {
      result.errors.push(formatBundleError(bundle.filePath, bundle.error))
      return
    }

    const now = Date.now()
    try {
      db.transaction(() => {
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
          if (action === 'inserted') result.inserted += 1
          else result.updated += 1
        }
      })()

      result.filesProcessed += 1
      this.log.phase('import', bundle.filePath, performance.now() - t0)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(formatBundleError(bundle.filePath, msg))
    }
  }

  async runOnce(
    sourcesDir: string,
    options?: { onProgress?: (processed: number, total: number) => void }
  ): Promise<ImportResult> {
    const { raw: db } = openDatabase(this.dbPath)
    const result: ImportResult = {
      filesProcessed: 0,
      inserted: 0,
      updated: 0,
      errors: []
    }

    const bundles = await this.loadParsedSourceBundles(sourcesDir)
    const total = bundles.length
    let processed = 0

    for (const bundle of bundles) {
      options?.onProgress?.(processed, total)
      this.persistParsedSourceBundle(db, bundle, result)
      processed += 1
      options?.onProgress?.(processed, total)
    }

    rebuildFts(db)
    return result
  }

  run(
    sourcesDir: string,
    options?: { onProgress?: (processed: number, total: number) => void }
  ): Promise<ImportResult> {
    return this.runOnce(sourcesDir, options)
  }
}
