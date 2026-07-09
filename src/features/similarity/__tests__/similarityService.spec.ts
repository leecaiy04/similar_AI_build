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
        hideSubThreshold: false,
      },
    })

    expect(display).toHaveLength(1)
    expect(display[0]?.source).toBe('apple')
  })

  it('exposes project anchor rule metadata for UI badges', () => {
    const service = createSimilarityService()
    const results = service.compare({
      sourceList: ['关于杭政储出2026 33号地块住宅商业项目的批复'],
      targetList: ['杭政储出【2026】33号地块住宅兼商业商务项目'],
      options: {
        threshold: 0.01,
        ignorePunctuation: true,
        fullwidthToHalfwidth: true,
        ignoreInvisibleChars: true,
      },
      selectedAlgorithm: 'edit',
      editWeight: 60,
      synonymText: '',
      ignoreText: '',
      preprocessOptions: {
        enabled: true,
        enableVersionNormalization: true,
        enableLandParcelRule: true,
        enableRoadSectionRule: true,
        noiseWordAggressiveness: 'medium',
      },
    })

    expect(results[0]?.matches[0]?.similarity).toBeGreaterThanOrEqual(0.9)
    expect(results[0]?.matches[0]?.ruleType).toBe('projectAnchor')
    expect(results[0]?.matches[0]?.reason).toContain('项目')
    expect(results[0]?.matches[0]?.anchors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'landParcel',
          value: expect.stringContaining('政储出202633号'),
        }),
      ]),
    )
  })
})
