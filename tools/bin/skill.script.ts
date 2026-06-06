#!/usr/bin/env bun
/**
 * mise run skill — agent skill registry CLI (thin dispatch stub).
 */
import { chdirToRepoRoot } from '../support/lib/shared/repo_root.script.ts'

const cmd = process.env.usage_cmd ?? process.argv[2] ?? ''
const args = process.argv.slice(2).filter(a => a !== cmd && a !== 'skill')

chdirToRepoRoot()
const proc = Bun.spawn(['bun', 'tools/governance/registries/skill/skill_registry.script.ts', cmd, ...args], {
  stdin: 'inherit',
  stdout: 'inherit',
  stderr: 'inherit'
})
process.exit(await proc.exited)
