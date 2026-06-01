import type { RpcSyncFileResult } from '@shared/rpc'

export type FileLogRowView = RpcSyncFileResult & {
  issues: string[]
  hasIssues: boolean
}

/**
 * Groups summaryErrors by file, deduplicates, and annotates each RpcSyncFileResult
 * with a computed hasIssues flag for the modal accordion.
 */
export function buildFileLogViews(fileLog: RpcSyncFileResult[], summaryErrors: string[]): FileLogRowView[] {
  const pathToErrors = new Map<string, Set<string>>()

  for (const err of summaryErrors) {
    for (const f of fileLog) {
      if (err.startsWith(f.path)) {
        if (!pathToErrors.has(f.path)) pathToErrors.set(f.path, new Set())
        pathToErrors.get(f.path)?.add(err)
      }
    }
  }

  return fileLog.map(f => {
    const issues = new Set<string>()

    if (f.error) issues.add(f.error)

    const fromSummary = pathToErrors.get(f.path)
    if (fromSummary) {
      for (const e of fromSummary) issues.add(e)
    }

    const issuesArr = [...issues]
    const hasIssues = f.ok === false || issuesArr.length > 0

    return { ...f, issues: issuesArr, hasIssues }
  })
}
