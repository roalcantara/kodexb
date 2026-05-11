import { describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import { minimalEntriesYml, testingPaths } from './paths'

describe('testingPaths', () => {
  it('resolves minimal entries file', async () => {
    const stat = await fs.stat(minimalEntriesYml)
    expect(stat.isFile()).toBe(true)
  })

  it('includes sample dir', async () => {
    const stat = await fs.stat(testingPaths.sample)
    expect(stat.isDirectory()).toBe(true)
  })
})
