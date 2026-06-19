import type { SecurityFinding } from '../security.types'
import { parseElectrobunViews } from './electrobun_surface_ast.script'

export function runElectrobunSurfaceCheck(configPath: string): SecurityFinding[] {
  const nodes = parseElectrobunViews(configPath)
  // No external views declared is a valid state for some projects
  if (nodes.length === 0) return []

  const findings: SecurityFinding[] = []
  for (const [index, node] of nodes.entries()) {
    // Glossary: identified by id `main` or protocol `views://shell`
    if (node.id === 'main' && node.url === 'views://shell') continue

    if (!node.hasSandboxTrue) {
      findings.push({
        id: `electrobun:sandbox:${index}`,
        severity: 'high',
        file: configPath,
        rule: 'sandbox-required',
        message: `External view '${node.id}' must declare sandbox: true.`
      })
    }
    if (!node.hasPartition) {
      findings.push({
        id: `electrobun:partition:${index}`,
        severity: 'high',
        file: configPath,
        rule: 'partition-required',
        message: `External view '${node.id}' must declare a non-empty partition.`
      })
    }
    if (!node.hasNavigationList) {
      findings.push({
        id: `electrobun:navigation:${index}`,
        severity: 'high',
        file: configPath,
        rule: 'navigation-allowlist-required',
        message: `External view '${node.id}' must declare a non-wildcard navigation allowlist (views:// or https:// only).`
      })
    }
  }

  return findings
}
