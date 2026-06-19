import { readFileSync } from 'node:fs'
import { err, ok, type Result } from 'neverthrow'

const TRAILING_CR = /\r$/

export function readTextFileSync(path: string): Result<string, Error> {
  try {
    return ok(readFileSync(path, 'utf-8'))
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function readTextFile(path: string): Promise<Result<string, Error>> {
  try {
    return ok(await Bun.file(path).text())
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

export function firstLine(text: string): string {
  const idx = text.indexOf('\n')
  return idx === -1 ? text.replace(TRAILING_CR, '') : text.slice(0, idx).replace(TRAILING_CR, '')
}

export function lines(text: string): string[] {
  const parts = text.split('\n')
  if (parts.at(-1) === '') parts.pop()
  return parts
}

export function readTextLinesSync(path: string, mode: 'first'): Result<string, Error>
export function readTextLinesSync(path: string, mode: 'all'): Result<string[], Error>
export function readTextLinesSync(path: string, mode: 'first' | 'all'): Result<string | string[], Error> {
  const fileResult = readTextFileSync(path)
  return fileResult.map(text => (mode === 'first' ? firstLine(text) : lines(text)))
}

export async function readTextLines(path: string, mode: 'first'): Promise<Result<string, Error>>
export async function readTextLines(path: string, mode: 'all'): Promise<Result<string[], Error>>
export async function readTextLines(path: string, mode: 'first' | 'all'): Promise<Result<string | string[], Error>> {
  const fileResult = await readTextFile(path)
  return fileResult.map(text => (mode === 'first' ? firstLine(text) : lines(text)))
}
