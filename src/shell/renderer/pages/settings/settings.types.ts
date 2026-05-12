import type { getConfig, getStats, saveConfig, showOpenDialog } from '../../rpc/client'

export type SettingsRpc = {
  getConfig: typeof getConfig
  saveConfig: typeof saveConfig
  showOpenDialog: typeof showOpenDialog
  getStats: typeof getStats
}
