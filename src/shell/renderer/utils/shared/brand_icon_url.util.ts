/**
 * Resolves bundled URL for an SVG under repo-root `assets/images/` (often a
 * symlink). Path depth must match `src/shell/renderer/utils/` — not
 * `src/shell/assets/images/`.
 */
export function brandSvgAssetUrl(basename: string): string {
  return new URL(`../../../../assets/images/${basename}.svg`, import.meta.url).href
}
