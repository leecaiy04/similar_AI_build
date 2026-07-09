import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { buildCsvRows } from '../../../core/io/csv'
import { parseJson, serializeJson } from '../../../core/io/json'
import type { BatchResult, MatchResult } from '../../../utils/similarity'
import { splitExcelLines } from '../../../utils/textParser'
import { createSimilarityService, type LockedItem } from '../service/similarityService'
import { useSharedAIConfig } from '../../../composables/useSharedAIConfig'
import { createLlmInvoke } from '../../../infra/llm'

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
  const { config: aiConfig } = useSharedAIConfig()

  const isProcessing = ref(false)
  const progress = ref(0)
  const currentProcessingIndex = ref(0)
  const totalProcessingCount = ref(0)
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

  const isAIProcessing = ref(false)
  const aiSuggestions = ref<Map<string, { suggestion: string; confidence: string; reason: string; matchIndex: number; similarity: number }>>(new Map())
  const needsAIConfig = ref(false)

  const filterOptions = ref({
    lockStatus: 'all' as 'all' | 'locked' | 'unlocked',
    matchStatus: 'all' as 'all' | 'matched' | 'unmatched',
    searchQuery: '',
    isRegexSearch: false,
    hideSubThreshold: false,
  })

  const activeCollapse = ref<string[]>(['preprocess'])
  const preprocessEnabled = ref(true)
  const preprocessOptions = ref({
    enableVersionNormalization: false,
    enableLandParcelRule: true,
    enableRoadSectionRule: true,
    noiseWordAggressiveness: 'medium' as 'low' | 'medium' | 'high',
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

  const displayLockedCount = computed(() => {
    return displayResults.value.filter(r => isLocked(r)).length
  })

  const loadSample = () => {
    sourceText.value = [
      '关于杭政储出2026 33号地块住宅商业项目的批复',
      '双桥单元XH020104-22地块安置房项建',
      '云河环路云创路至云洪路道路工程可研',
      '西湖区三墩北单元幼儿园新建项目',
      '留下街道社区卫生服务中心迁建工程',
      '岳湖泵站出水管改造工程初步设计',
      'XH020104-21地块保障房政府投资计划',
      '龙坞茶镇九街提升改造项目',
    ].join('\n')
    targetText.value = [
      '杭政储出【2026】33号地块住宅兼商业商务项目',
      '双桥单元XH020104-22地块保障性住房项目',
      '云河环路（云创路-云洪路）道路工程',
      '三墩北单元幼儿园建设工程',
      '留下街道社区卫生服务中心迁建项目',
      '岳湖泵站出水管改造工程',
      '双桥单元XH020104-21地块保障性住房项目',
      '龙坞茶镇九街综合提升工程',
    ].join('\n')
    synonymText.value = '安置房, 保障性住房\n住宅商业, 住宅兼商业商务\n建设工程, 新建项目\n提升改造, 综合提升'
    ignoreText.value = '关于, 的批复, 批复, 批文, 项建, 可研, 初步设计, 政府投资计划'
    ElMessage.success('已加载投资项目审批示例')
  }

  const startComparison = async () => {
    const sourceList = splitExcelLines(sourceText.value).map((value) => value.trim()).filter(Boolean)

    if (sourceList.length === 0) {
      ElMessage.warning('请先输入源文本')
      return
    }

    // 自对比模式：如果目标列表为空，使用源列表作为目标列表
    const isSelfComparison = targetList.value.length === 0
    const actualTargetList = isSelfComparison ? sourceList : targetList.value

    if (isSelfComparison) {
      ElMessage.info('检测到自对比模式：将在源列表内寻找相似项')
    }

    isProcessing.value = true
    progress.value = 0
    currentProcessingIndex.value = 0
    totalProcessingCount.value = sourceList.length
    results.value = []

    setTimeout(() => {
      try {
        const rawResults = service.compare({
          sourceList,
          targetList: actualTargetList,
          options: options.value,
          selectedAlgorithm: selectedAlgorithm.value,
          editWeight: editWeight.value,
          synonymText: synonymText.value,
          ignoreText: ignoreText.value,
          preprocessOptions: {
            enabled: preprocessEnabled.value,
            ...preprocessOptions.value,
          },
          onProgress: (current, total) => {
            currentProcessingIndex.value = current
            totalProcessingCount.value = total
            progress.value = (current / total) * 100
          },
        })

        // 自对比模式：过滤掉每行与自身的匹配（相似度 = 1.0 且文本完全相同）
        if (isSelfComparison) {
          results.value = rawResults.map((result) => ({
            ...result,
            matches: result.matches.filter((match) =>
              !(match.similarity >= 0.9999 && match.text === result.source)
            ),
          }))
        } else {
          results.value = rawResults
        }

        ElMessage.success(isSelfComparison ? '自对比完成' : '比对完成')
      } catch (error) {
        console.error(error)
        ElMessage.error('比对出错')
      } finally {
        isProcessing.value = false
        currentProcessingIndex.value = 0
        totalProcessingCount.value = 0
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
        preprocessEnabled: preprocessEnabled.value,
        preprocessOptions: preprocessOptions.value,
        activeCollapse: activeCollapse.value,
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
      if (typeof data.preprocessEnabled === 'boolean') preprocessEnabled.value = data.preprocessEnabled
      if (data.preprocessOptions && typeof data.preprocessOptions === 'object') {
        preprocessOptions.value = {
          ...preprocessOptions.value,
          ...data.preprocessOptions,
          enableVersionNormalization: false,
        }
      }
      if (Array.isArray(data.activeCollapse)) activeCollapse.value = data.activeCollapse
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
      preprocessEnabled: preprocessEnabled.value,
      preprocessOptions: preprocessOptions.value,
      activeCollapse: activeCollapse.value,
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
        if (typeof data.preprocessEnabled === 'boolean') preprocessEnabled.value = data.preprocessEnabled
        if (data.preprocessOptions && typeof data.preprocessOptions === 'object') {
          preprocessOptions.value = {
            ...preprocessOptions.value,
            ...(data.preprocessOptions as typeof preprocessOptions.value),
            enableVersionNormalization: false,
          }
        }
        if (Array.isArray(data.activeCollapse)) activeCollapse.value = data.activeCollapse as string[]
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

  const exportSimple = async () => {
    if (lockedItems.value.size === 0) {
      ElMessage.warning('暂无锁定项可导出')
      return
    }

    const stats = getExportStats()
    const lockedCount = displayResults.value.filter(r => isLocked(r)).length

    // 弹窗确认
    try {
      await ElMessageBox.confirm(
        `比对 ${stats.totalRows} 行，匹配 ${stats.matchedRows} 行，当前展示 ${stats.displayedRows} 行

本次导出条件：${stats.filterDescription}
将导出：${lockedCount} 条锁定项

是否继续导出？`,
        '导出确认',
        {
          confirmButtonText: '确认导出',
          cancelButtonText: '取消',
          type: 'info',
          distinguishCancelAndClose: true,
        }
      )
    } catch {
      return // 用户取消
    }

    const rows = displayResults.value.flatMap((row) => {
      const locked = getLockedItem(row)
      if (!locked) return []
      const note = getNote(row)
      return [[joinMode.value, row.source, locked.text, `${(locked.similarity * 100).toFixed(2)}%`, '已锁定', note]]
    })

    downloadContent(
      buildCsvRows([['模式', '基准文本(视图)', '锁定配对', '相似度', '状态', '备注'], ...rows]),
      `简单导出_${joinMode.value}_${getTimestamp()}.csv`,
      'text/csv;charset=utf-8',
    )

    ElMessage.success(`已导出 ${rows.length} 条锁定项`)
  }

  const getFilterDescription = () => {
    const conditions: string[] = []

    if (filterOptions.value.lockStatus === 'locked') {
      conditions.push('仅已锁定')
    } else if (filterOptions.value.lockStatus === 'unlocked') {
      conditions.push('仅未锁定')
    }

    if (filterOptions.value.matchStatus === 'matched') {
      conditions.push('仅已匹配')
    } else if (filterOptions.value.matchStatus === 'unmatched') {
      conditions.push('仅未匹配')
    }

    if (filterOptions.value.hideSubThreshold) {
      conditions.push(`隐藏低于${options.value.threshold}%`)
    }

    if (filterOptions.value.searchQuery) {
      conditions.push(`搜索"${filterOptions.value.searchQuery}"${filterOptions.value.isRegexSearch ? '(正则)' : ''}`)
    }

    return conditions.length > 0 ? conditions.join('、') : '无筛选'
  }

  const getExportStats = () => {
    // 计算完整结果（不受筛选影响）
    const fullResults = service.buildDisplayResults({
      results: results.value,
      thresholdPercent: 0,
      joinMode: joinMode.value,
      targetList: targetList.value,
      lockedItems: lockedItems.value,
      filterOptions: {
        lockStatus: 'all',
        matchStatus: 'all',
        searchQuery: '',
        isRegexSearch: false,
        hideSubThreshold: false,
      },
    })

    const totalRows = results.value.length
    const matchedRows = fullResults.filter(r => r.matches.length > 0).length
    const displayedRows = displayResults.value.length

    return {
      totalRows,
      matchedRows,
      displayedRows,
      filterDescription: getFilterDescription(),
    }
  }

  const exportComplex = async () => {
    if (displayResults.value.length === 0) {
      ElMessage.warning('暂无结果可导出')
      return
    }

    const stats = getExportStats()

    // 弹窗确认
    try {
      await ElMessageBox.confirm(
        `比对 ${stats.totalRows} 行，匹配 ${stats.matchedRows} 行，当前展示 ${stats.displayedRows} 行

本次导出条件：${stats.filterDescription}
将导出：${stats.displayedRows} 行数据（含前10个匹配项）

是否继续导出？`,
        '导出确认',
        {
          confirmButtonText: '确认导出',
          cancelButtonText: '取消',
          type: 'info',
          distinguishCancelAndClose: true,
        }
      )
    } catch {
      return // 用户取消
    }

    const maxMatches = 10
    const header = ['源项', '是否锁定', '锁定匹配', '锁定相似度', '备注']
    for (let index = 1; index <= maxMatches; index++) {
      header.push(`第${index}相似值`, `第${index}相似度`)
    }

    const rows = displayResults.value.map((row) => {
      const locked = getLockedItem(row)
      const note = getNote(row)
      const lockStatus = isLocked(row) ? '是' : '否'
      const values = [row.source, lockStatus, locked?.text ?? '', locked ? `${(locked.similarity * 100).toFixed(2)}%` : '', note]

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

    ElMessage.success(`已导出 ${rows.length} 行数据`)
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
          const note = parts[5] ? parts[5].replace(/^"|"$/g, '').trim() : ''

          if (source && match) {
            lockedItems.value.set(source, {
              matchIndex: -1,
              text: match,
              similarity,
              note,
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

  const copyToClipboard = async () => {
    if (displayResults.value.length === 0) {
      ElMessage.warning('暂无结果可复制')
      return
    }

    const stats = getExportStats()

    // 弹窗确认
    try {
      await ElMessageBox.confirm(
        `比对 ${stats.totalRows} 行，匹配 ${stats.matchedRows} 行，当前展示 ${stats.displayedRows} 行

本次复制条件：${stats.filterDescription}
将复制：${stats.displayedRows} 行数据（含前10个匹配项）

是否继续复制到剪贴板？`,
        '复制确认',
        {
          confirmButtonText: '确认复制',
          cancelButtonText: '取消',
          type: 'info',
          distinguishCancelAndClose: true,
        }
      )
    } catch {
      return // 用户取消
    }

    try {
      const maxMatches = 10
      const header = ['源项', '是否锁定', '锁定匹配', '锁定相似度', '备注']
      for (let index = 1; index <= maxMatches; index++) {
        header.push(`第${index}相似值`, `第${index}相似度`)
      }

      const rows = displayResults.value.map((row) => {
        const locked = getLockedItem(row)
        const note = getNote(row)
        const lockStatus = isLocked(row) ? '是' : '否'
        const values = [
          row.source,
          lockStatus,
          locked?.text ?? '',
          locked ? `${(locked.similarity * 100).toFixed(2)}%` : '',
          note
        ]

        for (let index = 0; index < maxMatches; index++) {
          values.push(row.matches[index]?.text ?? '')
          values.push(row.matches[index] ? `${(row.matches[index]!.similarity * 100).toFixed(2)}%` : '')
        }

        return values
      })

      // Build TSV content (Tab-Separated Values for Excel)
      const tsvContent = [header, ...rows]
        .map(row => row.join('\t'))
        .join('\n')

      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsvContent)
        ElMessage.success(`已复制 ${rows.length} 行数据到剪贴板，可直接粘贴到 Excel`)
      } else {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement('textarea')
        textArea.value = tsvContent
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()

        try {
          const successful = document.execCommand('copy')
          if (successful) {
            ElMessage.success(`已复制 ${rows.length} 行数据到剪贴板，可直接粘贴到 Excel`)
          } else {
            throw new Error('execCommand failed')
          }
        } finally {
          document.body.removeChild(textArea)
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard', error)
      ElMessage.error('复制失败。请使用 HTTPS 访问或尝试导出 CSV 文件')
    }
  }

  const updateNote = (item: BatchResult, note: string) => {
    if (joinMode.value === 'right') {
      for (const [source, match] of lockedItems.value.entries()) {
        if (match.text === item.source) {
          lockedItems.value.set(source, { ...match, note })
          break
        }
      }
    } else {
      const existing = lockedItems.value.get(item.source)
      if (existing) {
        lockedItems.value.set(item.source, { ...existing, note })
      }
    }
    saveState()
  }

  const getNote = (item: BatchResult): string => {
    if (joinMode.value === 'right') {
      for (const [, match] of lockedItems.value.entries()) {
        if (match.text === item.source) {
          return match.note || ''
        }
      }
      return ''
    }
    return lockedItems.value.get(item.source)?.note || ''
  }

  const getAISuggestion = async (item: BatchResult) => {
    if (item.matches.length === 0) return

    if (!aiConfig.value.apiKey || !aiConfig.value.baseUrl) {
      needsAIConfig.value = true
      ElMessage.warning('请先配置 AI（点击"⚙️ AI配置"按钮）')
      return
    }

    isAIProcessing.value = true

    try {
      const topMatches = item.matches.slice(0, 3)
      const matchesText = topMatches
        .map((m, i) => `${i + 1}. "${m.text}" (相似度: ${(m.similarity * 100).toFixed(1)}%)`)
        .join('\n')

      const prompt = `你是一个项目名称匹配专家。请分析以下项目名称匹配情况：

源名称: "${item.source}"

候选匹配项:
${matchesText}

重要判断规则：
1. 项目强锚点（最高优先级）：
   - 项目代码、杭政储出编号、控规单元地块号（如XH020104-22）一致时，应优先判定为强关联
   - 同类强锚点编号冲突（如XH020104-22 vs XH020104-21）时，应优先判定为不同项目
   - 道路工程要同时关注道路名称和起止点，起止点一致才可强匹配

2. 地块名识别：
   - 地块编号格式如"XXX-R21-YY"、"XXX-YY"等，其中核心标识是"XXX"和"YY"
   - "XXX-R21-YY"和"XXX-YY"应视为同一地块（中间的R21等为地块类型代码，可忽略）
   - 不同地块名（如"A地块"vs"B地块"、"XX-01"vs"XX-02"）必定是不同项目
   - 同一地块名大概率是同一项目

3. 道路/工程项目起止点：
   - 必须检查桩号起止点是否一致（如K1+000~K2+000）
   - 路名相同但起止点不同应判定为不同项目
   - 起止点信息缺失或明显不同的不应匹配

4. 附属词语容忍度：
   - 标点符号差异（括号、引号、顿号等）可忽略
   - 助词差异（的、之、及等）可忽略
   - 项目类型词差异（工程、项目、建设、地下车库、地下停车场等）可适当容忍
   - 但主体名称必须一致

5. 企业/单位主体：
   - 关注主体是否一致（分公司、子公司视为不同主体）

请提供：
1. 你认为最佳的匹配项编号（1-3），如果都不合适则回答"无"
2. 置信度（高/中/低）
3. 简短理由（30字以内，需说明关键判断依据，特别是地块名或起止点）

请严格按照以下格式回答：
推荐: [编号或"无"]
置信度: [高/中/低]
理由: [简短说明]`

      const abortController = new AbortController()
      const invoke = createLlmInvoke(aiConfig.value.mode)
      const response = await invoke(
        {
          baseUrl: aiConfig.value.baseUrl,
          apiKey: aiConfig.value.apiKey,
          model: aiConfig.value.model,
          systemPrompt: '你是项目名称匹配专家，擅长分析项目、企业、工程等各类名称的相似性和关联性。对于道路工程项目，你特别注意起止点桩号的差异；对于企业名称，你关注主体的一致性。',
          prompt,
        },
        abortController.signal
      )

      const content = response.content
      const recommendMatch = content.match(/推荐[:：]\s*(.+)/)?.[1]?.trim()
      const confidence = content.match(/置信度[:：]\s*(.+)/)?.[1]?.trim()
      const reason = content.match(/理由[:：]\s*(.+)/)?.[1]?.trim()

      // 保存 AI 建议到 map 中，不弹窗
      if (recommendMatch && recommendMatch !== '无' && /^[1-3]$/.test(recommendMatch)) {
        const matchIndex = parseInt(recommendMatch) - 1
        const suggestedMatch = topMatches[matchIndex]

        if (suggestedMatch) {
          aiSuggestions.value.set(item.source, {
            suggestion: suggestedMatch.text,
            confidence: confidence || '中',
            reason: reason || '',
            matchIndex: suggestedMatch.index,
            similarity: suggestedMatch.similarity,
          })
        }
      } else {
        aiSuggestions.value.set(item.source, {
          suggestion: '无合适匹配',
          confidence: confidence || '低',
          reason: reason || '未找到合适匹配',
          matchIndex: -1,
          similarity: 0,
        })
      }
    } catch (error) {
      console.error('AI suggestion failed:', error)
      const errorMsg = error instanceof Error ? error.message : '未知错误'

      // 检查是否是 API Key 错误
      if (errorMsg.includes('INVALID_API_KEY') || errorMsg.includes('Invalid API key')) {
        needsAIConfig.value = true
        ElMessage.error('API Key 无效，请重新配置（点击"⚙️ AI配置"）')
      } else {
        ElMessage.error('AI 建议失败: ' + errorMsg)
      }
    } finally {
      isAIProcessing.value = false
    }
  }

  const batchAISuggestion = async () => {
    if (!aiConfig.value.apiKey || !aiConfig.value.baseUrl) {
      needsAIConfig.value = true
      ElMessage.warning('请先配置 AI（点击"⚙️ AI配置"按钮）')
      return
    }

    // 筛选优先级高的项：相似度在 60%-90% 之间且未锁定的项
    const priorityItems = displayResults.value.filter((item) => {
      if (isLocked(item) || item.matches.length === 0) return false
      const topSimilarity = item.matches[0]!.similarity
      return topSimilarity >= 0.6 && topSimilarity < 0.9
    })

    if (priorityItems.length === 0) {
      ElMessage.info('没有需要 AI 建议的项（相似度 60%-90% 且未锁定）')
      return
    }

    ElMessageBox.confirm(
      `发现 ${priorityItems.length} 个需要 AI 建议的项（相似度 60%-90% 且未锁定）\n\n将依次为这些项提供 AI 建议，是否继续？`,
      '批量 AI 建议',
      {
        confirmButtonText: '开始分析',
        cancelButtonText: '取消',
        type: 'info',
      }
    ).then(async () => {
      isAIProcessing.value = true
      let successCount = 0

      for (let i = 0; i < priorityItems.length; i++) {
        const item = priorityItems[i]!
        try {
          await getAISuggestion(item)
          successCount++
          progress.value = ((i + 1) / priorityItems.length) * 100

          // 添加延迟避免 API 限流
          if (i < priorityItems.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1500))
          }
        } catch (error) {
          console.error(`AI suggestion failed for ${item.source}:`, error)
        }
      }

      isAIProcessing.value = false
      ElMessage.success(`批量 AI 建议完成，成功分析 ${successCount}/${priorityItems.length} 项`)
    }).catch(() => {
      ElMessage.info('已取消批量 AI 建议')
    })
  }

  const acceptAISuggestion = (item: BatchResult) => {
    const suggestion = aiSuggestions.value.get(item.source)
    if (!suggestion || suggestion.matchIndex === -1) return

    // 锁定 AI 建议的匹配项
    const match = item.matches.find(m => m.index === suggestion.matchIndex)
    if (match) {
      lockMatch(item, match)
      // 自动添加 AI 理由到备注
      updateNote(item, `AI建议: ${suggestion.reason}`)
      // 移除建议
      aiSuggestions.value.delete(item.source)
      ElMessage.success('已接受 AI 建议并锁定')
    }
  }

  const rejectAISuggestion = (item: BatchResult) => {
    aiSuggestions.value.delete(item.source)
    ElMessage.info('已拒绝 AI 建议')
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

  watch([sourceText, targetText, synonymText, ignoreText, options, selectedAlgorithm, editWeight, joinMode, preprocessEnabled, preprocessOptions, activeCollapse], saveState, {
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
    displayLockedCount,
    activeCollapse,
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
    preprocessEnabled,
    preprocessOptions,
    progress,
    currentProcessingIndex,
    totalProcessingCount,
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
    copyToClipboard,
    updateNote,
    getNote,
    getAISuggestion,
    batchAISuggestion,
    isAIProcessing,
    aiSuggestions,
    needsAIConfig,
    acceptAISuggestion,
    rejectAISuggestion,
  }
}
