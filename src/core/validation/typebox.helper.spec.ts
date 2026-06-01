import { describe, expect, it } from 'bun:test'
import { Type } from '@sinclair/typebox'
import type { ValueError } from '@sinclair/typebox/value'
import { compile, formatErrors, makeGuard, parse, safeParse, TypeBoxValidationError } from './typebox.helper'

describe('typebox.helper', () => {
  const schema = Type.Object({
    name: Type.String({ minLength: 1 }),
    age: Type.Number({ minimum: 0 })
  })

  describe('compile', () => {
    it('returns the same instance on repeated calls', () => {
      const first = compile(schema)
      const second = compile(schema)
      expect(first).toBe(second)
    })

    it('compiles a simple schema', () => {
      const check = compile(schema)
      expect(check.Check({ name: 'test', age: 25 })).toBe(true)
      expect(check.Check({ name: '', age: 25 })).toBe(false)
    })
  })

  describe('parse', () => {
    it('happy path returns Static<T>', () => {
      const result = parse(schema, { name: 'test', age: 25 })
      expect(result).toEqual({ name: 'test', age: 25 })
    })

    it('invalid input throws TypeBoxValidationError with non-empty errors', () => {
      expect(() => parse(schema, { name: '', age: -1 })).toThrow(TypeBoxValidationError)
      try {
        parse(schema, { name: '', age: -1 })
      } catch (err) {
        expect(err).toBeInstanceOf(TypeBoxValidationError)
        const typedErr = err as TypeBoxValidationError
        expect(typedErr.errors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('safeParse', () => {
    it('valid input returns { ok: true, data }', () => {
      const result = safeParse(schema, { name: 'test', age: 25 })
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toEqual({ name: 'test', age: 25 })
      }
    })

    it('invalid input returns { ok: false, errors }', () => {
      const result = safeParse(schema, { name: '', age: -1 })
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })
  })

  describe('formatErrors', () => {
    it('produces path:message; path:message format', () => {
      const errors = [
        { path: '/name', message: 'expected string' } as unknown as ValueError,
        { path: '/age', message: 'expected number' } as unknown as ValueError
      ]
      const formatted = formatErrors(errors)
      expect(formatted).toBe('/name: expected string; /age: expected number')
    })

    it('handles root path', () => {
      const errors = [{ path: '', message: 'invalid value' } as unknown as ValueError]
      const formatted = formatErrors(errors)
      expect(formatted).toBe('(root): invalid value')
    })
  })

  describe('TypeBoxValidationError', () => {
    it('stores errors array', () => {
      const errors = [{ path: '/name', message: 'error' } as unknown as ValueError]
      const err = new TypeBoxValidationError(errors, 'custom message')
      expect(err.errors).toEqual(errors)
      expect(err.message).toBe('custom message')
    })

    it('default message uses formatErrors', () => {
      const errors = [{ path: '/name', message: 'error' } as unknown as ValueError]
      const err = new TypeBoxValidationError(errors)
      expect(err.message).toBe('/name: error')
    })
  })

  describe('makeGuard', () => {
    it('returns type guard function', () => {
      const isValid = makeGuard(schema)

      expect(isValid({ name: 'test', age: 25 })).toBe(true)
      expect(isValid({ name: '', age: 25 })).toBe(false)
      expect(isValid(null)).toBe(false)
      expect(isValid({})).toBe(false)
    })

    it('narrowing works correctly', () => {
      const isValid = makeGuard(schema)
      const value: unknown = { name: 'test', age: 25 }

      if (isValid(value)) {
        expect(value.name).toBe('test')
        expect(value.age).toBe(25)
      }
    })
  })

  describe('performance', () => {
    it('10,000 parse iterations on 4-variant Type.Union complete in under 100ms', () => {
      const unionSchema = Type.Union([
        Type.Object({ type: Type.Literal('a'), value: Type.String() }),
        Type.Object({ type: Type.Literal('b'), value: Type.Number() }),
        Type.Object({ type: Type.Literal('c'), value: Type.Boolean() }),
        Type.Object({ type: Type.Literal('d'), value: Type.Array(Type.String()) })
      ])

      const start = Date.now()
      for (let i = 0; i < 10000; i++) {
        parse(unionSchema, { type: 'a', value: 'test' })
      }
      const elapsed = Date.now() - start

      expect(elapsed).toBeLessThan(100)
    })
  })
})
