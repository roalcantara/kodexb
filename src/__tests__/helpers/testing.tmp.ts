import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export type TempDir = {
  dir: string
  cleanup: () => Promise<void>
}

/** Creates an empty directory under the OS temp dir; `cleanup` removes it recursively. */
export async function createTempDir(prefix = 'kb-test-'): Promise<TempDir> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix))
  return {
    dir,
    cleanup: async () => {
      await fs.rm(dir, { recursive: true, force: true })
    }
  }
}
