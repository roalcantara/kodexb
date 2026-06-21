export function resolveTerminalAppName(
  terminalApp?: string,
  platform?: NodeJS.Platform,
  env?: Record<string, string | undefined>
): string {
  if (terminalApp) return terminalApp
  if ((platform ?? process.platform) === 'darwin') return 'Terminal'
  const e = env ?? process.env
  return e.TERMINAL ?? 'x-terminal-emulator'
}
