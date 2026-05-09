/** Tilde paths used in default `config.yaml` values (before `expandPath`). */
export const DEFAULTS = {
  database: {
    path: '~/.config/kb/knowledge.sqlite' as const
  },
  sources: {
    path: '~/.config/kb/sources/' as const
  },
  config: {
    path: '~/.config/kb/config.yaml' as const
  }
} as const
