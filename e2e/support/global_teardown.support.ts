import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { destroyFixture, type FixturePaths } from './seed_fixture.support'

const PATHS_FILE = path.join(import.meta.dirname, '..', '.fixture-paths.json')

export default async function globalTeardown(): Promise<void> {
  try {
    const raw = await readFile(PATHS_FILE, 'utf-8')
    const paths: FixturePaths = JSON.parse(raw)
    await destroyFixture(paths)
  } catch {
    // fixture may already be cleaned or file missing
  } finally {
    await rm(PATHS_FILE, { force: true })
  }
}
