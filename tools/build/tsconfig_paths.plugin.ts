import { existsSync, statSync } from 'node:fs'
import { dirname, isAbsolute, join, resolve } from 'node:path'
import type { BunPlugin } from 'bun'

type TsconfigJson = {
  extends?: string
  compilerOptions?: {
    baseUrl?: string
    paths?: Record<string, string[]>
  }
}

type CompiledPath = {
  prefix: string
  suffix: string
  targets: string[]
  isWildcard: boolean
}

async function loadTsconfig(tsconfigPath: string): Promise<{ baseDir: string; paths: Record<string, string[]> }> {
  const visited = new Set<string>()
  let collected: Record<string, string[]> | undefined
  let baseDir = dirname(tsconfigPath)
  let cursor: string | undefined = tsconfigPath

  while (cursor && !visited.has(cursor)) {
    visited.add(cursor)
    // biome-ignore lint/performance/noAwaitInLoops: each iteration depends on the previous tsconfig's `extends`
    const mod = (await import(cursor)) as { default: TsconfigJson }
    const parsed: TsconfigJson = mod.default
    if (parsed.compilerOptions?.paths && !collected) {
      collected = parsed.compilerOptions.paths
      baseDir = dirname(cursor)
    }
    cursor = parsed.extends ? resolve(dirname(cursor), parsed.extends) : undefined
  }

  return { baseDir, paths: collected ?? {} }
}

function compile(paths: Record<string, string[]>): CompiledPath[] {
  return Object.entries(paths).map(([pattern, targets]) => {
    const star = pattern.indexOf('*')
    return star === -1
      ? { prefix: pattern, suffix: '', targets, isWildcard: false }
      : { prefix: pattern.slice(0, star), suffix: pattern.slice(star + 1), targets, isWildcard: true }
  })
}

function absolutize(target: string, baseDir: string): string {
  return isAbsolute(target) ? target : join(baseDir, target)
}

function matchExact(specifier: string, entry: CompiledPath): string | null {
  if (specifier !== entry.prefix) return null
  return entry.targets[0] ?? null
}

function matchWildcard(specifier: string, entry: CompiledPath): string | null {
  if (!specifier.startsWith(entry.prefix) || !specifier.endsWith(entry.suffix)) return null
  const matched = specifier.slice(entry.prefix.length, specifier.length - entry.suffix.length)
  return entry.targets[0]?.replace('*', matched) ?? null
}

function resolveAlias(specifier: string, compiled: CompiledPath[], baseDir: string): string | null {
  for (const entry of compiled) {
    const target = entry.isWildcard ? matchWildcard(specifier, entry) : matchExact(specifier, entry)
    if (target) return absolutize(target, baseDir)
  }
  return null
}

const CANDIDATE_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']

function isFile(candidate: string): boolean {
  try {
    return existsSync(candidate) && statSync(candidate).isFile()
  } catch {
    return false
  }
}

function pickExisting(target: string): string | null {
  for (const ext of CANDIDATE_EXTENSIONS) {
    const candidate = `${target}${ext}`
    if (isFile(candidate)) return candidate
  }
  for (const ext of CANDIDATE_EXTENSIONS) {
    if (!ext) continue
    const candidate = join(target, `index${ext}`)
    if (isFile(candidate)) return candidate
  }
  return null
}

export async function tsconfigPathsPlugin(tsconfigPath: string): Promise<BunPlugin> {
  const { baseDir, paths } = await loadTsconfig(tsconfigPath)
  const compiled = compile(paths)
  if (compiled.length === 0) {
    return {
      name: 'tsconfig-paths',
      setup() {
        // no paths to register
      }
    }
  }

  const filter = new RegExp(
    `^(${compiled
      .map(
        p =>
          `${p.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}${p.isWildcard ? '.*' : ''}${p.suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
      )
      .join('|')})$`
  )

  return {
    name: 'tsconfig-paths',
    setup(build) {
      build.onResolve({ filter }, args => {
        const target = resolveAlias(args.path, compiled, baseDir)
        if (!target) return null
        const resolved = pickExisting(target) ?? target
        return { path: resolved }
      })
    }
  }
}
