/// <reference lib="dom" />

import { afterEach, describe, expect, mock, test } from 'bun:test'
import type { RpcGetConfigPayload } from '@shared/rpc'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsPage } from './settings.page'
import type { SettingsRpc } from './settings.types'

const BROWSE_FOR_RE = /Browse for/
const SAVED_LABEL_RE = /Saved/

const baseCfg: RpcGetConfigPayload = {
  configPath: '/home/kb/config.yaml',
  database: { path: '/home/kb/data.sqlite' },
  sources: { path: '/home/kb/sources' },
  display: { terminalApp: 'Terminal.app', editorApp: 'Code.app', pageSize: '50' }
}

function makeRpc(overrides: Partial<SettingsRpc> = {}): SettingsRpc {
  const getConfig = mock(() => Promise.resolve(baseCfg))
  const saveConfig = mock(() =>
    Promise.resolve({
      ...baseCfg,
      display: { ...baseCfg.display, pageSize: '100', terminalApp: 't2', editorApp: 'e2' }
    })
  )
  const showOpenDialog = mock(() => Promise.resolve('/picked/sources'))
  return { getConfig, saveConfig, showOpenDialog, ...overrides }
}

describe('SettingsPage', () => {
  afterEach(() => {
    mock.restore()
  })

  test('renders all sections from getConfig', async () => {
    const rpc = makeRpc()
    render(<SettingsPage rpc={rpc} />)
    await waitFor(() => expect(rpc.getConfig).toHaveBeenCalled())
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy()
    expect(screen.getByText('/home/kb/config.yaml')).toBeTruthy()
    expect(screen.getByText('/home/kb/data.sqlite')).toBeTruthy()
    expect(screen.getByText('/home/kb/sources')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Paths' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Apps' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Display' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Actions' })).toBeTruthy()
  })

  test('Save calls saveConfig with patch', async () => {
    const rpc = makeRpc()
    const user = userEvent.setup()
    render(<SettingsPage rpc={rpc} />)
    await waitFor(() => expect(screen.getByDisplayValue('Terminal.app')).toBeTruthy())
    const radios = screen.getAllByRole('radio')
    const size100 = radios[2]
    if (size100 === undefined) throw new Error('expected page size radio')
    await user.click(size100)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(rpc.saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        sourcesDir: '/home/kb/sources',
        dbPath: '/home/kb/data.sqlite',
        pageSize: 100
      })
    )
  })

  test('sources Browse calls showOpenDialog and updates path', async () => {
    const rpc = makeRpc()
    const user = userEvent.setup()
    render(<SettingsPage rpc={rpc} />)
    await waitFor(() => expect(screen.getByText('/home/kb/sources')).toBeTruthy())
    const browseButtons = screen.getAllByRole('button', { name: BROWSE_FOR_RE })
    const lastBrowse = browseButtons[browseButtons.length - 1]
    if (lastBrowse === undefined) throw new Error('expected browse button')
    await user.click(lastBrowse)
    expect(rpc.showOpenDialog).toHaveBeenCalled()
    await waitFor(() => expect(screen.getByText('/picked/sources')).toBeTruthy())
  })

  test('Reset refetches and restores page size', async () => {
    const rpc = makeRpc()
    const user = userEvent.setup()
    render(<SettingsPage rpc={rpc} />)
    await waitFor(() => expect(screen.getAllByRole('radio')[1]).toBeTruthy())
    const radios = screen.getAllByRole('radio')
    const size100 = radios[2]
    if (size100 === undefined) throw new Error('expected page size radio')
    await user.click(size100)
    expect((screen.getAllByRole('radio')[2] as HTMLInputElement).checked).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Reset to defaults' }))
    expect(rpc.getConfig).toHaveBeenCalledTimes(2)
    await waitFor(() => expect((screen.getAllByRole('radio')[1] as HTMLInputElement).checked).toBe(true))
  })

  test('shows Saved after successful save', async () => {
    const rpc = makeRpc()
    const user = userEvent.setup()
    render(<SettingsPage rpc={rpc} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText(SAVED_LABEL_RE)).toBeTruthy()
  })

  test('invokes onConfigSaved with payload after successful save', async () => {
    const rpc = makeRpc()
    const user = userEvent.setup()
    const onConfigSaved = mock(() => undefined)
    render(<SettingsPage rpc={rpc} onConfigSaved={onConfigSaved} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy())
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(onConfigSaved).toHaveBeenCalledWith(
        expect.objectContaining({
          display: expect.objectContaining({ pageSize: '100' })
        })
      )
    )
  })
})
