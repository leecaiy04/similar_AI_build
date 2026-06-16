<template>
    <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <!-- Sub Header -->
      <div class="app-header-gradient px-6 py-3 flex justify-between items-center shrink-0">
        <div class="flex items-center gap-3">
          <h2 class="text-base font-bold flex items-center gap-2 text-white">
            <span class="text-2xl">🔍</span>
            <span>相似度比对</span>
          </h2>
          <el-button @click="showGuide" link class="!text-white/80 hover:!text-white" size="small">使用指南</el-button>
          <el-button @click="loadSample" link class="!text-white/80 hover:!text-white" size="small">加载示例</el-button>
          <el-button @click="exportStateJson" link class="!text-white/80 hover:!text-white" size="small">导出工作区</el-button>
          <el-button @click="triggerImportJson" link class="!text-white/80 hover:!text-white" size="small">导入工作区</el-button>
          <input type="file" ref="importJsonRef" class="hidden" accept=".json" @change="handleImportJson" />
          <el-button @click="resetAll" link class="!text-red-200 hover:!text-white" size="small">清除缓存</el-button>
        </div>
      </div>

      <!-- Guide Component -->
      <SimilarityGuide ref="guideRef" />

      <!-- AI Config Dialog -->
      <el-dialog v-model="aiConfigVisible" title="AI 配置" width="500px">
        <el-form label-width="100px" label-position="left">
          <el-form-item label="API 模式">
            <el-radio-group v-model="aiConfig.mode" size="small">
              <el-radio-button value="claude">Claude API</el-radio-button>
              <el-radio-button value="openai">OpenAI API</el-radio-button>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="Base URL">
            <el-input v-model="aiConfig.baseUrl" placeholder="例如: http://118.89.81.103:8081" />
          </el-form-item>

          <el-form-item label="API Key">
            <el-input v-model="aiConfig.apiKey" type="password" show-password placeholder="输入你的 API Key" />
          </el-form-item>

          <el-form-item label="Model">
            <el-input v-model="aiConfig.model" placeholder="例如: claude-opus-4-8" />
          </el-form-item>

          <el-alert
            title="提示"
            type="info"
            :closable="false"
            class="mb-4"
          >
            配置会自动保存到本地，与"批量 AI"页面共享
          </el-alert>
        </el-form>

        <template #footer>
          <el-button @click="aiConfigVisible = false">取消</el-button>
          <el-button type="primary" @click="saveAIConfig">保存配置</el-button>
        </template>
      </el-dialog>

      <!-- Main Content -->
      <main class="flex-1 flex overflow-hidden">
        <!-- Sidebar / Configuration Panel -->
        <aside class="app-sidebar">
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-hide">

            <!-- Inputs Section -->
            <section class="space-y-6">
                <div class="space-y-6">
                  <!-- Source Input Card -->
                  <div class="app-input-group">
                    <div class="flex justify-between items-center mb-2">
                      <label class="text-sm font-medium text-blue-600 dark:text-blue-400">
                        源列表 ({{ sourceCount }})
                      </label>
                    </div>
                    <el-input
                      v-model="sourceText"
                      type="textarea"
                      :rows="4"
                      placeholder="每行输入一个待匹配的源文本..."
                      resize="none"
                      class="app-textarea"
                    />
                  </div>

                  <!-- Target Input Card -->
                  <div class="app-input-group">
                    <div class="flex justify-between items-center mb-2">
                      <label class="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        目标库 ({{ targetCount }})
                      </label>
                    </div>
                    <el-input
                      v-model="targetText"
                      type="textarea"
                      :rows="4"
                      placeholder="每行输入一个基准标准文本..."
                      resize="none"
                      class="app-textarea"
                    />
                  </div>
                </div>
            </section>

            <!-- Settings Section -->
            <section class="space-y-4">
              <div class="flex items-center gap-2 mb-4">
                 <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                 <span class="text-sm font-bold text-gray-400">算法配置</span>
                 <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
              </div>

              <div class="grid grid-cols-1 gap-4">
                <!-- Toggle Switches Group -->
                <div class="bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 grid grid-cols-2 gap-y-3 gap-x-1">
                   <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="options.ignorePunctuation = !options.ignorePunctuation">
                      <el-checkbox v-model="options.ignorePunctuation" size="small" @click.stop />
                      <span class="text-sm text-gray-600 dark:text-gray-400">忽略标点符号</span>
                   </div>
                   <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="options.fullwidthToHalfwidth = !options.fullwidthToHalfwidth">
                      <el-checkbox v-model="options.fullwidthToHalfwidth" size="small" @click.stop />
                      <span class="text-sm text-gray-600 dark:text-gray-400">全角转半角</span>
                   </div>
                   <div class="col-span-2 flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="options.ignoreInvisibleChars = !options.ignoreInvisibleChars">
                      <el-checkbox v-model="options.ignoreInvisibleChars" size="small" @click.stop />
                      <span class="text-sm text-gray-600 dark:text-gray-400">忽略不可见字符</span>
                   </div>
                </div>

                <!-- Slider Group -->
                <div class="bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50 space-y-4">
                    <div class="space-y-1">
                        <div class="flex justify-between items-center mb-1">
                           <span class="text-sm font-bold text-gray-500">相似度阈值</span>
                           <span class="text-sm font-mono font-black text-blue-600">{{ options.threshold }}%</span>
                        </div>
                        <el-slider v-model="options.threshold" :min="0" :max="100" />
                    </div>
                </div>

                <!-- Algorithm Settings -->
                <div class="bg-gray-50/50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    <div class="flex items-center justify-between mb-4">
                       <span class="text-sm font-bold text-gray-500">算法权重</span>
                       <el-tag size="small" effect="dark" round>高级</el-tag>
                    </div>

                    <el-radio-group v-model="selectedAlgorithm" size="small" class="w-full flex !mb-4 app-radio-group">
                       <el-radio-button value="edit" class="flex-1">编辑距离</el-radio-button>
                       <el-radio-button value="hybrid" class="flex-1">混合模式</el-radio-button>
                       <el-radio-button value="jaro" class="flex-1">Jaro优先</el-radio-button>
                    </el-radio-group>
                    
                    <transition name="el-fade-in-linear">
                      <div v-if="selectedAlgorithm === 'hybrid'" class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm mt-2">
                         <div class="flex justify-between text-[10px] text-gray-400 font-mono mb-2">
                            <span>缂栬緫: {{ editWeight }}%</span>
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
                        <el-input v-model="synonymText" type="textarea" :rows="2" size="small" placeholder="词?, 词? (分组)..." class="custom-small-textarea" />
                    </div>
                    <div class="space-y-1">
                        <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block ml-1">忽略词项</label>
                        <el-input v-model="ignoreText" type="textarea" :rows="2" size="small" placeholder="例如：有限公司， 集团..." class="custom-small-textarea" />
                    </div>
                </div>

                <!-- Join Mode Selection -->
                <div class="bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-gray-700/30 dark:to-gray-700/30 p-5 rounded-2xl border border-blue-100 dark:border-gray-700/50 space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-2">
                            <span class="text-sm">🎯</span>
                            匹配模式
                        </span>
                        <el-tag size="small" type="primary" effect="dark" round class="scale-90 origin-right transition-all font-mono">
                            {{ joinMode === 'left' ? '源为主' : joinMode === 'inner' ? '求同' : joinMode === 'right' ? '标为主' : '全集' }}
                        </el-tag>
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                        <div
                            @click="joinMode = 'left'"
                            class="p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                            :class="joinMode === 'left'
                                ? 'bg-blue-500 border-blue-600 shadow-lg shadow-blue-500/30'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300'">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-lg">📋</span>
                                <span class="text-xs font-black uppercase tracking-wide"
                                      :class="joinMode === 'left' ? 'text-white' : 'text-gray-700 dark:text-gray-300'">
                                    源为主 Left
                                </span>
                            </div>
                            <p class="text-[10px] leading-relaxed"
                               :class="joinMode === 'left' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'">
                                显示所有源列表项及其匹配结果
                            </p>
                        </div>

                        <div
                            @click="joinMode = 'inner'"
                            class="p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                            :class="joinMode === 'inner'
                                ? 'bg-green-500 border-green-600 shadow-lg shadow-green-500/30'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-green-300'">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-lg">🎯</span>
                                <span class="text-xs font-black uppercase tracking-wide"
                                      :class="joinMode === 'inner' ? 'text-white' : 'text-gray-700 dark:text-gray-300'">
                                    求同 Inner
                                </span>
                            </div>
                            <p class="text-[10px] leading-relaxed"
                               :class="joinMode === 'inner' ? 'text-green-100' : 'text-gray-500 dark:text-gray-400'">
                                只显示能匹配上的项（交集）
                            </p>
                        </div>

                        <div
                            @click="joinMode = 'right'"
                            class="p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                            :class="joinMode === 'right'
                                ? 'bg-purple-500 border-purple-600 shadow-lg shadow-purple-500/30'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300'">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-lg">📌</span>
                                <span class="text-xs font-black uppercase tracking-wide"
                                      :class="joinMode === 'right' ? 'text-white' : 'text-gray-700 dark:text-gray-300'">
                                    标为主 Right
                                </span>
                            </div>
                            <p class="text-[10px] leading-relaxed"
                               :class="joinMode === 'right' ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'">
                                以目标库为基准反向匹配源
                            </p>
                        </div>

                        <div
                            @click="joinMode = 'outer'"
                            class="p-3 rounded-xl border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                            :class="joinMode === 'outer'
                                ? 'bg-orange-500 border-orange-600 shadow-lg shadow-orange-500/30'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-orange-300'">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="text-lg">🔄</span>
                                <span class="text-xs font-black uppercase tracking-wide"
                                      :class="joinMode === 'outer' ? 'text-white' : 'text-gray-700 dark:text-gray-300'">
                                    全集 Outer
                                </span>
                            </div>
                            <p class="text-[10px] leading-relaxed"
                               :class="joinMode === 'outer' ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'">
                                显示所有项+未匹配的目标项
                            </p>
                        </div>
                    </div>

                    <div class="text-[10px] text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg border border-gray-200 dark:border-gray-700 leading-relaxed">
                        <div class="flex items-start gap-2">
                            <span class="text-blue-500 shrink-0 mt-0.5">💡</span>
                            <div>
                                <span v-if="joinMode === 'left'" class="font-semibold text-gray-700 dark:text-gray-300">
                                    适用场景：清洗源数据，为每个源项找最佳匹配。配合"未匹配"筛选可实现<strong class="text-blue-600 dark:text-blue-400">左差集</strong>（源有标无）。
                                </span>
                                <span v-else-if="joinMode === 'inner'" class="font-semibold text-gray-700 dark:text-gray-300">
                                    适用场景：<strong class="text-green-600 dark:text-green-400">求交集</strong>，只关注能匹配上的数据，过滤掉无法匹配的项。
                                </span>
                                <span v-else-if="joinMode === 'right'" class="font-semibold text-gray-700 dark:text-gray-300">
                                    适用场景：检查标准库覆盖率，看哪些标准项被源数据匹配到。配合"未匹配"筛选可实现<strong class="text-purple-600 dark:text-purple-400">右差集</strong>（标有源无）。
                                </span>
                                <span v-else-if="joinMode === 'outer'" class="font-semibold text-gray-700 dark:text-gray-300">
                                    适用场景：<strong class="text-orange-600 dark:text-orange-400">全量对比</strong>，查看两边的并集，发现双方的差异项。配合"未匹配"筛选可实现<strong class="text-orange-600 dark:text-orange-400">对称差集</strong>。
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Bottom Action -->
          <footer class="p-5 bg-gradient-to-t from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <el-button type="primary" class="w-full !h-12 !rounded-xl !text-base font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all" @click="startComparison" :loading="isProcessing">
                      <span class="flex items-center justify-center gap-2">
                        <span class="text-xl">🚀</span>
                        <span>{{ isProcessing ? 'AI 分析中...' : '启动智能比对' }}</span>
                      </span>
                    </el-button>
          </footer>
        </aside>

        <!-- Results Panel -->
        <div class="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900 overflow-hidden relative">
           <!-- Empty State -->
           <div v-if="results.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 select-none">
              <div class="text-center">
                <div class="text-6xl mb-4 text-gray-200 dark:text-gray-700">🎯</div>
                <p class="text-lg font-medium">准备完成</p>
                <p class="text-sm mt-2">Add source and target data, then start the comparison.</p>
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
                           <div class="flex gap-2 items-center">
                              <el-button type="warning" size="small" plain @click="batchAISuggestion" :loading="isAIProcessing" :disabled="displayResults.length === 0">
                                 🤖 AI 批量建议
                              </el-button>
                              <el-tooltip content="AI 会分析相似度在 60%-90% 之间且未锁定的项" placement="top">
                                 <span class="text-[10px] text-gray-400 cursor-help">❓</span>
                              </el-tooltip>
                              <el-button size="small" text @click="aiConfigVisible = true" class="!text-[10px]">
                                 ⚙️ AI配置
                              </el-button>
                              <el-button type="info" size="small" plain @click="triggerImport">导入锁定</el-button>
                              <el-button type="success" size="small" plain @click="exportSimple" :disabled="displayLockedCount === 0">
                                 导出锁定 ({{ displayLockedCount }})
                              </el-button>
                              <el-button type="primary" size="small" plain @click="copyToClipboard">
                                 📋 复制到剪贴板
                              </el-button>
                              <el-button type="primary" size="small" plain @click="exportComplex">
                                 全局报告
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
                                      <span class="text-gray-400">🎯</span>
                                  </template>
                              </el-input>
                              <el-tooltip content="Regex mode" placement="top">
                                  <div
                                      class="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all border border-gray-100 dark:border-gray-700"
                                      :class="filterOptions.isRegexSearch ? 'bg-blue-500 text-white border-blue-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400'"
                                      @click="filterOptions.isRegexSearch = !filterOptions.isRegexSearch"
                                  >
                                      <span class="text-[10px] font-black italic">.*</span>
                                  </div>
                              </el-tooltip>
                              <el-tooltip :content="filterOptions.hideSubThreshold ? '显示全部项' : '隐藏低于阈值的项'" placement="top">
                                  <div
                                      class="flex items-center gap-1 px-2 h-8 rounded-lg cursor-pointer transition-all border border-gray-100 dark:border-gray-700 whitespace-nowrap"
                                      :class="filterOptions.hideSubThreshold ? 'bg-orange-500 text-white border-orange-600' : 'bg-gray-50 dark:bg-gray-800 text-gray-400 hover:border-orange-300'"
                                      @click="filterOptions.hideSubThreshold = !filterOptions.hideSubThreshold"
                                  >
                                      <span class="text-sm">🚫</span>
                                      <span class="text-[10px] font-bold">{{ filterOptions.hideSubThreshold ? '已隐藏' : '隐藏' }}</span>
                                  </div>
                              </el-tooltip>
                          </div>

                          <div class="flex items-center gap-2">
                              <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">🔒 锁定状态</span>
                              <el-radio-group v-model="filterOptions.lockStatus" size="small" class="premium-filter-radio">
                                  <el-radio-button value="all">全部</el-radio-button>
                                  <el-radio-button value="locked">已锁定</el-radio-button>
                                  <el-radio-button value="unlocked">未锁定</el-radio-button>
                              </el-radio-group>
                          </div>

                          <div class="flex items-center gap-2">
                              <span class="text-[10px] font-black text-gray-400 uppercase tracking-tighter">🎯 匹配状态</span>
                              <el-radio-group v-model="filterOptions.matchStatus" size="small" class="premium-filter-radio">
                                  <el-radio-button value="all">全部</el-radio-button>
                                  <el-radio-button value="matched">已匹配</el-radio-button>
                                  <el-radio-button value="unmatched">未匹配（求异）</el-radio-button>
                              </el-radio-group>
                          </div>

                          <div class="ml-auto flex items-center gap-1" v-if="filterOptions.searchQuery || filterOptions.lockStatus !== 'all' || filterOptions.matchStatus !== 'all' || filterOptions.hideSubThreshold">
                             <el-button link size="small" @click="filterOptions = { lockStatus: 'all', matchStatus: 'all', searchQuery: '', isRegexSearch: false, hideSubThreshold: false }" class="!text-rose-500 !text-[10px] font-bold">
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

                               <!-- Locked Status Display -->
                               <div v-if="isLocked(item)" class="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                                  <div class="flex items-center justify-between mb-1">
                                     <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest flex items-center gap-1">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                        已确认匹配
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
                               <!-- AI Suggestion Panel -->
                               <div v-if="aiSuggestions.has(item.source) && !isLocked(item)" class="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border-2 border-purple-300 dark:border-purple-700 animate-pulse-once">
                                  <div class="flex items-start justify-between mb-2">
                                     <div class="flex items-center gap-2">
                                        <span class="text-base">🤖</span>
                                        <span class="text-[11px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wide">AI 建议</span>
                                        <el-tag :type="aiSuggestions.get(item.source)!.confidence === '高' ? 'success' : aiSuggestions.get(item.source)!.confidence === '中' ? 'warning' : 'info'"
                                                size="small" effect="dark" class="scale-75">
                                          {{ aiSuggestions.get(item.source)!.confidence }}置信度
                                        </el-tag>
                                     </div>
                                  </div>
                                  <div v-if="aiSuggestions.get(item.source)!.matchIndex !== -1" class="space-y-2">
                                     <div class="text-sm font-bold text-purple-800 dark:text-purple-200 break-all">
                                        {{ aiSuggestions.get(item.source)!.suggestion }}
                                     </div>
                                     <div class="text-xs text-gray-600 dark:text-gray-400 italic">
                                        理由: {{ aiSuggestions.get(item.source)!.reason }}
                                     </div>
                                     <div class="flex gap-2 mt-3">
                                        <el-button type="success" size="small" @click="acceptAISuggestion(item)" class="flex-1">
                                          ✓ 接受建议
                                        </el-button>
                                        <el-button type="info" size="small" plain @click="rejectAISuggestion(item)" class="flex-1">
                                          ✗ 拒绝
                                        </el-button>
                                     </div>
                                  </div>
                                  <div v-else class="text-sm text-gray-600 dark:text-gray-400">
                                     {{ aiSuggestions.get(item.source)!.reason }}
                                  </div>
                               </div>

                               <div class="flex items-center justify-between mb-1">
                                  <div class="text-[10px] font-black text-gray-400 uppercase tracking-widest">{{ joinMode === 'right' ? 'Matched Source' : 'Matched Target' }} Rank #1</div>
                                  <div class="flex gap-2">
                                     <el-button v-if="item.matches.length > 0 && !isLocked(item) && !aiSuggestions.has(item.source)"
                                                type="success" size="small" text
                                                class="!bg-purple-50 dark:!bg-purple-900/30 !font-black !text-[10px]"
                                                @click="getAISuggestion(item)"
                                                :loading="isAIProcessing">
                                       🤖 AI建议
                                     </el-button>
                                     <el-button v-if="item.matches.length > 0 && !isLocked(item)"
                                                type="primary" size="small" text
                                                class="!bg-blue-50 dark:!bg-blue-900/30 !font-black !text-[10px]"
                                                @click="lockMatch(item, item.matches[0]!)">
                                       锁定建议
                                     </el-button>
                                  </div>
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

                                   <!-- Note Section -->
                                   <div v-if="isLocked(item)" class="mt-4 pt-4 border-t border-dashed border-emerald-200 dark:border-emerald-800">
                                       <div class="flex items-center justify-between mb-2">
                                          <div class="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                                             <span>📝</span>
                                             <span>备注</span>
                                          </div>
                                          <span class="text-[9px] text-gray-400">已锁定 ✓</span>
                                       </div>
                                       <el-input
                                          :model-value="getNote(item)"
                                          @input="(val: string) => updateNote(item, val)"
                                          type="textarea"
                                          :rows="2"
                                          placeholder="记录对比过程、判断依据或特殊说明..."
                                          size="small"
                                          class="note-textarea"
                                       />
                                   </div>
                               </div>
                               <div v-else class="h-full flex flex-col items-center justify-center py-8 opacity-30 select-none">
                                   <div class="text-2xl mb-2">💡</div>
                                   <div class="text-[10px] font-black uppercase tracking-widest">No Strong Matches</div>
                               </div>
                            </div>
                         </div>
                      </div>
                  </div>
               </div>
           </div>
           
           <!-- Progress Bar -->
           <div v-if="isProcessing" class="absolute top-0 left-0 w-full z-50">
              <div class="h-1 bg-blue-100 dark:bg-gray-700">
                <div class="h-full bg-blue-600 transition-all duration-300 shadow-[0_0_10px_rgba(37,99,235,0.5)]" :style="{ width: progress + '%' }"></div>
              </div>
              <div class="bg-blue-600 text-white px-4 py-2 text-xs font-mono flex items-center justify-between shadow-lg">
                <span>正在比对中...</span>
                <span class="font-bold">{{ currentProcessingIndex }} / {{ totalProcessingCount }}</span>
                <span>{{ progress.toFixed(1) }}%</span>
              </div>
           </div>
        </div>
      </main>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSimilarityWorkspace } from '../features/similarity/composables/useSimilarityWorkspace'
import SimilarityGuide from '../components/SimilarityGuide.vue'
import { useSharedAIConfig } from '../composables/useSharedAIConfig'
import { ElMessage } from 'element-plus'

const guideRef = ref<InstanceType<typeof SimilarityGuide> | null>(null)

const { config: aiConfig } = useSharedAIConfig()
const aiConfigVisible = ref(false)

const {
  displayResults,
  displayLockedCount,
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
  options,
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
  acceptAISuggestion,
  rejectAISuggestion,
} = useSimilarityWorkspace()

function showGuide() {
  guideRef.value?.show()
}

function saveAIConfig() {
  if (!aiConfig.value.apiKey) {
    ElMessage.warning('请输入 API Key')
    return
  }
  if (!aiConfig.value.baseUrl) {
    ElMessage.warning('请输入 Base URL')
    return
  }
  if (!aiConfig.value.model) {
    ElMessage.warning('请输入 Model')
    return
  }

  aiConfigVisible.value = false
  ElMessage.success('AI 配置已保存')
}

void importJsonRef
void importRef
</script>

<style>
@keyframes pulse-once {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.85;
  }
}

.animate-pulse-once {
  animation: pulse-once 0.8s ease-in-out 1;
}
</style>

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

/* Note Textarea */
.note-textarea :deep(.el-textarea__inner) {
    border-radius: 8px;
    border: 1px solid rgba(16, 185, 129, 0.2);
    background: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    padding: 8px;
    transition: all 0.3s ease;
}

.dark .note-textarea :deep(.el-textarea__inner) {
    background: rgba(6, 78, 59, 0.2);
    border-color: rgba(16, 185, 129, 0.3);
    color: rgb(167, 243, 208);
}

.note-textarea :deep(.el-textarea__inner:focus) {
    border-color: rgb(16, 185, 129);
    background: #fff;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.dark .note-textarea :deep(.el-textarea__inner:focus) {
    background: rgba(6, 78, 59, 0.4);
    border-color: rgb(16, 185, 129);
}
</style>


