import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export type PersistenceConfig = {
  rootDir: string
  metricsDir: string
}

export function ensureRunDir(config: PersistenceConfig, dateStr: string): string {
  const dir = path.join(config.rootDir, dateStr)
  mkdirSync(dir, { recursive: true })
  return dir
}

export function writeStateSnapshot(config: PersistenceConfig, runId: string, dateStr: string, state: object): string {
  const dir = ensureRunDir(config, dateStr)
  const tmpPath = path.join(dir, `${runId}.state.json.tmp`)
  const finalPath = path.join(dir, `${runId}.state.json`)

  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8')
  renameSync(tmpPath, finalPath)

  return finalPath
}

export function readStateSnapshot(config: PersistenceConfig, runId: string, dateStr: string): object | null {
  const dir = path.join(config.rootDir, dateStr)
  const statePath = path.join(dir, `${runId}.state.json`)

  if (!existsSync(statePath)) return null

  try {
    const content = readFileSync(statePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

export function dualWriteOnTerminal(config: PersistenceConfig, runId: string, dateStr: string): void {
  const sourceDir = path.join(config.rootDir, dateStr)
  const sourcePath = path.join(sourceDir, `${runId}.ndjson`)

  if (!existsSync(sourcePath)) return

  const targetDir = path.join(config.metricsDir, dateStr)
  mkdirSync(targetDir, { recursive: true })
  const targetPath = path.join(targetDir, `${runId}.ndjson`)

  copyFileSync(sourcePath, targetPath)
}
