import { describe, expect, it } from 'vitest'
import { createTransformService } from '../service/transformService'

describe('transformService', () => {
  it('blocks duplicate rows when preventDuplicates is enabled', () => {
    const service = createTransformService()
    const result = service.addRows({
      existing: [{ id: '1', value: 'apple', isHighlighted: false, count: 0 }],
      inputText: 'apple\nbanana',
      splitMode: 'newline',
      preventDuplicates: true,
    })

    expect(result.addedCount).toBe(1)
    expect(result.rejectedCount).toBe(1)
    expect(result.rows.map((row) => row.value)).toEqual(['apple', 'banana'])
  })

  it('supports regex match, filter, and keep modes', () => {
    const service = createTransformService()
    const rows = [
      { id: '1', value: 'foo123', isHighlighted: false, count: 0 },
      { id: '2', value: 'bar', isHighlighted: false, count: 0 },
    ]

    expect(service.applyRegex(rows, '\\d+', 'match').map((row) => row.value)).toEqual(['123'])
    expect(service.applyRegex(rows, '\\d+', 'filter').map((row) => row.value)).toEqual(['bar'])
    expect(service.applyRegex(rows, '\\d+', 'keep').map((row) => row.value)).toEqual(['foo123'])
  })
})
