import { spawnSync } from 'node:child_process'
import path from 'node:path'

export type FileSelectionArgs = {
  changedOnly: boolean
  base: string | null
}

export type GitRunner = (args: string[]) => string[]

export const defaultGitRunner: GitRunner = (args: string[]) => {
  const diff = spawnSync('git', args)
  if (diff.status !== 0) return []
  return new TextDecoder()
    .decode(diff.stdout)
    .split('\n')
    .map(file => file.trim())
    .filter(Boolean)
}

export function selectCandidateFiles(
  allFiles: string[],
  args: FileSelectionArgs,
  gitRunner: GitRunner = defaultGitRunner
): string[] {
  if (!args.changedOnly) return [...allFiles]

  const base = resolveBaseRef(args.base)
  const changed = gitRunner(['diff', '--name-only', '--staged', base])

  if (changed.length === 0) {
    // Fallback if no staged changes or diff failed
    return allFiles.filter(file => file.startsWith('tools/') || file.endsWith('.ts') || file.endsWith('.md'))
  }

  return allFiles.filter(file => changed.includes(file))
}

export function resolveBaseRef(base: string | null): string {
  if (base?.trim()) return base.trim()
  return 'HEAD'
}

export function normalizeRepoPath(filePath: string): string {
  const root = process.cwd()
  const absolute = path.resolve(filePath)
  const relative = path.relative(root, absolute)
  return relative.split(path.sep).join('/')
}
