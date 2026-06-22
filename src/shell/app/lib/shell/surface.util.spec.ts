import { describe, expect, it, mock } from 'bun:test'
import type { AppShellHooks } from './shell_hooks.types'
import { openExternalUrl, openInEditorFor, pasteDocFor } from './surface.util'

function makeHooks(): AppShellHooks {
  return {
    openExternal: mock((_url: string) => undefined),
    pasteDoc: mock((_doc: string) => undefined),
    openInEditor: mock((_filePath: string, _editorApp?: string) => undefined)
  }
}

describe('openExternalUrl', () => {
  describe('when hooks.openExternal throws', () => {
    it('rejects with the thrown error', async () => {
      const hooks = makeHooks()
      const err = new Error('openExternal failed')
      ;(hooks.openExternal as ReturnType<typeof mock>).mockImplementation(() => {
        throw err
      })
      await expect(openExternalUrl(hooks, 'https://example.com')).rejects.toThrow('openExternal failed')
    })
  })

  describe('when hooks.openExternal succeeds', () => {
    it('resolves and calls the hook with the parsed URL', async () => {
      const hooks = makeHooks()
      await expect(openExternalUrl(hooks, 'https://example.com')).resolves.toBeUndefined()
      expect(hooks.openExternal).toHaveBeenCalledWith('https://example.com/')
    })
  })
})

describe('pasteDocFor', () => {
  describe('when hooks.pasteDoc throws', () => {
    it('rejects with the thrown error', async () => {
      const hooks = makeHooks()
      const err = new Error('pasteDoc failed')
      ;(hooks.pasteDoc as ReturnType<typeof mock>).mockImplementation(() => {
        throw err
      })
      await expect(pasteDocFor(hooks, 'throw')).rejects.toThrow('pasteDoc failed')
    })
  })

  describe('when hooks.pasteDoc succeeds', () => {
    it('resolves and calls the hook with the doc', async () => {
      const hooks = makeHooks()
      await expect(pasteDocFor(hooks, 'doc-content')).resolves.toBeUndefined()
      expect(hooks.pasteDoc).toHaveBeenCalledWith('doc-content')
    })
  })
})

describe('openInEditorFor', () => {
  describe('when hooks.openInEditor throws', () => {
    it('rejects with the thrown error', async () => {
      const hooks = makeHooks()
      const err = new Error('openInEditor failed')
      ;(hooks.openInEditor as ReturnType<typeof mock>).mockImplementation(() => {
        throw err
      })
      await expect(openInEditorFor(hooks, '/tmp/file.md', 'Code')).rejects.toThrow('openInEditor failed')
    })
  })

  describe('when hooks.openInEditor succeeds', () => {
    it('resolves and calls the hook with the path and editor', async () => {
      const hooks = makeHooks()
      await expect(openInEditorFor(hooks, '/tmp/file.md', 'Code')).resolves.toBeUndefined()
      expect(hooks.openInEditor).toHaveBeenCalledWith('/tmp/file.md', 'Code')
    })
  })
})
