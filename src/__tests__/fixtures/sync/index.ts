import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const Dirname = fileURLToPath(new URL('.', import.meta.url))

export const syncFixtureDir = resolve(Dirname)
