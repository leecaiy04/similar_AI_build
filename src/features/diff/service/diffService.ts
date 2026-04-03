import { SimilarityCalculator, type DifferenceItem, type DiffAlgorithm } from '../../../utils/similarity'
import { splitExcelLines } from '../../../utils/textParser'

export interface DiffRowResult {
  a: string
  b: string
  diff: DifferenceItem[]
  sim: number
}

export interface DiffCompareInput {
  textA: string
  textB: string
  ignoreCase: boolean
  ignoreSpace: boolean
  algorithm: DiffAlgorithm
}

interface DiffCalculatorLike {
  calculateCharDiff: SimilarityCalculator['calculateCharDiff']
}

function escapeHTML(value: string) {
  return value.replace(/[&<>'"]/g, (tag) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[tag] as string))
}

export function createDiffService(calculator: DiffCalculatorLike = new SimilarityCalculator()) {
  return {
    compareRows(input: DiffCompareInput): DiffRowResult[] {
      const listA = splitExcelLines(input.textA)
      const listB = splitExcelLines(input.textB)
      const maxLength = Math.max(listA.length, listB.length)
      const results: DiffRowResult[] = []

      for (let index = 0; index < maxLength; index++) {
        const rawA = listA[index] ?? ''
        const rawB = listB[index] ?? ''

        let compareA = rawA
        let compareB = rawB

        if (input.ignoreCase) {
          compareA = compareA.toLowerCase()
          compareB = compareB.toLowerCase()
        }

        if (input.ignoreSpace) {
          compareA = compareA.replace(/\s+/g, '')
          compareB = compareB.replace(/\s+/g, '')
        }

        const diffResult = calculator.calculateCharDiff(compareB, compareA, input.algorithm)

        results.push({
          a: input.ignoreCase || input.ignoreSpace ? compareA : rawA,
          b: input.ignoreCase || input.ignoreSpace ? compareB : rawB,
          diff: diffResult.diff,
          sim: diffResult.similarity,
        })
      }

      return results
    },
    renderDiffALeft(diff: DifferenceItem[]) {
      return diff
        .filter((part) => part.type === 'unchanged' || part.type === 'added')
        .map((part) => {
          if (part.type === 'added') {
            return `<span class="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-0.5 rounded font-bold underline decoration-green-500">${escapeHTML(part.char)}</span>`
          }
          return `<span class="text-gray-600 dark:text-gray-400">${escapeHTML(part.char)}</span>`
        })
        .join('')
    },
    renderDiffBRight(diff: DifferenceItem[]) {
      return diff
        .filter((part) => part.type === 'unchanged' || part.type === 'removed')
        .map((part) => {
          if (part.type === 'removed') {
            return `<span class="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-0.5 rounded font-bold line-through decoration-red-500">${escapeHTML(part.char)}</span>`
          }
          return `<span class="text-gray-600 dark:text-gray-400">${escapeHTML(part.char)}</span>`
        })
        .join('')
    },
    getSimColorClass(sim: number) {
      if (sim === 1) return 'text-green-600 dark:text-green-400'
      if (sim >= 0.8) return 'text-blue-600 dark:text-blue-400'
      if (sim >= 0.5) return 'text-yellow-600 dark:text-yellow-500'
      return 'text-red-500'
    },
  }
}
