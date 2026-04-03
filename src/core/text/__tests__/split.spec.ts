import { describe, expect, it } from 'vitest'
import { splitExcelLines } from '../split'

describe('splitExcelLines', () => {
  it('preserves newline inside quoted excel cell', () => {
    const lines = splitExcelLines('"a\nb"\nnext')
    expect(lines).toEqual(['a\nb', 'next'])
  })
})
