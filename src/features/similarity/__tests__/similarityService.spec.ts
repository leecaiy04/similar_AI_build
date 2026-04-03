import { describe, expect, it } from 'vitest'
import { createSimilarityService } from '../service/similarityService'

describe('similarityService', () => {
  it('sorts matches by descending similarity', () => {
    const service = createSimilarityService()
    const results = service.compare({
      sourceList: ['apple'],
      targetList: ['apricot', 'apple', 'apply'],
      options: { threshold: 0.01 },
      selectedAlgorithm: 'edit',
      editWeight: 60,
      synonymText: '',
      ignoreText: '',
    })

    expect(results[0]?.matches[0]?.text).toBe('apple')
  })

  it('filters results by threshold and join mode', () => {
    const service = createSimilarityService()
    const results = service.compare({
      sourceList: ['apple', 'pear'],
      targetList: ['apple', 'banana'],
      options: { threshold: 0.01 },
      selectedAlgorithm: 'edit',
      editWeight: 60,
      synonymText: '',
      ignoreText: '',
    })

    const display = service.buildDisplayResults({
      results,
      thresholdPercent: 90,
      joinMode: 'inner',
      targetList: ['apple', 'banana'],
      lockedItems: new Map(),
      filterOptions: {
        lockStatus: 'all',
        matchStatus: 'all',
        searchQuery: '',
        isRegexSearch: false,
      },
    })

    expect(display).toHaveLength(1)
    expect(display[0]?.source).toBe('apple')
  })
})
