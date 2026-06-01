/** Raycast KeyModifier literals (+ Linux `super`). Single owner for schema and parsers. */
export const KEY_MODIFIER_VALUES = ['cmd', 'ctrl', 'alt', 'shift', 'super', 'windows'] as const

export type KeyModifier = (typeof KEY_MODIFIER_VALUES)[number]
export function isKeyModifier(modifier: unknown): modifier is KeyModifier {
  return typeof modifier === 'string' && KEY_MODIFIER_VALUES.includes(modifier as KeyModifier)
}

export type KeyModifierSet = { modifiers: readonly KeyModifier[] }

export function getKeyModifier(modifier: unknown): KeyModifier | null {
  return KEY_MODIFIER_VALUES.includes(modifier as KeyModifier) ? (modifier as KeyModifier) : null
}

/** Authoring-only token; expands to the platform hyper triple (Raycast ✦). Not stored in bindings. */
export const HYPER_AUTHORING_TOKEN = 'hyper' as const

/** Platforms that define a concrete hyper triple (excludes `any`). */
export const CHORD_PLATFORM_VALUES = ['macos', 'linux', 'windows'] as const

export type ChordPlatform = (typeof CHORD_PLATFORM_VALUES)[number]

/** Sort order for stored binding modifiers (post-normalize). */
export const KEY_MODIFIER_PRECEDENCE: Record<KeyModifier, number> = {
  ctrl: 0,
  alt: 1,
  cmd: 2,
  super: 2,
  windows: 2,
  shift: 3
}
// Keyboard-left-to-right (US layout): ctrl, alt, cmd/super/windows, shift
export const ORDERED_MODIFIERS: KeyModifier[] = ['ctrl', 'alt', 'cmd', 'super', 'windows', 'shift']

export const DEFAULT_KEY_MODIFIER_PRECEDENCE = 99

/** Sort order while parsing YAML (`hyper` not yet expanded). */
export const KEY_MODIFIER_AUTHORING_PRECEDENCE: Record<string, number> = {
  hyper: 0,
  ctrl: 1,
  alt: 2,
  cmd: 3,
  super: 3,
  windows: 3,
  shift: 4
}

/** Raycast alias → canonical modifier (or authoring `hyper`). */
export const KEY_MODIFIER_INPUT_ALIASES: Record<string, KeyModifier | typeof HYPER_AUTHORING_TOKEN> = {
  opt: 'alt',
  option: 'alt',
  control: 'ctrl',
  meta: 'cmd',
  command: 'cmd'
}

/** Raycast ✦ hyper triple per platform. */
export const HYPER_TRIPLE_BY_PLATFORM: Record<ChordPlatform, readonly KeyModifier[]> = {
  macos: ['ctrl', 'alt', 'cmd'],
  linux: ['ctrl', 'alt', 'super'],
  windows: ['ctrl', 'alt', 'windows']
}

export const GLYPH_MAP_MACOS: Record<KeyModifier, string> = {
  cmd: '⌘',
  ctrl: '⌃',
  alt: '⌥',
  shift: '⇧',
  super: '◆',
  windows: '⊞'
}

export const GLYPH_MAP_LINUX: Record<KeyModifier, string> = {
  cmd: 'Meta',
  ctrl: 'Ctrl',
  alt: 'Alt',
  shift: 'Shift',
  super: 'Super',
  windows: 'Win'
}

export const HYPER_GLYPH = '✦'

/** Tokens accepted in YAML chord strings (includes authoring `hyper`). */
export const AUTHORING_MODIFIERS = [...KEY_MODIFIER_VALUES, HYPER_AUTHORING_TOKEN] as const
export const MODIFIER_GLYPH_PATTERN = /[⌘⌥⌃⇧✦❖]/

/**
 * Canonical chord key token → display glyph (macOS-oriented; see `assets/sources/unicodes.yml`).
 * Author and store the **key** only (`cmd+arrowUp`, `esc`); never `up`, `arrowup`, `escape`, or `↑` in chords.
 */
export const KEY_GLYPHS = {
  a: 'a',
  b: 'b',
  c: 'c',
  d: 'd',
  e: 'e',
  f: 'f',
  g: 'g',
  h: 'h',
  i: 'i',
  j: 'j',
  k: 'k',
  l: 'l',
  m: 'm',
  n: 'n',
  o: 'o',
  p: 'p',
  q: 'q',
  r: 'r',
  s: 's',
  t: 't',
  u: 'u',
  v: 'v',
  w: 'w',
  x: 'x',
  y: 'y',
  z: 'z',
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '.': '.',
  ',': ',',
  ';': ';',
  '=': '=',
  '+': '+',
  '-': '-',
  '[': '[',
  ']': ']',
  '{': '{',
  '}': '}',
  '«': '«',
  '»': '»',
  '(': '(',
  ')': ')',
  '/': '/',
  "'": "'",
  '`': '`',
  '§': '§',
  '^': '^',
  '@': '@',
  // biome-ignore lint/style/useNamingConvention: chord token is the printed key
  $: '$',
  arrowUp: '↑',
  arrowDown: '↓',
  arrowLeft: '←',
  arrowRight: '→',
  pageUp: '⇞',
  pageDown: '⇟',
  home: '⇱',
  end: '⇲',
  space: '␣',
  tab: '⇥',
  esc: '⎋',
  backspace: '⌫',
  delete: '⌦',
  deleteForward: '⌦',
  return: '↵',
  enter: '↵',
  backslash: '\\',
  prtsc: 'PrtSc',
  f1: 'f1',
  f2: 'f2',
  f3: 'f3',
  f4: 'f4',
  f5: 'f5',
  f6: 'f6',
  f7: 'f7',
  f8: 'f8',
  f9: 'f9',
  f10: 'f10',
  f11: 'f11',
  f12: 'f12',
  f13: 'f13',
  f14: 'f14',
  f15: 'f15',
  f16: 'f16',
  f17: 'f17',
  f18: 'f18',
  f19: 'f19',
  f20: 'f20',
  f21: 'f21',
  f22: 'f22',
  f23: 'f23',
  f24: 'f24'
} as const

export type ChordKeyToken = keyof typeof KEY_GLYPHS

/** Canonical key token stored on chord steps (same as {@link ChordKeyToken}). */
export type KeyAlias = ChordKeyToken

export type KeyGlyph = (typeof KEY_GLYPHS)[KeyAlias]

/** All canonical key tokens for TypeBox (`Type.Union` of literals). */
export const KEY_ALIAS_VALUES = Object.keys(KEY_GLYPHS) as KeyAlias[]

export function isChordKeyToken(token: string): token is ChordKeyToken {
  return token in KEY_GLYPHS
}

export function resolveChordKeyToken(token: ChordKeyToken): KeyAlias {
  return token
}

export function keyGlyphFor(key: KeyAlias): KeyGlyph {
  return KEY_GLYPHS[key]
}
