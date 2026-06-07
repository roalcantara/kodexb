import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

export function createCatalogTestRoot(prefix: string): { root: string; cleanup: () => void } {
  const root = mkdtempSync(path.join(tmpdir(), prefix))
  const cleanup = () => {
    try {
      rmSync(root, { recursive: true, force: true })
    } catch {
      /* ok */
    }
  }
  return { root, cleanup }
}

export function writeCatalogFile(root: string, relPath: string, content: string): void {
  mkdirSync(path.join(root, path.dirname(relPath)), { recursive: true })
  writeFileSync(path.join(root, relPath), content)
}

export class CatalogTestHarness {
  private _root: string | null = null
  private _cleanup: (() => void) | null = null

  get root(): string {
    if (!this._root) throw new Error('Harness not initialized')
    return this._root
  }

  init(prefix: string): string {
    const { root, cleanup } = createCatalogTestRoot(prefix)
    this._root = root
    this._cleanup = cleanup
    return root
  }

  writeFile(relPath: string, content: string): void {
    writeCatalogFile(this.root, relPath, content)
  }

  cleanup(): void {
    this._cleanup?.()
    this._root = null
    this._cleanup = null
  }
}
