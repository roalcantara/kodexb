export function usageFlag(env: Record<string, string | undefined>, name: string): boolean {
  return env[`usage_${name}`] === 'true'
}

export function usageOptString(env: Record<string, string | undefined>, name: string): string | undefined {
  return env[`usage_${name}`]?.trim() || undefined
}

export function usageCmd(env: Record<string, string | undefined>, fallback?: string): string {
  return env.usage_cmd?.trim() || fallback?.trim() || ''
}

export function stripUsageEnv(env: Record<string, string | undefined>): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {}
  for (const key of Object.keys(env)) {
    if (!key.startsWith('usage_')) out[key] = env[key]
  }
  return out
}

export function copyUsageToChild(
  strippedEnv: Record<string, string | undefined>,
  parentEnv: Record<string, string | undefined>,
  keys: string[]
): Record<string, string | undefined> {
  const child = { ...strippedEnv }
  for (const key of keys) {
    const val = parentEnv[`usage_${key}`]
    if (val !== undefined) child[`usage_${key}`] = val
  }
  return child
}

export function rawJsonConflict(raw: boolean, json: boolean): string | null {
  return raw && json ? 'spec: --raw and --json are mutually exclusive' : null
}

export function usageFlags<K extends string>(env: Record<string, string | undefined>, keys: K[]): Record<K, boolean> {
  const out = {} as Record<K, boolean>
  for (const key of keys) out[key] = usageFlag(env, key)
  return out
}

export function usageStrings<K extends string>(
  env: Record<string, string | undefined>,
  keys: K[]
): Record<K, string | undefined> {
  const out = {} as Record<K, string | undefined>
  for (const key of keys) out[key] = usageOptString(env, key)
  return out
}
