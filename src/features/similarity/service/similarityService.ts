import { SimilarityCalculator, type BatchResult, type JoinMode, type MatchResult, type SimilarityOptions } from '../../../utils/similarity'

export interface LockedItem {
  matchIndex: number
  text: string
  similarity: number
}

export interface SimilarityFilterOptions {
  lockStatus: 'all' | 'locked' | 'unlocked'
  matchStatus: 'all' | 'matched' | 'unmatched'
  searchQuery: string
  isRegexSearch: boolean
}

export interface SimilarityCompareInput {
  sourceList: string[]
  targetList: string[]
  options: SimilarityOptions
  selectedAlgorithm: 'hybrid' | 'edit' | 'jaro'
  editWeight: number
  synonymText: string
  ignoreText: string
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

      return calculator.batchCalculate(
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
              matches.push({ text: result.source, similarity: match.similarity, index: result.index })
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
