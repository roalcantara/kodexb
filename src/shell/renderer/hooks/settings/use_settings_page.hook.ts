import type { ConfigPatch, RpcDbStats, RpcGetConfigPayload } from '@shared/rpc'
import { useCallback, useEffect, useRef, useState } from 'react'

import { PAGE_SIZE_LARGE, PAGE_SIZE_MEDIUM, PAGE_SIZE_SMALL, PAGE_SIZE_XL } from '../../constants/page_size.const'
import type { SettingsRpc } from '../../pages/settings/settings.types'

const PAGE_SIZE_OPTIONS = [PAGE_SIZE_SMALL, PAGE_SIZE_MEDIUM, PAGE_SIZE_LARGE, PAGE_SIZE_XL] as const

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number]

const SETTINGS_SAVED_FLASH_MS = 2000

export type UseSettingsPageArgs = {
  rpc: SettingsRpc
  onCloseRequest?: () => void
  onConfigSaved?: (cfg: RpcGetConfigPayload) => void
}

function parseDisplayPageSize(raw: string): PageSizeOption {
  const ps = Number.parseInt(raw, 10)
  return PAGE_SIZE_OPTIONS.includes(ps as PageSizeOption) ? (ps as PageSizeOption) : PAGE_SIZE_MEDIUM
}

function useSettingsFormFields() {
  const [baseline, setBaseline] = useState<RpcGetConfigPayload | null>(null)
  const [configPath, setConfigPath] = useState('')
  const [dbPath, setDbPath] = useState('')
  const [sourcesPath, setSourcesPath] = useState('')
  const [terminalApp, setTerminalApp] = useState('')
  const [editorApp, setEditorApp] = useState('')
  const [pageSize, setPageSize] = useState<PageSizeOption>(PAGE_SIZE_MEDIUM)
  const [loadError, setLoadError] = useState<string | null>(null)

  const applyPayload = useCallback((cfg: RpcGetConfigPayload) => {
    setConfigPath(cfg.configPath)
    setDbPath(cfg.database.path)
    setSourcesPath(cfg.sources.path)
    setTerminalApp(cfg.display.terminalApp ?? '')
    setEditorApp(cfg.display.editorApp ?? '')
    setPageSize(parseDisplayPageSize(cfg.display.pageSize))
  }, [])

  return {
    baseline,
    setBaseline,
    configPath,
    dbPath,
    setDbPath,
    sourcesPath,
    setSourcesPath,
    terminalApp,
    setTerminalApp,
    editorApp,
    setEditorApp,
    pageSize,
    setPageSize,
    loadError,
    setLoadError,
    applyPayload
  }
}

function useSettingsRpcLoad(
  rpc: SettingsRpc,
  applyPayload: (cfg: RpcGetConfigPayload) => void,
  setBaseline: (v: RpcGetConfigPayload) => void,
  setLoadError: (v: string | null) => void
) {
  useEffect(() => {
    rpc
      .getConfig()
      .then(cfg => {
        setBaseline(cfg)
        applyPayload(cfg)
        setLoadError(null)
      })
      .catch(e => {
        setLoadError(String(e))
      })
  }, [applyPayload, rpc, setBaseline, setLoadError])
}

function useSettingsFilePickers(
  rpc: SettingsRpc,
  dbPath: string,
  setDbPath: (v: string) => void,
  sourcesPath: string,
  setSourcesPath: (v: string) => void
) {
  const pickDatabaseFile = useCallback(async () => {
    const picked = await rpc.showOpenDialog({
      title: 'Select database file',
      defaultPath: dbPath || undefined,
      properties: ['openFile']
    })
    if (picked !== null) setDbPath(picked)
  }, [dbPath, rpc, setDbPath])

  const pickSourcesDir = useCallback(async () => {
    const picked = await rpc.showOpenDialog({
      title: 'Select sources folder',
      defaultPath: sourcesPath || undefined,
      properties: ['openDirectory']
    })
    if (picked !== null) setSourcesPath(picked)
  }, [rpc, setSourcesPath, sourcesPath])

  return { pickDatabaseFile, pickSourcesDir }
}

function useSettingsSaveFlash() {
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [savedFlash, setSavedFlash] = useState(false)

  useEffect(
    () => () => {
      if (savedTimer.current !== undefined) clearTimeout(savedTimer.current)
    },
    []
  )

  const flashSaved = useCallback(() => {
    if (savedTimer.current !== undefined) clearTimeout(savedTimer.current)
    setSavedFlash(true)
    savedTimer.current = setTimeout(() => {
      setSavedFlash(false)
      savedTimer.current = undefined
    }, SETTINGS_SAVED_FLASH_MS)
  }, [])

  return { savedFlash, flashSaved }
}

function useSettingsSaveAndReset(
  rpc: SettingsRpc,
  applyPayload: (cfg: RpcGetConfigPayload) => void,
  setBaseline: (v: RpcGetConfigPayload) => void,
  fields: {
    sourcesPath: string
    dbPath: string
    terminalApp: string
    editorApp: string
    pageSize: PageSizeOption
  },
  flashSaved: () => void,
  onConfigSaved?: (cfg: RpcGetConfigPayload) => void
) {
  const { sourcesPath, dbPath, terminalApp, editorApp, pageSize } = fields

  const onSave = useCallback(async () => {
    const patch: ConfigPatch = {
      sourcesDir: sourcesPath,
      dbPath,
      terminalApp: terminalApp || undefined,
      editorApp: editorApp || undefined,
      pageSize
    }
    const next = await rpc.saveConfig(patch)
    setBaseline(next)
    applyPayload(next)
    onConfigSaved?.(next)
    flashSaved()
  }, [applyPayload, dbPath, editorApp, flashSaved, onConfigSaved, pageSize, rpc, setBaseline, sourcesPath, terminalApp])

  const onReset = useCallback(async () => {
    const cfg = await rpc.getConfig()
    setBaseline(cfg)
    applyPayload(cfg)
  }, [applyPayload, rpc, setBaseline])

  return { onSave, onReset }
}

function useEscapeToClose(onCloseRequest: (() => void) | undefined) {
  useEffect(() => {
    if (onCloseRequest === undefined) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRequest()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCloseRequest])
}

export function useSettingsPage({ rpc, onCloseRequest, onConfigSaved }: UseSettingsPageArgs) {
  const f = useSettingsFormFields()
  useSettingsRpcLoad(rpc, f.applyPayload, f.setBaseline, f.setLoadError)
  const { pickDatabaseFile, pickSourcesDir } = useSettingsFilePickers(
    rpc,
    f.dbPath,
    f.setDbPath,
    f.sourcesPath,
    f.setSourcesPath
  )
  const { savedFlash, flashSaved } = useSettingsSaveFlash()
  const { onSave, onReset } = useSettingsSaveAndReset(
    rpc,
    f.applyPayload,
    f.setBaseline,
    {
      sourcesPath: f.sourcesPath,
      dbPath: f.dbPath,
      terminalApp: f.terminalApp,
      editorApp: f.editorApp,
      pageSize: f.pageSize
    },
    flashSaved,
    onConfigSaved
  )
  useEscapeToClose(onCloseRequest)

  const [dbStats, setDbStats] = useState<RpcDbStats | null>(null)
  useEffect(() => {
    rpc
      .getStats()
      .then(s => setDbStats(s))
      .catch(() => setDbStats(null))
  }, [rpc])

  return {
    baseline: f.baseline,
    loadError: f.loadError,
    configPath: f.configPath,
    dbPath: f.dbPath,
    sourcesPath: f.sourcesPath,
    terminalApp: f.terminalApp,
    setTerminalApp: f.setTerminalApp,
    editorApp: f.editorApp,
    setEditorApp: f.setEditorApp,
    pageSize: f.pageSize,
    setPageSize: f.setPageSize,
    savedFlash,
    pickDatabaseFile,
    pickSourcesDir,
    onSave,
    onReset,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    dbStats
  }
}
