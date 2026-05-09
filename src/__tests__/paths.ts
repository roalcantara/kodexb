import path from 'node:path'

const testsRoot = import.meta.dir

/** Absolute paths to shared test fixtures and corpora. */
export const testingPaths = {
  fixtures: path.join(testsRoot, 'fixtures'),
  sample: path.join(testsRoot, 'fixtures', 'sample'),
  minimal: path.join(testsRoot, 'fixtures', 'minimal'),
  configInvalid: path.join(testsRoot, 'fixtures', 'config.invalid.yaml')
} as const

export const minimalEntriesYml = path.join(testingPaths.minimal, 'entries.yml')
