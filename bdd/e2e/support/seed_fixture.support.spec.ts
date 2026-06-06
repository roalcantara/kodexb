import { afterEach, describe, expect, it } from 'bun:test'
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { FIXTURE_PATHS_FILE } from './fixtures.support'
import { createFixture, destroyFixture, type FixturePaths, restoreReleaseFixtureSources } from './seed_fixture.support'

describe('restoreReleaseFixtureSources', () => {
  let paths: FixturePaths | undefined

  afterEach(async () => {
    if (paths) await destroyFixture(paths)
    paths = undefined
  })

  it('removes cross-scenario mutations and rewrites release source files', async () => {
    paths = await createFixture()
    await writeFile(FIXTURE_PATHS_FILE, JSON.stringify(paths))

    const syncDir = path.join(paths.sourcesPath, 'sync')
    await mkdir(syncDir, { recursive: true })
    await writeFile(path.join(syncDir, 'bad.yml'), 'broken: true')
    await writeFile(path.join(paths.sourcesPath, 'tasks.yml'), 'tasks: {}')

    await restoreReleaseFixtureSources()

    await expect(access(path.join(syncDir, 'bad.yml'))).rejects.toThrow()
    await expect(access(path.join(paths.sourcesPath, 'tasks.yml'))).rejects.toThrow()

    const tasksYaml = await readFile(path.join(paths.sourcesPath, 'tasks', 'release.yml'), 'utf-8')
    expect(tasksYaml).toContain('Release Todo Task')
  })
})
