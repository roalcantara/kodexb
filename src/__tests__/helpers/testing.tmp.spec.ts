import { describe, expect, it } from 'bun:test'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createTempDir } from './testing.tmp'

describe('createTempDir()', () => {
  it('creates writable dir then cleans up', async () => {
    const { dir, cleanup } = await createTempDir()
    const file = path.join(dir, 'x.txt')
    await fs.writeFile(file, 'ok', 'utf-8')
    expect(await fs.readFile(file, 'utf-8')).toBe('ok')
    await cleanup()
    await expect(fs.stat(dir)).rejects.toThrow()
  })
})
