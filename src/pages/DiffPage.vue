锘<template>

  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

    <!-- Action Header -->

    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-1.5 flex justify-between items-center h-10 shrink-0">

      <div class="flex items-center gap-3">

        <el-button @click="loadSample" link class="!text-gray-500 hover:!text-blue-600" size="small">閸旂姾娴囩粈杞扮伐</el-button>

        <el-button @click="clearData" link class="!text-rose-500 hover:!text-rose-600" size="small">濞撳懘娅庨弫鐗堝祦</el-button>

      </div>

      <div class="flex items-center gap-4">

        <span class="text-xs text-gray-500 font-medium">缁犳佺《: </span>

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

                    閺佺増宓 A 缂({{ listACount }})

                  </label>

                </div>

                <el-input

                  v-model="textA"

                  type="textarea"

                  :rows="8"

                  placeholder="姣忚岃緭鍏ヤ竴鏉℃暟鎹..."

                  resize="none"

                  class="premium-textarea"

                />

              </div>



              <!-- Right Data Input -->

              <div class="premium-input-group @container">

                <div class="flex justify-between items-center mb-2 px-1">

                  <label class="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-2">

                    <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>

                    閺佺増宓 B 缂({{ listBCount }})

                  </label>

                </div>

                <el-input

                  v-model="textB"

                  type="textarea"

                  :rows="8"

                  placeholder="姣忚岃緭鍏ヤ竴鏉″规瘮鏁版嵁..."

                  resize="none"

                  class="premium-textarea"

                />

              </div>

            </div>

            

            <div class="bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/50">

              <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="ignoreCase = !ignoreCase">

                 <el-checkbox v-model="ignoreCase" size="small" @click.stop />

                 <span class="text-xs text-gray-600 dark:text-gray-400">Ignore case</span>

              </div>

              <div class="flex items-center gap-2 hover:bg-white dark:hover:bg-gray-800 p-1 rounded-lg transition-colors cursor-pointer" @click="ignoreSpace = !ignoreSpace">

                 <el-checkbox v-model="ignoreSpace" size="small" @click.stop />

                 <span class="text-xs text-gray-600 dark:text-gray-400">闊鍥╂櫕閺嗘劗绮氶搹瑙勓呮稒鍐惧剨</span>

              </div>

            </div>

          </section>

        </div>



        <footer class="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">

          <el-button type="primary" class="w-full !h-12 !rounded-xl !text-sm font-black shadow-lg shadow-blue-500/10 active:scale-95 transition-all" @click="runDiff" :loading="isProcessing">

            {{ isProcessing ? '閻庝絻鍕妲烽悹渚婄磿閻ｇ粯绋?..' : '闂侀幇椤 Diff 閻庝絻鍕妲' }}

          </el-button>

        </footer>

      </aside>



      <!-- Diff Results Panel -->

      <div class="flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-900 overflow-hidden relative">

        <div v-if="results.length === 0" class="absolute inset-0 flex items-center justify-center text-gray-400 select-none">

          <div class="text-center">

            <div class="text-6xl mb-4 text-gray-200 dark:text-gray-700">闁虫寧鐗缁</div>

            <p class="text-lg font-medium">闁告垵妫楅ˇ閻庝絻鍕妲</p>

            <p class="text-sm mt-2">Enter both datasets on the left, then run the row-by-row diff.</p>

          </div>

        </div>



        <div v-else class="flex-1 flex flex-col overflow-hidden p-4">

          <div class="max-w-6xl mx-auto w-full h-full flex flex-col space-y-4">

            <div class="flex justify-between items-center bg-white/95 dark:bg-gray-800/95 backdrop-blur z-20 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700">

               <div>

                 <span class="font-bold text-gray-700 dark:text-gray-200 text-sm">鐎瑰壊鍠栫槐鎾朵絻鍕妲风紓浣规尰閻</span>

                 <span class="ml-3 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">Rows: {{ results.length }}</span>

               </div>

               <el-button type="success" size="small" plain @click="exportDiff">閻庣數鍘ч崵閻庝絻鍕妲烽柟韬插劚閹 (CSV)</el-button>

            </div>



            <!-- Scrollable Diff List -->

            <div class="flex-1 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">

              <div class="diff-grid-header grid grid-cols-[60px_1fr_1fr_80px] bg-gray-100 dark:bg-gray-700/50 py-2 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">

                <div class="text-center">閻炴稑鑻瑜</div>

                <div class="px-4">Data A</div>

                <div class="px-4 border-l border-gray-200 dark:border-gray-600">Data B</div>

                <div class="text-center">Similarity</div>

              </div>



              <div class="divide-y divide-gray-100 dark:divide-gray-800">

                <div v-for="(row, idx) in results" :key="idx" 

                     class="grid grid-cols-[60px_1fr_1fr_80px] hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors py-3 group">

                  <div class="text-center flex flex-col items-center justify-center">

                     <span class="font-mono text-xs text-gray-400">{{ idx + 1 }}</span>

                     <span v-if="row.sim === 1" class="text-[10px] bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-1 rounded mt-1">Exact match</span>

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

import { useDiffWorkspace } from '../features/diff/composables/useDiffWorkspace'



const {

  clearData,

  diffAlgorithm,

  exportDiff,

  getSimColorClass,

  ignoreCase,

  ignoreSpace,

  isProcessing,

  listACount,

  listBCount,

  loadSample,

  renderDiffALeft,

  renderDiffBRight,

  results,

  runDiff,

  textA,

  textB,

} = useDiffWorkspace()

</script>



<style scoped>

.custom-radio :deep(.el-radio-button__inner) {

    background: transparent;

    padding: 6px 12px;

}

</style>





