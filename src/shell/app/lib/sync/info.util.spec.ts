import { describe, expect, it } from 'bun:test'
import { testingPaths } from '@testing'
import { getSyncInfoForSourcesDir } from './info.util'

describe('getSyncInfoForSourcesDir', () => {
  it('counts yaml sources under the directory', async () => {
    const info = await getSyncInfoForSourcesDir(testingPaths.sample)
    expect(info.sourcesDir).toBe(testingPaths.sample)
    expect(info.fileCount).toBeGreaterThan(0)
  })
})
