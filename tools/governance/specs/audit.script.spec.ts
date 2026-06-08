import { describe, expect, it } from 'bun:test'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

function useFeatureDir(): { dir: string; cleanup: () => void } {
  const dir = mkdtempSync(path.join(tmpdir(), 'audit-cli-test-'))
  mkdirSync(path.join(dir, 'checklists'), { recursive: true })
  for (const n of ['spec.md', 'plan.md', 'tasks.md', 'handoff.md']) {
    const content =
      n === 'handoff.md'
        ? `| ID | Done when | Evidence |
| -- | --------- | -------- |
| WOBS-1 AC1 | Feature works | \`bun test\` |\n`
        : '# test'
    writeFileSync(path.join(dir, n), content)
  }
  for (const c of ['analyze-plan.md', 'analyze-tasks.md']) {
    writeFileSync(path.join(dir, 'checklists', c), 'done')
  }
  return {
    dir,
    cleanup: () => {
      rmSync(dir, { recursive: true, force: true })
    }
  }
}

describe('audit.script', () => {
  it('documents gate chain as lint -> trace -> security -> quality gate', () => {
    const gatePath = path.resolve(import.meta.dirname, 'gate.sh')
    const gateBody = Bun.file(gatePath).text()
    return gateBody.then(content => {
      const lint = content.indexOf('lint.script.ts')
      const trace = content.indexOf('trace.script.ts')
      const security = content.indexOf('security/scan.script.ts')
      const quality = content.indexOf('app-quality-gate/scripts/gate.sh')
      expect(lint).toBeGreaterThan(-1)
      expect(trace).toBeGreaterThan(lint)
      expect(security).toBeGreaterThan(trace)
      expect(quality).toBeGreaterThan(security)
    })
  })

  it('exits 0 for a clean feature dir (non-strict)', () => {
    const { dir, cleanup } = useFeatureDir()
    try {
      const r = Bun.spawnSync(['bun', 'tools/governance/specs/audit.script.ts', dir], {
        env: { ...process.env, NO_COLOR: '1' },
        cwd: path.resolve(import.meta.dirname, '../../..')
      })
      expect(r.exitCode).toBe(0)
    } finally {
      cleanup()
    }
  })

  it('--json output parses correctly', () => {
    const { dir, cleanup } = useFeatureDir()
    try {
      const r = Bun.spawnSync(['bun', 'tools/governance/specs/audit.script.ts', '--json', dir], {
        env: { ...process.env },
        cwd: path.resolve(import.meta.dirname, '../../..')
      })
      expect(r.exitCode).toBe(0)
      const out = JSON.parse(new TextDecoder().decode(r.stdout))
      expect(out).toHaveProperty('featureDir')
      expect(out).toHaveProperty('summary')
    } finally {
      cleanup()
    }
  })

  it('missing handoff.md causes exit 1 with --strict', () => {
    const { dir, cleanup } = useFeatureDir()
    rmSync(path.join(dir, 'handoff.md'))
    try {
      const r = Bun.spawnSync(['bun', 'tools/governance/specs/audit.script.ts', '--strict', dir], {
        env: { ...process.env, NO_COLOR: '1' },
        cwd: path.resolve(import.meta.dirname, '../../..')
      })
      expect(r.exitCode).toBe(1)
    } finally {
      cleanup()
    }
  })

  it('nonexistent dir exits 2', () => {
    const r = Bun.spawnSync(['bun', 'tools/governance/specs/audit.script.ts', '/nonexistent/path'], {
      env: { ...process.env },
      cwd: path.resolve(import.meta.dirname, '../../..')
    })
    expect(r.exitCode).toBe(2)
  })

  it('missing args exits 2', () => {
    const r = Bun.spawnSync(['bun', 'tools/governance/specs/audit.script.ts'], {
      env: { ...process.env },
      cwd: path.resolve(import.meta.dirname, '../../..')
    })
    expect(r.exitCode).toBe(2)
  })
})
