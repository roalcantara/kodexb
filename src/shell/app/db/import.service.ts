import type { Database } from 'bun:sqlite'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getLogger } from '@shared/logging'
import type { RpcImportResult, RpcSyncFileResult, RpcSyncProgressPayload } from '@shared/rpc'
import glob from 'fast-glob'
import type { Entry } from '../../../core'
import { parseSourceFile } from '../../../core'
import { listAllBindings } from './binding.repository'
import { openDatabase } from './client'
import { rebuildFts } from './entry.repository'
import { upsertKnowledgeBundleInTransaction } from './import_bundle_persist.util'
import { hardCollisionWarningMessages } from './import_collision_warnings.util'

type ParsedSourceBundle = { filePath: string; items: Entry[] } | { filePath: string; error: string }

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
      return {
        path: bundle.filePath,
        label,
        ok: false,
        error: bundle.error,
        inserted: 0,
        updated: 0
      }
    }

    const now = Date.now()
    let insertedInFile = 0
    let updatedInFile = 0
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
      return {
        path: bundle.filePath,
        label,
        ok: true,
        inserted: insertedInFile,
        updated: updatedInFile
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      result.errors.push(formatBundleError(bundle.filePath, msg))
      return {
        path: bundle.filePath,
        label,
        ok: false,
        error: msg,
        inserted: insertedInFile,
        updated: updatedInFile
      }
    }
  }

  async runOnce(
    sourcesDir: string,
    options?: { onProgress?: (payload: RpcSyncProgressPayload) => void }
  ): Promise<RpcImportResult> {
    const { raw: db } = openDatabase(this.dbPath)
    const result: RpcImportResult = {
      filesProcessed: 0,
      inserted: 0,
      updated: 0,
      errors: [],
      warnings: []
    }

    const bundles = await this.loadParsedSourceBundles(sourcesDir)
    const total = bundles.length
    let processed = 0

    for (const bundle of bundles) {
      const recentFile = this.persistParsedSourceBundle(db, bundle, result)
      processed += 1
      options?.onProgress?.({ processed, total, recentFile })
    }

    rebuildFts(db)
    result.warnings = hardCollisionWarningMessages(listAllBindings(db))
    return result
  }

  run(
    sourcesDir: string,
    options?: { onProgress?: (payload: RpcSyncProgressPayload) => void }
  ): Promise<RpcImportResult> {
    return this.runOnce(sourcesDir, options)
  }
}
