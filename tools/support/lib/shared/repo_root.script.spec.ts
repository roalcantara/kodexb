import { describe, expect, it } from 'bun:test'
import { repoRoot } from './repo_root.script.ts'

describe('repo_root.lib', () => {
  it('repoRoot returns an absolute path containing mise.toml', async () => {
    const root = repoRoot()
    expect(root.startsWith('/')).toBe(true)
    expect(await Bun.file(`${root}/mise.toml`).exists()).toBe(true)
  })
})
