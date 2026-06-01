import { afterEach, describe, expect, it } from 'bun:test'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const thisDir = dirname(fileURLToPath(import.meta.url))
let tmpDirs: string[] = []
function scriptPath(): string {
  return join(thisDir, 'commit_message.script.ts')
}
function runScript(
  msgFile: string,
  extraEnv?: Record<string, string | undefined>
): { exitCode: number; stdout: string } {
  const child = Bun.spawnSync([process.execPath, scriptPath(), msgFile], { env: { ...process.env, ...extraEnv } })
  return {
    exitCode: child.exitCode ?? (child.success ? 0 : 1),
    stdout: child.stdout?.toString().trim() ?? ''
  }
}
function makeFile(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'hk-msg-test-'))
  tmpDirs.push(dir)
  const filePath = join(dir, 'COMMIT_EDITMSG')
  writeFileSync(filePath, content)
  return filePath
}

afterEach(() => {
  for (const d of tmpDirs) {
    try {
      rmSync(d, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
  tmpDirs = []
})

describe('commit message policy', () => {
  describe.each([
    {
      scenario: 'accepts the commit message with a normal commit with body',
      content: 'docs(hooks): Add HK migration plan\n\nExplain why HK replaces the old commit hook stack.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with feat with scope and body',
      content: 'feat(api): Add search endpoint\n\nThis adds a new search endpoint to the API.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with fix without scope',
      content: 'fix: Resolve timeout in database connection\n\nIncrease the connection timeout to 30 seconds.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with ref type for refactors',
      content: 'ref(core): Extract validation helper\n\nThis helper centralizes common validation logic.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with breaking change with exclamation mark',
      content: 'feat(api)!: Change default timeout\n\nBREAKING CHANGE: Default timeout is now 30 seconds.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with max-length subject exactly 50 chars',
      content: 'docs(hooks): Add HK migration plan total 50 OK\n\nThis body provides enough context.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with Git COMMIT_EDITMSG comment trailer',
      content:
        "fix(tests): Remove unused DOM references\n\nThis commit removes the unnecessary dom references\nfrom multiple test files to clean up the codebase.\n\n# Please enter the commit message for your changes. Lines starting\n# with '#' will be ignored, and an empty message aborts the commit.\n#\n#	modified:   src/shell/renderer/components/list/compact_filter_overlay.component.spec.tsx\n",
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with commit.verbose unified diff trailer',
      content:
        'fix(hk): Fix commit validation\n\nAdjust commit validation\n# Please enter the commit message for your changes.\n#\n#	modified:   hk.pkl\n#\ndiff --git a/hk.pkl b/hk.pkl\n--- a/hk.pkl\n+++ b/hk.pkl\n@@ -67,3 +67,3 @@\n+// Forces hk to run only check commands (read-only) instead of fix commands.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with ci type',
      content: 'ci(release): Add signing check to pipeline\n\nVerify commit and tag signing.\n',
      expected: 'ok'
    },
    {
      scenario: 'accepts the commit message with build type',
      content: 'build: Add mise task for hooks\n\nThis adds project prepare wiring.\n',
      expected: 'ok'
    },
    {
      scenario: 'skips check policy for generated git subject "Merge"',
      content: "Merge branch 'feat/hooks' into main\n\n",
      expected: 'skipped generated git subject'
    },
    {
      scenario: 'skips check policy for generated git subject "Revert"',
      content: 'Revert "feat: Add hooks support"\n\nThis reverts commit abc123.\n',
      expected: 'skipped generated git subject'
    },
    {
      scenario: 'skips check policy for generated git subject "fixup!"',
      content: 'fixup! feat: Add hooks support\n\n',
      expected: 'skipped generated git subject'
    },
    {
      scenario: 'skips check policy for generated git subject "squash!"',
      content: 'squash! feat: Add hooks support\n\n',
      expected: 'skipped generated git subject'
    }
  ])('when subject is %s', ({ scenario, content, expected }) => {
    it(scenario, () => {
      const result = runScript(makeFile(content))
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe(`commit message policy: ${expected}`)
    })
  })

  describe('when author is Dependabot', () => {
    it('skips check policy', () => {
      for (const extraEnv of [{ GIT_HOOK_AUTHOR_NAME: 'dependabot[bot]' }, { GIT_AUTHOR_NAME: 'dependabot' }]) {
        const f = makeFile('chore(deps): Bump react from 18 to 19\n\n')
        const result = runScript(f, extraEnv)
        expect(result.exitCode).toBe(0)
        expect(result.stdout).toBe('commit message policy: skipped dependabot author')
      }
    })
  })

  describe.each([
    {
      scenario: 'rendered release-it message',
      content:
        'chore(release): Release v0.0.0-test [skip ci]\n\nPrepare the release commit so changelog and version stay aligned.\n'
    },
    {
      scenario: 'long release subject exceeding 50 chars',
      content:
        'chore(release): Release v1.2.3-rc.1 [skip ci]\n\nPrepare the release commit so changelog and version stay aligned.\n'
    }
  ])('when subject is "%s"', ({ scenario, content }) => {
    it(`accepts the commit message "${scenario}"`, () => {
      const result = runScript(makeFile(content))
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toBe('commit message policy: ok')
    })
  })

  describe('with invalid messages', () => {
    describe.each([
      {
        case: 'refactor type',
        message: 'refactor(core): Clean up validation logic\n\nThis should use ref instead of refactor.\n',
        expectedContains: ['commit message policy: failed', 'subject must match type']
      },
      {
        case: 'lowercase description',
        message: 'docs(hooks): add HK migration plan\n\nExplain why HK replaces the old commit hook stack.\n',
        expectedContains: ['commit message policy: failed']
      },
      {
        case: 'subject too long',
        message: 'docs(hooks): This is a very long subject line that exceeds fifty characters\n\nBody text.\n',
        expectedContains: ['commit message policy: failed']
      },
      {
        case: 'subject too short',
        message: 'feat\n\nThis has a valid body with twenty characters for sure.\n',
        expectedContains: ['commit message policy: failed']
      },
      {
        case: 'missing body',
        message: 'docs(hooks): Add HK migration plan\n\n',
        expectedContains: ['commit message policy: failed', 'body is required']
      },
      {
        case: 'short body',
        message: 'docs(hooks): Add HK migration plan\n\nToo short.\n',
        expectedContains: ['commit message policy: failed', 'body is required']
      },
      {
        case: 'body line exceeding 72 chars',
        message:
          'docs(hooks): Add HK migration plan\n\nThis body line is intentionally way too long and definitely exceeds the seventy-two character limit.\n',
        expectedContains: ['commit message policy: failed', 'body lines must be 72 characters or less']
      },
      {
        case: 'wip in subject',
        message: 'feat(api): WIP Add search endpoint\n\nThis body is at least twenty chars for the test to pass.\n',
        expectedContains: ['commit message policy: failed', 'subject must not contain wip']
      },
      {
        case: 'subject ending with period',
        message: 'docs(hooks): Add HK migration plan.\n\nExplain why HK replaces the old commit hook stack.\n',
        expectedContains: ['commit message policy: failed', 'subject must not end with a period']
      },
      {
        case: 'invalid type like unknown',
        message: 'unknown(hooks): Add some change\n\nThis body is at least twenty characters long.\n',
        expectedContains: ['commit message policy: failed', 'subject must match type']
      }
    ])('when subject is "%s"', ({ case: scenario, message, expectedContains }) => {
      it(`rejects the commit message "${scenario}"`, () => {
        const result = runScript(makeFile(message))
        expect(result.exitCode).toBe(1)
        for (const expected of expectedContains) {
          expect(result.stdout).toContain(expected)
        }
      })
    })
  })

  describe('when no file argument is given', () => {
    it('prints missing message file', () => {
      const child = Bun.spawnSync([process.execPath, scriptPath()])
      const stdout = child.stdout?.toString().trim() ?? ''
      const exitCode = child.exitCode ?? (child.success ? 0 : 1)
      expect(exitCode).toBe(1)
      expect(stdout).toBe('commit message policy: missing message file')
    })
  })

  describe('with exact invalid fixture from design.md', () => {
    it('matches the design.md invalid fixture', () => {
      const result = runScript(makeFile('docs(hooks): add HK migration plan\n'))
      expect(result.exitCode).toBe(1)
      expect(result.stdout).toBe(
        'commit message policy: failed\n- subject must match type(scope): Description with an allowed type and capitalized description\n- body is required and must contain at least 20 characters'
      )
    })
  })
})
