<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Sub Header -->
    <div class="app-header-gradient px-6 py-3 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-base font-bold flex items-center gap-2 text-white">
          <span class="text-2xl">📊</span>
          <span>表格合并</span>
        </h2>
        <el-button @click="loadSample" link class="!text-white/80 hover:!text-white" size="small">加载示例</el-button>
        <el-button @click="triggerFileImport" link class="!text-white/80 hover:!text-white" size="small">
          导入文件
        </el-button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          multiple
          class="hidden"
          @change="handleFileImport"
        />
        <el-button @click="resetAll" link class="!text-red-200 hover:!text-white" size="small">清空数据</el-button>
      </div>
      <div class="flex items-center gap-3">
        <el-tag v-if="currentStep === 1" type="success" effect="dark" size="large">步骤 1/3：输入表格</el-tag>
        <el-tag v-if="currentStep === 2" type="warning" effect="dark" size="large">步骤 2/3：对齐标题</el-tag>
        <el-tag v-if="currentStep === 3" type="info" effect="dark" size="large">步骤 3/3：合并数据</el-tag>
      </div>
    </div>

    <!-- Main Content -->
    <main class="flex-1 overflow-hidden">
      <!-- Step 1: Input Tables -->
      <div v-if="currentStep === 1" class="h-full flex">
        <aside class="app-sidebar">
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <section class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300">标题行数量</label>
                <el-input-number v-model="headerRowCount" :min="1" :max="5" size="small" class="w-32" />
              </div>
              <el-alert type="info" :closable="false" show-icon>
                <template #title>
                  <span class="text-sm">指定每个表格的标题行数，用于后续对齐</span>
                </template>
              </el-alert>
            </section>

            <section class="space-y-4">
              <div class="flex items-center justify-between">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300">待合并表格</label>
                <el-tag size="small">{{ tables.length }} 个</el-tag>
              </div>

              <div class="space-y-3 max-h-[500px] overflow-y-auto">
                <div v-for="(table, index) in tables" :key="index" class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500">表格 {{ index + 1 }}</span>
                    <div class="flex gap-2">
                      <el-button type="primary" size="small" text @click="triggerSingleFileImport(index)">
                        📁 导入
                      </el-button>
                      <el-button type="danger" size="small" text @click="removeTable(index)">删除</el-button>
                    </div>
                  </div>
                  <input
                    :ref="el => setSingleFileInputRef(el, index)"
                    type="file"
                    accept=".xlsx,.xls,.csv,.txt"
                    class="hidden"
                    @change="e => handleSingleFileImport(e, index)"
                  />
                  <el-input
                    v-model="table.content"
                    type="textarea"
                    :rows="4"
                    placeholder="粘贴表格数据（支持 Excel/CSV 复制）或点击【导入】选择文件"
                    size="small"
                  />
                  <div class="text-[10px] text-gray-400">
                    {{ table.content ? `${table.content.split('\n').filter(l => l.trim()).length} 行` : '空' }}
                  </div>
                </div>
              </div>

              <el-button type="primary" plain class="w-full" @click="addTable">
                ➕ 添加表格
              </el-button>
            </section>
          </div>

          <footer class="p-5 bg-gradient-to-t from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
            <el-button
              type="primary"
              class="w-full !h-12 !rounded-xl !text-base font-bold"
              @click="parseTablesAndGoToStep2"
              :disabled="!canProceedToStep2">
              下一步：对齐标题 →
            </el-button>
          </footer>
        </aside>

        <div class="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-900">
          <div class="text-center text-gray-400">
            <div class="text-6xl mb-4">📊</div>
            <p class="text-lg font-medium">添加表格数据</p>
            <p class="text-sm mt-2">支持 Excel、CSV 格式的表格数据</p>
            <p class="text-xs mt-4 text-gray-500">下一步将识别各表格的标题并进行对齐</p>
          </div>
        </div>
      </div>

      <!-- Step 2: Align Headers -->
      <div v-if="currentStep === 2" class="h-full flex flex-col p-6 overflow-auto">
        <div class="max-w-7xl mx-auto w-full space-y-6">
          <!-- Instructions -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 class="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">📋 标题对齐说明</h3>
            <ul class="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <li>• 系统已识别所有表格的标题列</li>
              <li>• 请将相同含义的列映射到统一的标准列名</li>
              <li>• 未映射的列将被忽略</li>
              <li>• 合并后将按标准列顺序输出</li>
            </ul>
          </div>

          <!-- Standard Columns -->
          <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold text-gray-700 dark:text-gray-300">标准列定义</h3>
              <el-button type="primary" size="small" @click="addStandardColumn">➕ 添加标准列</el-button>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div v-for="(_col, index) in standardColumns" :key="index"
                   class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 flex items-center gap-2">
                <el-input v-model="standardColumns[index]" placeholder="列名" size="small" />
                <el-button type="danger" size="small" text @click="removeStandardColumn(index)">×</el-button>
              </div>
            </div>
          </div>

          <!-- Column Mapping -->
          <div class="space-y-4">
            <div v-for="(table, tableIndex) in parsedTables" :key="tableIndex"
                 class="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h4 class="text-base font-bold text-gray-700 dark:text-gray-300 mb-4">
                表格 {{ tableIndex + 1 }} - 列映射
                <el-tag size="small" class="ml-2">{{ table.headers.length }} 列</el-tag>
              </h4>

              <div class="grid grid-cols-2 gap-4">
                <div v-for="(_header, colIndex) in table.headers" :key="colIndex" class="flex items-center gap-3">
                  <div class="flex-1 bg-gray-50 dark:bg-gray-700 rounded px-3 py-2 text-sm font-mono">
                    {{ table.headers[colIndex] }}
                  </div>
                  <span class="text-gray-400">→</span>
                  <el-select v-model="columnMappings[tableIndex]![colIndex]" placeholder="映射到标准列" size="small" clearable class="flex-1">
                    <el-option v-for="stdCol in standardColumns" :key="stdCol" :label="stdCol" :value="stdCol" />
                  </el-select>
                </div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3 justify-end sticky bottom-0 bg-gray-50 dark:bg-gray-900 py-4 border-t border-gray-200 dark:border-gray-700">
            <el-button @click="currentStep = 1" size="large">← 返回</el-button>
            <el-button type="success" @click="mergeTablesWithMapping" size="large" :disabled="!canProceedToStep3">
              合并表格 →
            </el-button>
          </div>
        </div>
      </div>

      <!-- Step 3: Result -->
      <div v-if="currentStep === 3" class="h-full flex flex-col p-6 overflow-auto">
        <div class="max-w-7xl mx-auto w-full space-y-6">
          <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div class="flex items-center justify-between mb-6">
              <div class="flex items-center gap-4">
                <h3 class="text-lg font-bold text-gray-700 dark:text-gray-300">合并结果</h3>
                <el-tag type="success" size="large">{{ mergedRows.length }} 行</el-tag>
                <el-tag type="info" size="large">{{ standardColumns.length }} 列</el-tag>
              </div>
              <div class="flex gap-2">
                <el-button @click="currentStep = 2" size="small">← 重新对齐</el-button>
                <el-button type="primary" size="small" @click="copyResult">📋 复制</el-button>
                <el-button type="success" size="small" @click="exportResult">💾 导出 CSV</el-button>
              </div>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-5 gap-3 mb-6">
              <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500">输入表格</div>
                <div class="text-2xl font-bold text-blue-600">{{ tables.length }}</div>
              </div>
              <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500">标准列</div>
                <div class="text-2xl font-bold text-green-600">{{ standardColumns.length }}</div>
              </div>
              <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500">总行数</div>
                <div class="text-2xl font-bold text-purple-600">{{ mergedRows.length }}</div>
              </div>
              <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500">标题行</div>
                <div class="text-2xl font-bold text-orange-600">1</div>
              </div>
              <div class="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500">数据行</div>
                <div class="text-2xl font-bold text-pink-600">{{ mergedRows.length - 1 }}</div>
              </div>
            </div>

            <!-- Table Preview -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div class="bg-gray-100 dark:bg-gray-700 px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 flex justify-between">
                <span>数据预览</span>
                <span>显示前 50 行</span>
              </div>
              <div class="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table class="w-full text-xs">
                  <thead class="bg-gray-50 dark:bg-gray-700 sticky top-0">
                    <tr>
                      <th class="px-3 py-2 text-left font-bold border-b border-gray-200 dark:border-gray-600">#</th>
                      <th v-for="col in standardColumns" :key="col"
                          class="px-3 py-2 text-left font-bold border-b border-gray-200 dark:border-gray-600">
                        {{ col }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, index) in mergedRows.slice(0, 50)" :key="index"
                        class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td class="px-3 py-2 text-gray-500">{{ index + 1 }}</td>
                      <td v-for="col in standardColumns" :key="col" class="px-3 py-2 font-mono">
                        {{ row[col] || '-' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-if="mergedRows.length > 50" class="bg-gray-50 dark:bg-gray-700 px-4 py-2 text-xs text-gray-500 text-center">
                ... 还有 {{ mergedRows.length - 50 }} 行
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ComponentPublicInstance } from 'vue'

interface Table {
  content: string
}

interface ParsedTable {
  headers: string[]
  rows: string[][]
}

const currentStep = ref(1)
const headerRowCount = ref(1)
const tables = ref<Table[]>([{ content: '' }])
const parsedTables = ref<ParsedTable[]>([])
const standardColumns = ref<string[]>([])
const columnMappings = ref<string[][]>([])
const mergedRows = ref<Record<string, string>[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const singleFileInputRefs = ref<Map<number, HTMLInputElement>>(new Map())

const setSingleFileInputRef = (el: HTMLInputElement | Element | ComponentPublicInstance | null, index: number) => {
  if (el && el instanceof HTMLInputElement) {
    singleFileInputRefs.value.set(index, el)
  }
}

const canProceedToStep2 = computed(() => {
  return tables.value.some(t => t.content.trim())
})

const canProceedToStep3 = computed(() => {
  return standardColumns.value.length > 0 &&
         columnMappings.value.some(mapping => mapping.some(m => m))
})

const triggerFileImport = () => {
  fileInputRef.value?.click()
}

const triggerSingleFileImport = (index: number) => {
  const inputEl = singleFileInputRefs.value.get(index)
  inputEl?.click()
}

const handleSingleFileImport = async (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  try {
    let content = ''

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      content = await readTextFile(file)
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      ElMessage.warning('Excel 文件请先在 Excel/WPS 中打开，复制内容后粘贴到输入框')
      return
    }

    if (content) {
      tables.value[index]!.content = content
      ElMessage.success(`已导入文件到表格 ${index + 1}`)
    }
  } catch (error) {
    console.error('File import error:', error)
    ElMessage.error(`导入文件失败`)
  }

  target.value = ''
}

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  for (let i = 0; i < files.length; i++) {
    const file = files[i]!
    try {
      let content = ''

      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        // CSV/TXT 文件直接读取
        content = await readTextFile(file)
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Excel 文件需要特殊处理
        ElMessage.warning('Excel 文件请先在 Excel/WPS 中打开，复制内容后粘贴到输入框')
        continue
      }

      if (content) {
        // 如果第一个表格是空的，替换它
        if (tables.value.length === 1 && !tables.value[0]!.content) {
          tables.value[0]!.content = content
        } else {
          tables.value.push({ content })
        }
      }
    } catch (error) {
      console.error('File import error:', error)
      ElMessage.error(`导入文件 ${file.name} 失败`)
    }
  }

  ElMessage.success(`成功导入 ${files.length} 个文件`)
  target.value = ''
}

const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result
      if (typeof result === 'string') {
        resolve(result)
      } else {
        reject(new Error('Failed to read file'))
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'UTF-8')
  })
}

const addTable = () => {
  tables.value.push({ content: '' })
}

const removeTable = (index: number) => {
  if (tables.value.length === 1) {
    ElMessage.warning('至少保留一个表格')
    return
  }
  tables.value.splice(index, 1)
}

const addStandardColumn = () => {
  const colName = `列${standardColumns.value.length + 1}`
  standardColumns.value.push(colName)
}

const removeStandardColumn = (index: number) => {
  standardColumns.value.splice(index, 1)
  // 清除该标准列的所有映射
  columnMappings.value.forEach(mapping => {
    mapping.forEach((m, i) => {
      if (m === standardColumns.value[index]) {
        mapping[i] = ''
      }
    })
  })
}

const parseTablesAndGoToStep2 = () => {
  parsedTables.value = []
  const allHeaders = new Set<string>()

  tables.value.forEach(table => {
    if (!table.content.trim()) return

    const lines = table.content.split('\n').filter(l => l.trim())
    if (lines.length <= headerRowCount.value) return

    // 解析标题（支持 Tab 或逗号分隔）
    const headerLines = lines.slice(0, headerRowCount.value)
    const headers = headerLines[0]!.split(/\t|,/).map(h => h.trim()).filter(Boolean)

    // 解析数据行
    const dataLines = lines.slice(headerRowCount.value)
    const rows = dataLines.map(line =>
      line.split(/\t|,/).map(cell => cell.trim())
    )

    parsedTables.value.push({ headers, rows })
    headers.forEach(h => allHeaders.add(h))
  })

  if (parsedTables.value.length === 0) {
    ElMessage.warning('没有有效的表格数据')
    return
  }

  // 初始化标准列（使用第一个表格的标题）
  if (standardColumns.value.length === 0) {
    standardColumns.value = Array.from(allHeaders)
  }

  // 初始化列映射
  columnMappings.value = parsedTables.value.map(table =>
    table.headers.map(header => {
      // 自动匹配相同名称的列
      return standardColumns.value.includes(header) ? header : ''
    })
  )

  currentStep.value = 2
  ElMessage.success(`已识别 ${parsedTables.value.length} 个表格，共 ${allHeaders.size} 个不同的列`)
}

const mergeTablesWithMapping = () => {
  const result: Record<string, string>[] = []

  parsedTables.value.forEach((table, tableIndex) => {
    const mapping = columnMappings.value[tableIndex]!

    table.rows.forEach(row => {
      const rowData: Record<string, string> = {}

      table.headers.forEach((_header, colIndex) => {
        const standardCol = mapping[colIndex]
        if (standardCol && row[colIndex]) {
          rowData[standardCol] = row[colIndex]!
        }
      })

      // 只添加有数据的行
      if (Object.keys(rowData).length > 0) {
        result.push(rowData)
      }
    })
  })

  mergedRows.value = result
  currentStep.value = 3
  ElMessage.success(`合并完成！共 ${result.length} 行数据`)
}

const copyResult = async () => {
  if (mergedRows.value.length === 0) return

  // 构建 TSV 格式
  const header = standardColumns.value.join('\t')
  const rows = mergedRows.value.map(row =>
    standardColumns.value.map(col => row[col] || '').join('\t')
  ).join('\n')
  const content = header + '\n' + rows

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(content)
      ElMessage.success('已复制到剪贴板')
    } else {
      const textArea = document.createElement('textarea')
      textArea.value = content
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      ElMessage.success('已复制到剪贴板')
    }
  } catch (error) {
    console.error(error)
    ElMessage.error('复制失败')
  }
}

const exportResult = () => {
  if (mergedRows.value.length === 0) return

  const header = standardColumns.value.join(',')
  const rows = mergedRows.value.map(row =>
    standardColumns.value.map(col => {
      const val = row[col] || ''
      // CSV 转义
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val
    }).join(',')
  ).join('\n')
  const content = '﻿' + header + '\n' + rows

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `表格合并_${new Date().getTime()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}

const loadSample = () => {
  tables.value = [
    {
      content: `姓名\t年龄\t部门\t工号
张三\t28\t技术部\tE001
李四\t32\t市场部\tE002`
    },
    {
      content: `Name\tAge\tDept
王五\t25\t人事部
赵六\t30\t财务部`
    },
    {
      content: `员工姓名\t年龄\t所属部门\t入职日期
孙七\t27\t技术部\t2020-01-15
周八\t29\t市场部\t2019-06-20`
    }
  ]
  headerRowCount.value = 1
  currentStep.value = 1
  ElMessage.success('已加载示例数据（3个不同格式的表格）')
}

const resetAll = () => {
  ElMessageBox.confirm('确定清空所有数据吗？', '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    currentStep.value = 1
    tables.value = [{ content: '' }]
    parsedTables.value = []
    standardColumns.value = []
    columnMappings.value = []
    mergedRows.value = []
    headerRowCount.value = 1
    ElMessage.success('已清空')
  }).catch(() => {})
}
</script>

<style scoped>
table {
  border-collapse: collapse;
}
</style>
