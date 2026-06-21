/**
 * Closeout / ready commit flush — delegates to Commit plan apply (no generic messages).
 */
import { applyRemaining } from './commit_plan_apply.script'

export type CloseoutCommitOpts = {
  root: string
  featureDir: string
  message?: string
  dryRun?: boolean
}

export function runCloseoutCommit(opts: CloseoutCommitOpts): number {
  return applyRemaining({
    root: opts.root,
    featureDir: opts.featureDir,
    messageOverride: opts.message,
    dryRun: opts.dryRun,
    strictCoverage: true
  })
}
