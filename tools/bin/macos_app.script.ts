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
  const appPath = '/Applications/kb.app'

  if (mode === 'enable') {
    return `
      tell application "System Events"
        set kbPath to "${appPath}"
        set existingItems to every login item whose path is kbPath
        if (count of existingItems) is 0 then
          make login item at end with properties {path:kbPath, hidden:true}
        end if
      end tell
    `.trim()
  }

  return `
    tell application "System Events"
      set kbPath to "${appPath}"
      repeat with li in login items
        if path of li is kbPath then delete li
      end repeat
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

function runAppleScript(command: string, successMessage?: string): void {
  const result = Bun.spawnSync(['osascript', '-e', command], { stdout: 'pipe', stderr: 'inherit', stdin: 'inherit' })
  if (result.exitCode !== 0) process.exit(result.exitCode ?? 1)
  if (successMessage) console.log(successMessage)
}

export function runMacosAction(action: 'install' | 'uninstall' | 'login-item', mode?: 'enable' | 'disable'): void {
  if (process.platform !== 'darwin') {
    console.error('This helper is only supported on macOS.')
    process.exit(1)
  }

  switch (action) {
    case 'install':
      runShellCommand(buildInstallScript())
      console.log(
        '\nIf ⌘⌥/ does not summon kb, grant Accessibility for kb in System Settings → Privacy & Security, then restart the app.'
      )
      return
    case 'uninstall':
      runShellCommand(buildUninstallScript())
      return
    case 'login-item':
      if (!mode) {
        console.error('Specify enable or disable for login-item.')
        process.exit(1)
      }
      runAppleScript(
        buildLoginItemScript(mode),
        mode === 'enable'
          ? 'Login item enabled: kb will start hidden at login (/Applications/kb.app).'
          : 'Login item disabled: kb removed from Login Items.'
      )
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
