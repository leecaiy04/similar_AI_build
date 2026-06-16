<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Action Header -->
    <div class="app-header-gradient px-6 py-3 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-base font-bold flex items-center gap-2 text-white">
          <span class="text-2xl">⚡</span>
          <span>数据 Diff</span>
        </h2>
        <el-button @click="loadSample" link class="!text-white/80 hover:!text-white" size="small">加载示例</el-button>
        <el-button @click="clearData" link class="!text-red-200 hover:!text-white" size="small">清除数据</el-button>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-white/90 font-medium">模式: </span>
          <el-radio-group v-model="compareMode" size="small" class="app-radio-group">
            <el-radio-button value="line">逐行</el-radio-button>
            <el-radio-button value="match">最佳匹配</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="compareMode === 'match'" class="flex items-center gap-2">
          <span class="text-sm text-white/90 font-medium">过滤: </span>
          <el-radio-group v-model="matchFilter" size="small" class="app-radio-group">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="exact">完全匹配</el-radio-button>
            <el-radio-button value="high">高相似</el-radio-button>
            <el-radio-button value="low">低相似</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="compareMode === 'match' && (matchFilter === 'high' || matchFilter === 'low')" class="flex items-center gap-2">
          <span class="text-sm text-white/90 font-medium">阈值: </span>
          <el-input-number v-model="customThreshold" :min="0" :max="1" :step="0.05" :precision="2" size="small" class="w-28" />
        </div>
        <div class="flex items-center gap-2">
          <span class="text-sm text-white/90 font-medium">算法: </span>
          <el-radio-group v-model="diffAlgorithm" size="small" class="app-radio-group">
            <el-radio-button value="lcs">LCS</el-radio-button>
            <el-radio-button value="myers">Myers</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- Main Content Area -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Input Panel (Sidebar) -->
      <aside class="app-sidebar">
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-hide">
          <section class="space-y-6">
            <div class="space-y-6">
              <!-- Left Data Input -->
              <div class="app-input-group">
                <div class="flex justify-between items-center mb-2">
                  <label class="text-sm font-medium text-blue-600 dark:text-blue-400">
                    数据A组 ({{ listACount }})
                  </label>
                </div>
                <el-input
                  v-model="textA"
                  type="textarea"
                  :rows="8"
                  placeholder="每行输入一条数据..."
                  resize="none"
                  class="app-textarea"
                />
              </div>

              <!-- Right Data Input -->
              <div class="app-input-group">
                <div class="flex justify-between items-center mb-2">
                  <label class="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    数据B组 ({{ listBCount }})
                  </label>
                </div>
                <el-input
                  v-model="textB"
                  type="textarea"
                  :rows="8"
                  placeholder="每行输入一条比对数据..."
                  resize="none"
                  class="app-textarea"
                />
              </div>
            </div>

            <div class="bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="ignoreCase = !ignoreCase">
                 <el-checkbox v-model="ignoreCase" size="small" @click.stop />
                 <span class="text-sm text-gray-600 dark:text-gray-400">忽略大小写</span>
              </div>
              <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="ignoreSpace = !ignoreSpace">
                 <el-checkbox v-model="ignoreSpace" size="small" @click.stop />
                 <span class="text-sm text-gray-600 dark:text-gray-400">忽略空白字符</span>
              </div>
            </div>
          </section>
        </div>

        <footer class="p-5 bg-gradient-to-t from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
          <el-button type="primary" class="w-full !h-11 !rounded-lg !text-base font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all" @click="runDiff" :loading="isProcessing">
            <span class="flex items-center justify-center gap-2">
              <span v-if="compareMode === 'line'">{{ isProcessing ? '对比计算中...' : '逐行 Diff 对比' }}</span>
              <span v-else>{{ isProcessing ? '匹配计算中...' : '最佳匹配对比' }}</span>
            </span>
          </el-button>
        </footer>
      </aside>

      <!-- Diff Results Panel -->
      <div class="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900 overflow-hidden relative">
        <div v-if="results.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 select-none">
          <div class="text-center">
            <div class="text-6xl mb-4 text-gray-200 dark:text-gray-700">📊</div>
            <p class="text-lg font-medium">准备对比</p>
            <p class="text-sm mt-2">Enter both datasets on the left, then run the row-by-row diff.</p>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col overflow-hidden p-4">
          <div class="max-w-6xl mx-auto w-full h-full flex flex-col space-y-4">
            <div class="flex justify-between items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur z-20 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700">
               <div>
                 <span class="font-bold text-gray-700 dark:text-gray-200 text-sm">差异对比结果</span>
                 <span class="ml-3 text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Rows: {{ results.length }}</span>
               </div>
               <el-button type="success" size="small" plain @click="exportDiff">导出报告 (CSV)</el-button>
            </div>

            <!-- Scrollable Diff List -->
            <div class="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <div class="diff-grid-header grid bg-gray-100 dark:bg-gray-700/50 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase"
                   :class="compareMode === 'match' ? 'grid-cols-[60px_60px_1fr_1fr_80px]' : 'grid-cols-[60px_1fr_1fr_80px]'">
                <div class="text-center">行号</div>
                <div v-if="compareMode === 'match'" class="text-center">原行号</div>
                <div class="px-4">Data A</div>
                <div class="px-4 border-l border-gray-200 dark:border-gray-600">Data B</div>
                <div class="text-center">相似度</div>
              </div>

              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                <div v-for="(row, idx) in results" :key="idx"
                     class="grid hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors py-3 group"
                     :class="compareMode === 'match' ? 'grid-cols-[60px_60px_1fr_1fr_80px]' : 'grid-cols-[60px_1fr_1fr_80px]'">
                  <div class="text-center flex flex-col items-center justify-center">
                     <span class="font-mono text-sm text-gray-400">{{ idx + 1 }}</span>
                     <span v-if="row.sim === 1" class="text-[11px] bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-1 rounded mt-1">完全匹配</span>
                  </div>

                  <div v-if="compareMode === 'match'" class="text-center flex items-center justify-center">
                     <span class="font-mono text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded">
                       {{ row.originalLineB !== undefined ? row.originalLineB : '-' }}
                     </span>
                  </div>

                  <div class="px-4 font-mono text-sm leading-relaxed break-all">
                     <span v-html="renderDiffALeft(row.diff)"></span>
                  </div>

                  <div class="px-4 border-l border-gray-100 dark:border-gray-700 font-mono text-sm leading-relaxed break-all">
                     <span v-html="renderDiffBRight(row.diff)"></span>
                  </div>

                  <div class="flex items-center justify-center font-mono text-sm font-black" :class="getSimColorClass(row.sim)">
                     {{ (row.sim * 100).toFixed(1) }}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useDiffWorkspace } from '../features/diff/composables/useDiffWorkspace'

const {
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
} = useDiffWorkspace()
</script>

<style scoped>
.app-radio-group :deep(.el-radio-button__inner) {
    background: transparent;
    padding: 6px 12px;
}
</style>


