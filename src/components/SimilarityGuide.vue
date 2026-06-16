<template>
  <teleport to="body">
    <transition name="slide-in">
      <div v-if="isVisible" class="fixed right-0 top-0 bottom-0 z-[9999] w-full max-w-md shadow-2xl">
        <!-- Guide Panel -->
        <div class="h-full bg-white dark:bg-gray-800 overflow-hidden flex flex-col">
          <!-- Header -->
          <div class="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 text-white flex-shrink-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-2xl">🎯</span>
                <div>
                  <h2 class="text-lg font-bold">使用指南</h2>
                  <p class="text-xs text-blue-100 mt-0.5">边看边操作</p>
                </div>
              </div>
              <button
                @click="closeGuide"
                class="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="bg-gray-100 dark:bg-gray-700 h-1.5">
            <div
              class="bg-blue-500 h-full transition-all duration-300 ease-out"
              :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
            ></div>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-y-auto px-6 py-4">
            <transition name="slide-fade" mode="out-in">
              <div :key="currentStep" class="space-y-4">
                <!-- Step 1: 输入数据 -->
                <div v-if="currentStep === 1" class="space-y-3">
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center text-xl">
                      📝
                    </div>
                    <div class="flex-1">
                      <h3 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
                        步骤 1：输入待比对数据
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        在左侧面板输入您的数据，每行一条记录
                      </p>
                      <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                        <div class="space-y-2">
                          <div>
                            <div class="flex items-center gap-2 mb-1">
                              <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              <span class="text-xs font-bold text-blue-700 dark:text-blue-300">源列表</span>
                            </div>
                            <p class="text-xs text-gray-700 dark:text-gray-300">
                              输入需要清洗或匹配的数据
                            </p>
                          </div>
                          <div>
                            <div class="flex items-center gap-2 mb-1">
                              <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                              <span class="text-xs font-bold text-indigo-700 dark:text-indigo-300">目标库</span>
                            </div>
                            <p class="text-xs text-gray-700 dark:text-gray-300">
                              输入标准库或参考数据
                            </p>
                          </div>
                        </div>
                      </div>
                      <div class="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                        <div class="flex items-start gap-2">
                          <span class="text-amber-600 dark:text-amber-400 text-sm">💡</span>
                          <p class="text-xs text-amber-700 dark:text-amber-300">
                            <strong>小技巧：</strong>点击"加载示例"快速体验
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 2: 选择算法 -->
                <div v-if="currentStep === 2" class="space-y-3">
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-xl">
                      ⚙️
                    </div>
                    <div class="flex-1">
                      <h3 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
                        步骤 2：选择比对算法
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        根据数据特点选择合适的相似度算法
                      </p>
                      <div class="space-y-2">
                        <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-[10px] font-bold">基础强度</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">编辑距离</span>
                          </div>
                          <p class="text-xs text-gray-600 dark:text-gray-400">
                            适合拼写错误、字符增删等场景
                          </p>
                        </div>
                        <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-[10px] font-bold">优先</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">Jaro-Winkler</span>
                          </div>
                          <p class="text-xs text-gray-600 dark:text-gray-400">
                            适合位置变换、前缀匹配
                          </p>
                        </div>
                        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-300 dark:border-purple-700">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-[10px] font-bold">推荐</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">混合动能</span>
                          </div>
                          <p class="text-xs text-gray-600 dark:text-gray-400">
                            结合两种算法，适用于大多数场景
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 3: 调整阈值 -->
                <div v-if="currentStep === 3" class="space-y-3">
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-xl">
                      🎚️
                    </div>
                    <div class="flex-1">
                      <h3 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
                        步骤 3：设置相似度阈值
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        只显示超过阈值的匹配结果
                      </p>
                      <div class="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                        <div class="space-y-3">
                          <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">阈值范围</span>
                            <span class="text-sm font-mono font-black text-blue-600 dark:text-blue-400">0-100%</span>
                          </div>
                          <div class="bg-white dark:bg-gray-800 rounded-lg p-2">
                            <div class="text-[11px] text-gray-600 dark:text-gray-400 space-y-1.5">
                              <div class="flex items-center gap-2">
                                <span class="text-red-500">●</span>
                                <span><strong>60%以下：</strong>宽松，可能误匹配</span>
                              </div>
                              <div class="flex items-center gap-2">
                                <span class="text-amber-500">●</span>
                                <span><strong>60-80%：</strong>平衡，推荐</span>
                              </div>
                              <div class="flex items-center gap-2">
                                <span class="text-green-500">●</span>
                                <span><strong>80%以上：</strong>严格</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div class="flex items-start gap-2">
                          <span class="text-blue-600 dark:text-blue-400 text-sm">💡</span>
                          <p class="text-xs text-blue-700 dark:text-blue-300">
                            <strong>建议：</strong>首次使用设置为 70%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 4: 选择匹配模式 -->
                <div v-if="currentStep === 4" class="space-y-3">
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-xl">
                      🎯
                    </div>
                    <div class="flex-1">
                      <h3 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
                        步骤 4：选择匹配模式
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        不同模式适用于不同业务场景
                      </p>
                      <div class="grid grid-cols-2 gap-2">
                        <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
                          <div class="flex items-center gap-1.5 mb-1">
                            <span class="text-sm">📋</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">源为主</span>
                          </div>
                          <p class="text-[10px] text-gray-600 dark:text-gray-400">
                            显示所有源数据及匹配
                          </p>
                        </div>
                        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-700">
                          <div class="flex items-center gap-1.5 mb-1">
                            <span class="text-sm">🎯</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">求同</span>
                          </div>
                          <p class="text-[10px] text-gray-600 dark:text-gray-400">
                            只显示能匹配上的
                          </p>
                        </div>
                        <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-700">
                          <div class="flex items-center gap-1.5 mb-1">
                            <span class="text-sm">📌</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">标为主</span>
                          </div>
                          <p class="text-[10px] text-gray-600 dark:text-gray-400">
                            检查标准库覆盖率
                          </p>
                        </div>
                        <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 border border-orange-200 dark:border-orange-700">
                          <div class="flex items-center gap-1.5 mb-1">
                            <span class="text-sm">🔄</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">全集</span>
                          </div>
                          <p class="text-[10px] text-gray-600 dark:text-gray-400">
                            显示所有项和差异
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Step 5: 查看结果 -->
                <div v-if="currentStep === 5" class="space-y-3">
                  <div class="flex items-start gap-3">
                    <div class="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-xl">
                      ✨
                    </div>
                    <div class="flex-1">
                      <h3 class="text-base font-bold text-gray-900 dark:text-gray-100 mb-2">
                        步骤 5：分析结果并导出
                      </h3>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        查看匹配结果，锁定确认项，并导出报告
                      </p>
                      <div class="space-y-2">
                        <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="text-base">🔍</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">视觉对比</span>
                          </div>
                          <p class="text-xs text-gray-600 dark:text-gray-400">
                            高亮显示差异部分，快速识别
                          </p>
                        </div>
                        <div class="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="text-base">🔒</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">锁定确认</span>
                          </div>
                          <p class="text-xs text-gray-600 dark:text-gray-400">
                            点击"锁定建议"确认该匹配
                          </p>
                        </div>
                        <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-300 dark:border-indigo-700">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="text-base">📊</span>
                            <span class="text-xs font-bold text-gray-900 dark:text-gray-100">导出功能</span>
                          </div>
                          <div class="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                            <div>• <strong>导出锁定：</strong>仅导出已锁定项</div>
                            <div>• <strong>全局报告：</strong>导出所有匹配结果</div>
                            <div>• <strong>导出工作区：</strong>保存配置和状态</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>

          <!-- Footer -->
          <div class="bg-gray-50 dark:bg-gray-700 px-6 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-600 flex-shrink-0">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500 dark:text-gray-400 font-mono">
                {{ currentStep }} / {{ totalSteps }}
              </span>
            </div>
            <div class="flex items-center gap-3">
              <button
                v-if="currentStep > 1"
                @click="previousStep"
                class="px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                上一步
              </button>
              <button
                v-if="currentStep < totalSteps"
                @click="nextStep"
                class="px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-lg shadow-blue-500/30"
              >
                下一步
              </button>
              <button
                v-else
                @click="finishGuide"
                class="px-6 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-lg shadow-green-500/30"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const isVisible = ref(false)
const currentStep = ref(1)
const totalSteps = 5
const dontShowAgain = ref(false)

function nextStep() {
  if (currentStep.value < totalSteps) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function closeGuide() {
  isVisible.value = false
}

function finishGuide() {
  isVisible.value = false
}

defineExpose({
  show: () => {
    isVisible.value = true
    currentStep.value = 1
    dontShowAgain.value = false
  }
})
</script>

<style scoped>
.slide-in-enter-active,
.slide-in-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-in-enter-from {
  transform: translateX(100%);
}

.slide-in-leave-to {
  transform: translateX(100%);
}

.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.slide-fade-enter-from {
  transform: translateX(20px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-20px);
  opacity: 0;
}
</style>
