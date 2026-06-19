import { err, ok, type Result } from 'neverthrow'

export async function readTextFile(path: string): Promise<Result<string, Error>> {
  try {
    return ok(await Bun.file(path).text())
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

export function firstLine(text: string): string {
  const idx = text.indexOf('\n')
  return idx === -1 ? text.replace(/\r$/, '') : text.slice(0, idx).replace(/\r$/, '')
}

export function lines(text: string): string[] {
  const parts = text.split('\n')
  if (parts.at(-1) === '') parts.pop()
  return parts
}

export async function readTextLines(path: string, mode: 'first'): Promise<Result<string, Error>>
export async function readTextLines(path: string, mode: 'all'): Promise<Result<string[], Error>>
export async function readTextLines(path: string, mode: 'first' | 'all'): Promise<Result<string | string[], Error>> {
  const fileResult = await readTextFile(path)
  return fileResult.map(text => (mode === 'first' ? firstLine(text) : lines(text)))
}
