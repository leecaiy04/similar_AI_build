import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildCsvRows } from '../../../core/io/csv'
import type { DiffAlgorithm } from '../../../utils/similarity'
import { splitExcelLines } from '../../../utils/textParser'
import { createDiffService, type DiffRowResult } from '../service/diffService'

const STORAGE_KEY = 'premium_diff_tool_v1'

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
  const results = ref<DiffRowResult[]>([])

  const listACount = computed(() => splitExcelLines(textA.value).length)
  const listBCount = computed(() => splitExcelLines(textB.value).length)

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
      results.value = service.compareRows({
        textA: textA.value,
        textB: textB.value,
        ignoreCase: ignoreCase.value,
        ignoreSpace: ignoreSpace.value,
        algorithm: diffAlgorithm.value,
      })
      isProcessing.value = false
      saveState()
    }, 50)
  }

  const renderDiffALeft = (diff: DiffRowResult['diff']) => service.renderDiffALeft(diff)
  const renderDiffBRight = (diff: DiffRowResult['diff']) => service.renderDiffBRight(diff)
  const getSimColorClass = (sim: number) => service.getSimColorClass(sim)

  const exportDiff = () => {
    if (results.value.length === 0) return

    const rows = results.value.map((row, index) => [
      String(index + 1),
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
    ])

    downloadContent(
      buildCsvRows([['行号', '数据A', '数据B', '相似度', '差异详情'], ...rows]),
      `Diff对比报告_${getTimestamp()}.csv`,
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
      if (textA.value || textB.value) runDiff()
    } catch {
      // ignore malformed local state
    }
  })

  watch([textA, textB, ignoreCase, ignoreSpace, diffAlgorithm], saveState)

  return {
    clearData,
    diffAlgorithm,
    exportDiff,
    getSimColorClass,
    ignoreCase,
    ignoreSpace,
    isProcessing,
    listACount,
    listBCount,
    loadSample,
    renderDiffALeft,
    renderDiffBRight,
    results,
    runDiff,
    textA,
    textB,
  }
}
