<template>
    <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <!-- Sub Header -->
      <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-1.5 flex justify-between items-center h-10 shrink-0">
        <div class="flex items-center gap-3">
          <el-button @click="loadSample" link class="!text-gray-500 hover:!text-blue-600" size="small">加载示例</el-button>
          <el-button @click="exportStateJson" link class="!text-blue-500 hover:!text-blue-600" size="small">导出工作区</el-button>
          <el-button @click="triggerImportJson" link class="!text-blue-500 hover:!text-blue-600" size="small">导入工作区</el-button>
          <input type="file" ref="importJsonRef" class="hidden" accept=".json" @change="handleImportJson" />
          <el-button @click="resetAll" link class="!text-rose-500 hover:!text-rose-600" size="small">清除缓存</el-button>
        </div>
      </div>
      
      <!-- Main Content -->
      <main class="flex-1 flex overflow-hidden">
        <!-- Sidebar / Configuration Panel -->
        <aside class="w-full md:w-96 lg:w-[450px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-2xl relative z-10">
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
            
            <!-- Inputs Section -->
            <section class="space-y-6">
                <div class="space-y-6">
                  <!-- Source Input Card -->
                  <div class="premium-input-group @container">
                    <div class="flex justify-between items-center mb-2 px-1">
                      <label class="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        源列 ({{ sourceCount }})
                      </label>
                    </div>
                    <el-input
                      v-model="sourceText"
                      type="textarea"
                      :rows="4"
                      placeholder="每行输入一个待匹配的源文本..."
                      resize="none"
                      class="premium-textarea"
                    />
                  </div>

                  <!-- Target Input Card -->
                  <div class="premium-input-group @container">
                    <div class="flex justify-between items-center mb-2 px-1">
                      <label class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                        目标库 ({{ targetCount }})
                      </label>
                    </div>
                    <el-input
                      v-model="targetText"
                      type="textarea"
                      :rows="4"
                      placeholder="每行输入一个基准标准文本..."
                      resize="none"
                      class="premium-textarea"
                    />
                  </div>
                </div>
            </section>

            <!-- Settings Section -->
            <section class="space-y-4">
              <div class="flex items-center gap-2 mb-4">
                 <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                 <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">比对引擎高级配置</span>
                 <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
              </div>

              <div class="grid grid-cols-1 gap-4">
                <!-- Toggle Switches Group -->
                <div class="bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 grid grid-cols-2 gap-y-3 gap-x-1">
                   <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="options.ignorePunctuation = !options.ignorePunctuation">
                      <el-checkbox v-model="options.ignorePunctuation" size="small" @click.stop />
                      <span class="text-xs text-gray-600 dark:text-gray-400">忽略符号</span>
                   </div>
                   <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="options.fullwidthToHalfwidth = !options.fullwidthToHalfwidth">
                      <el-checkbox v-model="options.fullwidthToHalfwidth" size="small" @click.stop />
                      <span class="text-xs text-gray-600 dark:text-gray-400">全半角转</span>
                   </div>
                   <div class="col-span-2 flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="options.ignoreInvisibleChars = !options.ignoreInvisibleChars">
                      <el-checkbox v-model="options.ignoreInvisibleChars" size="small" @click.stop />
                      <span class="text-xs text-gray-600 dark:text-gray-400">忽略不可见字符 <span class="text-[10px] text-gray-400 font-normal">(BOM/控制符)</span></span>
                   </div>
                </div>

                <!-- Slider Group -->
                <div class="bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50 space-y-4">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center mb-1">
                           <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wide">匹配阈值</span>
                           <span class="text-xs font-mono font-black text-blue-600">{{ options.threshold }}%</span>
                        </div>
                        <el-slider v-model="options.threshold" :min="0" :max="100" />
                    </div>
                </div>

                <!-- Algorithm Settings -->
                <div class="bg-gray-50/50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                    <div class="flex items-center justify-between mb-4">
                       <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wide">优化策略</span>
                       <el-tag size="small" effect="dark" round class="scale-90 origin-right">Premium</el-tag>
                    </div>
                    
                    <el-radio-group v-model="selectedAlgorithm" size="small" class="w-full flex !mb-4 premium-radio-group">
                       <el-radio-button value="edit" class="flex-1">基础强度</el-radio-button>
                       <el-radio-button value="hybrid" class="flex-1">混合动力</el-radio-button>
                       <el-radio-button value="jaro" class="flex-1">前缀优先</el-radio-button>
                    </el-radio-group>
                    
                    <transition name="el-fade-in-linear">
                      <div v-if="selectedAlgorithm === 'hybrid'" class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mt-2">
                         <div class="flex justify-between text-[10px] text-gray-400 font-mono mb-2">
                            <span>编辑: {{ editWeight }}%</span>
                            <span>Jaro: {{ jaroWeight }}%</span>
                         </div>
                         <el-slider v-model="editWeight" :min="0" :max="100" />
                      </div>
                    </transition>
                </div>

                <!-- Textarea Rules -->
                <div class="space-y-3 pt-2">
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block ml-1">增强同义词组</label>
                        <el-input v-model="synonymText" type="textarea" :rows="2" size="small" placeholder="词1, 词2 (分组换行)..." class="custom-small-textarea" />
                    </div>
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block ml-1">全局忽略关键词</label>
                        <el-input v-model="ignoreText" type="textarea" :rows="2" size="small" placeholder="如：有限公司, 集团..." class="custom-small-textarea" />
                    </div>
                </div>

                <!-- Join Mode Selection -->
                <div class="bg-gray-50/50 dark:bg-gray-700/30 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-gray-500 uppercase tracking-wide">数据连接视角</span>
                        <el-tag size="small" type="info" round class="scale-90 origin-right transition-all">{{ joinMode }}</el-tag>
                    </div>
                    
                    <el-radio-group v-model="joinMode" size="small" class="w-full flex premium-radio-group">
                        <el-radio-button value="left" class="flex-1">Left</el-radio-button>
                        <el-radio-button value="inner" class="flex-1">Inner</el-radio-button>
                        <el-radio-button value="right" class="flex-1">Right</el-radio-button>
                        <el-radio-button value="outer" class="flex-1">Outer</el-radio-button>
                    </el-radio-group>
                    
                    <div class="text-[10px] text-gray-400 mt-2 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-100 dark:border-gray-700 leading-relaxed shadow-inner">
                        <span v-if="joinMode === 'left'">展示 [源列] 所有项，并关联其各推荐匹配。</span>
                        <span v-else-if="joinMode === 'inner'">仅展示 [源列] 中有成功匹配建议的项目。</span>
                        <span v-else-if="joinMode === 'right'">以 [目标库] 为主，从 [源列] 中反向寻找匹配项。</span>
                        <span v-else-if="joinMode === 'outer'">全量展示源项及未匹配的目标项（无匹配补齐）。</span>
                    </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Bottom Action -->
          <footer class="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                    <el-button type="primary" class="w-full !h-12 !rounded-xl !text-sm font-black shadow-lg shadow-blue-500/10 active:scale-95 transition-all" @click="startComparison" :loading="isProcessing">
                      {{ isProcessing ? 'AI 分析中...' : '启动智能比对' }}
                    </el-button>
          </footer>
        </aside>

        <!-- Results Panel -->
        <div class="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900 overflow-hidden relative">
           <!-- Empty State -->
           <div v-if="results.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 select-none">
              <div class="text-center">
                <div class="text-6xl mb-4 text-gray-200 dark:text-gray-700">🔍</div>
                <p class="text-lg font-medium">准备就绪</p>
                <p class="text-sm mt-2">并在左侧输入数据后点击“开始比对”</p>
              </div>
           </div>
           
           <!-- Results List -->
           <div v-else class="flex-1 overflow-auto p-4 scroll-smooth">
               <div class="max-w-5xl mx-auto space-y-4">
                  <div class="sticky top-0 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur z-20 pt-2 pb-4 border-b border-gray-200 dark:border-gray-700 mb-4 px-1 space-y-3">
                      <div class="flex justify-between items-center">
                          <div class="flex items-center gap-6">
                             <div class="flex flex-col">
                                <span class="font-bold text-gray-700 dark:text-gray-200 text-sm italic">智能比对分析报告 ({{ displayResults.length }})</span>
                                <span class="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none">{{ joinMode }} Perspective Enabled</span>
                             </div>
                          </div>
                           <div class="flex gap-2">
                              <el-button type="info" size="small" plain @click="triggerImport">导入锁定</el-button>
                              <el-button type="success" size="small" plain @click="exportSimple" :disabled="lockedItems.size === 0">
                                 导出锁定 ({{ lockedItems.size }})
                              </el-button>
                              <el-button type="primary" size="small" plain @click="exportComplex">
                                 全量报告
                              </el-button>
                              <input type="file" ref="importRef" class="hidden" accept=".csv" @change="handleImport" />
                           </div>
                      </div>

                      <!-- Filter Bar -->
                      <div class="flex flex-wrap items-center gap-3 bg-white/50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <div class="flex-1 min-w-[200px] flex gap-1">
                              <el-input
                                  v-model="filterOptions.searchQuery"
                                  placeholder="搜索源或目标文本..."
                                  size="small"
                                  clearable
                                  class="premium-search-input"
                              >
                                  <template #prefix>
                                      <span class="text-gray-400">🔍</span>
                                  </template>
                              </el-input>
                              <el-tooltip content="正则表达式模式" placement="top">
                                  <div 
                                      class="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all border border-gray-100 dark:border-gray-700"
                                      :class="filterOptions.isRegexSearch ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'"
                                      @click="filterOptions.isRegexSearch = !filterOptions.isRegexSearch"
                                  >
                                      <span class="text-[10px] font-black italic">.*</span>
                                  </div>
                              </el-tooltip>
                          </div>
                          
                          <div class="flex items-center gap-2">
                              <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">锁定状态:</span>
                              <el-radio-group v-model="filterOptions.lockStatus" size="small" class="premium-filter-radio">
                                  <el-radio-button value="all">全部</el-radio-button>
                                  <el-radio-button value="locked">已锁定</el-radio-button>
                                  <el-radio-button value="unlocked">未锁定</el-radio-button>
                              </el-radio-group>
                          </div>

                          <div class="flex items-center gap-2">
                              <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">匹配状态:</span>
                              <el-radio-group v-model="filterOptions.matchStatus" size="small" class="premium-filter-radio">
                                  <el-radio-button value="all">全部</el-radio-button>
                                  <el-radio-button value="matched">有建议</el-radio-button>
                                  <el-radio-button value="unmatched">无建议</el-radio-button>
                              </el-radio-group>
                          </div>
                          
                          <div class="ml-auto flex items-center gap-1" v-if="filterOptions.searchQuery || filterOptions.lockStatus !== 'all' || filterOptions.matchStatus !== 'all'">
                             <el-button link size="small" @click="filterOptions = { lockStatus: 'all', matchStatus: 'all', searchQuery: '', isRegexSearch: false }" class="!text-rose-500 !text-[10px] font-bold">
                                重置筛选
                             </el-button>
                          </div>
                      </div>
                  </div>

                  <div v-for="(item, idx) in displayResults" :key="item.index + '-' + (item.isRight ? 'r' : 'l')" 
                       class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border overflow-hidden transition hover:shadow-md"
                       :class="isLocked(item) ? 'border-green-400 dark:border-green-600 ring-4 ring-green-100 dark:ring-green-900/10' : 'border-gray-200 dark:border-gray-700'">
                      <div class="flex">
                         <div class="w-14 flex flex-col items-center justify-center border-r border-gray-100 dark:border-gray-700"
                              :class="isLocked(item) ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-700/30'">
                            <span class="font-mono text-gray-400 text-sm">{{ idx + 1 }}</span>
                            <span v-if="isLocked(item)" class="text-green-500 text-lg mt-1">🔒</span>
                         </div>
                         <div class="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                               <div class="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">{{ joinMode === 'right' ? 'Target Standard' : 'Source Input' }}</div>
                               <div class="text-gray-900 dark:text-gray-100 text-base leading-relaxed break-all font-semibold italic">{{ item.source }}</div>
                               
                               <div v-if="isLocked(item)" class="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                                  <div class="flex items-center justify-between mb-1">
                                     <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        已确权配对
                                     </span>
                                     <el-button type="danger" size="small" link @click="unlockMatch(item)">解除</el-button>
                                  </div>
                                  <div class="text-sm text-emerald-800 dark:text-emerald-200 font-bold break-all flex items-center gap-2">
                                     {{ getLockedItem(item)?.text }}
                                     <el-tag type="success" size="small" round effect="dark" class="font-mono scale-90">
                                        {{ ((getLockedItem(item)?.similarity || 0) * 100).toFixed(1) }}%
                                     </el-tag>
                                  </div>
                               </div>
                            </div>
                            <div>
                               <div class="flex items-center justify-between mb-1">
                                  <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ joinMode === 'right' ? 'Matched Source' : 'Matched Target' }} Rank #1</div>
                                  <el-button v-if="item.matches.length > 0 && !isLocked(item)" 
                                             type="primary" size="small" text
                                             class="!bg-blue-50 dark:!bg-blue-900/30 !font-black !text-[10px]"
                                             @click="lockMatch(item, item.matches[0]!)">
                                    锁定建议
                                  </el-button>
                               </div>
                               <div v-if="item.matches.length > 0">
                                   <div class="flex items-center justify-between mb-2">
                                       <el-tag :type="getScoreColor(item.matches[0]!.similarity)" effect="dark" size="small" class="font-mono font-black scale-90 origin-left">
                                           {{ (item.matches[0]!.similarity * 100).toFixed(1) }}%
                                       </el-tag>
                                       <span class="text-[10px] text-gray-400 font-mono">ID: {{ item.matches[0]!.index }}</span>
                                   </div>
                                    <div class="mb-3">
                                        <div class="text-sm font-bold text-gray-700 dark:text-gray-200 break-all">
                                            {{ item.matches[0]!.text }}
                                        </div>
                                    </div>
                                    <div class="p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-100 dark:border-gray-800/80 break-all text-sm leading-relaxed overflow-hidden">
                                        <div class="text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-tighter opacity-50">Visual Check</div>
                                        <span v-html="renderDiffHTML(item.source, item.matches[0]!.text)"></span>
                                    </div>
                                   
                                   <div v-if="item.matches.length > 1" class="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                                       <div class="text-[10px] font-black text-gray-400 mb-2 uppercase tracking-widest">其他匹配建议 ({{ Math.min(item.matches.length - 1, 5) }})</div>
                                       <div class="grid grid-cols-1 gap-2">
                                           <div v-for="(match, matchIndex) in item.matches.slice(1, 6)" :key="matchIndex" 
                                                class="px-3 py-2 bg-gray-50/50 dark:bg-gray-800/50 rounded-lg border border-transparent hover:border-blue-400 dark:hover:border-blue-500 transition cursor-pointer flex items-center justify-between"
                                                @click="!isLocked(item) && lockMatch(item, match)">
                                               <div class="flex items-center gap-2 overflow-hidden">
                                                   <el-tag :type="getScoreColor(match.similarity)" effect="plain" size="small" class="font-mono text-[10px] shrink-0">
                                                       {{ (match.similarity * 100).toFixed(1) }}%
                                                   </el-tag>
                                                   <span class="text-xs text-gray-600 dark:text-gray-400 truncate">{{ match.text }}</span>
                                               </div>
                                               <span v-if="!isLocked(item)" class="text-[10px] font-bold text-blue-500 whitespace-nowrap ml-2">Lock</span>
                                           </div>
                                       </div>
                                   </div>
                               </div>
                               <div v-else class="h-full flex flex-col items-center justify-center py-8 opacity-30 select-none">
                                   <div class="text-2xl mb-2">🧊</div>
                                   <div class="text-[10px] font-black uppercase tracking-widest">No Strong Matches</div>
                               </div>
                            </div>
                         </div>
                      </div>
                  </div>
               </div>
           </div>
           
           <!-- Progress Bar -->
           <div v-if="isProcessing" class="absolute top-0 left-0 w-full h-1 bg-blue-100 dark:bg-gray-700 z-50">
              <div class="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]" :style="{ width: progress + '%' }"></div>
           </div>
        </div>
      </main>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { SimilarityCalculator, type BatchResult, type MatchResult } from '../utils/similarity'
import { splitExcelLines } from '../utils/textParser'

// 锁定项接口定义
interface LockedItem {
    matchIndex: number      // 匹配项在目标列表中的索引
    text: string            // 匹配的文本
    similarity: number      // 相似度
}

type JoinMode = 'left' | 'right' | 'inner' | 'outer'

const calculator = new SimilarityCalculator()

// State
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
    weights: { edit: 0.6, jaro: 0.4 }
})

const results = ref<BatchResult[]>([])

// 持久化存储 Key
const STORAGE_KEY = 'premium_similarity_app_cache_v2'

// 算法选择状态
const selectedAlgorithm = ref<'hybrid' | 'edit' | 'jaro'>('edit')
const editWeight = ref(60) // 编辑距离权重百分比（0-100）
const jaroWeight = computed(() => 100 - editWeight.value) // Jaro-Winkler 权重

// 锁定状态管理 - key: 源文本内容, value: 锁定的匹配信息
const lockedItems = ref<Map<string, LockedItem>>(new Map())

// Computed
const sourceCount = computed(() => splitExcelLines(sourceText.value).filter(l => l.trim()).length)
const targetCount = computed(() => splitExcelLines(targetText.value).filter(l => l.trim()).length)

// Filter Options
const filterOptions = ref({
    lockStatus: 'all' as 'all' | 'locked' | 'unlocked',
    matchStatus: 'all' as 'all' | 'matched' | 'unmatched',
    searchQuery: '',
    isRegexSearch: false
})

// Methods

const loadSample = () => {
    sourceText.value = [
        '浙江阿里巴巴云计算有限公司',
        '深圳市腾讯计算机系统有限公司',
        '北京百度网讯科技有限公司',
        '北京字节跳动科技有限公司',
        '北京京东世纪贸易有限公司',
        '小米科技有限责任公司',
        '华为技术有限公司',
        '网易（杭州）网络有限公司'
    ].join('\n')
    targetText.value = [
        '阿里巴巴云计算',
        '腾讯计算机系统',
        '百度网讯科技',
        '字节跳动科技',
        '京东世纪贸易',
        '小米科技',
        '华为技术',
        '网易网络'
    ].join('\n')
    synonymText.value = '阿里巴巴, 阿里\n腾讯, Tencent\n字节跳动, ByteDance\n京东, JD'
    ignoreText.value = '有限公司, 股份有限公司, 有限责任公司, 集团, 分公司, 总部'
    ElMessage.success('已加载高相似度行业示例')
}

const startComparison = async () => {
    const sources = splitExcelLines(sourceText.value).map(s => s.trim()).filter(Boolean)
    const targets = splitExcelLines(targetText.value).map(s => s.trim()).filter(Boolean)

    if (sources.length === 0 || targets.length === 0) {
        ElMessage.warning('请先输入源文本和目标文本')
        return
    }

    isProcessing.value = true
    progress.value = 0
    results.value = []

    // Configure calculator
    calculator.setSynonymGroups(synonymText.value)
    calculator.setIgnoreTerms(ignoreText.value)

    // Run in next tick to allow UI update
    setTimeout(() => {
        try {
            // 根据选择的算法设置权重
            let weights = { edit: 0.6, jaro: 0.4 }
            if (selectedAlgorithm.value === 'edit') {
                weights = { edit: 1.0, jaro: 0.0 }
            } else if (selectedAlgorithm.value === 'jaro') {
                weights = { edit: 0.0, jaro: 1.0 }
            } else {
                // 混合算法，使用用户设置的权重
                weights = { edit: editWeight.value / 100, jaro: jaroWeight.value / 100 }
            }
            
            const res = calculator.batchCalculate(sources, targets, 'left', {
                ...options.value,
                threshold: 0.01, // 内部使用 1% 深度提取，支持滑块动态调整
                weights: weights
            }, (current, total) => {
                progress.value = (current / total) * 100
            })
            
            results.value = res // 存储全量潜在匹配
            ElMessage.success('比对完成')
        } catch (e) {
            console.error(e)
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

const renderDiffHTML = (source: string, match: string) => {
    const diffRes = calculator.calculateCharDiff(match, source, 'lcs')
    return diffRes.diff.map(part => {
        if (part.type === 'added') return `<span class="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 px-0.5 rounded underline decoration-green-500">${part.char}</span>`
        if (part.type === 'removed') return `<span class="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 px-0.5 rounded line-through decoration-red-500">${part.char}</span>`
        return `<span class="text-gray-700 dark:text-gray-300">${part.char}</span>`
    }).join('')
}

// ========== 锁定相关方法 ==========

/**
 * 检查某个源项是否已锁定
 */
const isLocked = (item: BatchResult): boolean => {
    if (joinMode.value === 'right') {
        for (const [_, m] of lockedItems.value.entries()) {
            if (m.text === item.source) return true
        }
        return false
    }
    return lockedItems.value.has(item.source)
}

/**
 * 获取锁定项信息
 */
const getLockedItem = (item: BatchResult): { text: string, similarity: number } | undefined => {
    if (joinMode.value === 'right') {
        for (const [s, m] of lockedItems.value.entries()) {
            if (m.text === item.source) return { text: s, similarity: m.similarity }
        }
        return undefined
    }
    const locked = lockedItems.value.get(item.source)
    return locked ? { text: locked.text, similarity: locked.similarity } : undefined
}

/**
 * 锁定某个匹配项
 */
const lockMatch = (item: BatchResult, match: MatchResult) => {
    if (joinMode.value === 'right') {
        lockedItems.value.set(match.text, { 
            matchIndex: item.index, 
            text: item.source, 
            similarity: match.similarity 
        })
    } else {
        lockedItems.value.set(item.source, {
            matchIndex: match.index,
            text: match.text,
            similarity: match.similarity
        })
    }
    saveState()
    ElMessage.success('匹配项已锁定')
}

/**
 * 解锁某个源项
 */
const unlockMatch = (item: BatchResult) => {
    if (joinMode.value === 'right') {
        for (const [s, m] of lockedItems.value.entries()) {
            if (m.text === item.source) {
                lockedItems.value.delete(s)
                break
            }
        }
    } else {
        lockedItems.value.delete(item.source)
    }
    saveState()
    ElMessage.info('已解除锁定')
}

// 连接逻辑处理
const displayResults = computed(() => {
    if (results.value.length === 0) return []

    const currentThreshold = options.value.threshold / 100

    // 1. 动态过滤：基于当前滑块值过滤全部匹配项（包括最佳匹配）。
    // 我们已经在计算时缓存了 1% 以上的所有结果，此处仅做实时展现过滤，保证操作流畅且逻辑一致。
    let filtered: BatchResult[] = results.value.map(r => {
        const validMatches = r.matches.filter(m => m.similarity >= currentThreshold)
        return { ...r, matches: validMatches }
    })

    let baseResults: BatchResult[] = []

    if (joinMode.value === 'inner') {
        baseResults = filtered.filter(r => {
            if (lockedItems.value.has(r.source)) return true
            return r.matches.length > 0
        })
    } else if (joinMode.value === 'right') {
        const targets = splitExcelLines(targetText.value).map(s => s.trim()).filter(Boolean)
        baseResults = targets.map((t, ti) => {
            const matches: MatchResult[] = []
            filtered.forEach(r => {
                const m = r.matches.find(match => match.text === t)
                if (m) matches.push({ text: r.source, similarity: m.similarity, index: r.index })
                const l = lockedItems.value.get(r.source)
                if (l && l.text === t && !matches.find(x => x.text === r.source)) {
                    matches.push({ text: r.source, similarity: l.similarity, index: r.index })
                }
            })
            matches.sort((a, b) => b.similarity - a.similarity)
            return { source: t, matches, index: ti, isRight: true }
        })
    } else if (joinMode.value === 'outer') {
        const matchedTargets = new Set()
        filtered.forEach(r => {
            if (r.matches.length > 0) matchedTargets.add(r.matches[0]!.text)
            const l = lockedItems.value.get(r.source)
            if (l) matchedTargets.add(l.text)
        })
        const targets = splitExcelLines(targetText.value).map(s => s.trim()).filter(Boolean)
        const unmatchedTargetsResults: BatchResult[] = targets
            .filter(t => !matchedTargets.has(t))
            .map((t, ti) => ({ source: t, matches: [], index: 10000 + ti, isRight: true }))
        
        baseResults = [...filtered, ...unmatchedTargetsResults]
    } else {
        baseResults = filtered
    }

    // 3. 应用进一步的过滤器 (锁定、匹配状态、搜索)
    return baseResults.filter(item => {
        // 锁定状态过滤
        if (filterOptions.value.lockStatus === 'locked' && !isLocked(item)) return false
        if (filterOptions.value.lockStatus === 'unlocked' && isLocked(item)) return false

        // 匹配状态过滤
        if (filterOptions.value.matchStatus === 'matched' && item.matches.length === 0) return false
        if (filterOptions.value.matchStatus === 'unmatched' && item.matches.length > 0) return false

        // 搜索过滤
        if (filterOptions.value.searchQuery) {
            const query = filterOptions.value.searchQuery
            let searchFn: (text: string) => boolean

            if (filterOptions.value.isRegexSearch) {
                try {
                    const regex = new RegExp(query, 'i')
                    searchFn = (text) => regex.test(text)
                } catch (e) {
                    // 如果正则语法错误，回退到普通包含模式
                    searchFn = (text) => text.toLowerCase().includes(query.toLowerCase())
                }
            } else {
                searchFn = (text) => text.toLowerCase().includes(query.toLowerCase())
            }

            const sourceMatch = searchFn(item.source)
            const targetMatch = item.matches.some(m => searchFn(m.text))
            const lockedText = getLockedItem(item)?.text
            const lockedMatch = lockedText ? searchFn(lockedText) : false
            
            if (!sourceMatch && !targetMatch && !lockedMatch) return false
        }

        return true
    })
})

/**
 * 自动锁定所有100%匹配项
 */
const autoLockPerfectMatches = () => {
    results.value.forEach((item) => {
        if (!lockedItems.value.has(item.source) && 
            item.matches.length > 0 && 
            item.matches[0]!.similarity >= 0.9999) {
            lockedItems.value.set(item.source, {
                matchIndex: item.matches[0]!.index,
                text: item.matches[0]!.text,
                similarity: item.matches[0]!.similarity
            })
        }
    })
    saveState()
}

/**
 * 持久化逻辑
 */
const saveState = () => {
    const data = {
        sourceText: sourceText.value,
        targetText: targetText.value,
        synonymText: synonymText.value,
        ignoreText: ignoreText.value,
        options: options.value,
        selectedAlgorithm: selectedAlgorithm.value,
        editWeight: editWeight.value,
        joinMode: joinMode.value,
        lockedItems: Array.from(lockedItems.value.entries())
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

const loadState = () => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
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
        }
    } catch (e) {
        console.error('Failed to load state', e)
    }
    return false
}

const resetAll = () => {
    ElMessageBox.confirm('这将清除所有输入内容和已锁定的配对，确定吗？', '系统提醒', {
        confirmButtonText: '确定重置',
        cancelButtonText: '取消',
        type: 'warning',
        roundButton: true
    }).then(() => {
        localStorage.removeItem(STORAGE_KEY)
        location.reload()
    })
}

// 批量比对完成后自动锁定
watch(results, (newResults) => {
    if (newResults.length > 0) {
        autoLockPerfectMatches()
    }
}, { deep: true })

// 自动保存配置
watch([sourceText, targetText, synonymText, ignoreText, options, selectedAlgorithm, editWeight, joinMode], () => {
    saveState()
}, { deep: true })

// ========== 导入导出工作区 (JSON) ==========

const exportStateJson = () => {
    const data = {
        sourceText: sourceText.value,
        targetText: targetText.value,
        synonymText: synonymText.value,
        ignoreText: ignoreText.value,
        options: options.value,
        selectedAlgorithm: selectedAlgorithm.value,
        editWeight: editWeight.value,
        joinMode: joinMode.value,
        lockedItems: Array.from(lockedItems.value.entries()),
        results: results.value
    }
    const jsonContent = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Similarity_Workspace_${getTimestamp()}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success('工作区导出成功')
}

const importJsonRef = ref<HTMLInputElement | null>(null)
const triggerImportJson = () => importJsonRef.value?.click()

const handleImportJson = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (f) => {
        if (!f.target) return
        try {
            const content = f.target.result as string
            const data = JSON.parse(content)
            
            sourceText.value = data.sourceText || ''
            targetText.value = data.targetText || ''
            synonymText.value = data.synonymText || ''
            ignoreText.value = data.ignoreText || ''
            if (data.options) options.value = { ...options.value, ...data.options }
            selectedAlgorithm.value = data.selectedAlgorithm || 'edit'
            editWeight.value = data.editWeight || 60
            joinMode.value = data.joinMode || 'left'
            if (data.lockedItems) lockedItems.value = new Map(data.lockedItems)
            if (data.results) results.value = data.results
            
            saveState()
            ElMessage.success('成功还原工作区状态')
            target.value = ''
        } catch (err) {
            ElMessage.error('导入失败，请检查 JSON 格式')
            console.error(err)
        }
    }
    reader.readAsText(file)
}


// ========== 导出方法 ==========

/**
 * 生成时间戳字符串（格式：YYYYMMDD_HHmmss）
 */
const getTimestamp = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    return `${year}${month}${day}_${hours}${minutes}${seconds}`
}


/**
 * 简单导出 - 仅导出已锁定的项目（根据当前选择视图）
 */
const exportSimple = () => {
    if (lockedItems.value.size === 0) {
        ElMessage.warning('暂无锁定项可导出')
        return
    }
    
    let csvContent = "\uFEFF"
    csvContent += `模式,基准文本(视图),锁定配对,相似度,状态\n`
    
    displayResults.value.forEach((row) => {
        const locked = getLockedItem(row)
        if (locked) {
            csvContent += `"${joinMode.value}","${row.source.replace(/"/g, '""')}","${locked.text.replace(/"/g, '""')}","${(locked.similarity * 100).toFixed(2)}%","已锁定"\n`
        }
    })

    downloadCSV(csvContent, `简单导出_${joinMode.value}_${getTimestamp()}.csv`)
}

/**
 * 复杂导出 - 已选视图下的全量报告
 */
const exportComplex = () => {
    if (displayResults.value.length === 0) {
        ElMessage.warning('暂无结果可导出')
        return
    }
    
    const MAX_MATCHES = 5
    // 表头： 源项, 锁定匹配, 锁定相似度, 第1相似值, 第1相似度, ..., 第5相似值, 第5相似度
    let header = '源项,锁定匹配,锁定相似度'
    for (let i = 1; i <= MAX_MATCHES; i++) {
        header += `,第${i}相似值,第${i}相似度`
    }
    let csvContent = '\uFEFF' + header + '\n'
    
    displayResults.value.forEach((row) => {
        const locked = getLockedItem(row)
        const lockedText = locked ? `"${locked.text.replace(/"/g, '""')}"` : ''
        const lockedScore = locked ? (locked.similarity * 100).toFixed(2) + '%' : ''
        
        const matchCols: string[] = []
        for (let i = 0; i < MAX_MATCHES; i++) {
            if (row.matches[i]) {
                matchCols.push(`"${row.matches[i]!.text.replace(/"/g, '""')}"`)
                matchCols.push((row.matches[i]!.similarity * 100).toFixed(2) + '%')
            } else {
                matchCols.push('', '')
            }
        }
        
        csvContent += `"${row.source.replace(/"/g, '""')}",${lockedText},${lockedScore},${matchCols.join(',')}\n`
    })

    downloadCSV(csvContent, `全量报表_${joinMode.value}_${getTimestamp()}.csv`)
}

/**
 * 下载CSV文件的辅助函数（使用 Blob 方式，支持中文文件名）
 */
const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

const importRef = ref<HTMLInputElement | null>(null)
const triggerImport = () => importRef.value?.click()

const handleImport = (e: Event) => {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (f) => {
        if (!f.target) return
        try {
            const content = f.target.result as string
            const lines = content.split('\n')
            if (lines.length < 2) throw new Error('File is empty or invalid')

            let importCount = 0
            for (let i = 1; i < lines.length; i++) {
                const rawLine = lines[i]
                if (!rawLine) continue
                const line = rawLine.trim()
                if (!line) continue

                const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
                if (parts && parts.length >= 2) {
                    const source = parts[0]!.replace(/^"|"$/g, '').trim()
                    const match = parts[1]!.replace(/^"|"$/g, '').trim()
                    const sim = parts[2] ? parseFloat(parts[2].replace(/[%"\s]/g, '')) / 100 : 1

                    if (source && match) {
                        lockedItems.value.set(source, {
                            matchIndex: -1, 
                            text: match,
                            similarity: sim
                        })
                        importCount++;
                    }
                }
            }
            saveState()
            ElMessage.success(`成功导入 ${importCount} 条锁定配对`)
            target.value = ''
        } catch (err) {
            ElMessage.error('导入失败，请检查 CSV 格式')
            console.error(err)
        }
    }
    reader.readAsText(file)
}

onMounted(() => {
    if (loadState()) {
        ElNotification({
            title: '工作现场已恢复',
            message: '系统为您自动加载了上次的配置和锁定。',
            type: 'success',
            position: 'bottom-right'
        })
    }
})
</script>

<style>
/* Premium Styles */
.premium-textarea :deep(.el-textarea__inner) {
    border-radius: 12px;
    border: 1px solid rgba(226, 232, 240, 0.8);
    background: rgba(248, 250, 252, 0.5);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    font-size: 13px;
    padding: 12px;
}

.dark .premium-textarea :deep(.el-textarea__inner) {
    background: rgba(15, 23, 42, 0.3);
    border-color: rgba(51, 65, 85, 0.8);
}

.premium-textarea :deep(.el-textarea__inner:focus) {
    background: #fff;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    border-color: #3b82f6;
}

.dark .premium-textarea :deep(.el-textarea__inner:focus) {
    background: rgba(30, 41, 59, 0.8);
}

.custom-small-textarea :deep(.el-textarea__inner) {
    border-radius: 10px;
    font-size: 11px;
    background: #fff;
}

.dark .custom-small-textarea :deep(.el-textarea__inner) {
    background: rgba(15, 23, 42, 0.5);
}

.premium-radio-group :deep(.el-radio-button__inner) {
    background: transparent;
    padding: 8px 12px;
    font-size: 11px;
}

.premium-search-input :deep(.el-input__wrapper) {
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(226, 232, 240, 0.8);
    box-shadow: none !important;
    transition: all 0.3s ease;
}

.dark .premium-search-input :deep(.el-input__wrapper) {
    background: rgba(15, 23, 42, 0.3);
    border-color: rgba(51, 65, 85, 0.8);
}

.premium-search-input :deep(.el-input__wrapper.is-focus) {
    background: #fff;
    border-color: #3b82f6;
    box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1) !important;
}

.premium-filter-radio :deep(.el-radio-button__inner) {
    font-size: 10px;
    padding: 5px 10px;
    background: transparent;
    border: 1px solid transparent;
}

.premium-filter-radio :deep(.el-radio-button__orig-radio:checked + .el-radio-button__inner) {
    background: #3b82f6;
    border-color: #3b82f6;
    box-shadow: -1px 0 0 0 #3b82f6;
}

/* Hide Scrollbar */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
