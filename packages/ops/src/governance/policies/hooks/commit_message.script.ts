#!/usr/bin/env bun

import { validateCommitMessage } from './commit_message_validate.script'

const messageFile = process.argv[2]

if (!messageFile) {
  console.log('commit message policy: missing message file')
  process.exit(1)
}

const file = Bun.file(messageFile)
if (!(await file.exists())) {
  console.log('commit message policy: missing message file')
  process.exit(1)
}

const contents = await file.text()

const authorName =
  process.env.GIT_HOOK_AUTHOR_NAME ??
  process.env.GIT_AUTHOR_NAME ??
  (() => {
    try {
      const child = Bun.spawnSync(['git', 'var', 'GIT_AUTHOR_IDENT'])
      return child.stdout?.toString().trim() ?? ''
    } catch {
      return ''
    }
  })()

const result = validateCommitMessage(contents, { authorName })

if (!result.ok) {
  console.log('commit message policy: failed')
  for (const f of result.failures) console.log(f)
  process.exit(1)
}

if (result.skipped) {
  console.log(`commit message policy: skipped ${result.skipped}`)
  process.exit(0)
}

console.log('commit message policy: ok')
