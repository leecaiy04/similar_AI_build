/**
 * 高级文本预处理工具
 *
 * 提供领域特定的规则预处理能力：
 * - 版本号智能识别
 * - 地块名解析
 * - 道路桩号解析
 * - 附属词语过滤
 */

/**
 * 版本号模式匹配
 */
const VERSION_PATTERNS = [
  // v1.0, v2.0, version 1.0, 版本1.0
  /[\s\-_](?:v|version|版本)[\s\-_]*\d+(?:\.\d+)*(?:[\s\-_]*(?:旧版|新版|old|new|beta|alpha))?\b/gi,
  // 单独的v1, v2（必须有v前缀）
  /\bv\d+(?:\.\d+)*\b/gi,
  // (旧版), [新版], （版本2.0）
  /[\(（][^)）]*(?:版|version)[^)）]*[\)）]/gi,
  /[\[［][^\]］]*(?:版|version)[^\]］]*[\]］]/gi,
]

/**
 * 提取核心名称（移除版本号）
 */
export function extractCoreName(text: string): string {
  if (!text) return ''

  let core = text

  // 移除版本号
  for (const pattern of VERSION_PATTERNS) {
    core = core.replace(pattern, ' ')
  }

  // 移除空括号
  core = core.replace(/[\(（]\s*[\)）]/g, '')
  core = core.replace(/[\[［]\s*[\]］]/g, '')

  // 清理多余空格
  core = core.replace(/\s+/g, ' ').trim()

  return core
}

/**
 * 地块信息接口
 */
export interface LandParcelInfo {
  prefix: string      // 前缀：XXX
  type?: string       // 类型代码：R21（可选）
  suffix: string      // 后缀：YY
  raw: string         // 原始名称
}

/**
 * 解析地块名称
 */
export function parseLandParcel(text: string): LandParcelInfo | null {
  if (!text) return null

  // 匹配模式：前缀-[类型代码]-后缀
  const patterns = [
    // XXX-R21-YY 格式（类型代码通常是字母+数字）
    /([A-Z一-鿿一-龥]+)-([A-Z]\d+)-([A-Z一-鿿一-龥\d]+)/i,
    // XXX-YY 格式
    /([A-Z一-鿿一-龥]+)-([A-Z一-鿿一-龥\d]+)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      // 检查是否是类型代码（字母开头+数字）
      const isTypeCode = match.length === 4 && /^[A-Z]\d+$/i.test(match[2])

      return {
        prefix: match[1],
        type: isTypeCode ? match[2] : undefined,
        suffix: isTypeCode ? match[3] : match[2],
        raw: text
      }
    }
  }

  return null
}

/**
 * 判断是否为同一地块
 * @returns true=同一地块, false=不同地块, null=无法判断（不是地块名）
 */
export function isSameLandParcel(text1: string, text2: string): boolean | null {
  const parcel1 = parseLandParcel(text1)
  const parcel2 = parseLandParcel(text2)

  if (!parcel1 || !parcel2) return null  // 不是地块名

  // 比较前缀和后缀，忽略中间的类型代码
  return parcel1.prefix.toLowerCase() === parcel2.prefix.toLowerCase() &&
         parcel1.suffix.toLowerCase() === parcel2.suffix.toLowerCase()
}

/**
 * 道路工程段信息接口
 */
export interface RoadSection {
  roadName: string    // 路名
  startPile: string   // 起点桩号：K1+000
  endPile: string     // 终点桩号：K2+000
  raw: string
}

/**
 * 解析道路工程段
 */
export function parseRoadSection(text: string): RoadSection | null {
  if (!text) return null

  // 匹配模式：路名 + 桩号范围
  // 支持多种分隔符：~、～、至、-、到
  const pattern = /([一-鿿一-龥]+路)\s*(K\d+\+\d+)\s*[~～至\-到]\s*(K\d+\+\d+)/
  const match = text.match(pattern)

  if (match) {
    return {
      roadName: match[1],
      startPile: match[2],
      endPile: match[3],
      raw: text
    }
  }

  return null
}

/**
 * 判断是否为同一道路工程段
 * @returns true=同一段, false=不同段, null=无法判断（不是道路工程）
 */
export function isSameRoadSection(text1: string, text2: string): boolean | null {
  const section1 = parseRoadSection(text1)
  const section2 = parseRoadSection(text2)

  if (!section1 || !section2) return null  // 不是道路工程

  // 路名和桩号都必须完全一致
  return section1.roadName === section2.roadName &&
         section1.startPile === section2.startPile &&
         section1.endPile === section2.endPile
}

/**
 * 附属词语（噪音词）
 */
const NOISE_WORDS = {
  // 助词（最小影响）
  helper: ['的', '之', '及', '与', '和', '或'],

  // 常见项目类型词（中等影响）
  common: ['工程', '项目', '建设', '建筑', '设施', '系统', '平台', '工具', '应用'],

  // 领域特定词（高影响，慎用）
  domain: ['地下车库', '地下停车场', '停车场', '车库', '配套', '附属'],
}

/**
 * 移除附属词语
 * @param aggressiveness 激进程度：low=仅助词, medium=常见词, high=全部
 */
export function removeNoiseWords(
  text: string,
  aggressiveness: 'low' | 'medium' | 'high' = 'medium'
): string {
  let result = text

  const wordsToRemove: string[] = []

  if (aggressiveness === 'low') {
    wordsToRemove.push(...NOISE_WORDS.helper)
  } else if (aggressiveness === 'medium') {
    wordsToRemove.push(...NOISE_WORDS.helper, ...NOISE_WORDS.common)
  } else {
    wordsToRemove.push(...NOISE_WORDS.helper, ...NOISE_WORDS.common, ...NOISE_WORDS.domain)
  }

  // 按长度降序排序，避免短词先被替换导致长词无法匹配
  wordsToRemove.sort((a, b) => b.length - a.length)

  for (const word of wordsToRemove) {
    // 使用全局替换，转义特殊字符
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escapedWord, 'g'), ' ')
  }

  return result.replace(/\s+/g, ' ').trim()
}

/**
 * 规则预处理结果
 */
export interface RuleProcessingResult {
  // 如果规则能确定性判断，直接返回结果
  definitive?: {
    isSame: boolean
    score: number
    reason: string
  }

  // 预处理后的文本
  processed1: string
  processed2: string

  // 识别到的特征
  features: {
    hasVersion?: boolean
    isLandParcel?: boolean
    isRoadSection?: boolean
    coreName1?: string
    coreName2?: string
  }
}

/**
 * 应用所有规则预处理
 */
export function applyRulePreprocessing(
  text1: string,
  text2: string,
  options: {
    enableVersionNormalization?: boolean
    enableLandParcelRule?: boolean
    enableRoadSectionRule?: boolean
    noiseWordAggressiveness?: 'low' | 'medium' | 'high'
  } = {}
): RuleProcessingResult {
  const result: RuleProcessingResult = {
    processed1: text1,
    processed2: text2,
    features: {}
  }

  // 1. 地块名规则（最高优先级，确定性判断）
  if (options.enableLandParcelRule !== false) {
    const landMatch = isSameLandParcel(text1, text2)
    if (landMatch !== null) {
      result.features.isLandParcel = true
      result.definitive = {
        isSame: landMatch,
        score: landMatch ? 1.0 : 0.0,
        reason: landMatch
          ? '地块名匹配（忽略类型代码）'
          : '地块编号不同，确定为不同项目'
      }
      return result
    }
  }

  // 2. 道路桩号规则（确定性判断）
  if (options.enableRoadSectionRule !== false) {
    const roadMatch = isSameRoadSection(text1, text2)
    if (roadMatch !== null) {
      result.features.isRoadSection = true
      result.definitive = {
        isSame: roadMatch,
        score: roadMatch ? 1.0 : 0.0,
        reason: roadMatch
          ? '道路名称和桩号完全一致'
          : '路名相同但桩号不同，确定为不同项目'
      }
      return result
    }
  }

  // 3. 版本号标准化
  if (options.enableVersionNormalization !== false) {
    const core1 = extractCoreName(text1)
    const core2 = extractCoreName(text2)

    if (core1 !== text1 || core2 !== text2) {
      result.features.hasVersion = true
      result.features.coreName1 = core1
      result.features.coreName2 = core2

      // 核心名称完全相同
      if (core1 === core2 && core1.length > 0) {
        result.definitive = {
          isSame: true,
          score: 0.98,
          reason: '核心名称完全匹配（版本号差异忽略）'
        }
        return result
      }

      // 使用核心名称继续比对
      result.processed1 = core1
      result.processed2 = core2
    }
  }

  // 4. 移除附属词语
  if (options.noiseWordAggressiveness) {
    result.processed1 = removeNoiseWords(result.processed1, options.noiseWordAggressiveness)
    result.processed2 = removeNoiseWords(result.processed2, options.noiseWordAggressiveness)
  }

  return result
}
