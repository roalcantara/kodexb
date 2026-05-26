import type { ElectrobunConfig } from 'electrobun'
import packageJson from './package.json'
import { rendererLogEnvPlugin } from './tools/build/renderer_log_env.plugin'
import { tsconfigPathsPlugin } from './tools/build/tsconfig_paths.plugin'

const appIconset = 'assets/icons/app-logo.iconset'
const tsconfigPath = new URL('./tsconfig.json', import.meta.url).pathname
const pathsPlugin = await tsconfigPathsPlugin(tsconfigPath)

const developerId = process.env.ELECTROBUN_DEVELOPER_ID ?? ''
const appleId = process.env.ELECTROBUN_APPLEID ?? ''
const appleIdPass = process.env.ELECTROBUN_APPLEIDPASS ?? ''
const appleTeamId = process.env.ELECTROBUN_TEAMID ?? ''

const canCodesign = developerId.length > 0
const canNotarize = canCodesign && appleId.length > 0 && appleIdPass.length > 0 && appleTeamId.length > 0

/**
 * Opt-in CEF renderer for dev-time debugging. WKWebView (the default native
 * macOS renderer) only exposes Apple's Safari Web Inspector — Apple does not
 * expose Chrome DevTools Protocol — so Chromium-based debuggers (Cursor
 * Browser, Chrome, Edge) cannot connect to it. Setting `ELECTROBUN_RENDERER=cef`
 * bundles CEF and switches the default renderer; CEF then exposes Chrome
 * DevTools at `http://localhost:9222` for any Chromium browser to attach to.
 *
 * Defaults to `false` so canary/stable builds remain unaffected. Use the
 * `bun run dev:cef` script (or set the env var manually) when you want to
 * debug the renderer from Cursor Browser.
 */
const useCef = process.env.ELECTROBUN_RENDERER === 'cef'

export default {
  app: {
    name: packageJson.name,
    identifier: `sh.blackboard.${packageJson.name}`,
    version: packageJson.version
  },
  build: {
    bun: {
      entrypoint: 'src/shell/main/index.ts',
      tsconfig: tsconfigPath,
      plugins: [pathsPlugin]
    },
    views: {
      shell: {
        entrypoint: 'src/shell/renderer/index.ts',
        tsconfig: tsconfigPath,
        plugins: [pathsPlugin, rendererLogEnvPlugin()]
      }
    },
    copy: {
      'src/shell/renderer/index.html': 'views/shell/index.html',
      'assets/images': 'views/shell/assets/images'
    },
    /**
     * `build.copy` dirs are watched by default; `assets/images/**` contains
     * ~800 static design icons carrying the `com.apple.provenance` xattr,
     * which macOS fsevents periodically re-reports during Spotlight scans.
     * That fires a spurious rebuild loop that also deletes the running app's
     * CWD mid-flight (causing `current working directory was deleted` from
     * the spawned bun process). Icons don't need hot reload — restart
     * `bun run dev` / `dev:cef` manually when an icon genuinely changes.
     */
    watchIgnore: ['assets/images/**'],
    mac: {
      icons: appIconset,
      bundleCEF: useCef,
      defaultRenderer: useCef ? 'cef' : 'native',
      codesign: canCodesign,
      notarize: canNotarize,
      createDmg: true,
      entitlements: {
        'com.apple.security.cs.allow-jit': true,
        'com.apple.security.cs.allow-unsigned-executable-memory': true,
        'com.apple.security.cs.disable-library-validation': true,
        'com.apple.security.network.client': true
      }
    },
    linux: {
      icon: `${appIconset}/icon_256x256.png`,
      bundleCEF: useCef,
      defaultRenderer: useCef ? 'cef' : 'native'
    }
  }
} satisfies ElectrobunConfig
