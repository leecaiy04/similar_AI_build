import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createTransformService, type DataRow, type RegexAction } from '../service/transformService'

const STORAGE_KEY = 'premium_data_proc_v1'

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

export function useDataProcessingWorkspace() {
  const transformService = createTransformService()

  const dataList = ref<DataRow[]>([])
  const inputText = ref('')
  const regexPattern = ref('')
  const findText = ref('')
  const replaceText = ref('')
  const prefixText = ref('')
  const suffixText = ref('')
  const splitChar = ref('')
  const splitMode = ref<'newline' | 'blankline'>('newline')
  const preventDuplicates = ref(false)

  const rowCount = computed(() => dataList.value.length)

  const addTypedData = () => {
    if (!inputText.value.trim()) return

    const result = transformService.addRows({
      existing: dataList.value,
      inputText: inputText.value,
      splitMode: splitMode.value,
      preventDuplicates: preventDuplicates.value,
    })
    dataList.value = result.rows
    inputText.value = ''

    if (preventDuplicates.value && result.rejectedCount > 0) {
      ElMessage.warning(`成功添加 ${result.addedCount} 行，拒绝录入重复项 ${result.rejectedCount} 行`)
    } else if (result.addedCount > 0) {
      ElMessage.success(`成功添加 ${result.addedCount} 行`)
    }
  }

  const highlightDuplicates = () => {
    const counted = transformService.countDuplicates(dataList.value)
    dataList.value = counted
    const duplicates = counted.filter((row) => row.isHighlighted).length
    if (duplicates > 0) {
      ElMessage.success(`已高亮 ${duplicates} 个重复出现的条目`)
    } else {
      ElMessage.info('未发现重复项')
    }
  }

  const clearHighlights = () => {
    dataList.value = dataList.value.map((row) => ({ ...row, isHighlighted: false }))
    ElMessage.success('已清除高亮')
  }

  const countDuplicates = () => {
    dataList.value = transformService.countDuplicates(dataList.value).map((row) => ({
      ...row,
      isHighlighted: false,
    }))
    ElMessage.success('统计完成，结果已在右侧显示')
  }

  const togglePreventDuplicates = () => {
    preventDuplicates.value = !preventDuplicates.value
    if (preventDuplicates.value) {
      ElMessage.warning('已开启：后续新增数据若与现有数据重复将被拦截')
    } else {
      ElMessage.info('已关闭重复录入校验')
    }
  }

  const clearPreventDuplicates = () => {
    preventDuplicates.value = false
    ElMessage.success('已清除拒绝录入限制')
  }

  const removeDuplicates = () => {
    const originalLength = dataList.value.length
    dataList.value = transformService.removeDuplicates(dataList.value).map((row) => ({
      ...row,
      count: 0,
      isHighlighted: false,
    }))
    const removedCount = originalLength - dataList.value.length
    if (removedCount > 0) {
      ElMessage.success(`已清理去重，共删除 ${removedCount} 行重复数据`)
    } else {
      ElMessage.info('未发现需要删除的重复项')
    }
  }

  const extractNumbers = () => {
    let affected = 0
    dataList.value = dataList.value
      .map((row) => {
        const matches = row.value.match(/-?\d+(\.\d+)?/g)
        const value = matches ? matches.join('') : ''
        if (value !== row.value) affected++
        return { ...row, value, count: 0, isHighlighted: false }
      })
      .filter((row) => row.value !== '')
    ElMessage.success(`智能提取完成，影响 ${affected} 行`)
  }

  const trimSpaces = () => {
    let count = 0
    dataList.value = dataList.value.map((row) => {
      const value = row.value.trim()
      if (value !== row.value) count++
      return { ...row, value }
    })
    ElMessage.success(`已处理 ${count} 行`)
  }

  const removeEmpty = () => {
    const originalLength = dataList.value.length
    dataList.value = dataList.value.filter((row) => row.value.trim() !== '')
    ElMessage.success(`删除了 ${originalLength - dataList.value.length} 个空行`)
  }

  const sortData = (direction: 'asc' | 'desc') => {
    dataList.value = [...dataList.value].sort((left, right) => {
      if (direction === 'asc') return left.value.localeCompare(right.value)
      return right.value.localeCompare(left.value)
    })
    ElMessage.success(direction === 'asc' ? '已升序排列' : '已降序排列')
  }

  const convertCase = (mode: 'lower' | 'upper') => {
    dataList.value = dataList.value.map((row) => ({
      ...row,
      value: mode === 'lower' ? row.value.toLowerCase() : row.value.toUpperCase(),
    }))
    ElMessage.success(`已转换为${mode === 'lower' ? '小写' : '大写'}`)
  }

  const applyRegex = (action: RegexAction) => {
    if (!regexPattern.value) {
      ElMessage.warning('请输入正则表达式')
      return
    }

    try {
      dataList.value = transformService.applyRegex(dataList.value, regexPattern.value, action)
      if (action === 'match') ElMessage.success('提取完成')
      if (action === 'filter') ElMessage.success('删除匹配行完成')
      if (action === 'keep') ElMessage.success('保留匹配行完成')
    } catch {
      ElMessage.error('正则表达式语法错误')
    }
  }

  const batchReplace = () => {
    if (!findText.value) return
    let count = 0
    dataList.value = dataList.value.map((row) => {
      if (!row.value.includes(findText.value)) return row
      count++
      return { ...row, value: row.value.split(findText.value).join(replaceText.value) }
    })
    ElMessage.success(`完成替换，共影响 ${count} 行`)
  }

  const addFixes = () => {
    if (!prefixText.value && !suffixText.value) return
    dataList.value = dataList.value.map((row) => ({
      ...row,
      value: `${prefixText.value}${row.value}${suffixText.value}`,
    }))
    ElMessage.success('已批量追加固定前缀后缀')
  }

  const handleExtract = (type: string | number | object) => {
    if (typeof type !== 'string') return
    let regex: RegExp | null = null
    if (type === 'phone') regex = /1[3-9]\d{9}/g
    else if (type === 'email') regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
    else if (type === 'url') regex = /https?:\/\/[^\s]+/g
    else if (type === 'idcard') regex = /[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]/gi
    if (!regex) return

    let count = 0
    dataList.value = dataList.value
      .map((row) => {
        const matches = row.value.match(regex!)
        if (!matches) return { ...row, value: '' }
        count++
        return { ...row, value: matches.join(' | ') }
      })
      .filter((row) => row.value !== '')
    ElMessage.success(`智能提取完成，截获 ${count} 行含特定类型数据的条目`)
  }

  const handleMask = (type: string | number | object) => {
    if (typeof type !== 'string') return
    let count = 0
    dataList.value = dataList.value.map((row) => {
      let value = row.value
      if (type === 'phone') {
        value = value.replace(/(1[3-9]\d{2})\d{4}(\d{4})/g, '$1****$2')
      } else if (type === 'idcard') {
        value = value.replace(/([1-9]\d{5})\d{8}(\d{4}|\d{3}[Xx])/gi, '$1********$2')
      } else if (type === 'name') {
        const raw = value.trim()
        if (raw.length === 2) value = `${raw[0]}*`
        else if (raw.length > 2) value = `${raw[0]}${'*'.repeat(raw.length - 2)}${raw[raw.length - 1]}`
      }
      if (value !== row.value) count++
      return { ...row, value }
    })
    ElMessage.success(`安全执行：已为 ${count} 行数据实施隐私脱敏过滤`)
  }

  const splitToRows = () => {
    if (!splitChar.value) return
    let splitCount = 0
    const nextRows: DataRow[] = []

    dataList.value.forEach((row) => {
      let parts: string[]
      try {
        parts = row.value.split(new RegExp(splitChar.value, 'g'))
      } catch {
        parts = row.value.split(splitChar.value)
      }
      if (parts.length > 1) splitCount++
      parts.filter((part) => part.trim()).forEach((part) => {
        nextRows.push({
          id: generateId(),
          value: part.trim(),
          isHighlighted: false,
          count: 0,
        })
      })
    })

    dataList.value = nextRows
    ElMessage.success(`高级分列执行：成功拆列 ${splitCount} 组，衍生得到 ${nextRows.length} 行数据`)
  }

  const removeRow = (index: number) => {
    dataList.value.splice(index, 1)
  }

  const clearAll = () => {
    ElMessageBox.confirm('确定要清空所有数据吗？', '系统警告', {
      confirmButtonText: '确定清空',
      cancelButtonText: '暂不',
      type: 'warning',
    }).then(() => {
      dataList.value = []
      inputText.value = ''
      ElMessage.success('工作区已全部清空')
    }).catch(() => {})
  }

  const copyAllData = async () => {
    if (dataList.value.length === 0) return
    const text = dataList.value
      .map((row) => {
        let value = row.value
        if (value.includes('\n') || value.includes('"')) {
          value = `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
      ElMessage.success('已复制处理后的全部数据，可直接粘贴到 Excel')
    } catch {
      ElMessage.error('复制失败，浏览器可能限制了剪贴板权限')
    }
  }

  const saveState = () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        dataList: dataList.value,
        preventDuplicates: preventDuplicates.value,
        regexPattern: regexPattern.value,
        findText: findText.value,
        replaceText: replaceText.value,
        prefixText: prefixText.value,
        suffixText: suffixText.value,
        splitChar: splitChar.value,
        splitMode: splitMode.value,
      }),
    )
  }

  onMounted(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (parsed.dataList) dataList.value = parsed.dataList
      if (parsed.preventDuplicates !== undefined) preventDuplicates.value = parsed.preventDuplicates
      if (parsed.regexPattern) regexPattern.value = parsed.regexPattern
      if (parsed.findText) findText.value = parsed.findText
      if (parsed.replaceText) replaceText.value = parsed.replaceText
      if (parsed.prefixText) prefixText.value = parsed.prefixText
      if (parsed.suffixText) suffixText.value = parsed.suffixText
      if (parsed.splitChar) splitChar.value = parsed.splitChar
      if (parsed.splitMode) splitMode.value = parsed.splitMode
    } catch {
      // ignore malformed local state
    }
  })

  watch(dataList, saveState, { deep: true })
  watch([preventDuplicates, splitMode, regexPattern, findText, replaceText, prefixText, suffixText, splitChar], saveState)

  return {
    addFixes,
    addTypedData,
    applyRegex,
    batchReplace,
    clearAll,
    clearHighlights,
    clearPreventDuplicates,
    convertCase,
    copyAllData,
    countDuplicates,
    dataList,
    extractNumbers,
    findText,
    highlightDuplicates,
    handleExtract,
    handleMask,
    inputText,
    prefixText,
    preventDuplicates,
    regexPattern,
    removeDuplicates,
    removeEmpty,
    removeRow,
    replaceText,
    rowCount,
    sortData,
    splitChar,
    splitMode,
    splitToRows,
    suffixText,
    togglePreventDuplicates,
    trimSpaces,
  }
}
