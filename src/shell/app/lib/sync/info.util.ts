import glob from 'fast-glob'

export async function getSyncInfoForSourcesDir(sourcesDir: string): Promise<{ sourcesDir: string; fileCount: number }> {
  let fileCount = 0
  try {
    const files = await glob('**/*.{yaml,yml}', { cwd: sourcesDir, absolute: true })
    fileCount = files.length
  } catch {
    fileCount = 0
  }
  return { sourcesDir, fileCount }
}
