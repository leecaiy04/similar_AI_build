/**
 * 增强的相似度计算服务
 *
 * 集成高级预处理和多维度特征计算
 */

import { SimilarityCalculator } from './similarity'
import type { SimilarityOptions } from './similarity'
import {
  applyRulePreprocessing,
  type RuleProcessingResult,
} from './advancedPreprocessing'
import {
  tokenSetSimilarity,
  ngramSimilarity,
  calculateWeightedScore,
  WEIGHT_PRESETS,
  type AdvancedSimilarityOptions,
  type SimilarityFeatures,
  type EnhancedMatchResult,
} from './advancedSimilarity'

/**
 * 增强的相似度计算结果
 */
export interface EnhancedSimilarityResult {
  /** 最终相似度分数 */
  similarity: number

  /** 是否为确定性判断（规则层） */
  isDefinitive: boolean

  /** 判断依据 */
  reason: string

  /** 详细特征向量 */
  features: SimilarityFeatures

  /** 决策过程说明 */
  explanation: string[]

  /** 预处理结果 */
  preprocessing?: RuleProcessingResult
}

/**
 * 使用增强功能计算两个文本的相似度
 */
export function calculateEnhancedSimilarity(
  text1: string,
  text2: string,
  calculator: SimilarityCalculator,
  options: AdvancedSimilarityOptions = {}
): EnhancedSimilarityResult {
  const explanation: string[] = []
  const features: SimilarityFeatures = {
    edit: 0,
    jaro: 0,
  }

  // Step 1: 规则预处理层
  const preprocessing = applyRulePreprocessing(text1, text2, {
    enableVersionNormalization: options.enableVersionNormalization !== false,
    enableLandParcelRule: options.enableLandParcelRule !== false,
    enableRoadSectionRule: options.enableRoadSectionRule !== false,
    noiseWordAggressiveness: options.noiseWordAggressiveness && options.noiseWordAggressiveness !== 'none'
      ? options.noiseWordAggressiveness
      : undefined,
  })

  // 如果规则层有确定性判断，直接返回
  if (preprocessing.definitive) {
    features.rule = {
      type: preprocessing.features.isLandParcel
        ? 'landParcel'
        : preprocessing.features.isRoadSection
        ? 'roadSection'
        : preprocessing.features.isProjectAnchor
        ? 'projectAnchor'
        : 'coreName',
      score: preprocessing.definitive.score,
      reason: preprocessing.definitive.reason,
    }

    explanation.push(`✓ 规则层确定性判断：${preprocessing.definitive.reason}`)
    explanation.push(`  最终分数：${(preprocessing.definitive.score * 100).toFixed(2)}%`)

    return {
      similarity: preprocessing.definitive.score,
      isDefinitive: true,
      reason: preprocessing.definitive.reason,
      features,
      explanation,
      preprocessing,
    }
  }

  // Step 2: 使用预处理后的文本进行传统算法计算
  const processedText1 = preprocessing.processed1
  const processedText2 = preprocessing.processed2

  explanation.push(`传统算法特征计算：`)

  // 转换为兼容的 SimilarityOptions
  const baseOptions: SimilarityOptions = {
    threshold: options.threshold,
    ignoreInvisibleChars: options.ignoreInvisibleChars,
    fullwidthToHalfwidth: options.fullwidthToHalfwidth,
    ignorePunctuation: options.ignorePunctuation,
    weights: options.weights,
  }

  // 编辑距离
  features.edit = calculator.calculateSimilarity(processedText1, processedText2, baseOptions)
  explanation.push(`  - 编辑距离相似度: ${(features.edit * 100).toFixed(1)}%`)

  // Jaro-Winkler (通过权重为0来获取纯Jaro分数，或使用现有算法)
  const jaroOptions = { ...baseOptions, weights: { edit: 0, jaro: 1 } }
  features.jaro = calculator.calculateSimilarity(processedText1, processedText2, jaroOptions)
  explanation.push(`  - Jaro-Winkler: ${(features.jaro * 100).toFixed(1)}%`)

  // Token Set（可选）
  if (options.enableTokenSet !== false) {
    features.tokenSet = tokenSetSimilarity(processedText1, processedText2)
    explanation.push(`  - Token Set 相似度: ${(features.tokenSet * 100).toFixed(1)}%`)
  }

  // N-gram（可选）
  if (options.enableNgram !== false) {
    const ngramSize = options.ngramSize || 2
    features.ngram = ngramSimilarity(processedText1, processedText2, ngramSize)
    explanation.push(`  - N-gram(${ngramSize}) 相似度: ${(features.ngram * 100).toFixed(1)}%`)
  }

  // Step 3: 加权融合
  const weights = options.advancedWeights || WEIGHT_PRESETS.balanced
  const finalScore = calculateWeightedScore(features, weights)

  explanation.push(`\n加权融合：`)
  explanation.push(`  最终分数: ${(finalScore * 100).toFixed(2)}%`)

  // 生成判断依据
  let reason = ''
  if (finalScore >= 0.9) {
    reason = '高度相似'
  } else if (finalScore >= 0.75) {
    reason = '相似度较高'
  } else if (finalScore >= 0.5) {
    reason = '中等相似度'
  } else {
    reason = '相似度较低'
  }

  // 添加特征说明
  if (preprocessing.features.hasVersion) {
    reason += '（已移除版本号）'
  }
  if (options.noiseWordAggressiveness && options.noiseWordAggressiveness !== 'none') {
    reason += '（已过滤附属词）'
  }

  return {
    similarity: finalScore,
    isDefinitive: false,
    reason,
    features,
    explanation,
    preprocessing,
  }
}

/**
 * 批量增强相似度计算
 */
export function batchCalculateEnhanced(
  sourceList: string[],
  targetList: string[],
  calculator: SimilarityCalculator,
  options: AdvancedSimilarityOptions = {},
  progressCallback?: (current: number, total: number) => void
): EnhancedMatchResult[][] {
  const results: EnhancedMatchResult[][] = []

  for (let i = 0; i < sourceList.length; i++) {
    const source = sourceList[i] || ''
    const matches: EnhancedMatchResult[] = []

    for (let j = 0; j < targetList.length; j++) {
      const target = targetList[j] || ''

      const result = calculateEnhancedSimilarity(source, target, calculator, options)

      // 过滤低于阈值的匹配
      if (result.similarity >= (options.threshold || 0)) {
        matches.push({
          text: target,
          similarity: result.similarity,
          index: j,
          features: result.features,
          explanation: result.explanation,
        })
      }
    }

    // 按相似度降序排序
    matches.sort((a, b) => b.similarity - a.similarity)
    results.push(matches)

    if (progressCallback) {
      progressCallback(i + 1, sourceList.length)
    }
  }

  return results
}

/**
 * 快速版本：仅使用规则层判断
 * 适合大规模数据的第一轮筛选
 */
export function quickRuleCheck(
  text1: string,
  text2: string,
  options: Pick<
    AdvancedSimilarityOptions,
    'enableVersionNormalization' | 'enableLandParcelRule' | 'enableRoadSectionRule'
  > = {}
): { isSame: boolean | null; score: number; reason: string } {
  const preprocessing = applyRulePreprocessing(text1, text2, {
    enableVersionNormalization: options.enableVersionNormalization !== false,
    enableLandParcelRule: options.enableLandParcelRule !== false,
    enableRoadSectionRule: options.enableRoadSectionRule !== false,
  })

  if (preprocessing.definitive) {
    return {
      isSame: preprocessing.definitive.isSame,
      score: preprocessing.definitive.score,
      reason: preprocessing.definitive.reason,
    }
  }

  return {
    isSame: null,
    score: 0,
    reason: '需要进一步算法判断',
  }
}
