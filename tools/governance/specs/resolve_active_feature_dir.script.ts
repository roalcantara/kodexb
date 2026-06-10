import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { chdirToRepoRoot } from '../../support/lib/shared/repo_root.script.ts'
import { catalogPaths } from '../support/catalog_paths.script.ts'

const SPECS_ROOT = catalogPaths.specs_root
const BRANCH_RE = /^(\d{3})-/i

export type ResolveResult = { ok: true; featureDir: string } | { ok: false; exitCode: number; message: string }

function tryResolveFromFeatureJson(): string | undefined {
  const featureJson = '.specify/feature.json'
  if (!existsSync(featureJson)) return
  try {
    const data = JSON.parse(readFileSync(featureJson, 'utf-8'))
    const dir = data?.feature_directory
    if (dir) {
      const resolved = path.resolve(dir)
      if (existsSync(path.join(resolved, 'spec.md'))) return resolved
    }
  } catch {}
}

function tryResolveFromGitBranch(): string | undefined {
  const branchProc = Bun.spawnSync(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])
  if (branchProc.exitCode !== 0) return
  const branch = new TextDecoder().decode(branchProc.stdout).trim()
  if (!BRANCH_RE.test(branch)) return
  const candidate = path.join(SPECS_ROOT, branch)
  if (!existsSync(path.join(candidate, 'spec.md'))) return
  return path.resolve(candidate)
}

function tryResolveFromCwd(): string | undefined {
  const cwd = process.cwd()
  if (!cwd.includes(SPECS_ROOT)) return
  const parts = cwd.split(path.sep)
  const specsIdx = parts.indexOf(SPECS_ROOT)
  if (specsIdx < 0) return
  const sub = parts.slice(specsIdx).join(path.sep)
  const candidate = path.resolve(sub)
  if (!existsSync(path.join(candidate, 'spec.md'))) return
  return candidate
}

/**
 * Normalized feature-dir resolution for the `spec` CLI (review f18c5638, rules
 * 00–06): a single positional `[feature]` is preferred; there are no `--feature`
 * / `--feat` flags. When the positional is absent, fall back to active-feature
 * inference. `positional` wins over any legacy `usage_feature` value.
 */
export function resolveSpecFeatureDir(opts: { positional?: string; usage_feature?: string } = {}): ResolveResult {
  const explicit = (opts.positional || opts.usage_feature || '').trim()
  return resolveActiveFeatureDir(explicit || undefined)
}

export function resolveActiveFeatureDir(argDir?: string): ResolveResult {
  chdirToRepoRoot()

  if (argDir) {
    const resolved = path.resolve(argDir)
    if (!existsSync(path.join(resolved, 'spec.md'))) {
      return {
        ok: false,
        exitCode: 2,
        message: `spec: feature dir "${argDir}" does not contain spec.md — use ${SPECS_ROOT}/NNN-slug/`
      }
    }
    if (!resolved.startsWith(path.resolve(SPECS_ROOT))) {
      return {
        ok: false,
        exitCode: 2,
        message: `spec: feature dir "${argDir}" is not under ${SPECS_ROOT}`
      }
    }
    return { ok: true, featureDir: resolved }
  }

  const fromJson = tryResolveFromFeatureJson()
  if (fromJson) {
    if (!fromJson.startsWith(path.resolve(SPECS_ROOT))) {
      return {
        ok: false,
        exitCode: 2,
        message: `spec: feature.json points outside ${SPECS_ROOT}: ${fromJson}`
      }
    }
    return { ok: true, featureDir: fromJson }
  }

  const fromBranch = tryResolveFromGitBranch()
  if (fromBranch) {
    if (!fromBranch.startsWith(path.resolve(SPECS_ROOT))) {
      return {
        ok: false,
        exitCode: 2,
        message: `spec: git branch resolves outside ${SPECS_ROOT}: ${fromBranch}`
      }
    }
    return { ok: true, featureDir: fromBranch }
  }

  const fromCwd = tryResolveFromCwd()
  if (fromCwd) {
    if (!fromCwd.startsWith(path.resolve(SPECS_ROOT))) {
      return {
        ok: false,
        exitCode: 2,
        message: `spec: cwd resolves outside ${SPECS_ROOT}: ${fromCwd}`
      }
    }
    return { ok: true, featureDir: fromCwd }
  }

  return {
    ok: false,
    exitCode: 2,
    message: [
      'spec: could not infer feature directory — try one of:',
      `  • Provide the feature dir as an argument: mise run spec ready ${SPECS_ROOT}/NNN-slug`,
      `  • Create .specify/feature.json with {"feature_directory": "${SPECS_ROOT}/NNN-slug"}`,
      '  • Check out a branch matching NNN-slug',
      `  • Run from within a ${SPECS_ROOT}/NNN-slug/ directory`
    ].join('\n')
  }
}
