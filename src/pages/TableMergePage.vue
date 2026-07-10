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
              <div class="flex items-center justify-between gap-3">
                <label class="text-sm font-bold text-gray-700 dark:text-gray-300">标题行数量</label>
                <el-input-number v-model="headerRowCount" :min="1" :max="5" size="small" class="w-32" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <el-button size="small" type="primary" plain @click="applyAllSmartRecommendations">
                  ✨ 智能推荐跳过行
                </el-button>
                <el-button size="small" plain @click="resetAllSkipRows">
                  跳过行清零
                </el-button>
              </div>
              <el-alert type="info" :closable="false" show-icon>
                <template #title>
                  <span class="text-sm">标题行数量用于识别列名；每个表格可单独设置“表头前跳过行数”，用于跳过合并单元格大标题、单位说明等非表头行。</span>
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
                  <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-2 space-y-2">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <div class="text-xs font-bold text-amber-700 dark:text-amber-300">表头前跳过行数</div>
                        <div class="text-[10px] text-amber-600 dark:text-amber-400">
                          推荐跳过 {{ getRecommendedSkipRows(table.content) }} 行；单单元格行通常是合并大标题/说明
                        </div>
                      </div>
                      <div class="flex items-center gap-2">
                        <el-input-number v-model="table.skipRows" :min="0" :max="20" size="small" class="!w-24" />
                        <el-button size="small" text type="primary" @click="applySmartRecommendation(index)">采用推荐</el-button>
                      </div>
                    </div>
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
              <li>• 已按每个表格的“跳过行数”跳过合并大标题/说明行，再识别表头</li>
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
                <el-tag v-if="table.skippedRows" type="warning" size="small" class="ml-2">已跳过 {{ table.skippedRows }} 行</el-tag>
                <el-tag v-if="table.recommendedSkipRows !== table.skippedRows" type="info" size="small" class="ml-2">
                  推荐 {{ table.recommendedSkipRows }} 行
                </el-tag>
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
            <div class="grid grid-cols-6 gap-3 mb-6">
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
                <div class="text-2xl font-bold text-orange-600">{{ headerRowCount }}</div>
              </div>
              <div class="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500">跳过行</div>
                <div class="text-2xl font-bold text-amber-600">{{ totalSkippedRows }}</div>
              </div>
              <div class="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500">数据行</div>
                <div class="text-2xl font-bold text-pink-600">{{ mergedRows.length }}</div>
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

    <el-dialog
      v-model="sheetImportDialogVisible"
      title="批量导入工作簿 / 工作表"
      width="90%"
      top="5vh"
      destroy-on-close
    >
      <div class="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 h-[70vh]">
        <section class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden flex flex-col bg-white dark:bg-gray-800">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <div class="text-sm font-bold text-gray-700 dark:text-gray-200">待导入工作表</div>
              <div class="text-xs text-gray-500">已选 {{ selectedImportCandidates.length }} / {{ importCandidates.length }} 个</div>
            </div>
            <div class="flex gap-1">
              <el-button size="small" text type="primary" @click="selectAllImportCandidates(true)">全选</el-button>
              <el-button size="small" text @click="selectAllImportCandidates(false)">全不选</el-button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <div
              v-for="candidate in importCandidates"
              :key="candidate.id"
              class="border rounded-lg p-3 cursor-pointer transition-colors"
              :class="activeImportCandidate?.id === candidate.id ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60'"
              @click="activeImportCandidateId = candidate.id"
            >
              <div class="flex items-start gap-2">
                <el-checkbox v-model="candidate.selected" class="mt-0.5" @click.stop />
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="text-xs font-bold text-gray-700 dark:text-gray-200 truncate" :title="candidate.fileName">
                    {{ candidate.fileName }}
                  </div>
                  <div class="text-xs text-blue-600 dark:text-blue-300 truncate" :title="candidate.sheetName">
                    {{ candidate.sheetName }}
                  </div>
                  <div class="flex flex-wrap gap-1">
                    <el-tag size="small" type="success">{{ candidate.rowCount }} 行</el-tag>
                    <el-tag size="small" type="info">{{ candidate.colCount }} 列</el-tag>
                    <el-tag v-if="!candidate.content.trim()" size="small" type="danger">空表</el-tag>
                  </div>
                </div>
              </div>
            </div>

            <el-empty v-if="importCandidates.length === 0" description="暂无可导入工作表" />
          </div>
        </section>

        <section class="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-800 flex flex-col">
          <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <div class="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">
                {{ activeImportCandidate ? `${activeImportCandidate.fileName} / ${activeImportCandidate.sheetName}` : '数据预览' }}
              </div>
              <div class="text-xs text-gray-500">显示前 {{ Math.min(activeImportCandidate?.previewRows.length || 0, 12) }} 行，导入后会自动填入左侧表格并推荐跳过行数</div>
            </div>
            <el-tag v-if="activeImportCandidate" type="primary" size="large">
              {{ activeImportCandidate.rowCount }} 行 × {{ activeImportCandidate.colCount }} 列
            </el-tag>
          </div>

          <div class="flex-1 overflow-auto p-4">
            <table v-if="activeImportCandidate && activeImportCandidate.previewRows.length" class="w-full text-xs border border-gray-200 dark:border-gray-700">
              <tbody>
                <tr v-for="(row, rowIndex) in activeImportCandidate.previewRows" :key="rowIndex" class="border-b border-gray-100 dark:border-gray-700">
                  <td class="px-2 py-1 bg-gray-50 dark:bg-gray-700 text-gray-400 border-r border-gray-200 dark:border-gray-600 w-12 text-center">
                    {{ rowIndex + 1 }}
                  </td>
                  <td
                    v-for="(_, colIndex) in previewColumnIndexes"
                    :key="colIndex"
                    class="px-2 py-1 border-r border-gray-100 dark:border-gray-700 whitespace-pre-wrap align-top min-w-28"
                  >
                    {{ row[colIndex] || '' }}
                  </td>
                </tr>
              </tbody>
            </table>
            <el-empty v-else description="请选择左侧工作表查看预览" />
          </div>
        </section>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <div class="text-xs text-gray-500">
            支持一次选择多个 Excel/CSV/TXT 文件；Excel 会展开为“工作簿-工作表”逐项选择。
          </div>
          <div class="flex gap-2">
            <el-button @click="sheetImportDialogVisible = false">取消</el-button>
            <el-button type="primary" :disabled="selectedImportCandidates.length === 0" @click="confirmSheetImport">
              导入选中 {{ selectedImportCandidates.length }} 个
            </el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { ComponentPublicInstance } from 'vue'
import readXlsxFile from 'read-excel-file/browser'
import { parseDelimitedTable, recommendSkipRows } from '../utils/tableMergeParser'

interface Table {
  content: string
  skipRows: number
}

interface ParsedTable {
  headers: string[]
  rows: string[][]
  skippedRows: number
  recommendedSkipRows: number
  originalLineCount: number
}

interface TableImportCandidate {
  id: string
  fileName: string
  sheetName: string
  content: string
  previewRows: string[][]
  rowCount: number
  colCount: number
  selected: boolean
}

const MAX_PREVIEW_ROWS = 12

const currentStep = ref(1)
const headerRowCount = ref(1)
const tables = ref<Table[]>([{ content: '', skipRows: 0 }])
const parsedTables = ref<ParsedTable[]>([])
const standardColumns = ref<string[]>([])
const columnMappings = ref<string[][]>([])
const mergedRows = ref<Record<string, string>[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)
const singleFileInputRefs = ref<Map<number, HTMLInputElement>>(new Map())
const sheetImportDialogVisible = ref(false)
const importCandidates = ref<TableImportCandidate[]>([])
const activeImportCandidateId = ref('')
const pendingSingleImportIndex = ref<number | null>(null)

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
const totalSkippedRows = computed(() => parsedTables.value.reduce((sum, table) => sum + table.skippedRows, 0))
const selectedImportCandidates = computed(() => importCandidates.value.filter(candidate => candidate.selected && candidate.content.trim()))
const activeImportCandidate = computed(() => {
  return importCandidates.value.find(candidate => candidate.id === activeImportCandidateId.value) ?? importCandidates.value[0] ?? null
})
const previewColumnIndexes = computed(() => {
  const colCount = activeImportCandidate.value?.colCount ?? 0
  return Array.from({ length: colCount }, (_unused, index) => index)
})

const createTable = (content = ''): Table => ({
  content,
  skipRows: recommendSkipRows(content),
})

const getRecommendedSkipRows = (content: string) => recommendSkipRows(content)

const applySmartRecommendation = (index: number) => {
  const table = tables.value[index]
  if (!table) return
  table.skipRows = recommendSkipRows(table.content)
  ElMessage.success(`表格 ${index + 1} 推荐跳过 ${table.skipRows} 行`)
}

const applyAllSmartRecommendations = () => {
  tables.value.forEach((table) => {
    table.skipRows = recommendSkipRows(table.content)
  })
  ElMessage.success('已根据单单元格大标题/说明行推荐跳过行数')
}

const resetAllSkipRows = () => {
  tables.value.forEach((table) => {
    table.skipRows = 0
  })
  ElMessage.success('已将所有跳过行数清零')
}


const triggerFileImport = () => {
  fileInputRef.value?.click()
}

const triggerSingleFileImport = (index: number) => {
  const inputEl = singleFileInputRefs.value.get(index)
  inputEl?.click()
}

const handleSingleFileImport = async (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  if (files.length === 0) return

  await prepareSheetImport(files, index)
  target.value = ''
}

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  if (files.length === 0) return

  await prepareSheetImport(files, null)
  target.value = ''
}

const prepareSheetImport = async (files: File[], targetTableIndex: number | null) => {
  const candidates: TableImportCandidate[] = []

  for (const file of files) {
    try {
      candidates.push(...await buildImportCandidatesFromFile(file))
    } catch (error) {
      console.error('File import error:', error)
      ElMessage.error(`解析文件 ${file.name} 失败`)
    }
  }

  if (candidates.length === 0) {
    ElMessage.warning('未识别到可导入的数据，请检查文件格式或工作表内容')
    return
  }

  pendingSingleImportIndex.value = targetTableIndex
  importCandidates.value = candidates
  activeImportCandidateId.value = candidates[0]?.id ?? ''
  sheetImportDialogVisible.value = true
}

const buildImportCandidatesFromFile = async (file: File): Promise<TableImportCandidate[]> => {
  if (isTextTableFile(file)) {
    const content = await readTextFile(file)
    return [createImportCandidate({
      fileName: file.name,
      sheetName: getTextFileSheetName(file),
      content,
    })]
  }

  if (isWorkbookFile(file)) {
    const sheets = await readXlsxFile(file)

    return sheets.map((sheet) => {
      const content = rowsToDelimitedText(sheet.data)
      return createImportCandidate({
        fileName: file.name,
        sheetName: sheet.sheet,
        content,
      })
    }).filter(candidate => candidate.content.trim())
  }

  if (isLegacyWorkbookFile(file)) {
    ElMessage.warning(`旧版 .xls 暂不支持直接解析，请将 ${file.name} 另存为 .xlsx 或 CSV 后导入`)
    return []
  }

  ElMessage.warning(`暂不支持文件格式：${file.name}`)
  return []
}

const createImportCandidate = ({
  fileName,
  sheetName,
  content,
}: {
  fileName: string
  sheetName: string
  content: string
}): TableImportCandidate => {
  const previewRows = buildPreviewRows(content)
  const colCount = previewRows.reduce((max, row) => Math.max(max, row.length), 0)

  return {
    id: `${fileName}-${sheetName}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    fileName,
    sheetName,
    content,
    previewRows,
    rowCount: content.split('\n').filter(line => line.trim()).length,
    colCount,
    selected: Boolean(content.trim()),
  }
}

const confirmSheetImport = () => {
  const selectedCandidates = selectedImportCandidates.value
  if (selectedCandidates.length === 0) {
    ElMessage.warning('请至少选择一个工作表')
    return
  }

  if (pendingSingleImportIndex.value !== null) {
    const targetIndex = pendingSingleImportIndex.value
    const [firstCandidate, ...extraCandidates] = selectedCandidates
    if (firstCandidate && tables.value[targetIndex]) {
      tables.value[targetIndex] = createTable(firstCandidate.content)
    }
    extraCandidates.forEach(candidate => tables.value.push(createTable(candidate.content)))
  } else {
    selectedCandidates.forEach((candidate, candidateIndex) => {
      if (candidateIndex === 0 && tables.value.length === 1 && !tables.value[0]!.content.trim()) {
        tables.value[0] = createTable(candidate.content)
      } else {
        tables.value.push(createTable(candidate.content))
      }
    })
  }

  const importCount = selectedCandidates.length
  sheetImportDialogVisible.value = false
  importCandidates.value = []
  activeImportCandidateId.value = ''
  pendingSingleImportIndex.value = null
  ElMessage.success(`已导入 ${importCount} 个工作表，并自动填入待合并表格`)
}

const selectAllImportCandidates = (selected: boolean) => {
  importCandidates.value.forEach(candidate => {
    if (candidate.content.trim()) {
      candidate.selected = selected
    }
  })
}

const isTextTableFile = (file: File) => {
  const fileName = file.name.toLowerCase()
  return fileName.endsWith('.csv') || fileName.endsWith('.txt')
}

const isWorkbookFile = (file: File) => {
  const fileName = file.name.toLowerCase()
  return fileName.endsWith('.xlsx')
}

const isLegacyWorkbookFile = (file: File) => {
  return file.name.toLowerCase().endsWith('.xls')
}

const getTextFileSheetName = (file: File) => {
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith('.csv')) return 'CSV 文件'
  if (fileName.endsWith('.txt')) return '文本文件'
  return '表格文件'
}

const rowsToDelimitedText = (rawRows: unknown[][]): string => {
  const rows = trimEmptyTableEdges(rawRows.map(row => row.map(formatCellValue)))
  return rows.map(row => row.map(escapeTsvCell).join('\t')).join('\n')
}

const trimEmptyTableEdges = (rows: string[][]): string[][] => {
  const trimmedRows = [...rows]

  while (trimmedRows.length > 0 && trimmedRows[trimmedRows.length - 1]!.every(cell => !cell.trim())) {
    trimmedRows.pop()
  }

  const lastColumnIndex = trimmedRows.reduce((maxIndex, row) => {
    for (let index = row.length - 1; index >= 0; index--) {
      if (row[index]?.trim()) return Math.max(maxIndex, index)
    }
    return maxIndex
  }, -1)

  if (lastColumnIndex < 0) return []
  return trimmedRows.map(row => row.slice(0, lastColumnIndex + 1))
}

const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toLocaleDateString()
  return String(value)
}

const escapeTsvCell = (value: string): string => {
  if (!value.includes('\t') && !value.includes('\n') && !value.includes('"')) return value
  return `"${value.replace(/"/g, '""')}"`
}

const buildPreviewRows = (content: string): string[][] => {
  return content.split('\n')
    .filter(line => line.trim())
    .slice(0, MAX_PREVIEW_ROWS)
    .map(line => line.includes('\t') ? line.split('\t') : line.split(','))
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
  tables.value.push(createTable())
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

  tables.value.forEach((table) => {
    if (!table.content.trim()) return

    const parsed = parseDelimitedTable(table.content, {
      skipRows: table.skipRows,
      headerRowCount: headerRowCount.value,
    })

    if (!parsed) return

    parsedTables.value.push({
      ...parsed,
      recommendedSkipRows: recommendSkipRows(table.content),
    })
    parsed.headers.forEach(h => allHeaders.add(h))
  })

  if (parsedTables.value.length === 0) {
    ElMessage.warning('没有有效的表格数据，请检查跳过行数和标题行数量是否过大')
    return
  }

  // 初始化标准列（使用识别出的所有标题）
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
  ElMessage.success(`已识别 ${parsedTables.value.length} 个表格，共 ${allHeaders.size} 个不同的列，跳过 ${totalSkippedRows.value} 行非表头内容`)
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
    createTable(`员工基本信息汇总
姓名	年龄	部门	工号
张三	28	技术部	E001
李四	32	市场部	E002`),
    createTable(`Name	Age	Dept
王五	25	人事部
赵六	30	财务部`),
    createTable(`表三：入职信息
员工姓名	年龄	所属部门	入职日期
孙七	27	技术部	2020-01-15
周八	29	市场部	2019-06-20`),
  ]
  headerRowCount.value = 1
  currentStep.value = 1
  ElMessage.success('已加载示例数据，并自动推荐跳过合并大标题行')
}

const resetAll = () => {
  ElMessageBox.confirm('确定清空所有数据吗？', '确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    currentStep.value = 1
    tables.value = [createTable()]
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
