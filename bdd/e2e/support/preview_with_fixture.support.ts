/**
 * Boots tools/dev/preview/server.script.ts after creating the bdd e2e fixture and writing
 * bdd/e2e/.fixture-paths.json. Playwright must use this as webServer.command so
 * the running app and step definitions share one temp directory.
 */
import { writeFileSync } from 'node:fs'
import { FIXTURE_PATHS_FILE } from './fixtures.support'
import { createFixture } from './seed_fixture.support'

const PREVIEW_PORT = process.env.PORT ?? process.env.PREVIEW_PORT ?? '3456'

const fixture = await createFixture()
writeFileSync(FIXTURE_PATHS_FILE, JSON.stringify(fixture))
process.env.APP_CONFIG_PATH = fixture.configPath
process.env.PORT = PREVIEW_PORT

await import('../../../tools/dev/preview/server.script.ts')
