/**
 * 扩展的相似度计算选项
 *
 * 在原有 SimilarityOptions 基础上增加高级预处理和新算法支持
 */

import type { SimilarityOptions } from './similarity'

/**
 * 高级相似度计算选项
 */
export interface AdvancedSimilarityOptions extends SimilarityOptions {
  /** 是否启用版本号标准化 */
  enableVersionNormalization?: boolean

  /** 是否启用地块名识别规则 */
  enableLandParcelRule?: boolean

  /** 是否启用道路桩号识别规则 */
  enableRoadSectionRule?: boolean

  /** 附属词语过滤激进程度 */
  noiseWordAggressiveness?: 'low' | 'medium' | 'high' | 'none'

  /** 是否启用 Token Set 相似度 */
  enableTokenSet?: boolean

  /** 是否启用 N-gram 相似度 */
  enableNgram?: boolean

  /** N-gram 的 n 值（默认2） */
  ngramSize?: number

  /** 扩展的算法权重配置 */
  advancedWeights?: {
    /** 编辑距离权重 */
    edit: number
    /** Jaro-Winkler 权重 */
    jaro: number
    /** Token Set 权重 */
    tokenSet: number
    /** N-gram 权重 */
    ngram: number
  }
}

/**
 * 相似度特征向量
 */
export interface SimilarityFeatures {
  /** 规则层特征（确定性判断） */
  rule?: {
    type: 'coreName' | 'landParcel' | 'roadSection'
    score: number
    reason: string
  }

  /** 传统算法层特征 */
  edit: number          // 编辑距离相似度
  jaro: number          // Jaro-Winkler 相似度
  tokenSet?: number     // Token Set 相似度（可选）
  ngram?: number        // N-gram 相似度（可选）

  /** AI层特征（未来扩展） */
  embedding?: number    // 语义嵌入相似度
  llm?: number         // LLM 判断分数
}

/**
 * 增强的匹配结果（包含特征详情）
 */
export interface EnhancedMatchResult {
  /** 匹配到的目标文本 */
  text: string
  /** 最终相似度分数 */
  similarity: number
  /** 在目标列表中的索引位置 */
  index: number
  /** 详细特征向量 */
  features?: SimilarityFeatures
  /** 决策过程说明 */
  explanation?: string[]
}

/**
 * Token Set 相似度计算
 * 基于词集的 Jaccard 相似度
 */
export function tokenSetSimilarity(text1: string, text2: string): number {
  /**
   * 简单的中文分词：按字符拆分（对于中文更合适）
   * 对于英文，按空格分词
   */
  function tokenize(text: string): Set<string> {
    const normalized = text.toLowerCase().trim()

    // 检测是否包含中文字符
    const hasChinese = /[一-龥]/.test(normalized)

    if (hasChinese) {
      // 中文：按字符分割
      return new Set(normalized.split('').filter(c => c.trim().length > 0))
    } else {
      // 英文：按空格分割
      return new Set(normalized.split(/\s+/).filter(t => t.length > 0))
    }
  }

  const tokens1 = tokenize(text1)
  const tokens2 = tokenize(text2)

  if (tokens1.size === 0 && tokens2.size === 0) return 1.0
  if (tokens1.size === 0 || tokens2.size === 0) return 0.0

  // 计算交集和并集
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)))
  const union = new Set([...tokens1, ...tokens2])

  return intersection.size / union.size
}

/**
 * N-gram 相似度计算
 */
export function ngramSimilarity(text1: string, text2: string, n: number = 2): number {
  /**
   * 从文本中提取 N-gram 集合
   */
  function getNgrams(text: string, n: number): Set<string> {
    const normalized = text.toLowerCase().replace(/\s+/g, '')
    const ngrams = new Set<string>()

    if (normalized.length < n) {
      ngrams.add(normalized)
      return ngrams
    }

    for (let i = 0; i <= normalized.length - n; i++) {
      ngrams.add(normalized.substring(i, i + n))
    }

    return ngrams
  }

  const ngrams1 = getNgrams(text1, n)
  const ngrams2 = getNgrams(text2, n)

  if (ngrams1.size === 0 && ngrams2.size === 0) return 1.0
  if (ngrams1.size === 0 || ngrams2.size === 0) return 0.0

  // 计算交集和并集
  const intersection = new Set([...ngrams1].filter(g => ngrams2.has(g)))
  const union = new Set([...ngrams1, ...ngrams2])

  return intersection.size / union.size
}

/**
 * 计算加权融合分数
 */
export function calculateWeightedScore(
  features: SimilarityFeatures,
  weights: AdvancedSimilarityOptions['advancedWeights']
): number {
  // 如果有规则层确定性判断，直接返回
  if (features.rule) {
    return features.rule.score
  }

  // 默认权重
  const defaultWeights = {
    edit: 0.35,
    jaro: 0.25,
    tokenSet: 0.25,
    ngram: 0.15,
  }

  const w = weights || defaultWeights

  let totalScore = 0
  let totalWeight = 0

  // 编辑距离
  if (features.edit !== undefined) {
    totalScore += features.edit * w.edit
    totalWeight += w.edit
  }

  // Jaro-Winkler
  if (features.jaro !== undefined) {
    totalScore += features.jaro * w.jaro
    totalWeight += w.jaro
  }

  // Token Set
  if (features.tokenSet !== undefined) {
    totalScore += features.tokenSet * w.tokenSet
    totalWeight += w.tokenSet
  }

  // N-gram
  if (features.ngram !== undefined) {
    totalScore += features.ngram * w.ngram
    totalWeight += w.ngram
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0
}

/**
 * 预设权重配置
 */
export const WEIGHT_PRESETS = {
  /** 平衡模式（默认） */
  balanced: {
    edit: 0.35,
    jaro: 0.25,
    tokenSet: 0.25,
    ngram: 0.15,
  },

  /** 精确模式（强调字符级精确性） */
  precise: {
    edit: 0.50,
    jaro: 0.30,
    tokenSet: 0.15,
    ngram: 0.05,
  },

  /** 灵活模式（强调词级语义） */
  flexible: {
    edit: 0.20,
    jaro: 0.20,
    tokenSet: 0.40,
    ngram: 0.20,
  },
}
