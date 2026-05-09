/// <reference lib="dom" />

import { expect, test } from 'bun:test'

// `src/shell/main/main.ts` is a side-effectful entrypoint (creates native windows).
// We test the error-dialog logic independently in `error.helper.spec.ts`.
test.skip('main bootstrap is exercised in runtime (Electrobun)', () => {
  expect(true).toBe(true)
})
