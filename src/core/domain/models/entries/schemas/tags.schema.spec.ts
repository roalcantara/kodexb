import { describe, expect, it } from 'bun:test'
import { Value } from '@sinclair/typebox/value'
import { tagsSchema } from './tags.schema'

function isValid(data: unknown): boolean {
  return Value.Check(tagsSchema, data) === true
}

describe('tagsSchema', () => {
  describe('when tags are valid', () => {
    describe.each([['foo and bar', ['foo', 'bar']]])('with %s', (_, data) => {
      it('passes validation', () => {
        expect(isValid(data)).toBe(true)
      })
    })
  })

  describe('when tags are invalid', () => {
    describe.each([
      ['empty list', []],
      ['more than four tags', ['a', 'b', 'c', 'd', 'e']],
      ['invalid characters', ['foo-bar']]
    ])('with %s', (_, data) => {
      it('fails validation', () => {
        expect(isValid(data)).toBe(false)
      })
    })
  })
})
