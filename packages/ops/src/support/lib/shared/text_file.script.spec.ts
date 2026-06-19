import { describe, expect, it } from 'bun:test'
import { firstLine, lines, readTextFile, readTextLines } from './text_file.script'

describe('firstLine', () => {
  it('returns the first line without trailing \\r', () => {
    expect(firstLine('hello\nworld\n')).toBe('hello')
  })

  it('handles \\r\\n line endings', () => {
    expect(firstLine('hello\r\nworld\r\n')).toBe('hello')
  })

  it('returns the whole string for a single line', () => {
    expect(firstLine('hello')).toBe('hello')
  })
})

describe('lines', () => {
  it('splits on \\n and drops final empty segment', () => {
    expect(lines('a\nb\nc\n')).toEqual(['a', 'b', 'c'])
  })

  it('returns array for content without trailing newline', () => {
    expect(lines('a\nb')).toEqual(['a', 'b'])
  })

  it('returns single-element array for one line', () => {
    expect(lines('hello')).toEqual(['hello'])
  })
})

describe('readTextFile', () => {
  it('returns ok with file content', async () => {
    const result = await readTextFile(import.meta.path)
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap().length).toBeGreaterThan(0)
  })

  it('returns err for nonexistent file', async () => {
    const result = await readTextFile('/nonexistent/path.txt')
    expect(result.isErr()).toBe(true)
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(Error)
  })
})

describe('readTextLines', () => {
  it('returns first line with mode "first"', async () => {
    const text = 'line one\nline two\nline three\n'
    const tmp = `/tmp/text_file_test_${Date.now()}.txt`
    await Bun.write(tmp, text)
    const result = await readTextLines(tmp, 'first')
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toBe('line one')
  })

  it('returns all lines with mode "all"', async () => {
    const text = 'a\nb\nc\n'
    const tmp = `/tmp/text_file_test_all_${Date.now()}.txt`
    await Bun.write(tmp, text)
    const result = await readTextLines(tmp, 'all')
    expect(result.isOk()).toBe(true)
    expect(result._unsafeUnwrap()).toEqual(['a', 'b', 'c'])
  })

  it('returns err for nonexistent path', async () => {
    const result = await readTextLines('/nonexistent/path.txt', 'all')
    expect(result.isErr()).toBe(true)
  })
})
