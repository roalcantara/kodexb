import path from 'node:path'
import { spawnSync } from 'node:child_process'

export type FileSelectionArgs = {
  changedOnly: boolean
  base: string | null
}

export function selectCandidateFiles(allFiles: string[], args: FileSelectionArgs): string[] {
  if (!args.changedOnly) return [...allFiles]

  const base = resolveBaseRef(args.base)
  const diff = spawnSync('git', ['diff', '--name-only', '--staged', base])
  const changed = diff.status === 0
    ? new TextDecoder()
        .decode(diff.stdout)
        .split('\n')
        .map(file => file.trim())
        .filter(Boolean)
    : []

  if (changed.length === 0) {
    // Fallback if no staged changes or diff failed
    return allFiles.filter(file => file.startsWith('tools/') || file.endsWith('.ts') || file.endsWith('.md'))
  }

  return changed.filter(file => allFiles.includes(file))
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
