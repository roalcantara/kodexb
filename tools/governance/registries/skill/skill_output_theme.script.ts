/** Skill-registry semantic colors (domain-specific; not shared across mise tasks). */

import { GUM, gumBadge, gumFail, gumOk, gumSectionBanner } from '../../../support/lib/cli/gum_theme.script.ts'

export const CATEGORY_COLORS: Record<string, string> = {
  lock_without_yaml: GUM.warn,
  global_in_lock: GUM.error,
  installed_extra: GUM.warn,
  installed_missing: GUM.info,
  policy_incomplete: GUM.warn,
  yaml_without_lock: GUM.accent,
  owned_dir_missing: GUM.error,
  schema: GUM.error
}

export const POLICY_COLORS = {
  required: GUM.success,
  routed: GUM.accent,
  optional: GUM.info,
  reference: GUM.muted,
  blocked: GUM.error
} as const satisfies Record<string, string>

export const LOCATION_COLORS: Record<string, string> = {
  owned: GUM.success,
  project: GUM.info,
  global: '#c8cdd8'
}

/** Distinct badge backgrounds per install location. */
export const LOCATION_BG: Record<string, string> = {
  owned: '#005047',
  project: '#1a3a5c',
  global: '#373845'
}

export const POLICY_SECTION_BG: Record<string, string> = {
  required: '#005047',
  routed: '#3d0066',
  optional: '#1a2744',
  reference: '#282935',
  blocked: '#4a1010'
}

export const POLICY_SECTION_FG: Record<string, string> = {
  required: '#86f6e4',
  routed: '#f0dbff',
  optional: '#93c5fd',
  reference: '#e2e9f5',
  blocked: '#fca5a5'
}

export function locationBadge(location: string): string {
  return gumBadge(location, LOCATION_COLORS[location] ?? GUM.muted, LOCATION_BG[location] ?? GUM.badge_bg)
}

export function policySection(title: string, policyType: string): string {
  return gumSectionBanner(
    title,
    POLICY_SECTION_BG[policyType] ?? GUM.badge_bg,
    POLICY_SECTION_FG[policyType] ?? GUM.label
  )
}

export function installGlyph(installed: boolean, blocked: boolean): string {
  if (blocked) return gumFail('⊘')
  if (installed) return gumOk('✔')
  return gumFail('✗')
}
