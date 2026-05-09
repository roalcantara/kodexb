import type { Static, TSchema } from '@sinclair/typebox'
import { type TypeCheck, TypeCompiler } from '@sinclair/typebox/compiler'
import type { ValueError } from '@sinclair/typebox/value'

const checkCache = new WeakMap<TSchema, TypeCheck<TSchema>>()

export function compile<T extends TSchema>(schema: T): TypeCheck<T> {
  let check = checkCache.get(schema)
  if (!check) {
    check = TypeCompiler.Compile(schema) as TypeCheck<T>
    checkCache.set(schema, check)
  }
  return check as TypeCheck<T>
}

export function parse<T extends TSchema>(schema: T, value: unknown): Static<T> {
  const errorList = Array.from(compile(schema).Errors(value))
  if (errorList.length > 0) {
    throw new TypeBoxValidationError(errorList)
  }
  return value as Static<T>
}

export function safeParse<T extends TSchema>(
  schema: T,
  value: unknown
): { ok: true; data: Static<T> } | { ok: false; errors: ValueError[] } {
  const errorList = Array.from(compile(schema).Errors(value))
  if (errorList.length > 0) {
    return { ok: false, errors: errorList }
  }
  return { ok: true, data: value as Static<T> }
}

export function formatErrors(errors: Iterable<ValueError>): string {
  const parts: string[] = []
  for (const err of errors) {
    const path = err.path || '(root)'
    parts.push(`${path}: ${err.message}`)
  }
  return parts.join('; ')
}

export class TypeBoxValidationError extends Error {
  readonly errors: ValueError[]

  constructor(errors: ValueError[], context?: string) {
    const message = context ?? formatErrors(errors)
    super(message)
    this.name = 'TypeBoxValidationError'
    this.errors = errors
    Object.setPrototypeOf(this, TypeBoxValidationError.prototype)
  }
}

export function makeGuard<T extends TSchema>(schema: T): (value: unknown) => value is Static<T> {
  const check = compile(schema)
  return (value: unknown): value is Static<T> => check.Check(value)
}
