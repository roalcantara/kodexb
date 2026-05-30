import { IsNull, IsUndefined } from '@sinclair/typebox/value'

export const isBlank = (v: unknown): v is null | undefined | '' =>
  IsNull(v) || IsUndefined(v) || (typeof v === 'string' && v.trim() === '')
