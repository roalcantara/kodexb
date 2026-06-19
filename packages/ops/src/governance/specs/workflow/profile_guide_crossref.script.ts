import { existsSync, readFileSync } from 'node:fs'

const DEFAULT_YAML = 'assets/catalog/workflows/default.yaml'
const SECURITY_GUIDE = 'assets/guides/SECURITY_GUIDE.md'

type Finding = {
  file: string
  line: number
  severity: 'warn' | 'error'
  message: string
}

export function checkProfileGuideCrossref(profilePath: string, guidePath: string): Finding[] {
  const findings: Finding[] = []

  if (!existsSync(profilePath)) {
    findings.push({ file: profilePath, line: 0, severity: 'error', message: 'profile not found' })
    return findings
  }
  if (!existsSync(guidePath)) {
    findings.push({ file: guidePath, line: 0, severity: 'error', message: 'guide not found' })
    return findings
  }

  const profile = readFileSync(profilePath, 'utf-8')
  const guide = readFileSync(guidePath, 'utf-8')

  const lines = profile.split('\n')
  const commandLines = lines
    .map((line, idx) => ({ line, lineNum: idx + 1 }))
    .filter(
      ({ line: l }) => l.includes('command:') || l.includes('- "mise') || l.includes('- "hk') || l.includes('- "gh')
    )
  const safetyCommands = commandLines.filter(
    ({ line: l }) => l.includes('hk check') || l.includes('gh pr') || l.includes('gitleaks')
  )

  const guideLower = guide.toLowerCase()

  for (const { line: cmd, lineNum } of safetyCommands) {
    const trimmed = cmd
      .trim()
      .replace(/^-\s*"/, '')
      .replace(/"$/, '')
      .replace(/^-\s*/, '')
    if (!guideLower.includes(trimmed.toLowerCase())) {
      findings.push({
        file: profilePath,
        line: lineNum,
        severity: 'warn',
        message: `command "${trimmed}" not found in ${guidePath}`
      })
    }
  }

  return findings
}

if (import.meta.main) {
  const findings = checkProfileGuideCrossref(DEFAULT_YAML, SECURITY_GUIDE)
  if (findings.length > 0) {
    for (const f of findings) {
      console.log(`${f.severity}: ${f.file}:${f.line} — ${f.message}`)
    }
    process.exit(1)
  }
  process.exit(0)
}
