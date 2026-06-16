import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildCsvRows } from '../../../core/io/csv'
import type { DiffAlgorithm } from '../../../utils/similarity'
import { SimilarityCalculator } from '../../../utils/similarity'
import { splitExcelLines } from '../../../utils/textParser'
import { createDiffService, type DiffRowResult } from '../service/diffService'

const STORAGE_KEY = 'premium_diff_tool_v1'

type CompareMode = 'line' | 'match'
type MatchFilter = 'all' | 'exact' | 'high' | 'low'

function getTimestamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}`
}

function downloadContent(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function useDiffWorkspace() {
  const service = createDiffService()

  const isProcessing = ref(false)
  const textA = ref('')
  const textB = ref('')
  const ignoreCase = ref(false)
  const ignoreSpace = ref(false)
  const diffAlgorithm = ref<DiffAlgorithm>('lcs')
  const compareMode = ref<CompareMode>('line')
  const matchFilter = ref<MatchFilter>('all')
  const customThreshold = ref(0.8)
  const results = ref<DiffRowResult[]>([])
  const allMatchResults = ref<DiffRowResult[]>([]) // 存储未过滤的完整结果

  const listACount = computed(() => splitExcelLines(textA.value).length)
  const listBCount = computed(() => splitExcelLines(textB.value).length)

  const applyMatchFilter = (allResults: DiffRowResult[]): DiffRowResult[] => {
    if (compareMode.value !== 'match' || matchFilter.value === 'all') {
      return allResults
    }

    switch (matchFilter.value) {
      case 'exact':
        // 仅显示完全匹配 (相似度 = 1.0)
        return allResults.filter(row => row.sim === 1.0)
      case 'high':
        // 仅显示高相似度 (相似度 >= 自定义阈值)
        return allResults.filter(row => row.sim >= customThreshold.value)
      case 'low':
        // 仅显示低相似度 (相似度 < 自定义阈值)
        return allResults.filter(row => row.sim < customThreshold.value)
      default:
        return allResults
    }
  }

  const loadSample = () => {
    textA.value = [
      'function calculateTotal(price, tax) {',
      '  return price + tax;',
      '}',
      'const user_id = 12345;',
      'Hello World!',
    ].join('\n')
    textB.value = [
      'function calculateTotal(price, taxRate) {',
      '  return price * (1 + taxRate);',
      '}',
      'const userId = 123456;',
      'Hello world!',
    ].join('\n')
  }

  const clearData = () => {
    textA.value = ''
    textB.value = ''
    results.value = []
  }

  const runDiff = () => {
    const maxLength = Math.max(listACount.value, listBCount.value)
    if (maxLength === 0 || (textA.value.trim() === '' && textB.value.trim() === '')) {
      ElMessage.warning('请输入要对比的数据')
      return
    }

    isProcessing.value = true
    results.value = []

    setTimeout(() => {
      if (compareMode.value === 'line') {
        // 逐行对比
        results.value = service.compareRows({
          textA: textA.value,
          textB: textB.value,
          ignoreCase: ignoreCase.value,
          ignoreSpace: ignoreSpace.value,
          algorithm: diffAlgorithm.value,
        })
        allMatchResults.value = []
      } else {
        // 最佳匹配对比
        allMatchResults.value = runBestMatch()
        results.value = applyMatchFilter(allMatchResults.value)
      }
      isProcessing.value = false
      saveState()
    }, 50)
  }

  const runBestMatch = (): DiffRowResult[] => {
    const listA = splitExcelLines(textA.value)
    const listB = splitExcelLines(textB.value)

    if (listA.length === 0 || listB.length === 0) {
      return []
    }

    // 创建相似度计算器
    const calculator = new SimilarityCalculator()

    // 计算所有可能的相似度
    const similarities: { aIdx: number; bIdx: number; sim: number }[] = []
    for (let i = 0; i < listA.length; i++) {
      for (let j = 0; j < listB.length; j++) {
        let a = listA[i]!
        let b = listB[j]!

        if (ignoreCase.value) {
          a = a.toLowerCase()
          b = b.toLowerCase()
        }
        if (ignoreSpace.value) {
          a = a.replace(/\s+/g, '')
          b = b.replace(/\s+/g, '')
        }

        const sim = calculator.calculateSimilarity(a, b, { weights: { edit: 0.5, jaro: 0.5 } })
        similarities.push({ aIdx: i, bIdx: j, sim })
      }
    }

    // 按相似度降序排序
    similarities.sort((a, b) => b.sim - a.sim)

    // 贪心匹配：选择最高相似度的配对
    const usedA = new Set<number>()
    const usedB = new Set<number>()
    const matches: { aIdx: number; bIdx: number; sim: number }[] = []

    for (const match of similarities) {
      if (!usedA.has(match.aIdx) && !usedB.has(match.bIdx)) {
        matches.push(match)
        usedA.add(match.aIdx)
        usedB.add(match.bIdx)
      }
    }

    // 按 A 的索引排序
    matches.sort((a, b) => a.aIdx - b.aIdx)

    // 生成 diff 结果
    const diffResults: DiffRowResult[] = []

    for (const match of matches) {
      const a = listA[match.aIdx]!
      const b = listB[match.bIdx]!

      const diffResult = service.compareRows({
        textA: a,
        textB: b,
        ignoreCase: ignoreCase.value,
        ignoreSpace: ignoreSpace.value,
        algorithm: diffAlgorithm.value,
      })

      if (diffResult.length > 0) {
        const row = diffResult[0]!
        // 添加原始行号
        row.originalLineB = match.bIdx + 1
        diffResults.push(row)
      }
    }

    // 添加未匹配的 A 项
    for (let i = 0; i < listA.length; i++) {
      if (!usedA.has(i)) {
        const diffResult = service.compareRows({
          textA: listA[i]!,
          textB: '',
          ignoreCase: ignoreCase.value,
          ignoreSpace: ignoreSpace.value,
          algorithm: diffAlgorithm.value,
        })
        if (diffResult.length > 0) {
          const row = diffResult[0]!
          row.originalLineB = undefined
          diffResults.push(row)
        }
      }
    }

    return diffResults
  }

  const renderDiffALeft = (diff: DiffRowResult['diff']) => service.renderDiffALeft(diff)
  const renderDiffBRight = (diff: DiffRowResult['diff']) => service.renderDiffBRight(diff)
  const getSimColorClass = (sim: number) => service.getSimColorClass(sim)

  const exportDiff = () => {
    if (results.value.length === 0) return

    const headers = compareMode.value === 'match'
      ? ['行号', '原行号(B)', '数据A', '数据B', '相似度', '差异详情']
      : ['行号', '数据A', '数据B', '相似度', '差异详情']

    const rows = results.value.map((row, index) => {
      const baseData = [
        String(index + 1),
      ]

      if (compareMode.value === 'match') {
        baseData.push((row as any).originalLineB !== undefined ? String((row as any).originalLineB) : '-')
      }

      baseData.push(
        row.a,
        row.b,
        `${(row.sim * 100).toFixed(2)}%`,
        row.diff
          .map((part) => {
            if (part.type === 'added') return `[+${part.char}]`
            if (part.type === 'removed') return `[-${part.char}]`
            return part.char
          })
          .join(''),
      )

      return baseData
    })

    downloadContent(
      buildCsvRows([headers, ...rows]),
      `Diff对比报告_${compareMode.value === 'match' ? '最佳匹配' : '逐行'}_${getTimestamp()}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  const saveState = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        textA: textA.value,
        textB: textB.value,
        ignoreCase: ignoreCase.value,
        ignoreSpace: ignoreSpace.value,
        diffAlgorithm: diffAlgorithm.value,
        compareMode: compareMode.value,
        matchFilter: matchFilter.value,
        customThreshold: customThreshold.value,
      }),
    )
  }

  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const data = JSON.parse(stored)
      textA.value = data.textA || ''
      textB.value = data.textB || ''
      ignoreCase.value = data.ignoreCase ?? false
      ignoreSpace.value = data.ignoreSpace ?? false
      diffAlgorithm.value = data.diffAlgorithm || 'lcs'
      compareMode.value = data.compareMode || 'line'
      matchFilter.value = data.matchFilter || 'all'
      customThreshold.value = data.customThreshold ?? 0.8
      if (textA.value || textB.value) runDiff()
    } catch {
      // ignore malformed local state
    }
  })

  watch([textA, textB, ignoreCase, ignoreSpace, diffAlgorithm, compareMode, matchFilter, customThreshold], () => {
    saveState()
    // 当过滤条件变化时，重新应用过滤
    if (compareMode.value === 'match' && allMatchResults.value.length > 0) {
      results.value = applyMatchFilter(allMatchResults.value)
    }
  })

  return {
    clearData,
    compareMode,
    customThreshold,
    diffAlgorithm,
    exportDiff,
    getSimColorClass,
    ignoreCase,
    ignoreSpace,
    isProcessing,
    listACount,
    listBCount,
    loadSample,
    matchFilter,
    renderDiffALeft,
    renderDiffBRight,
    results,
    runDiff,
    textA,
    textB,
  }
}
