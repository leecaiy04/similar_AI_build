<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Action Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-1.5 flex justify-between items-center h-10 shrink-0">
      <div class="flex items-center gap-3">
        <el-button @click="loadSample" link class="!text-gray-500 hover:!text-blue-600" size="small">加载示例</el-button>
        <el-button @click="clearData" link class="!text-rose-500 hover:!text-rose-600" size="small">清除数据</el-button>
      </div>
      <div class="flex items-center gap-4">
        <span class="text-xs text-gray-500 font-medium">算法: </span>
        <el-radio-group v-model="diffAlgorithm" size="small" class="custom-radio">
          <el-radio-button value="lcs">LCS</el-radio-button>
          <el-radio-button value="myers">Myers</el-radio-button>
        </el-radio-group>
      </div>
    </div>

    <!-- Main Content Area -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Input Panel (Sidebar) -->
      <aside class="w-full md:w-96 lg:w-[450px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-2xl relative z-10">
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
          <section class="space-y-6">
            <div class="space-y-6">
              <!-- Left Data Input -->
              <div class="premium-input-group @container">
                <div class="flex justify-between items-center mb-2 px-1">
                  <label class="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    数据 A组 ({{ listACount }})
                  </label>
                </div>
                <el-input
                  v-model="textA"
                  type="textarea"
                  :rows="8"
                  placeholder="每行输入一条数据..."
                  resize="none"
                  class="premium-textarea"
                />
              </div>

              <!-- Right Data Input -->
              <div class="premium-input-group @container">
                <div class="flex justify-between items-center mb-2 px-1">
                  <label class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    数据 B组 ({{ listBCount }})
                  </label>
                </div>
                <el-input
                  v-model="textB"
                  type="textarea"
                  :rows="8"
                  placeholder="每行输入一条对比数据..."
                  resize="none"
                  class="premium-textarea"
                />
              </div>
            </div>
            
            <div class="bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">
              <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="ignoreCase = !ignoreCase">
                 <el-checkbox v-model="ignoreCase" size="small" @click.stop />
                 <span class="text-xs text-gray-600 dark:text-gray-400">忽略大小写</span>
              </div>
              <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="ignoreSpace = !ignoreSpace">
                 <el-checkbox v-model="ignoreSpace" size="small" @click.stop />
                 <span class="text-xs text-gray-600 dark:text-gray-400">忽略空白字符</span>
              </div>
            </div>
          </section>
        </div>

        <footer class="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
          <el-button type="primary" class="w-full !h-12 !rounded-xl !text-sm font-black shadow-lg shadow-blue-500/10 active:scale-95 transition-all" @click="runDiff" :loading="isProcessing">
            {{ isProcessing ? '对比计算中...' : '逐行 Diff 对比' }}
          </el-button>
        </footer>
      </aside>

      <!-- Diff Results Panel -->
      <div class="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900 overflow-hidden relative">
        <div v-if="results.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 select-none">
          <div class="text-center">
            <div class="text-6xl mb-4 text-gray-200 dark:text-gray-700">⚖️</div>
            <p class="text-lg font-medium">准备对比</p>
            <p class="text-sm mt-2">在左侧输入两组对应数据后点击“逐行 Diff”</p>
          </div>
        </div>

        <div v-else class="flex-1 flex flex-col overflow-hidden p-4">
          <div class="max-w-6xl mx-auto w-full h-full flex flex-col space-y-4">
            <div class="flex justify-between items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur z-20 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700">
               <div>
                 <span class="font-bold text-gray-700 dark:text-gray-200 text-sm">差异对比结果</span>
                 <span class="ml-3 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">共 {{ results.length }} 行</span>
               </div>
               <el-button type="success" size="small" plain @click="exportDiff">导出对比报告 (CSV)</el-button>
            </div>

            <!-- Scrollable Diff List -->
            <div class="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
              <div class="diff-grid-header grid grid-cols-[60px_1fr_1fr_80px] bg-gray-100 dark:bg-gray-700/50 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                <div class="text-center">行号</div>
                <div class="px-4">数据 A组</div>
                <div class="px-4 border-l border-gray-200 dark:border-gray-600">数据 B组</div>
                <div class="text-center">相似度</div>
              </div>

              <div class="divide-y divide-gray-100 dark:divide-gray-800">
                <div v-for="(row, idx) in results" :key="idx" 
                     class="grid grid-cols-[60px_1fr_1fr_80px] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors py-3 group">
                  <div class="text-center flex flex-col items-center justify-center">
                     <span class="font-mono text-xs text-gray-400">{{ idx + 1 }}</span>
                     <span v-if="row.sim === 1" class="text-[10px] bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-1 rounded mt-1">完全一致</span>
                  </div>
                  
                  <div class="px-4 font-mono text-sm leading-relaxed break-all">
                     <span v-html="renderDiffALeft(row.diff)"></span>
                  </div>
                  
                  <div class="px-4 border-l border-gray-100 dark:border-gray-700 font-mono text-sm leading-relaxed break-all">
                     <span v-html="renderDiffBRight(row.diff)"></span>
                  </div>

                  <div class="flex items-center justify-center font-mono text-xs font-black" :class="getSimColorClass(row.sim)">
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
import { ref, computed, watch, onMounted } from 'vue'
import { SimilarityCalculator, type DifferenceItem } from '../utils/similarity'
import { splitExcelLines } from '../utils/textParser'
import { ElMessage } from 'element-plus'

interface DiffRowResult {
    a: string;
    b: string;
    diff: DifferenceItem[];
    sim: number;
}

const calculator = new SimilarityCalculator()

const isProcessing = ref(false)
const textA = ref('')
const textB = ref('')
const ignoreCase = ref(false)
const ignoreSpace = ref(false)
const diffAlgorithm = ref<'lcs'|'myers'>('lcs')
const results = ref<DiffRowResult[]>([])

const listACount = computed(() => splitExcelLines(textA.value).length)
const listBCount = computed(() => splitExcelLines(textB.value).length)

const STORAGE_KEY = 'premium_diff_tool_v1'

const loadSample = () => {
    textA.value = [
        'function calculateTotal(price, tax) {',
        '  return price + tax;',
        '}',
        'const user_id = 12345;',
        'Hello World!'
    ].join('\n')
    textB.value = [
        'function calculateTotal(price, taxRate) {',
        '  return price * (1 + taxRate);',
        '}',
        'const userId = 123456;',
        'Hello world!'
    ].join('\n')
}

const clearData = () => {
    textA.value = ''
    textB.value = ''
    results.value = []
}

const runDiff = () => {
    const listA = splitExcelLines(textA.value)
    const listB = splitExcelLines(textB.value)
    const maxLen = Math.max(listA.length, listB.length)
    
    if (maxLen === 0 || (textA.value.trim() === '' && textB.value.trim() === '')) {
        ElMessage.warning('请输入要对比的数据')
        return
    }

    isProcessing.value = true
    results.value = []

    setTimeout(() => {
        const out: DiffRowResult[] = []
        for(let i=0; i<maxLen; i++) {
            let strA = listA[i] || ''
            let strB = listB[i] || ''
            
            let cmpA = strA
            let cmpB = strB
            
            if (ignoreCase.value) {
                cmpA = cmpA.toLowerCase()
                cmpB = cmpB.toLowerCase()
            }
            if (ignoreSpace.value) {
                cmpA = cmpA.replace(/\s+/g, '')
                cmpB = cmpB.replace(/\s+/g, '')
            }

            const diffRes = calculator.calculateCharDiff(cmpB, cmpA, diffAlgorithm.value)
            
            // Map the simplified diff back to original strings if we ignored space/case
            // To make this visually accurate when viewing the original text, 
            // for simplicity in this implementation we display the processed text if ignore flags are used.
            const displayA = (ignoreCase.value || ignoreSpace.value) ? cmpA : strA
            const displayB = (ignoreCase.value || ignoreSpace.value) ? cmpB : strB

            out.push({
                a: displayA,
                b: displayB,
                diff: diffRes.diff,
                sim: diffRes.similarity
            })
        }
        results.value = out
        isProcessing.value = false
        saveState()
    }, 50)
}

const renderDiffALeft = (diff: DifferenceItem[]) => {
    return diff.filter(d => d.type === 'unchanged' || d.type === 'added').map(part => {
        if (part.type === 'added') {
            return `<span class="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-0.5 rounded font-bold underline decoration-green-500">${escapeHTML(part.char)}</span>`
        }
        return `<span class="text-gray-600 dark:text-gray-400">${escapeHTML(part.char)}</span>`
    }).join('')
}

const renderDiffBRight = (diff: DifferenceItem[]) => {
    return diff.filter(d => d.type === 'unchanged' || d.type === 'removed').map(part => {
        if (part.type === 'removed') {
            return `<span class="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-0.5 rounded font-bold line-through decoration-red-500">${escapeHTML(part.char)}</span>`
        }
        return `<span class="text-gray-600 dark:text-gray-400">${escapeHTML(part.char)}</span>`
    }).join('')
}

const escapeHTML = (str: string) => {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] as string)
    )
}

const getSimColorClass = (sim: number) => {
    if (sim === 1) return 'text-green-600 dark:text-green-400'
    if (sim >= 0.8) return 'text-blue-600 dark:text-blue-400'
    if (sim >= 0.5) return 'text-yellow-600 dark:text-yellow-500'
    return 'text-red-500'
}

const getTimestamp = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}${month}${day}_${hours}${minutes}`
}

const exportDiff = () => {
    if (results.value.length === 0) return
    let csv = '\uFEFF行号,数据A,数据B,相似度,差异详情\n'
    
    results.value.forEach((r, idx) => {
        const aSafe = `"${r.a.replace(/"/g, '""')}"`
        const bSafe = `"${r.b.replace(/"/g, '""')}"`
        const simStr = (r.sim * 100).toFixed(2) + '%'
        
        // Build a readable diff summary text
        const partsText = r.diff.map(d => {
            if (d.type === 'added') return `[+${d.char}]`
            if (d.type === 'removed') return `[-${d.char}]`
            return d.char
        }).join('')
        const diffSafe = `"${partsText.replace(/"/g, '""')}"`
        
        csv += `${idx + 1},${aSafe},${bSafe},${simStr},${diffSafe}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Diff对比报告_${getTimestamp()}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

const saveState = () => {
    const data = { textA: textA.value, textB: textB.value, ignoreCase: ignoreCase.value, ignoreSpace: ignoreSpace.value, diffAlgorithm: diffAlgorithm.value }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

onMounted(() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const data = JSON.parse(stored)
            textA.value = data.textA || ''
            textB.value = data.textB || ''
            ignoreCase.value = data.ignoreCase ?? false
            ignoreSpace.value = data.ignoreSpace ?? false
            diffAlgorithm.value = data.diffAlgorithm || 'lcs'
            if (textA.value || textB.value) runDiff()
        }
    } catch(e) {}
})

watch([textA, textB, ignoreCase, ignoreSpace, diffAlgorithm], () => {
    saveState()
})
</script>

<style scoped>
.custom-radio :deep(.el-radio-button__inner) {
    background: transparent;
    padding: 6px 12px;
}
</style>
