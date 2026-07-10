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

  it('classifies deterministic same rules as level 1 lock recommendations', () => {
    const service = createSimilarityService()
    const results = service.compare({
      sourceList: ['滨江-R21-01地块'],
      targetList: ['滨江-01地块'],
      options: { threshold: 0.01 },
      selectedAlgorithm: 'edit',
      editWeight: 60,
      synonymText: '',
      ignoreText: '',
      preprocessOptions: {
        enabled: true,
        enableVersionNormalization: false,
        enableLandParcelRule: true,
        enableRoadSectionRule: true,
        noiseWordAggressiveness: 'medium',
      },
    })

    expect(results[0]?.matches[0]?.recommendation).toMatchObject({
      level: 'rule',
      label: '规则判定相同',
      shouldSuggestLock: true,
    })
  })

  it('classifies strong project anchors as level 2 probable lock recommendations', () => {
    const service = createSimilarityService()
    const results = service.compare({
      sourceList: ['关于杭政储出2026 33号地块住宅商业项目的批复'],
      targetList: ['杭政储出【2026】33号地块住宅兼商业商务项目'],
      options: { threshold: 0.01 },
      selectedAlgorithm: 'edit',
      editWeight: 60,
      synonymText: '',
      ignoreText: '',
      preprocessOptions: {
        enabled: true,
        enableVersionNormalization: false,
        enableLandParcelRule: true,
        enableRoadSectionRule: true,
        noiseWordAggressiveness: 'medium',
      },
    })

    expect(results[0]?.matches[0]?.recommendation).toMatchObject({
      level: 'anchor',
      label: '锚点大概率相同',
      shouldSuggestLock: true,
    })
  })

  it('classifies threshold-only candidates as level 3 lock recommendations', () => {
    const service = createSimilarityService()
    const results = service.compare({
      sourceList: ['三墩北单元幼儿园新建项目'],
      targetList: ['三墩北单元幼儿园建设工程'],
      options: { threshold: 0.01 },
      selectedAlgorithm: 'edit',
      editWeight: 60,
      synonymText: '建设工程, 新建项目',
      ignoreText: '',
      preprocessOptions: {
        enabled: true,
        enableVersionNormalization: false,
        enableLandParcelRule: true,
        enableRoadSectionRule: true,
        noiseWordAggressiveness: 'medium',
      },
    })

    expect(results[0]?.matches[0]?.recommendation).toMatchObject({
      level: 'threshold',
      label: '相似度达标',
      shouldSuggestLock: true,
    })
  })

  it('does not suggest locking when strong anchors conflict even if names are similar', () => {
    const service = createSimilarityService()
    const results = service.compare({
      sourceList: ['双桥XH020104-22安置房'],
      targetList: ['双桥单元XH020104-21地块安置房项目'],
      options: { threshold: 0.01 },
      selectedAlgorithm: 'edit',
      editWeight: 60,
      synonymText: '',
      ignoreText: '',
      preprocessOptions: {
        enabled: true,
        enableVersionNormalization: false,
        enableLandParcelRule: true,
        enableRoadSectionRule: true,
        noiseWordAggressiveness: 'medium',
      },
    })

    expect(results[0]?.matches[0]?.recommendation).toMatchObject({
      level: 'none',
      label: '不建议自动锁定',
      shouldSuggestLock: false,
    })
  })
})
