import type { Database } from 'bun:sqlite'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getLogger } from '@shared/logging'
import type { RpcImportResult, RpcSyncFileResult, RpcSyncProgressPayload } from '@shared/rpc'
import glob from 'fast-glob'
import type { Entry } from '../../../core'
import { parseSourceFileResilient } from '../../../core/domain/models/entries/parsers/parse_source_file_resilient.parser'
import { listAllBindings } from './binding.repository'
import { openDatabase } from './client'
import { rebuildFts } from './entry.repository'
import { upsertKnowledgeBundleInTransaction } from './import_bundle_persist.util'
import { hardCollisionWarningMessages } from './import_collision_warnings.util'

type ParsedSourceBundle =
  | { filePath: string; items: Entry[]; parseErrors?: string[] }
  | { filePath: string; error: string }

function formatBundleError(filePath: string, message: string): string {
  const trimmed = message.trimStart()
  if (trimmed.startsWith(filePath)) return message
  return `${filePath}: ${message}`
}

export class ImportService {
  private readonly dbPath: string
  private readonly log: ReturnType<typeof getLogger>

  constructor(dbPath: string) {
    this.dbPath = dbPath
    this.log = getLogger(['kb', 'app', 'sync'])
  }

  private async loadParsedSourceBundles(sourcesDir: string): Promise<ParsedSourceBundle[]> {
    const files = (await glob('**/*.{yaml,yml}', { cwd: sourcesDir, absolute: true })).sort((a, b) =>
      a.localeCompare(b)
    )
    return Promise.all(files.map(filePath => this.loadParsedSourceBundleForPath(filePath)))
  }

  private async loadParsedSourceBundleForPath(filePath: string): Promise<ParsedSourceBundle> {
    let content: string
    try {
      content = await fs.readFile(filePath, 'utf-8')
    } catch (err) {
      return {
        filePath,
        error: err instanceof Error ? err.message : String(err)
      }
    }

    const { entries, errors } = parseSourceFileResilient(filePath, content)
    if (entries.length === 0 && errors.length > 0) {
      const firstError = errors.at(0) ?? 'parse failed with no error detail'
      return { filePath, error: firstError }
    }

    return { filePath, items: entries, parseErrors: errors.length > 0 ? errors : undefined }
  }

  private persistParsedSourceBundle(
    db: Database,
    bundle: ParsedSourceBundle,
    result: RpcImportResult
  ): RpcSyncFileResult {
    const label = path.basename(bundle.filePath)
    const t0 = performance.now()
    if ('error' in bundle) {
      const msg = formatBundleError(bundle.filePath, bundle.error)
      result.errors.push(msg)
      const fileResult: RpcSyncFileResult = {
        path: bundle.filePath,
        label,
        ok: false,
        error: bundle.error,
        inserted: 0,
        updated: 0
      }
      result.fileLog.push(fileResult)
      return fileResult
    }

    const now = Date.now()
    let insertedInFile = 0
    let updatedInFile = 0

    if (bundle.parseErrors) {
      for (const err of bundle.parseErrors) {
        result.errors.push(formatBundleError(bundle.filePath, err))
      }
    }

    try {
      db.transaction(() => {
        const counts = upsertKnowledgeBundleInTransaction(db, bundle, result, now)
        insertedInFile = counts.insertedInFile
        updatedInFile = counts.updatedInFile
      })()

      result.filesProcessed += 1
      this.log.info('{phase} label={label} dur_ms={dur_ms}', {
        phase: 'import',
        label: bundle.filePath,
        dur_ms: (performance.now() - t0).toFixed(2)
      })
      const fileResult: RpcSyncFileResult = {
        path: bundle.filePath,
        label,
        ok: true,
        inserted: insertedInFile,
        updated: updatedInFile
      }
      result.fileLog.push(fileResult)
      return fileResult
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(formatBundleError(bundle.filePath, msg))
      const fileResult: RpcSyncFileResult = {
        path: bundle.filePath,
        label,
        ok: false,
        error: msg,
        inserted: insertedInFile,
        updated: updatedInFile
      }
      result.fileLog.push(fileResult)
      return fileResult
    }
  }

  async runOnce(
    sourcesDir: string,
    options?: {
      onProgress?: (payload: RpcSyncProgressPayload) => void
      /** Test-only: stop after processing this many source bundles. */
      maxBundles?: number
    }
  ): Promise<RpcImportResult> {
    const { raw: db } = openDatabase(this.dbPath)
    try {
      const result: RpcImportResult = {
        filesProcessed: 0,
        inserted: 0,
        updated: 0,
        errors: [],
        warnings: [],
        fileLog: []
      }

      const bundles = await this.loadParsedSourceBundles(sourcesDir)
      const total = bundles.length

      const processBundleAt = async (index: number): Promise<void> => {
        if (index >= bundles.length) return
        const bundle = bundles[index]
        if (!bundle) return
        const recentFile = this.persistParsedSourceBundle(db, bundle, result)
        options?.onProgress?.({ processed: index + 1, total, recentFile })
        const maxBundles = options?.maxBundles
        if (maxBundles !== undefined && index + 1 >= maxBundles) return
        await Bun.sleep(0)
        await processBundleAt(index + 1)
      }

      await processBundleAt(0)

      rebuildFts(db)
      result.warnings = hardCollisionWarningMessages(listAllBindings(db))
      return result
    } finally {
      db.close(true)
    }
  }

  run(
    sourcesDir: string,
    options?: {
      onProgress?: (payload: RpcSyncProgressPayload) => void
      maxBundles?: number
    }
  ): Promise<RpcImportResult> {
    return this.runOnce(sourcesDir, options)
  }
}
