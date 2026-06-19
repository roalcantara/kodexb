import path from 'node:path'

const SCOPE_ALIASES: Record<string, string> = {
  'test-helper': 'src/__tests__',
  core: 'src/core',
  shared: 'src/shared',
  'shell-app': 'src/shell/app',
  'shell-main': 'src/shell/main',
  'shell-renderer': 'src/shell/renderer'
}

type StyleIssue = { file: string; category: string; message: string }

export function normalizeScope(raw: string): string {
  const TRAILING_SLASH_RE = /\/$/
  const value = SCOPE_ALIASES[raw] || raw || 'src'
  const scoped = value.startsWith('src') ? value : `src/${value}`
  return path.normalize(scoped).replace(/\\/g, '/').replace(TRAILING_SLASH_RE, '')
}

export async function runSpecStyle(root: string, strict: boolean, styleFormat: string): Promise<void> {
  const SRC = path.join(root, 'src')
  const SPEC_GLOB = new Bun.Glob('**/*.spec.{ts,tsx}')

  const scope = normalizeScope(process.env.usage_scope || 'src')
  const relPath = (full: string) => path.relative(root, full).replace(/\\/g, '/')
  const inScope = (rel: string) => rel === scope || rel.startsWith(`${scope}/`)

  async function loadFactoryNames(): Promise<Set<string>> {
    const file = Bun.file(path.join(root, 'src/__tests__/factories/factories.builder.ts'))
    if (!(await file.exists())) return new Set()
    const c = await file.text()
    const start = c.indexOf('const factories = {')
    const end = c.indexOf('} as const', start)
    if (start < 0 || end < start) return new Set()
    return new Set(
      [...c.slice(start, end).matchAll(/(?:'([^']+)'|(\w+))\s*:/g)]
        .map(x => x[1] ?? x[2])
        .filter((name): name is string => name !== undefined)
    )
  }

  function auditSpec(rel: string, c: string, knownFactories: Set<string>): StyleIssue[] {
    const findings: StyleIssue[] = []
    const add = (category: string, message: string) => findings.push({ file: rel, category, message })

    if (/import\s*\{[^}]*\btest\b/.test(c)) add('test usage', 'imports test from bun:test (use it)')
    if (/^\s*test\(/m.test(c)) add('test usage', 'uses test() (use it)')
    if (!c.includes('describe(')) add('no describe', 'no describe block')
    if (c.includes('describe(') && !/describe\(['"]when |describe\(['"]with |describe\(['"]without /.test(c)) {
      add('no situation', 'no when/with/without situation describe')
    }
    for (const l of c.split('\n')) {
      const m = l.match(/^\s*it\('(.{41,})'\)/)
      if (m) {
        add('long description', `${m[1]?.slice(0, 60) ?? ''}: description > 40 chars`)
        break
      }
    }
    if (/expect\([^)]*===/.test(c) && /\.toBe\(true\)|\.toBe\(false\)/.test(c)) {
      add('opaque boolean matcher', 'opaque boolean matcher (use readable matcher)')
    }
    if (/window\.dispatchEvent/.test(c) || /document\.dispatchEvent/.test(c)) {
      add('global dispatchEvent', 'uses global dispatchEvent')
    }
    if (/\bmock\s*\(/.test(c) || /\bspyOn\s*\(/.test(c) || /\bmock\.module\s*\(/.test(c)) {
      add('mock usage', 'uses mock, spyOn, or mock.module')
    }
    for (const [, name] of c.matchAll(/factoryFor\('([^']+)'/g)) {
      if (name && !knownFactories.has(name)) {
        add('unknown factory', `factoryFor('${name}') not in factories.builder.ts`)
      }
    }
    return findings
  }

  function categoryCounts(findings: StyleIssue[]): [string, number][] {
    const counts = new Map<string, number>()
    for (const { category } of findings) counts.set(category, (counts.get(category) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }

  function render(specCount: number, findings: StyleIssue[], asMarkdown: boolean): string {
    const counts = categoryCounts(findings)
    if (!asMarkdown) {
      const lines = [`scope: ${scope}`, `specs scanned: ${specCount}`]
      for (const [category, count] of counts) lines.push(`${category}: ${count}`)
      for (const issue of findings) lines.push(`${issue.file}: ${issue.message}`)
      lines.push(`style issues: ${findings.length}`)
      return lines.join('\n')
    }
    const lines = [
      '### Better Specs style audit',
      '',
      `- Scope: \`${scope}\``,
      `- Specs scanned: ${specCount}`,
      `- Style issues: ${findings.length}`,
      '',
      '| Category | Count |',
      '| --- | ---: |',
      ...(counts.length === 0 ? ['| none | 0 |'] : counts.map(([c, n]) => `| ${c} | ${n} |`)),
      ''
    ]
    if (findings.length > 0) {
      lines.push('<details>', '<summary>Findings</summary>', '')
      for (const issue of findings) lines.push(`- \`${issue.file}\` — ${issue.message}`)
      lines.push('', '</details>')
    }
    return lines.join('\n')
  }

  const specPaths = [...SPEC_GLOB.scanSync(SRC)]
    .map(name => path.join(SRC, name))
    .filter(full => inScope(relPath(full)))
    .sort()

  const factoryNames = await loadFactoryNames()
  const specTexts = await Promise.all(specPaths.map(full => Bun.file(full).text()))
  const issues = specPaths.flatMap((full, index) => auditSpec(relPath(full), specTexts[index] ?? '', factoryNames))

  const report = render(specPaths.length, issues, styleFormat === 'markdown')
  console.log(report)
  if (issues.length > 0 && strict) process.exit(1)
}
