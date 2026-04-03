import { describe, expect, it } from 'vitest'
import { buildCsv } from '../csv'

describe('buildCsv', () => {
  it('exports csv with BOM', () => {
    const csv = buildCsv(['a,b'])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
  })
})
