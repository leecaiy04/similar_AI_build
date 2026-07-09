import { describe, it, expect } from 'vitest'
import { SimilarityCalculator } from '../similarity'
import {
  tokenSetSimilarity,
  ngramSimilarity,
  calculateWeightedScore,
  WEIGHT_PRESETS,
  type SimilarityFeatures,
} from '../advancedSimilarity'
import {
  calculateEnhancedSimilarity,
  quickRuleCheck,
} from '../enhancedSimilarityService'

describe('tokenSetSimilarity', () => {
  it('应该计算词集相似度（中文按字符）', () => {
    const sim = tokenSetSimilarity('数据分析平台系统', '数据平台分析工具')
    // tokens1: {数, 据, 分, 析, 平, 台, 系, 统}
    // tokens2: {数, 据, 平, 台, 分, 析, 工, 具}
    // 交集: {数, 据, 分, 析, 平, 台} = 6
    // 并集: {数, 据, 分, 析, 平, 台, 系, 统, 工, 具} = 10
    expect(sim).toBeCloseTo(0.6, 1)
  })

  it('应该对词序不敏感', () => {
    const sim1 = tokenSetSimilarity('数据分析平台', '平台分析数据')
    expect(sim1).toBe(1.0)
  })

  it('应该处理空字符串', () => {
    expect(tokenSetSimilarity('', '')).toBe(1.0)
    expect(tokenSetSimilarity('测试', '')).toBe(0.0)
  })

  it('应该处理英文按空格分词', () => {
    const sim = tokenSetSimilarity('data analysis platform', 'platform analysis data')
    expect(sim).toBe(1.0)
  })
})

describe('ngramSimilarity', () => {
  it('应该计算2-gram相似度', () => {
    const sim = ngramSimilarity('数据分析', '数据统计', 2)
    // ngrams1: {数据, 据分, 分析}
    // ngrams2: {数据, 据统, 统计}
    // 交集: {数据} = 1
    // 并集: {数据, 据分, 分析, 据统, 统计} = 5
    expect(sim).toBeCloseTo(0.2, 1)
  })

  it('应该支持不同的n值', () => {
    const sim3 = ngramSimilarity('数据分析平台', '数据统计平台', 3)
    // 都包含"台"等，应该有共同的3-gram
    expect(sim3).toBeGreaterThanOrEqual(0)
  })

  it('应该处理相同文本', () => {
    expect(ngramSimilarity('测试', '测试', 2)).toBe(1.0)
  })

  it('应该处理短文本', () => {
    const sim = ngramSimilarity('A', 'A', 2)
    expect(sim).toBe(1.0)
  })
})

describe('calculateWeightedScore', () => {
  it('应该计算加权分数', () => {
    const features: SimilarityFeatures = {
      edit: 0.8,
      jaro: 0.9,
      tokenSet: 0.7,
      ngram: 0.6,
    }

    const score = calculateWeightedScore(features, WEIGHT_PRESETS.balanced)

    // 0.8*0.35 + 0.9*0.25 + 0.7*0.25 + 0.6*0.15 = 0.77
    expect(score).toBeCloseTo(0.77, 1)
  })

  it('规则层判断应该直接返回', () => {
    const features: SimilarityFeatures = {
      rule: {
        type: 'coreName',
        score: 0.98,
        reason: '核心名称匹配',
      },
      edit: 0.5,
      jaro: 0.5,
    }

    const score = calculateWeightedScore(features, WEIGHT_PRESETS.balanced)
    expect(score).toBe(0.98)
  })

  it('应该支持不同权重预设', () => {
    const features: SimilarityFeatures = {
      edit: 0.8,
      jaro: 0.9,
      tokenSet: 0.7,
      ngram: 0.6,
    }

    const scorePrecise = calculateWeightedScore(features, WEIGHT_PRESETS.precise)
    const scoreFlexible = calculateWeightedScore(features, WEIGHT_PRESETS.flexible)

    // 精确模式更重视编辑距离
    expect(scorePrecise).toBeGreaterThan(scoreFlexible)
  })
})

describe('calculateEnhancedSimilarity', () => {
  const calculator = new SimilarityCalculator()

  it('应该识别版本号并返回确定性结果', () => {
    const result = calculateEnhancedSimilarity(
      '项目管理系统v1.0',
      '项目管理系统v2.0',
      calculator,
      { enableVersionNormalization: true }
    )

    expect(result.isDefinitive).toBe(true)
    expect(result.similarity).toBeGreaterThan(0.9)
    expect(result.reason).toContain('核心名称')
  })

  it('应该识别地块名并返回确定性结果', () => {
    const result = calculateEnhancedSimilarity(
      '滨江-R21-01地块',
      '滨江-01地块',
      calculator,
      { enableLandParcelRule: true }
    )

    expect(result.isDefinitive).toBe(true)
    expect(result.similarity).toBe(1.0)
    expect(result.features.rule?.type).toBe('landParcel')
  })

  it('应该识别不同地块并返回确定性结果', () => {
    const result = calculateEnhancedSimilarity(
      '滨江-01地块',
      '滨江-02地块',
      calculator,
      { enableLandParcelRule: true }
    )

    expect(result.isDefinitive).toBe(true)
    expect(result.similarity).toBe(0.0)
  })

  it('应该使用传统算法计算相似度', () => {
    const result = calculateEnhancedSimilarity(
      '用户管理系统',
      '用户管理平台',
      calculator,
      {
        enableTokenSet: true,
        enableNgram: true,
      }
    )

    expect(result.isDefinitive).toBe(false)
    expect(result.features.edit).toBeGreaterThan(0)
    expect(result.features.jaro).toBeGreaterThan(0)
    expect(result.features.tokenSet).toBeGreaterThan(0)
    expect(result.features.ngram).toBeGreaterThan(0)
  })

  it('应该生成决策过程说明', () => {
    const result = calculateEnhancedSimilarity(
      '数据分析平台',
      '数据分析系统',
      calculator,
      { enableTokenSet: true }
    )

    expect(result.explanation).toBeDefined()
    expect(result.explanation.length).toBeGreaterThan(0)
    expect(result.explanation.some(line => line.includes('编辑距离'))).toBe(true)
  })

  it('应该应用附属词过滤', () => {
    const result = calculateEnhancedSimilarity(
      '数据分析平台系统',
      '数据分析工具应用',
      calculator,
      {
        noiseWordAggressiveness: 'medium',
        enableTokenSet: true,
      }
    )

    // 过滤后都变成"数据分析"，应该高度相似
    expect(result.similarity).toBeGreaterThan(0.9)
    expect(result.reason).toContain('已过滤附属词')
  })

  it('应该通过项目名称强锚点识别同一投资项目', () => {
    const result = calculateEnhancedSimilarity(
      '杭政储出2026 33号住宅商业',
      '杭政储出【2026】33号地块住宅兼商业商务项目',
      calculator,
      { enableLandParcelRule: true }
    )

    expect(result.isDefinitive).toBe(true)
    expect(result.similarity).toBeGreaterThanOrEqual(0.9)
    expect(result.features.rule?.type).toBe('projectAnchor')
    expect(result.reason).toContain('项目强锚点')
  })

  it('应该通过控规编号冲突识别不同项目', () => {
    const result = calculateEnhancedSimilarity(
      '双桥XH020104-22安置房',
      '双桥单元XH020104-21地块安置房项目',
      calculator,
      { enableLandParcelRule: true }
    )

    expect(result.isDefinitive).toBe(true)
    expect(result.similarity).toBeLessThanOrEqual(0.54)
    expect(result.features.rule?.type).toBe('projectAnchor')
  })

  it('应该提供预处理结果', () => {
    const result = calculateEnhancedSimilarity(
      '项目管理系统v1.0',
      '项目管理系统v2.0',
      calculator
    )

    expect(result.preprocessing).toBeDefined()
    expect(result.preprocessing?.features.hasVersion).toBe(true)
  })
})

describe('quickRuleCheck', () => {
  it('应该快速识别版本号差异', () => {
    const result = quickRuleCheck(
      '项目管理系统v1.0',
      '项目管理系统v2.0',
      { enableVersionNormalization: true }
    )

    expect(result.isSame).toBe(true)
    expect(result.score).toBeGreaterThan(0.9)
  })

  it('应该快速识别地块名', () => {
    const result = quickRuleCheck(
      '滨江-R21-01地块',
      '滨江-01地块',
      { enableLandParcelRule: true }
    )

    expect(result.isSame).toBe(true)
  })

  it('对于无法确定的情况应返回null', () => {
    const result = quickRuleCheck(
      '用户管理系统',
      '用户管理平台'
    )

    expect(result.isSame).toBeNull()
    expect(result.reason).toContain('需要进一步')
  })
})
