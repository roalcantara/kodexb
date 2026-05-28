import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createFixture, type FixturePaths } from './seed_fixture.support'

const PATHS_FILE = path.join(import.meta.dirname, '..', '.fixture-paths.json')

export default async function globalSetup(): Promise<void> {
  const paths: FixturePaths = await createFixture()
  process.env.APP_CONFIG_PATH = paths.configPath
  await writeFile(PATHS_FILE, JSON.stringify(paths))
}
