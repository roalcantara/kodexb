import type { Env } from '../../shared/types'

const HOME_TILDE_RE = /^~/
const ENV_BRACES_RE = /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g
const ENV_BARE_RE = /\$([A-Za-z_][A-Za-z0-9_]*)/g

/**
 * Expands `~` to the user home directory and `$VAR` / `${VAR}` env references.
 */
export const expandPath = <T, E = T extends object ? T : Env>(p: unknown, env: E, defaultValue?: string): string => {
  if (typeof p === 'string' && p.trim()) {
    return p
      .replace(HOME_TILDE_RE, (env as Env).HOME ?? '')
      .replace(ENV_BRACES_RE, (_, name: string) => (env as Env)[name] ?? '')
      .replace(ENV_BARE_RE, (_, name: string) => (env as Env)[name] ?? '')
  }
  if (defaultValue) return expandPath(defaultValue, env)
  return ''
}
