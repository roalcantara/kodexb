#!/usr/bin/env bun

export function buildInstallCommands(): string[] {
  return [
    'bun run build',
    'rm -rf "/Applications/kb.app"',
    'cp -R "build/dev-macos-arm64/kb-dev.app" "/Applications/kb.app"',
    'xattr -d com.apple.quarantine "/Applications/kb.app" 2>/dev/null || true'
  ]
}

export function buildUninstallCommands(): string[] {
  return ['rm -rf "/Applications/kb.app"']
}

export function buildLoginItemScript(mode: 'enable' | 'disable'): string {
  if (mode === 'enable') {
    return `
      tell application "System Events" to make login item at end with properties {path:"/Applications/kb.app", hidden:false}
    `.trim()
  }

  return `
    tell application "System Events"
      try
        delete login item "kb"
      end try
    end tell
  `.trim()
}

export function buildInstallScript(): string {
  return buildInstallCommands().join(' && ')
}

export function buildUninstallScript(): string {
  return buildUninstallCommands().join(' && ')
}

export function buildStartupToggleScript(mode: 'enable' | 'disable'): string {
  return `osascript -e '${buildLoginItemScript(mode)}'`
}

function runShellCommand(command: string): void {
  const result = Bun.spawnSync(['sh', '-lc', command], { stdio: ['inherit', 'inherit', 'inherit'] })
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1)
}

function runAppleScript(command: string): void {
  const result = Bun.spawnSync(['osascript', '-e', command], { stdio: ['inherit', 'inherit', 'inherit'] })
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1)
}

export function runMacosAction(action: 'install' | 'uninstall' | 'login-item', mode?: 'enable' | 'disable'): void {
  if (process.platform !== 'darwin') {
    console.error('This helper is only supported on macOS.')
    process.exit(1)
  }

  switch (action) {
    case 'install':
      runShellCommand(buildInstallScript())
      return
    case 'uninstall':
      runShellCommand(buildUninstallScript())
      return
    case 'login-item':
      if (!mode) {
        console.error('Specify enable or disable for login-item.')
        process.exit(1)
      }
      runAppleScript(buildLoginItemScript(mode))
      return
  }
}

if (import.meta.main) {
  const [command = 'help', mode] = Bun.argv.slice(2)

  switch (command) {
    case 'install':
      runMacosAction('install')
      break
    case 'uninstall':
      runMacosAction('uninstall')
      break
    case 'login-item':
      runMacosAction('login-item', mode as 'enable' | 'disable')
      break
    default:
      console.log('Usage: bun tools/bin/macos_app.script.ts [install|uninstall|login-item enable|login-item disable]')
      process.exitCode = 1
  }
}
