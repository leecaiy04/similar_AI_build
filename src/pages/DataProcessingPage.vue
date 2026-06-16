<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Action Header Toolbar -->
    <div class="app-header-gradient px-6 py-3 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-base font-bold flex items-center gap-2 text-white">
          <span class="text-2xl">⚙️</span>
          <span>数据处理</span>
        </h2>
        <el-button @click="clearAll" link class="!text-red-200 hover:!text-white" size="small">清空全部</el-button>
      </div>

      <div class="flex items-center gap-3">
        <!-- 常用功能 -->
        <el-button-group size="small">
          <el-button @click="highlightDuplicates" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">高亮重复</el-button>
          <el-button @click="removeDuplicates" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">删除重复</el-button>
          <el-button @click="removeEmpty" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">删除空行</el-button>
        </el-button-group>

        <el-divider direction="vertical" class="!border-white/30" />

        <!-- 高级工具下拉 -->
        <el-dropdown trigger="click" @command="handleAdvancedTool">
          <el-button size="small" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
            高级工具 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="trimSpaces">去除首尾空格</el-dropdown-item>
              <el-dropdown-item command="extractNumbers">提取数字</el-dropdown-item>
              <el-dropdown-item command="countDuplicates">统计重复次数</el-dropdown-item>
              <el-dropdown-item command="clearHighlights">清除高亮</el-dropdown-item>
              <el-dropdown-item divided command="sortAsc">升序排序</el-dropdown-item>
              <el-dropdown-item command="sortDesc">降序排序</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 转换工具下拉 -->
        <el-dropdown trigger="click" @command="handleConvert">
          <el-button size="small" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
            批量转换 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="lower">转小写</el-dropdown-item>
              <el-dropdown-item command="upper">转大写</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 智能提取下拉 -->
        <el-dropdown trigger="click" @command="handleExtract">
          <el-button size="small" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
            智能提取 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="phone">提取手机号</el-dropdown-item>
              <el-dropdown-item command="email">提取邮箱</el-dropdown-item>
              <el-dropdown-item command="url">提取网址</el-dropdown-item>
              <el-dropdown-item command="idcard">提取身份证号</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 数据脱敏下拉 -->
        <el-dropdown trigger="click" @command="handleMask">
          <el-button size="small" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
            数据脱敏 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="phone">手机号脱敏</el-dropdown-item>
              <el-dropdown-item command="idcard">身份证脱敏</el-dropdown-item>
              <el-dropdown-item command="name">姓名脱敏</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-divider direction="vertical" class="!border-white/30" />

        <!-- 导出 -->
        <el-button type="success" size="small" @click="exportCsv" class="!bg-green-500 hover:!bg-green-600 !border-green-500">
          导出CSV
        </el-button>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Data Input / Editor -->
      <div class="flex-1 p-4 overflow-hidden flex flex-col">
        <div class="flex justify-between items-center mb-2 px-1">
          <label class="text-sm font-bold text-gray-500 flex items-center gap-2">
            数据处理工作区
            <el-tag size="small" type="info" round class="font-mono">{{ dataList.length }} rows</el-tag>
          </label>
          <el-button size="small" type="primary" plain @click="copyAllData" :disabled="dataList.length === 0">
             一键复制
          </el-button>
        </div>

        <div class="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
          <div class="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div class="flex justify-between items-center mb-2">
               <span class="text-sm text-gray-500 font-bold">添加输入</span>
               <el-radio-group v-model="splitMode" size="small">
                 <el-radio-button value="newline">按行分隔</el-radio-button>
                 <el-radio-button value="blankline">按空行分隔</el-radio-button>
               </el-radio-group>
            </div>
            <el-input
              v-model="inputText"
              type="textarea"
              :rows="3"
              placeholder="在此粘贴多段文本数据，或直接输入后点击添加..."
              resize="none"
              class="custom-textarea"
              @keydown.enter.prevent="addTypedData"
            />
            <div class="mt-2 flex justify-end">
              <el-button size="small" type="primary" @click="addTypedData">追加数据到列表 (Enter)</el-button>
            </div>
          </div>

          <!-- Virtual/Rendered List -->
          <div class="flex-1 overflow-auto p-4 bg-white dark:bg-gray-800">
            <div v-if="dataList.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400 select-none pb-12">
               <div class="text-5xl mb-4 text-gray-200 dark:text-gray-700">📋</div>
               <p class="text-sm font-medium">暂无数据</p>
               <p class="text-xs mt-1">在上方粘贴内容并追加到列表</p>
            </div>

            <div v-else class="space-y-1">
              <div 
                v-for="(item, index) in dataList" 
                :key="item.id"
                class="group flex items-center justify-between px-3 py-2 rounded-lg border transition-all"
                :class="[
                  item.isHighlighted 
                    ? 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800/50' 
                    : 'bg-gray-50/50 border-transparent hover:border-gray-200 dark:bg-gray-900/50 dark:hover:border-gray-700'
                ]"
              >
                <!-- Row Number & Content -->
                <div class="flex items-center gap-3 overflow-hidden">
                   <div class="w-6 text-right shrink-0">
                     <span class="text-sm font-mono text-gray-400 select-none">{{ index + 1 }}</span>
                   </div>
                   <div class="font-mono text-sm truncate" :class="item.isHighlighted ? 'text-rose-700 dark:text-rose-400 font-medium' : 'text-gray-700 dark:text-gray-300'">
                     {{ item.value }}
                   </div>
                </div>

                <!-- Status Tags & Actions -->
                <div class="flex items-center gap-2 shrink-0">
                  <el-tag v-if="item.count > 1" type="danger" size="small" effect="plain" round class="scale-90 font-mono">
                    重复 {{ item.count }} 次
                  </el-tag>
                  <el-button type="danger" link icon="Delete" size="small" class="opacity-0 group-hover:opacity-100 transition-opacity" @click="removeRow(index)"></el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataProcessingWorkspace } from '../features/data-processing/composables/useDataProcessingWorkspace'

const {
  addTypedData,
  clearAll,
  clearHighlights,
  convertCase,
  copyAllData,
  countDuplicates,
  dataList,
  extractNumbers,
  highlightDuplicates,
  handleExtract,
  handleMask,
  inputText,
  removeDuplicates,
  removeEmpty,
  removeRow,
  sortData,
  splitMode,
  trimSpaces,
} = useDataProcessingWorkspace()

// Handler functions for dropdown menus
const handleAdvancedTool = (command: string) => {
  switch (command) {
    case 'trimSpaces':
      trimSpaces()
      break
    case 'extractNumbers':
      extractNumbers()
      break
    case 'countDuplicates':
      countDuplicates()
      break
    case 'clearHighlights':
      clearHighlights()
      break
    case 'sortAsc':
      sortData('asc')
      break
    case 'sortDesc':
      sortData('desc')
      break
  }
}

const handleConvert = (command: string) => {
  convertCase(command as 'lower' | 'upper')
}

// Export to CSV
const exportCsv = () => {
  if (dataList.value.length === 0) return
  const csvContent = dataList.value.map(row => row.value).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `data_${Date.now()}.csv`
  link.click()
}

</script>

<style scoped>
.custom-textarea :deep(.el-textarea__inner) {
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    font-size: 13px;
    background: transparent;
    border: none;
    box-shadow: none;
    padding: 0;
}
.custom-textarea :deep(.el-textarea__inner:focus) {
    box-shadow: none;
}
</style>


