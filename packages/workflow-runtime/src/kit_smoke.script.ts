/** SKO-7 smoke harness — set `KB_KIT_SMOKE=1` only from `spec test smoke`. */
export const KB_KIT_SMOKE_ENV = 'KB_KIT_SMOKE'

export function isKitSmokeMode(): boolean {
  return process.env[KB_KIT_SMOKE_ENV] === '1'
}

export function featureDirFromArgv(argv: string[]): string {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--feature' && argv[i + 1]) return argv[i + 1] ?? ''
  }
  return ''
}
