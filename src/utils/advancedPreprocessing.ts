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
      const isTypeCode = match.length === 4 && /^[A-Z]\d+$/i.test(match[2] || '')

      return {
        prefix: match[1] || '',
        type: isTypeCode ? match[2] : undefined,
        suffix: isTypeCode ? (match[3] || '') : (match[2] || ''),
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
      roadName: match[1] || '',
      startPile: match[2] || '',
      endPile: match[3] || '',
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
 * 项目名称锚点
 *
 * 用于识别项目名称中比普通字符相似度更可靠的结构化信息。
 */
export interface ProjectAnchor {
  type: 'projectCode' | 'landParcel' | 'planningPlot' | 'plotNumber' | 'road' | 'entity'
  value: string
  weight: number
}

export interface ProjectAnchorComparison {
  isSame: boolean | null
  score: number
  reason: string
  sharedAnchors: ProjectAnchor[]
  conflictingAnchors: ProjectAnchor[]
}

const PROJECT_ANCHOR_STRONG_TYPES: ProjectAnchor['type'][] = [
  'projectCode',
  'landParcel',
  'planningPlot',
]

const PROJECT_ENTITY_SUFFIXES = [
  '幼儿园',
  '泵站',
  '学校',
  '医院',
  '地块',
  '道路',
  '公园',
  '桥梁',
  '隧道',
  '路',
  '街',
  '巷',
  '河',
  '港',
  '桥',
]

function normalizeProjectName(text: string): string {
  return (text || '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[‐‑‒–—―－]+/g, '-')
    .replace(/[()（）[\]【】{}｛｝<>《》]/g, '')
    .replace(/[〔〕]/g, '')
    .replace(/\s+/g, '')
}

function compactProjectName(text: string): string {
  return normalizeProjectName(text)
    .replace(/[^\w一-鿿-]+/g, '')
    .replace(/可行性研究报告|项目建议书|初步设计|建设工程|建设项目|道路工程|改造提升|综合整治|企业投资项目备案|政府投资项目审批|关于|批复|复函|审批|备案|核准|调整|工程|项目|建设|新建|改建|扩建|改造|提升|的/g, '')
}

function appendAnchor(anchors: ProjectAnchor[], seen: Set<string>, anchor: ProjectAnchor): void {
  const key = `${anchor.type}:${anchor.value}`
  if (!anchor.value || seen.has(key)) return
  seen.add(key)
  anchors.push(anchor)
}

/**
 * 提取项目名称中的结构化锚点。
 */
export function extractProjectAnchors(text: string): ProjectAnchor[] {
  const normalized = normalizeProjectName(text)
  const anchors: ProjectAnchor[] = []
  const seen = new Set<string>()

  for (const match of normalized.matchAll(/\d{4}-\d{6}-\d{2}-\d{2}-\d{6}/g)) {
    appendAnchor(anchors, seen, { type: 'projectCode', value: match[0], weight: 1.0 })
  }

  for (const match of normalized.matchAll(/[一-鿿]{0,6}政储出\d{4}\d+号/g)) {
    appendAnchor(anchors, seen, { type: 'landParcel', value: normalizeLandParcelAnchor(match[0]), weight: 0.98 })
  }

  for (const match of normalized.matchAll(/[A-Z]{1,8}\d{4,}(?:-[A-Z0-9]+)+/g)) {
    appendAnchor(anchors, seen, { type: 'planningPlot', value: match[0], weight: 0.96 })
  }

  for (const match of normalized.matchAll(/\d+号地块/g)) {
    appendAnchor(anchors, seen, { type: 'plotNumber', value: match[0], weight: 0.75 })
  }

  const suffixPattern = PROJECT_ENTITY_SUFFIXES
    .sort((left, right) => right.length - left.length)
    .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  const entityPattern = new RegExp(`[一-鿿A-Z0-9]{1,14}(?:${suffixPattern})`, 'g')
  for (const match of normalized.matchAll(entityPattern)) {
    const value = compactProjectName(match[0])
    if (isWeakProjectEntity(value)) continue
    appendAnchor(anchors, seen, {
      type: /(?:道路|路|街|巷)$/.test(value) ? 'road' : 'entity',
      value,
      weight: 0.72,
    })
  }

  for (const value of extractRoadSegments(normalized)) {
    appendAnchor(anchors, seen, { type: 'road', value, weight: 0.68 })
  }

  return anchors
}

/**
 * 使用结构化锚点判断项目名称是否明显相同或冲突。
 */
export function compareProjectAnchors(text1: string, text2: string): ProjectAnchorComparison {
  const anchors1 = extractProjectAnchors(text1)
  const anchors2 = extractProjectAnchors(text2)
  const sharedAnchors = anchors1
    .filter(anchor => anchors2.some(candidate => candidate.type === anchor.type && candidate.value === anchor.value))
    .sort((left, right) => right.weight - left.weight || left.value.localeCompare(right.value))
  const conflictingAnchors = findConflictingProjectAnchors(anchors1, anchors2)

  if (conflictingAnchors.length > 0) {
    return {
      isSame: false,
      score: 0.54,
      reason: '项目强锚点冲突，判断为不同项目',
      sharedAnchors,
      conflictingAnchors,
    }
  }

  const strongShared = sharedAnchors.filter(anchor => PROJECT_ANCHOR_STRONG_TYPES.includes(anchor.type))
  if (strongShared.length > 0) {
    return {
      isSame: true,
      score: Math.min(1, Math.max(...strongShared.map(anchor => anchor.weight))),
      reason: '项目强锚点一致',
      sharedAnchors,
      conflictingAnchors,
    }
  }

  const sharedRoadAnchors = sharedAnchors.filter(anchor => anchor.type === 'road')
  if (sharedRoadAnchors.length >= 2) {
    return {
      isSame: true,
      score: 0.9,
      reason: '道路起止点锚点一致',
      sharedAnchors,
      conflictingAnchors,
    }
  }

  if (sharedAnchors.length > 0) {
    return {
      isSame: null,
      score: 0.65,
      reason: '存在弱锚点重合，需继续算法判断',
      sharedAnchors,
      conflictingAnchors,
    }
  }

  return {
    isSame: null,
    score: 0,
    reason: '未发现可确定项目关系的锚点',
    sharedAnchors,
    conflictingAnchors,
  }
}

function findConflictingProjectAnchors(anchors1: ProjectAnchor[], anchors2: ProjectAnchor[]): ProjectAnchor[] {
  const conflicts: ProjectAnchor[] = []
  for (const type of PROJECT_ANCHOR_STRONG_TYPES) {
    const values1 = anchors1.filter(anchor => anchor.type === type).map(anchor => anchor.value)
    const values2 = anchors2.filter(anchor => anchor.type === type).map(anchor => anchor.value)
    if (values1.length === 0 || values2.length === 0) continue
    if (values1.some(value => values2.includes(value))) continue
    for (const value of [...values1, ...values2].sort()) {
      appendAnchor(conflicts, new Set(conflicts.map(anchor => `${anchor.type}:${anchor.value}`)), {
        type,
        value,
        weight: 1,
      })
    }
  }
  return conflicts
}

function extractRoadSegments(text: string): string[] {
  const segments: string[] = []
  let start = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char && /[-/、,，至到]/.test(char)) {
      start = index + 1
      continue
    }
    if (!char || !/[路街巷]/.test(char)) continue
    const value = compactProjectName(text.slice(start, index + 1))
    start = index + 1
    if (isWeakProjectEntity(value)) continue
    if (value.length >= 3 && value.length <= 10) {
      segments.push(value)
    }
  }
  return segments
}

function normalizeLandParcelAnchor(value: string): string {
  const marker = '政储出'
  const markerIndex = value.indexOf(marker)
  if (markerIndex <= 0) return value
  const prefix = value
    .slice(0, markerIndex)
    .replace(/^(关于|对|同意|核准|批复)+/, '')
    .slice(-3)
  return `${prefix}${value.slice(markerIndex)}`
}

function isWeakProjectEntity(value: string): boolean {
  if (!value) return true
  if (/^[一-鿿A-Z0-9]{0,1}[路街巷河港桥]$/.test(value)) return true
  return ['道路', '地块', '学校', '医院', '公园', '桥梁'].includes(value)
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
    isProjectAnchor?: boolean
    sharedAnchors?: ProjectAnchor[]
    conflictingAnchors?: ProjectAnchor[]
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

  // 3. 项目名称结构化锚点规则
  const projectAnchorMatch = compareProjectAnchors(text1, text2)
  if (projectAnchorMatch.isSame !== null) {
    result.features.isProjectAnchor = true
    result.features.sharedAnchors = projectAnchorMatch.sharedAnchors
    result.features.conflictingAnchors = projectAnchorMatch.conflictingAnchors
    result.definitive = {
      isSame: projectAnchorMatch.isSame,
      score: projectAnchorMatch.score,
      reason: projectAnchorMatch.reason,
    }
    return result
  }
  if (projectAnchorMatch.sharedAnchors.length > 0 || projectAnchorMatch.conflictingAnchors.length > 0) {
    result.features.sharedAnchors = projectAnchorMatch.sharedAnchors
    result.features.conflictingAnchors = projectAnchorMatch.conflictingAnchors
  }

  // 4. 版本号标准化
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

  // 5. 移除附属词语
  if (options.noiseWordAggressiveness) {
    result.processed1 = removeNoiseWords(result.processed1, options.noiseWordAggressiveness)
    result.processed2 = removeNoiseWords(result.processed2, options.noiseWordAggressiveness)
  }

  return result
}
