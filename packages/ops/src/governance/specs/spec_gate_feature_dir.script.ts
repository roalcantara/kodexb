/**
 * Resolve feature dir for `mise run spec gate` (explicit arg or active-feature inference).
 */
import { type ResolveResult, resolveActiveFeatureDir } from './resolve_active_feature_dir.script'

export function resolveSpecGateFeatureDir(explicitDir?: string): ResolveResult {
  return resolveActiveFeatureDir(explicitDir || undefined)
}
