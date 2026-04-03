import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { buildCsvRows } from '../../../core/io/csv'
import { parseJson, serializeJson } from '../../../core/io/json'
import type { BatchResult, MatchResult } from '../../../utils/similarity'
import { splitExcelLines } from '../../../utils/textParser'
import { createSimilarityService, type LockedItem } from '../service/similarityService'

type JoinMode = 'left' | 'right' | 'inner' | 'outer'

const STORAGE_KEY = 'premium_similarity_app_cache_v2'

function getTimestamp() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  return `${year}${month}${day}_${hours}${minutes}${seconds}`
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

export function useSimilarityWorkspace() {
  const service = createSimilarityService()

  const isProcessing = ref(false)
  const progress = ref(0)
  const joinMode = ref<JoinMode>('left')

  const sourceText = ref('')
  const targetText = ref('')
  const synonymText = ref('阿里巴巴集团, 阿里\n腾讯控股有限公司, 腾讯')
  const ignoreText = ref('有限公司, 股份有限公司, 科技, 信息')

  const options = ref({
    threshold: 70,
    ignorePunctuation: true,
    fullwidthToHalfwidth: true,
    ignoreInvisibleChars: true,
    weights: { edit: 0.6, jaro: 0.4 },
  })

  const results = ref<BatchResult[]>([])
  const selectedAlgorithm = ref<'hybrid' | 'edit' | 'jaro'>('edit')
  const editWeight = ref(60)
  const jaroWeight = computed(() => 100 - editWeight.value)
  const lockedItems = ref<Map<string, LockedItem>>(new Map())
  const importJsonRef = ref<HTMLInputElement | null>(null)
  const importRef = ref<HTMLInputElement | null>(null)

  const filterOptions = ref({
    lockStatus: 'all' as 'all' | 'locked' | 'unlocked',
    matchStatus: 'all' as 'all' | 'matched' | 'unmatched',
    searchQuery: '',
    isRegexSearch: false,
  })

  const sourceCount = computed(() => splitExcelLines(sourceText.value).filter((line) => line.trim()).length)
  const targetCount = computed(() => splitExcelLines(targetText.value).filter((line) => line.trim()).length)
  const targetList = computed(() => splitExcelLines(targetText.value).map((value) => value.trim()).filter(Boolean))

  const getLockedItem = (item: BatchResult): { text: string; similarity: number } | undefined => {
    if (joinMode.value === 'right') {
      for (const [source, match] of lockedItems.value.entries()) {
        if (match.text === item.source) {
          return { text: source, similarity: match.similarity }
        }
      }
      return undefined
    }

    const locked = lockedItems.value.get(item.source)
    return locked ? { text: locked.text, similarity: locked.similarity } : undefined
  }

  const isLocked = (item: BatchResult) => {
    if (joinMode.value === 'right') {
      for (const [, match] of lockedItems.value.entries()) {
        if (match.text === item.source) return true
      }
      return false
    }
    return lockedItems.value.has(item.source)
  }

  const displayResults = computed(() =>
    service.buildDisplayResults({
      results: results.value,
      thresholdPercent: options.value.threshold,
      joinMode: joinMode.value,
      targetList: targetList.value,
      lockedItems: lockedItems.value,
      filterOptions: filterOptions.value,
    }),
  )

  const loadSample = () => {
    sourceText.value = [
      '浙江阿里巴巴云计算有限公司',
      '深圳市腾讯计算机系统有限公司',
      '北京百度网讯科技有限公司',
      '北京字节跳动科技有限公司',
      '北京京东世纪贸易有限公司',
      '小米科技有限责任公司',
      '华为技术有限公司',
      '网易（杭州）网络有限公司',
    ].join('\n')
    targetText.value = [
      '阿里巴巴云计算',
      '腾讯计算机系统',
      '百度网讯科技',
      '字节跳动科技',
      '京东世纪贸易',
      '小米科技',
      '华为技术',
      '网易网络',
    ].join('\n')
    synonymText.value = '阿里巴巴, 阿里\n腾讯, Tencent\n字节跳动, ByteDance\n京东, JD'
    ignoreText.value = '有限公司, 股份有限公司, 有限责任公司, 集团, 分公司, 总部'
    ElMessage.success('已加载高相似度行业示例')
  }

  const startComparison = async () => {
    const sourceList = splitExcelLines(sourceText.value).map((value) => value.trim()).filter(Boolean)
    if (sourceList.length === 0 || targetList.value.length === 0) {
      ElMessage.warning('请先输入源文本和目标文本')
      return
    }

    isProcessing.value = true
    progress.value = 0
    results.value = []

    setTimeout(() => {
      try {
        results.value = service.compare({
          sourceList,
          targetList: targetList.value,
          options: options.value,
          selectedAlgorithm: selectedAlgorithm.value,
          editWeight: editWeight.value,
          synonymText: synonymText.value,
          ignoreText: ignoreText.value,
          onProgress: (current, total) => {
            progress.value = (current / total) * 100
          },
        })
        ElMessage.success('比对完成')
      } catch (error) {
        console.error(error)
        ElMessage.error('比对出错')
      } finally {
        isProcessing.value = false
      }
    }, 100)
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.9) return 'success'
    if (score >= 0.7) return 'warning'
    return 'info'
  }

  const renderDiffHTML = (source: string, match: string) => service.renderDiffHTML(source, match)

  const lockMatch = (item: BatchResult, match: MatchResult) => {
    if (joinMode.value === 'right') {
      lockedItems.value.set(match.text, {
        matchIndex: item.index,
        text: item.source,
        similarity: match.similarity,
      })
    } else {
      lockedItems.value.set(item.source, {
        matchIndex: match.index,
        text: match.text,
        similarity: match.similarity,
      })
    }
    saveState()
    ElMessage.success('匹配项已锁定')
  }

  const unlockMatch = (item: BatchResult) => {
    if (joinMode.value === 'right') {
      for (const [source, match] of lockedItems.value.entries()) {
        if (match.text === item.source) {
          lockedItems.value.delete(source)
          break
        }
      }
    } else {
      lockedItems.value.delete(item.source)
    }
    saveState()
    ElMessage.info('已解除锁定')
  }

  const saveState = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sourceText: sourceText.value,
        targetText: targetText.value,
        synonymText: synonymText.value,
        ignoreText: ignoreText.value,
        options: options.value,
        selectedAlgorithm: selectedAlgorithm.value,
        editWeight: editWeight.value,
        joinMode: joinMode.value,
        lockedItems: Array.from(lockedItems.value.entries()),
      }),
    )
  }

  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return false
      const data = JSON.parse(saved)
      sourceText.value = data.sourceText || ''
      targetText.value = data.targetText || ''
      synonymText.value = data.synonymText || ''
      ignoreText.value = data.ignoreText || ''
      if (data.options) options.value = { ...options.value, ...data.options }
      selectedAlgorithm.value = data.selectedAlgorithm || 'edit'
      editWeight.value = data.editWeight || 60
      joinMode.value = data.joinMode || 'left'
      if (data.lockedItems) lockedItems.value = new Map(data.lockedItems)
      return true
    } catch (error) {
      console.error('Failed to load state', error)
      return false
    }
  }

  const resetAll = () => {
    ElMessageBox.confirm('这将清除所有输入内容和已锁定的配对，确定吗？', '系统提醒', {
      confirmButtonText: '确定重置',
      cancelButtonText: '取消',
      type: 'warning',
      roundButton: true,
    }).then(() => {
      localStorage.removeItem(STORAGE_KEY)
      location.reload()
    })
  }

  const exportStateJson = () => {
    const content = serializeJson({
      sourceText: sourceText.value,
      targetText: targetText.value,
      synonymText: synonymText.value,
      ignoreText: ignoreText.value,
      options: options.value,
      selectedAlgorithm: selectedAlgorithm.value,
      editWeight: editWeight.value,
      joinMode: joinMode.value,
      lockedItems: Array.from(lockedItems.value.entries()),
      results: results.value,
    })

    downloadContent(content, `Similarity_Workspace_${getTimestamp()}.json`, 'application/json;charset=utf-8')
    ElMessage.success('工作区导出成功')
  }

  const triggerImportJson = () => importJsonRef.value?.click()

  const handleImportJson = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      if (!loadEvent.target) return
      try {
        const data = parseJson<Record<string, unknown>>(loadEvent.target.result as string)
        sourceText.value = typeof data.sourceText === 'string' ? data.sourceText : ''
        targetText.value = typeof data.targetText === 'string' ? data.targetText : ''
        synonymText.value = typeof data.synonymText === 'string' ? data.synonymText : ''
        ignoreText.value = typeof data.ignoreText === 'string' ? data.ignoreText : ''
        if (data.options && typeof data.options === 'object') {
          options.value = { ...options.value, ...(data.options as typeof options.value) }
        }
        selectedAlgorithm.value =
          data.selectedAlgorithm === 'hybrid' || data.selectedAlgorithm === 'jaro' ? data.selectedAlgorithm : 'edit'
        editWeight.value = typeof data.editWeight === 'number' ? data.editWeight : 60
        joinMode.value =
          data.joinMode === 'right' || data.joinMode === 'inner' || data.joinMode === 'outer' ? data.joinMode : 'left'
        if (Array.isArray(data.lockedItems)) {
          lockedItems.value = new Map(data.lockedItems as Array<[string, LockedItem]>)
        }
        if (Array.isArray(data.results)) {
          results.value = data.results as BatchResult[]
        }
        saveState()
        ElMessage.success('成功还原工作区状态')
        target.value = ''
      } catch (error) {
        ElMessage.error('导入失败，请检查 JSON 格式')
        console.error(error)
      }
    }
    reader.readAsText(file)
  }

  const exportSimple = () => {
    if (lockedItems.value.size === 0) {
      ElMessage.warning('暂无锁定项可导出')
      return
    }

    const rows = displayResults.value.flatMap((row) => {
      const locked = getLockedItem(row)
      if (!locked) return []
      return [[joinMode.value, row.source, locked.text, `${(locked.similarity * 100).toFixed(2)}%`, '已锁定']]
    })

    downloadContent(
      buildCsvRows([['模式', '基准文本(视图)', '锁定配对', '相似度', '状态'], ...rows]),
      `简单导出_${joinMode.value}_${getTimestamp()}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  const exportComplex = () => {
    if (displayResults.value.length === 0) {
      ElMessage.warning('暂无结果可导出')
      return
    }

    const maxMatches = 5
    const header = ['源项', '锁定匹配', '锁定相似度']
    for (let index = 1; index <= maxMatches; index++) {
      header.push(`第${index}相似值`, `第${index}相似度`)
    }

    const rows = displayResults.value.map((row) => {
      const locked = getLockedItem(row)
      const values = [row.source, locked?.text ?? '', locked ? `${(locked.similarity * 100).toFixed(2)}%` : '']

      for (let index = 0; index < maxMatches; index++) {
        values.push(row.matches[index]?.text ?? '')
        values.push(row.matches[index] ? `${(row.matches[index]!.similarity * 100).toFixed(2)}%` : '')
      }

      return values
    })

    downloadContent(
      buildCsvRows([header, ...rows]),
      `全量报表_${joinMode.value}_${getTimestamp()}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  const triggerImport = () => importRef.value?.click()

  const handleImport = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      if (!loadEvent.target) return
      try {
        const lines = String(loadEvent.target.result).split('\n')
        if (lines.length < 2) throw new Error('File is empty or invalid')

        let importCount = 0
        for (let index = 1; index < lines.length; index++) {
          const line = lines[index]?.trim()
          if (!line) continue

          const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
          if (!parts || parts.length < 2) continue

          const source = parts[0]!.replace(/^"|"$/g, '').trim()
          const match = parts[1]!.replace(/^"|"$/g, '').trim()
          const similarity = parts[2] ? parseFloat(parts[2].replace(/[%"\s]/g, '')) / 100 : 1

          if (source && match) {
            lockedItems.value.set(source, {
              matchIndex: -1,
              text: match,
              similarity,
            })
            importCount++
          }
        }

        saveState()
        ElMessage.success(`成功导入 ${importCount} 条锁定配对`)
        target.value = ''
      } catch (error) {
        ElMessage.error('导入失败，请检查 CSV 格式')
        console.error(error)
      }
    }
    reader.readAsText(file)
  }

  watch(
    results,
    (value) => {
      if (value.length > 0) {
        service.autoLockPerfectMatches(value, lockedItems.value)
        saveState()
      }
    },
    { deep: true },
  )

  watch([sourceText, targetText, synonymText, ignoreText, options, selectedAlgorithm, editWeight, joinMode], saveState, {
    deep: true,
  })

  onMounted(() => {
    if (loadState()) {
      ElNotification({
        title: '工作现场已恢复',
        message: '系统为您自动加载了上次的配置和锁定。',
        type: 'success',
        position: 'bottom-right',
      })
    }
  })

  return {
    displayResults,
    editWeight,
    exportComplex,
    exportSimple,
    exportStateJson,
    filterOptions,
    getLockedItem,
    getScoreColor,
    handleImport,
    handleImportJson,
    ignoreText,
    importJsonRef,
    importRef,
    isLocked,
    isProcessing,
    jaroWeight,
    joinMode,
    loadSample,
    lockMatch,
    lockedItems,
    options,
    progress,
    renderDiffHTML,
    resetAll,
    results,
    selectedAlgorithm,
    sourceCount,
    sourceText,
    startComparison,
    synonymText,
    targetCount,
    targetText,
    triggerImport,
    triggerImportJson,
    unlockMatch,
  }
}
