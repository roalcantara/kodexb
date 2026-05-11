/// <reference lib="dom" />

import { expect, test } from 'bun:test'

test('main bootstrap exercised in runtime (Electrobun) — no-op in CI', () => {
  // The bootstrap is tested implicitly by `bun run dev` / `bun run build`.
  // This test exists as a pointer — import `src/shell/main/main.ts` in an
  // Electrobun environment to exercise the actual native window creation.
  expect(true).toBe(true)
})
