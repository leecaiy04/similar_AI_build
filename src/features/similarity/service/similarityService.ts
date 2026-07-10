import { SimilarityCalculator, type BatchResult, type JoinMode, type LockRecommendation, type MatchResult, type SimilarityOptions } from '../../../utils/similarity'
import { calculateEnhancedSimilarity } from '../../../utils/enhancedSimilarityService'
import type { AdvancedSimilarityOptions } from '../../../utils/advancedSimilarity'

export interface LockedItem {
  matchIndex: number
  text: string
  similarity: number
  note?: string
}

export interface SimilarityFilterOptions {
  lockStatus: 'all' | 'locked' | 'unlocked'
  matchStatus: 'all' | 'matched' | 'unmatched'
  searchQuery: string
  isRegexSearch: boolean
  hideSubThreshold: boolean
}

export interface PreprocessCompareOptions {
  enabled: boolean
  enableVersionNormalization: boolean
  enableLandParcelRule: boolean
  enableRoadSectionRule: boolean
  noiseWordAggressiveness: 'low' | 'medium' | 'high'
}

export interface SimilarityCompareInput {
  sourceList: string[]
  targetList: string[]
  options: SimilarityOptions
  selectedAlgorithm: 'hybrid' | 'edit' | 'jaro'
  editWeight: number
  synonymText: string
  ignoreText: string
  preprocessOptions?: PreprocessCompareOptions
  onProgress?: (current: number, total: number, source: string) => void
}

export interface BuildDisplayResultsInput {
  results: BatchResult[]
  thresholdPercent: number
  joinMode: JoinMode
  targetList: string[]
  lockedItems: Map<string, LockedItem>
  filterOptions: SimilarityFilterOptions
}

function buildWeights(selectedAlgorithm: SimilarityCompareInput['selectedAlgorithm'], editWeight: number) {
  if (selectedAlgorithm === 'edit') return { edit: 1, jaro: 0 }
  if (selectedAlgorithm === 'jaro') return { edit: 0, jaro: 1 }
  return { edit: editWeight / 100, jaro: (100 - editWeight) / 100 }
}

function normalizeThresholdRatio(threshold?: number) {
  if (typeof threshold !== 'number' || Number.isNaN(threshold)) return 0.7
  if (threshold > 1) return Math.min(1, threshold / 100)
  return Math.max(0, threshold)
}

function formatAnchorValues(anchors?: MatchResult['anchors']) {
  return (anchors || []).map((anchor) => anchor.value).filter(Boolean).join('、')
}

function buildLockRecommendation(input: {
  similarity: number
  thresholdRatio: number
  isDefinitive?: boolean
  ruleType?: MatchResult['ruleType']
  reason?: string
  anchors?: MatchResult['anchors']
  conflictingAnchors?: MatchResult['conflictingAnchors']
}): LockRecommendation {
  const conflictSummary = formatAnchorValues(input.conflictingAnchors)
  if ((input.conflictingAnchors?.length || 0) > 0) {
    return {
      level: 'none',
      label: '不建议自动锁定',
      shouldSuggestLock: false,
      reason: conflictSummary ? `强锚点冲突：${conflictSummary}` : '强锚点冲突',
      priority: 0,
    }
  }

  if (input.isDefinitive && input.ruleType && input.ruleType !== 'projectAnchor' && input.similarity >= 0.9) {
    return {
      level: 'rule',
      label: '规则判定相同',
      shouldSuggestLock: true,
      reason: input.reason || '确定性规则判定为同一项目',
      priority: 3,
    }
  }

  if ((input.anchors?.length || 0) > 0 && input.similarity >= 0.85) {
    const anchorSummary = formatAnchorValues(input.anchors)
    return {
      level: 'anchor',
      label: '锚点大概率相同',
      shouldSuggestLock: true,
      reason: anchorSummary ? `命中强锚点：${anchorSummary}` : input.reason || '项目强锚点一致',
      priority: 2,
    }
  }

  if (input.similarity >= input.thresholdRatio) {
    return {
      level: 'threshold',
      label: '相似度达标',
      shouldSuggestLock: true,
      reason: `相似度 ${(input.similarity * 100).toFixed(1)}% 达到阈值 ${(input.thresholdRatio * 100).toFixed(0)}%`,
      priority: 1,
    }
  }

  return {
    level: 'none',
    label: '不建议自动锁定',
    shouldSuggestLock: false,
    reason: `相似度 ${(input.similarity * 100).toFixed(1)}% 低于阈值 ${(input.thresholdRatio * 100).toFixed(0)}%`,
    priority: 0,
  }
}

function isLocked(item: BatchResult, joinMode: JoinMode, lockedItems: Map<string, LockedItem>) {
  if (joinMode === 'right') {
    for (const [, match] of lockedItems.entries()) {
      if (match.text === item.source) return true
    }
    return false
  }
  return lockedItems.has(item.source)
}

function getLockedItem(item: BatchResult, joinMode: JoinMode, lockedItems: Map<string, LockedItem>) {
  if (joinMode === 'right') {
    for (const [source, match] of lockedItems.entries()) {
      if (match.text === item.source) {
        return { text: source, similarity: match.similarity }
      }
    }
    return undefined
  }

  const locked = lockedItems.get(item.source)
  return locked ? { text: locked.text, similarity: locked.similarity } : undefined
}

export function createSimilarityService(calculator = new SimilarityCalculator()) {
  return {
    compare(input: SimilarityCompareInput): BatchResult[] {
      calculator.setSynonymGroups(input.synonymText)
      calculator.setIgnoreTerms(input.ignoreText)
      const thresholdRatio = normalizeThresholdRatio(input.options.threshold)

      if (input.preprocessOptions?.enabled) {
        const weights = buildWeights(input.selectedAlgorithm, input.editWeight)
        const advancedOptions: AdvancedSimilarityOptions = {
          ...input.options,
          threshold: 0.01,
          weights,
          enableVersionNormalization: input.preprocessOptions.enableVersionNormalization,
          enableLandParcelRule: input.preprocessOptions.enableLandParcelRule,
          enableRoadSectionRule: input.preprocessOptions.enableRoadSectionRule,
          noiseWordAggressiveness: input.preprocessOptions.noiseWordAggressiveness,
          enableTokenSet: true,
          enableNgram: true,
        }

        return input.sourceList.map((source, sourceIndex) => {
          const matches = input.targetList
            .map((target, targetIndex) => {
              const enhanced = calculateEnhancedSimilarity(source, target, calculator, advancedOptions)
              const anchors = enhanced.preprocessing?.features.sharedAnchors
              const conflictingAnchors = enhanced.preprocessing?.features.conflictingAnchors
              const ruleType = enhanced.features.rule?.type
              return {
                text: target,
                similarity: enhanced.similarity,
                index: targetIndex,
                ruleType,
                reason: enhanced.reason,
                explanation: enhanced.explanation,
                anchors,
                conflictingAnchors,
                recommendation: buildLockRecommendation({
                  similarity: enhanced.similarity,
                  thresholdRatio,
                  isDefinitive: enhanced.isDefinitive,
                  ruleType,
                  reason: enhanced.reason,
                  anchors,
                  conflictingAnchors,
                }),
              }
            })
            .filter((match) => match.similarity >= 0.01)
            .sort((left, right) => right.similarity - left.similarity)
            .slice(0, 10)

          input.onProgress?.(sourceIndex + 1, input.sourceList.length, source)

          return {
            source,
            matches,
            index: sourceIndex,
          }
        })
      }

      const results = calculator.batchCalculate(
        input.sourceList,
        input.targetList,
        'left',
        {
          ...input.options,
          threshold: 0.01,
          weights: buildWeights(input.selectedAlgorithm, input.editWeight),
        },
        input.onProgress ?? null,
      )

      // 性能优化：每个源项只保留前10个最相似的匹配项
      return results.map((result) => ({
        ...result,
        matches: result.matches.slice(0, 10).map((match) => ({
          ...match,
          recommendation: buildLockRecommendation({
            similarity: match.similarity,
            thresholdRatio,
          }),
        })),
      }))
    },
    buildDisplayResults(input: BuildDisplayResultsInput): BatchResult[] {
      const threshold = input.thresholdPercent / 100

      const filtered = input.results.map((result) => ({
        ...result,
        matches: result.matches.filter((match) => match.similarity >= threshold),
      }))

      let baseResults: BatchResult[] = []

      if (input.joinMode === 'inner') {
        baseResults = filtered.filter((result) => {
          if (input.lockedItems.has(result.source)) return true
          return result.matches.length > 0
        })
      } else if (input.joinMode === 'right') {
        baseResults = input.targetList.map((target, index) => {
          const matches: MatchResult[] = []
          filtered.forEach((result) => {
            const match = result.matches.find((candidate) => candidate.text === target)
            if (match) {
              matches.push({ ...match, text: result.source, index: result.index })
            }
            const locked = input.lockedItems.get(result.source)
            if (locked && locked.text === target && !matches.find((candidate) => candidate.text === result.source)) {
              matches.push({ text: result.source, similarity: locked.similarity, index: result.index })
            }
          })
          matches.sort((left, right) => right.similarity - left.similarity)
          return { source: target, matches, index, isRight: true }
        })
      } else if (input.joinMode === 'outer') {
        const matchedTargets = new Set<string>()
        filtered.forEach((result) => {
          if (result.matches.length > 0) matchedTargets.add(result.matches[0]!.text)
          const locked = input.lockedItems.get(result.source)
          if (locked) matchedTargets.add(locked.text)
        })

        const unmatchedTargets = input.targetList
          .filter((target) => !matchedTargets.has(target))
          .map((target, index) => ({ source: target, matches: [], index: 10000 + index, isRight: true }))

        baseResults = [...filtered, ...unmatchedTargets]
      } else {
        baseResults = filtered
      }

      return baseResults.filter((item) => {
        // If hideSubThreshold is enabled, filter out items without matches AND without locked items
        if (input.filterOptions.hideSubThreshold) {
          const hasMatches = item.matches.length > 0
          const hasLocked = isLocked(item, input.joinMode, input.lockedItems)
          if (!hasMatches && !hasLocked) {
            return false
          }
        }

        if (input.filterOptions.lockStatus === 'locked' && !isLocked(item, input.joinMode, input.lockedItems)) {
          return false
        }

        if (input.filterOptions.lockStatus === 'unlocked' && isLocked(item, input.joinMode, input.lockedItems)) {
          return false
        }

        if (input.filterOptions.matchStatus === 'matched' && item.matches.length === 0) {
          return false
        }

        if (input.filterOptions.matchStatus === 'unmatched' && item.matches.length > 0) {
          return false
        }

        if (input.filterOptions.searchQuery) {
          const query = input.filterOptions.searchQuery
          let searchFn: (value: string) => boolean

          if (input.filterOptions.isRegexSearch) {
            try {
              const regex = new RegExp(query, 'i')
              searchFn = (value) => regex.test(value)
            } catch {
              searchFn = (value) => value.toLowerCase().includes(query.toLowerCase())
            }
          } else {
            searchFn = (value) => value.toLowerCase().includes(query.toLowerCase())
          }

          const sourceMatch = searchFn(item.source)
          const targetMatch = item.matches.some((match) => searchFn(match.text))
          const lockedText = getLockedItem(item, input.joinMode, input.lockedItems)?.text
          const lockedMatch = lockedText ? searchFn(lockedText) : false

          if (!sourceMatch && !targetMatch && !lockedMatch) {
            return false
          }
        }

        return true
      })
    },
    renderDiffHTML(source: string, match: string) {
      const diff = calculator.calculateCharDiff(match, source, 'lcs')
      return diff.diff
        .map((part) => {
          if (part.type === 'added') {
            return `<span class="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-0.5 rounded underline decoration-green-500">${part.char}</span>`
          }
          if (part.type === 'removed') {
            return `<span class="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-0.5 rounded line-through decoration-red-500">${part.char}</span>`
          }
          return `<span class="text-gray-700 dark:text-gray-300">${part.char}</span>`
        })
        .join('')
    },
    autoLockPerfectMatches(results: BatchResult[], lockedItems: Map<string, LockedItem>) {
      results.forEach((item) => {
        if (!lockedItems.has(item.source) && item.matches.length > 0 && item.matches[0]!.similarity >= 0.9999) {
          lockedItems.set(item.source, {
            matchIndex: item.matches[0]!.index,
            text: item.matches[0]!.text,
            similarity: item.matches[0]!.similarity,
          })
        }
      })
    },
  }
}
