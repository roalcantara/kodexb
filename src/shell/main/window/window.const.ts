import type { Size, WindowFrame } from './placement.util'

export const MAIN_WINDOW_DEFAULT_SIZE = { width: 748, height: 600 } as const satisfies Size
export const MAIN_WINDOW_RENDERER_URL = 'views://shell/index.html' as const

export function buildBrowserWindowCreateOptions<Rpc>(frame: WindowFrame, rpc: Rpc, platform: NodeJS.Platform) {
  const isDarwin = platform === 'darwin'
  return {
    title: 'kb',
    url: MAIN_WINDOW_RENDERER_URL,
    frame,
    titleBarStyle: (isDarwin ? 'hidden' : 'default') as 'hidden' | 'default',
    transparent: true,
    hidden: isDarwin,
    activate: !isDarwin,
    rpc
  }
}
