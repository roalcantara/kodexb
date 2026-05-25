import type { RpcGetConfigPayload } from '@shared/rpc'
import { fireAndForget } from '@shared/utils'

import { useSettingsPage } from '../../hooks/settings/use_settings_page.hook'

import type { SettingsRpc } from './settings.types'

export type { SettingsRpc } from './settings.types'

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

/** Lazy-load real RPC so unit tests can inject `rpc` without pulling `electrobun/view`. */
const defaultRpc: SettingsRpc = {
  getConfig: () => import('../../rpc/client').then(m => m.getConfig()),
  saveConfig: patch => import('../../rpc/client').then(m => m.saveConfig(patch)),
  showOpenDialog: opts => import('../../rpc/client').then(m => m.showOpenDialog(opts)),
  getStats: () => import('../../rpc/client').then(m => m.getStats())
}

export type SettingsPageProps = {
  onCloseRequest?: () => void
  onConfigSaved?: (cfg: RpcGetConfigPayload) => void
  rpc?: SettingsRpc
}

export function SettingsPage({ onCloseRequest, onConfigSaved, rpc = defaultRpc }: SettingsPageProps) {
  const s = useSettingsPage({ rpc, onCloseRequest, onConfigSaved })

  if (s.loadError !== null) {
    return (
      <div className="kb-settings kb-settings--error" role="alert">
        <p>Could not load settings.</p>
        <pre className="kb-settings-pre">{s.loadError}</pre>
      </div>
    )
  }

  if (s.baseline === null) {
    return (
      <div className="kb-settings" aria-busy="true">
        <p className="kb-settings-muted">Loading…</p>
      </div>
    )
  }

  return (
    <div className="kb-settings">
      <h1 className="kb-settings-title">Settings</h1>

      <section className="kb-settings-section" aria-labelledby="settings-paths">
        <h2 id="settings-paths" className="kb-settings-heading">
          Paths
        </h2>
        <div className="kb-settings-row">
          <span className="kb-settings-label">Config file</span>
          <code className="kb-settings-path">{s.configPath}</code>
        </div>
        <div className="kb-settings-row">
          <span className="kb-settings-label">Database</span>
          <code className="kb-settings-path">{s.dbPath}</code>
          <button
            type="button"
            className="kb-settings-browse"
            onClick={() => fireAndForget(s.pickDatabaseFile())}
            aria-label="Browse for database file"
          >
            Browse
          </button>
        </div>
        <div className="kb-settings-row">
          <span className="kb-settings-label">Sources</span>
          <code className="kb-settings-path">{s.sourcesPath}</code>
          <button
            type="button"
            className="kb-settings-browse"
            onClick={() => fireAndForget(s.pickSourcesDir())}
            aria-label="Browse for sources folder"
          >
            Browse
          </button>
        </div>
      </section>

      <section className="kb-settings-section" aria-labelledby="settings-apps">
        <h2 id="settings-apps" className="kb-settings-heading">
          Apps
        </h2>
        <label className="kb-settings-field">
          <span className="kb-settings-label">Terminal</span>
          <input
            className="kb-settings-input"
            type="text"
            value={s.terminalApp}
            onChange={e => s.setTerminalApp(e.target.value)}
            autoComplete="off"
            aria-label="Terminal application"
          />
        </label>
        <label className="kb-settings-field">
          <span className="kb-settings-label">Editor</span>
          <input
            className="kb-settings-input"
            type="text"
            value={s.editorApp}
            onChange={e => s.setEditorApp(e.target.value)}
            autoComplete="off"
            aria-label="Editor application"
          />
        </label>
      </section>

      <section className="kb-settings-section" aria-labelledby="settings-display">
        <h2 id="settings-display" className="kb-settings-heading">
          Display
        </h2>
        <fieldset className="kb-settings-fieldset">
          <legend className="kb-settings-legend">Page size</legend>
          {s.pageSizeOptions.map(n => (
            <label key={n} className="kb-settings-radio">
              <input
                type="radio"
                name="pageSize"
                value={n}
                checked={s.pageSize === n}
                onChange={() => s.setPageSize(n)}
              />
              <span>{n}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="kb-settingsSection">
        <h2 className="kb-settingsSection-title">Stats</h2>
        <div className="kb-settingsRow">
          <table className="kb-statsTable">
            <tbody>
              <tr>
                <td>Bookmarks</td>
                <td className="kb-statsCount">{s.dbStats?.byType?.bookmark ?? 0}</td>
              </tr>
              <tr>
                <td>Commands</td>
                <td className="kb-statsCount">{s.dbStats?.byType?.command ?? 0}</td>
              </tr>
              <tr>
                <td>Cheats</td>
                <td className="kb-statsCount">{s.dbStats?.byType?.cheat ?? 0}</td>
              </tr>
              <tr>
                <td>Tasks</td>
                <td className="kb-statsCount">{s.dbStats?.byType?.task ?? 0}</td>
              </tr>
              <tr className="kb-statsTotal">
                <td>Total</td>
                <td className="kb-statsCount">{s.dbStats?.total ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="kb-settingsRow">
          <span className="kb-settings-label">Database Path</span>
          <div className="kb-settingsValue">{s.dbStats?.dbPath ?? '—'}</div>
        </div>
        <div className="kb-settingsRow">
          <span className="kb-settings-label">Database Size</span>
          <div className="kb-settingsValue">{formatBytes(s.dbStats?.dbSize ?? 0)}</div>
        </div>
      </section>

      <section className="kb-settings-section kb-settings-actions" aria-labelledby="settings-actions">
        <h2 id="settings-actions" className="kb-settings-heading">
          Actions
        </h2>
        <div className="kb-settings-actionRow">
          <button type="button" className="kb-settings-primary" onClick={() => fireAndForget(s.onSave())}>
            Save
          </button>
          <button type="button" className="kb-settings-secondary" onClick={() => fireAndForget(s.onReset())}>
            Reset to defaults
          </button>
          {s.savedFlash ? (
            <span className="kb-settings-saved" role="status">
              Saved ✓
            </span>
          ) : null}
        </div>
      </section>
    </div>
  )
}
