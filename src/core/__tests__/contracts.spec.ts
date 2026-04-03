import { describe, expect, it } from 'vitest'
import { createProcessResult, toAppError } from '../contracts'

describe('contracts', () => {
  it('creates idle process result', () => {
    expect(createProcessResult('r1').status).toBe('idle')
  })

  it('maps native error to InternalError fallback', () => {
    const err = toAppError(new Error('boom'))
    expect(err.type).toBe('InternalError')
  })
})
