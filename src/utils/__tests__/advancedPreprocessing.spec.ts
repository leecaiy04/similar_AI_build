import { describe, it, expect } from 'vitest'
import {
  extractCoreName,
  parseLandParcel,
  isSameLandParcel,
  parseRoadSection,
  isSameRoadSection,
  removeNoiseWords,
  applyRulePreprocessing,
} from '../advancedPreprocessing'

describe('extractCoreName', () => {
  it('应该移除版本号', () => {
    expect(extractCoreName('项目管理系统v1.0')).toBe('项目管理系统')
    expect(extractCoreName('项目管理系统v2.0')).toBe('项目管理系统')
    expect(extractCoreName('数据分析平台 version 1.0')).toBe('数据分析平台')
    expect(extractCoreName('用户管理系统V3')).toBe('用户管理系统')
  })

  it('应该移除括号中的版本说明', () => {
    expect(extractCoreName('项目管理系统(旧版)')).toBe('项目管理系统')
    expect(extractCoreName('数据分析平台[新版]')).toBe('数据分析平台')
    expect(extractCoreName('系统（版本2.0）')).toBe('系统')
  })

  it('应该保留非版本号内容', () => {
    expect(extractCoreName('用户管理系统')).toBe('用户管理系统')
    expect(extractCoreName('滨江-01地块项目')).toBe('滨江-01地块项目')
  })

  it('应该处理空字符串', () => {
    expect(extractCoreName('')).toBe('')
  })
})

describe('parseLandParcel', () => {
  it('应该解析标准地块名（带类型代码）', () => {
    const result = parseLandParcel('滨江-R21-01地块')
    expect(result).toEqual({
      prefix: '滨江',
      type: 'R21',
      suffix: '01地块',
      raw: '滨江-R21-01地块'
    })
  })

  it('应该解析简化地块名（无类型代码）', () => {
    const result = parseLandParcel('滨江-01地块')
    expect(result).toEqual({
      prefix: '滨江',
      type: undefined,
      suffix: '01地块',
      raw: '滨江-01地块'
    })
  })

  it('应该处理英文地块名', () => {
    const result = parseLandParcel('ABC-R21-YY')
    expect(result).toEqual({
      prefix: 'ABC',
      type: 'R21',
      suffix: 'YY',
      raw: 'ABC-R21-YY'
    })
  })

  it('对于非地块名应返回null', () => {
    expect(parseLandParcel('用户管理系统')).toBeNull()
    expect(parseLandParcel('数据分析平台')).toBeNull()
    expect(parseLandParcel('')).toBeNull()
  })
})

describe('isSameLandParcel', () => {
  it('应该识别相同地块（忽略类型代码）', () => {
    expect(isSameLandParcel('滨江-R21-01地块', '滨江-01地块')).toBe(true)
    expect(isSameLandParcel('滨江-R21-YY', '滨江-YY')).toBe(true)
  })

  it('应该识别相同地块（都有类型代码）', () => {
    expect(isSameLandParcel('滨江-R21-01地块', '滨江-R22-01地块')).toBe(true)
  })

  it('应该识别不同地块', () => {
    expect(isSameLandParcel('滨江-01地块', '滨江-02地块')).toBe(false)
    expect(isSameLandParcel('滨江-A地块', '滨江-B地块')).toBe(false)
  })

  it('对于非地块名应返回null', () => {
    expect(isSameLandParcel('用户管理系统', '用户管理平台')).toBeNull()
    expect(isSameLandParcel('滨江-01地块', '用户管理系统')).toBeNull()
  })

  it('应该忽略大小写', () => {
    expect(isSameLandParcel('ABC-R21-YY', 'abc-yy')).toBe(true)
  })
})

describe('parseRoadSection', () => {
  it('应该解析标准道路工程段', () => {
    const result = parseRoadSection('滨江路K1+000~K2+000')
    expect(result).toEqual({
      roadName: '滨江路',
      startPile: 'K1+000',
      endPile: 'K2+000',
      raw: '滨江路K1+000~K2+000'
    })
  })

  it('应该支持多种分隔符', () => {
    expect(parseRoadSection('滨江路K1+000～K2+000')).toBeTruthy()
    expect(parseRoadSection('滨江路K1+000至K2+000')).toBeTruthy()
    expect(parseRoadSection('滨江路K1+000-K2+000')).toBeTruthy()
  })

  it('应该处理带空格的格式', () => {
    const result = parseRoadSection('滨江路 K1+000 ~ K2+000')
    expect(result?.roadName).toBe('滨江路')
  })

  it('对于非道路工程应返回null', () => {
    expect(parseRoadSection('用户管理系统')).toBeNull()
    expect(parseRoadSection('数据分析平台')).toBeNull()
    expect(parseRoadSection('')).toBeNull()
  })
})

describe('isSameRoadSection', () => {
  it('应该识别相同道路工程段', () => {
    expect(isSameRoadSection(
      '滨江路K1+000~K2+000',
      '滨江路K1+000~K2+000'
    )).toBe(true)
  })

  it('应该识别不同道路工程段（不同桩号）', () => {
    expect(isSameRoadSection(
      '滨江路K1+000~K2+000',
      '滨江路K3+000~K4+000'
    )).toBe(false)
  })

  it('应该识别不同道路工程段（不同路名）', () => {
    expect(isSameRoadSection(
      '滨江路K1+000~K2+000',
      '西湖路K1+000~K2+000'
    )).toBe(false)
  })

  it('对于非道路工程应返回null', () => {
    expect(isSameRoadSection('用户管理系统', '用户管理平台')).toBeNull()
  })
})

describe('removeNoiseWords', () => {
  it('低激进度：只移除助词', () => {
    expect(removeNoiseWords('数据的分析与处理', 'low')).toBe('数据 分析 处理')
    expect(removeNoiseWords('用户管理系统', 'low')).toBe('用户管理系统')
  })

  it('中激进度：移除助词和常见类型词', () => {
    expect(removeNoiseWords('数据分析平台系统', 'medium')).toBe('数据分析')
    expect(removeNoiseWords('用户管理工程项目', 'medium')).toBe('用户管理')
  })

  it('高激进度：移除所有附属词', () => {
    expect(removeNoiseWords('地下停车场建设项目', 'high')).toBe('')
    expect(removeNoiseWords('配套设施工程', 'high')).toBe('')
  })
})

describe('applyRulePreprocessing', () => {
  it('应该识别版本号差异并返回确定性结果', () => {
    const result = applyRulePreprocessing(
      '项目管理系统v1.0',
      '项目管理系统v2.0',
      { enableVersionNormalization: true }
    )

    expect(result.definitive).toBeDefined()
    expect(result.definitive?.isSame).toBe(true)
    expect(result.definitive?.score).toBe(0.98)
    expect(result.features.hasVersion).toBe(true)
  })

  it('应该识别地块名并返回确定性结果', () => {
    const result = applyRulePreprocessing(
      '滨江-R21-01地块',
      '滨江-01地块',
      { enableLandParcelRule: true }
    )

    expect(result.definitive).toBeDefined()
    expect(result.definitive?.isSame).toBe(true)
    expect(result.features.isLandParcel).toBe(true)
  })

  it('应该识别不同地块并返回确定性结果', () => {
    const result = applyRulePreprocessing(
      '滨江-01地块',
      '滨江-02地块',
      { enableLandParcelRule: true }
    )

    expect(result.definitive).toBeDefined()
    expect(result.definitive?.isSame).toBe(false)
  })

  it('应该识别道路工程段并返回确定性结果', () => {
    const result = applyRulePreprocessing(
      '滨江路K1+000~K2+000',
      '滨江路K3+000~K4+000',
      { enableRoadSectionRule: true }
    )

    expect(result.definitive).toBeDefined()
    expect(result.definitive?.isSame).toBe(false)
    expect(result.features.isRoadSection).toBe(true)
  })

  it('应该处理无规则匹配的情况', () => {
    const result = applyRulePreprocessing(
      '用户管理系统',
      '用户管理平台',
      {
        enableVersionNormalization: true,
        enableLandParcelRule: true,
        enableRoadSectionRule: true
      }
    )

    expect(result.definitive).toBeUndefined()
    expect(result.processed1).toBe('用户管理系统')
    expect(result.processed2).toBe('用户管理平台')
  })

  it('应该移除附属词语', () => {
    const result = applyRulePreprocessing(
      '数据分析平台系统',
      '数据分析工具应用',
      { noiseWordAggressiveness: 'medium' }
    )

    expect(result.processed1).toBe('数据分析')
    expect(result.processed2).toBe('数据分析')
  })

  it('地块名规则优先级最高', () => {
    // 即使启用了版本号处理，地块名规则也应该先生效
    const result = applyRulePreprocessing(
      '滨江-R21-01地块v1.0',
      '滨江-01地块v2.0',
      {
        enableVersionNormalization: true,
        enableLandParcelRule: true
      }
    )

    expect(result.definitive?.reason).toContain('地块')
    expect(result.features.isLandParcel).toBe(true)
  })
})
