import { readFile, rm } from 'node:fs/promises'
import { FIXTURE_PATHS_FILE } from './fixtures.support'
import { destroyFixture, type FixturePaths } from './seed_fixture.support'

export default async function globalTeardown(): Promise<void> {
  try {
    const raw = await readFile(FIXTURE_PATHS_FILE, 'utf-8')
    const paths: FixturePaths = JSON.parse(raw)
    await destroyFixture(paths)
  } catch {
    // fixture may already be cleaned or file missing
  } finally {
    await rm(FIXTURE_PATHS_FILE, { force: true })
  }
}
