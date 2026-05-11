import fs from 'node:fs/promises'
import path from 'node:path'
import { err, ok, type Result } from 'neverthrow'
import { DEFAULTS } from '../../../core/constants/defaults.const'
import { expandPath } from '../../../core/helpers/path.helper'
import type { Env } from '../../../shared/types'
import { DEFAULT_CONFIG_BODY, parseConfig, type RawConfig, type ResolvedConfig } from './config.schema'

export type LoadedConfig = ResolvedConfig & {
  configPath: string
  database: { path: string }
  sources: { path: string }
}

function resolveConfig(raw: unknown, configPath: string, env: Env): Result<ResolvedConfig, string> {
  const parsed = parseConfig(raw)
  if (parsed.isErr()) {
    return err(`config at ${configPath}: ${parsed.error.join('; ')}`)
  }

  const body: RawConfig = parsed.value
  const databasePath = body.database?.path ?? DEFAULT_CONFIG_BODY.database?.path ?? DEFAULTS.database.path
  const sourcesPath = body.sources?.path ?? DEFAULT_CONFIG_BODY.sources?.path ?? DEFAULTS.sources.path
  const pageSize = (body.display?.pageSize ?? '50') as '25' | '50' | '100' | '200'

  return ok({
    database: { path: expandPath(databasePath, env, DEFAULTS.database.path) },
    sources: { path: expandPath(sourcesPath, env, DEFAULTS.sources.path) },
    display: {
      terminalApp: body.display?.terminalApp,
      editorApp: body.display?.editorApp,
      pageSize
    }
  })
}

/**
 * Loads and validates the kb config from the given path.
 * Creates the file with defaults if missing.
 */
export async function loadConfig(pathArg?: string): Promise<LoadedConfig> {
  const env = process.env as Env
  const configPath = expandPath(pathArg ?? DEFAULTS.config.path, env)

  let raw: unknown
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    raw = Bun.YAML.parse(content)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e
    raw = DEFAULT_CONFIG_BODY
    await fs.mkdir(path.dirname(configPath), { recursive: true })
    await fs.writeFile(configPath, `${Bun.YAML.stringify(DEFAULT_CONFIG_BODY)}\n`, 'utf-8')
  }

  const result = resolveConfig(raw, configPath, env)
  if (result.isErr()) throw new Error(result.error)
  return { configPath, ...result.value }
}

/**
 * Applies a partial config patch and persists the updated config to disk.
 */
export async function saveConfig(
  current: LoadedConfig,
  patch: Partial<{ sourcesDir: string; dbPath: string; terminalApp: string; editorApp: string; pageSize: string }>
): Promise<LoadedConfig> {
  const body: typeof DEFAULT_CONFIG_BODY = {
    database: { path: patch.dbPath ?? current.database.path },
    sources: { path: patch.sourcesDir ?? current.sources.path },
    display: {
      terminalApp: patch.terminalApp ?? current.display.terminalApp,
      editorApp: patch.editorApp ?? current.display.editorApp,
      pageSize: patch.pageSize ?? current.display.pageSize
    }
  }
  await fs.writeFile(current.configPath, `${Bun.YAML.stringify(body)}\n`, 'utf-8')
  return loadConfig(current.configPath)
}
