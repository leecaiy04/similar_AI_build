<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="app-header-gradient px-6 py-3 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-base font-bold flex items-center gap-2 text-white">
          <span class="text-2xl">🤖</span>
          <span>批量 AI 助手</span>
        </h2>
        <el-button @click="loadSample" link class="!text-white/80 hover:!text-white" size="small">加载示例</el-button>
        <el-button @click="clearData" link class="!text-red-200 hover:!text-white" size="small">清除数据</el-button>
      </div>
      <div class="flex items-center gap-2">
        <el-tag size="large" type="success" effect="light" round v-if="isProcessing" class="!bg-white/20 !text-white !border-white/30">
          正在处理: {{ processedCount }} / {{ listACount }}
        </el-tag>
      </div>
    </div>

    <!-- Main Content Area -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Config Panel (Sidebar) -->
      <aside class="app-sidebar w-[400px]">
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-hide">
          <section class="space-y-5">
            <!-- Preset Selection -->
            <div class="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-sm">
              <div class="flex items-center gap-2 mb-4">
                <label class="text-sm font-bold text-blue-700 dark:text-blue-400">配置预设</label>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div
                  v-for="(p, n) in presets"
                  :key="n"
                  @click="activePresetIndex = n"
                  class="relative cursor-pointer group"
                >
                  <div
                    :title="`${p.mode === 'claude' ? 'Claude' : p.mode === 'openai' ? 'GPT' : '测试'} · ${p.baseUrl}`"
                    class="p-2 rounded-xl border-2 transition-all duration-200 h-12 flex items-center justify-center shadow-sm hover:shadow-md overflow-hidden"
                    :class="activePresetIndex === n
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-600 shadow-lg shadow-blue-500/30 scale-105'
                      : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:scale-105'"
                  >
                    <div class="text-xs font-bold text-center truncate w-full" :class="activePresetIndex === n ? 'text-white' : 'text-gray-700 dark:text-gray-300'">
                      {{ p.name || `P${n+1}` }}
                    </div>
                    <div v-if="activePresetIndex === n" class="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Configuration Form -->
            <div class="space-y-4 bg-gray-50/80 dark:bg-gray-700/40 p-5 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm">
              <div class="space-y-1">
                 <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                   <span>📝</span>
                   <span>预设名称</span>
                 </label>
                 <el-input v-model="currentPreset.name" size="default" placeholder="例如：DeepSeek 分析" class="!rounded-xl" />
              </div>

              <div class="space-y-1">
                 <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                   <span>🔌</span>
                   <span>接口模式</span>
                 </label>
                 <el-select v-model="currentPreset.mode" size="default" class="w-full" @change="handleModeChange">
                    <el-option label="OpenAI (通用格式)" value="openai" />
                    <el-option label="Anthropic (Claude)" value="claude" />
                    <el-option label="Claude Code (本地)" value="claude-code" />
                    <el-option label="测试模式" value="test" />
                 </el-select>
              </div>

              <div class="space-y-1" v-if="currentPreset.mode === 'openai' || currentPreset.mode === 'claude'">
                 <div class="flex items-center justify-between">
                   <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                     <span>🌐</span>
                     <span>线路预设</span>
                   </label>
                   <el-button
                      size="small"
                      type="primary"
                      link
                      @click="testAllServers"
                      :loading="testingSpeed"
                      class="!text-blue-600 hover:!text-blue-700 dark:!text-blue-400"
                   >
                     <span class="flex items-center gap-1">
                       <span>⚡</span>
                       <span>一键测速</span>
                     </span>
                   </el-button>
                 </div>
                 <el-select v-model="currentPreset.baseUrl" size="default" class="w-full">
                    <el-option
                      v-for="server in currentEndpointServers"
                      :key="server.url"
                      :label="getServerLabel(server)"
                      :value="server.url"
                    >
                      <div class="flex items-center justify-between w-full">
                        <span>{{ server.name }}</span>
                        <span v-if="server.latency !== null" class="text-xs ml-2 font-mono font-bold" :class="getLatencyColor(server.latency)">
                          {{ server.latency }}ms
                        </span>
                        <span v-else-if="server.testing" class="text-xs text-blue-500 ml-2 animate-pulse">测试中...</span>
                      </div>
                    </el-option>
                 </el-select>
                 <div class="text-xs mt-2 p-2 rounded-lg" v-if="recommendedServer" :class="'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'">
                    <span class="text-green-700 dark:text-green-400 font-semibold flex items-center gap-1">
                      <span>💡</span>
                      <span>推荐: {{ recommendedServer.name }} ({{ recommendedServer.latency }}ms)</span>
                    </span>
                 </div>
              </div>

              <div class="space-y-1" v-if="currentPreset.mode === 'openai' || currentPreset.mode === 'claude'">
                 <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                   <span>🔗</span>
                   <span>API 地址（可手动覆盖）</span>
                 </label>
                 <el-input v-model="currentPreset.baseUrl" size="default" placeholder="https://cc-vibe.com/v1" />
              </div>

              <div class="space-y-1" v-if="currentPreset.mode !== 'claude-code' && currentPreset.mode !== 'test'">
                 <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                   <span>🔑</span>
                   <span>API Key</span>
                 </label>
                 <el-input v-model="currentPreset.apiKey" size="default" type="password" show-password placeholder="sk-..." @input="saveApiKey" />
                 <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1" v-if="currentPreset.mode === 'openai' || currentPreset.mode === 'claude'">
                    <span>💾</span>
                    <span>默认 API Key 已预设，也会自动保存到浏览器</span>
                 </div>
              </div>

              <div class="space-y-1">
                 <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                   <span>🎯</span>
                   <span>模型名称</span>
                 </label>
                 <div class="flex gap-2">
                   <el-select
                      v-model="currentPreset.model"
                      size="default"
                      class="flex-1"
                      filterable
                      allow-create
                      default-first-option
                      :placeholder="currentPreset.mode === 'claude-code' ? '选择或输入模型' : '输入模型名称...'"
                   >
                      <el-option v-for="m in modelList" :key="m" :label="m" :value="m" />
                   </el-select>
                   <el-button
                      v-if="currentPreset.mode === 'claude-code' || currentPreset.mode === 'claude' || currentPreset.mode === 'openai'"
                      size="default"
                      type="primary"
                      @click="fetchModels"
                      :loading="fetchingModels"
                   >
                     {{ currentPreset.mode === 'claude-code' ? '刷新' : '获取' }}
                   </el-button>
                 </div>
                 <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1" v-if="currentPreset.mode === 'claude-code'">
                    <span>💻</span>
                    <span>使用 Claude Code 本地模型进行推理</span>
                 </div>
              </div>
            </div>

            <!-- Prompt Settings -->
            <div class="space-y-4 pt-2">
                <div class="space-y-2">
                    <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                      <span>💬</span>
                      <span>系统提示词 (System Prompt)</span>
                    </label>
                    <el-input v-model="currentPreset.systemPrompt" type="textarea" :rows="2" size="default" placeholder="例如：你是一个翻译专家..." class="custom-small-textarea" />
                </div>
                <div class="space-y-2">
                    <label class="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase flex items-center gap-2">
                      <span>📋</span>
                      <span>用户提示词模板</span>
                      <span class="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded text-[10px] font-mono" v-pre>{{input}}</span>
                    </label>
                    <el-input v-model="currentPreset.promptTemplate" type="textarea" :rows="3" size="default" placeholder="请处理以下数据：&#10;{{input}}" class="custom-small-textarea" />
                    <div class="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <span>💡</span>
                      <span>模板中使用 <code class="px-1 bg-gray-200 dark:bg-gray-700 rounded" v-pre>{{input}}</code> 表示每行输入内容</span>
                    </div>
                </div>

                <div class="space-y-2 pt-2">
                    <label class="text-sm font-bold text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span>并发请求数量</span>
                      <span class="text-blue-600 dark:text-blue-400 font-mono text-sm ml-auto">{{ concurrentCount }}</span>
                    </label>
                    <el-slider v-model="concurrentCount" :min="1" :max="3" size="default" />
                </div>
            </div>
          </section>
        </div>

        <footer class="p-5 bg-gradient-to-t from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
          <el-button v-if="!isProcessing" type="primary" class="w-full !h-11 !rounded-lg !text-base font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 transition-all" @click="startBatchRequest">
            开始批量请求
          </el-button>
          <el-button v-else type="danger" class="w-full !h-11 !rounded-lg !text-base font-bold shadow-lg shadow-rose-500/20 active:scale-95 transition-all" @click="stopBatchRequest">
            停止任务
          </el-button>
        </footer>
      </aside>

      <!-- Data Panel -->
      <div class="flex-1 flex overflow-hidden bg-gray-50/50 dark:bg-gray-900">
          <div class="flex-1 grid grid-cols-2 gap-px bg-gray-200 dark:bg-gray-700 border-l border-gray-200 dark:border-gray-700">
             
             <!-- Left: Input List -->
             <div class="bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden">
                 <div class="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm z-10">
                     <div class="flex items-center gap-2">
                         <span class="text-sm font-bold text-gray-500">源数据 (输入)</span>
                         <el-select v-model="splitMode" size="small" class="w-32" placeholder="分隔模式">
                             <el-option label="按行处理" value="newline"></el-option>
                             <el-option label="按空行处理 (多段)" value="blankline"></el-option>
                         </el-select>
                     </div>
                     <span class="text-sm font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{{ listACount }} items</span>
                 </div>
                 <div class="flex-1 flex overflow-hidden">
                     <div v-for="(name, idx) in inputNames" :key="name"
                          class="flex-1 flex flex-col h-full overflow-hidden"
                          :class="{'border-r border-gray-200 dark:border-gray-700': idx < inputNames.length - 1}">
                         <div v-if="inputNames.length > 1" class="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30 text-sm font-bold text-blue-500 shrink-0">
                             变量: {{ name }}
                         </div>
                         <el-input
                           v-model="textData[name]"
                           type="textarea"
                           :placeholder="`每行输入对应 {{${name}}} 的处理数据...`"
                           resize="none"
                           class="premium-textarea flex-1 w-full h-full !rounded-none !border-none custom-no-border-textarea"
                         />
                     </div>
                 </div>
             </div>

             <!-- Right: Output List -->
             <div class="bg-white dark:bg-gray-800 flex flex-col h-full overflow-hidden relative">
                 <div class="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shadow-sm z-10">
                     <span class="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">AI output</span>
                     <el-button size="small" type="primary" plain class="!h-6 !px-2 !text-[10px]" @click="exportResults" :disabled="outputResults.length === 0">导出</el-button>
                 </div>
                 
                 <div class="flex-1 overflow-auto p-2 bg-gray-50/30 dark:bg-gray-900/30">
                     <div v-if="outputResults.length === 0 && !isProcessing" class="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 select-none">
                         <div class="text-4xl mb-2">...</div>
                         <p class="text-[10px] font-bold uppercase tracking-widest">等待执行</p>
                     </div>
                     <div class="space-y-[1px]">
                         <div v-for="(res, idx) in displayOutputs" :key="idx" 
                              class="flex bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-sm hover:border-blue-300 transition-colors">
                             <div class="w-8 shrink-0 bg-gray-50 dark:bg-gray-900/50 flex flex-col items-center justify-start py-2 border-r border-gray-100 dark:border-gray-700">
                                 <span class="text-[9px] font-mono text-gray-400">{{ idx + 1 }}</span>
                                 <div v-if="res.status === 'loading'" class="mt-2 w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                 <span v-else-if="res.status === 'success'" class="mt-2 text-green-500 text-[10px]">OK</span>
                                 <span v-else-if="res.status === 'error'" class="mt-2 text-red-500 text-[10px]">ERR</span>
                             </div>
                             <div class="flex-1 p-2 overflow-hidden">
                                 <div v-if="res.status === 'loading'" class="text-xs text-blue-400 italic">请求中...</div>
                                 <div v-else-if="res.status === 'error'" class="text-xs text-red-500 font-mono break-words">{{ res.error }}</div>
                                 <div v-else class="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap">{{ res.result }}</div>
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
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAIBatchWorkspace } from '../features/ai-batch/composables/useAIBatchWorkspace'
import { AI_ENDPOINT_PRESETS, DEFAULT_AI_API_KEY, DEFAULT_AI_MODEL, getAIPresetDetailLabel, normalizeOpenAIBaseUrl } from '../config/aiProviders'

interface OpenAIServer {
  name: string
  url: string
  latency: number | null
  testing: boolean
}

const testingSpeed = ref(false)
const endpointServers = ref<OpenAIServer[]>(AI_ENDPOINT_PRESETS.map((preset) => ({
  name: getAIPresetDetailLabel(preset),
  url: preset.baseUrl,
  latency: null,
  testing: false,
})))

const currentEndpointServers = computed(() => endpointServers.value.filter((server) =>
  currentPreset.value.mode === 'claude' ? server.name.startsWith('Claude-') : server.name.startsWith('GPT-')
))

const recommendedServer = computed(() => {
  const tested = currentEndpointServers.value.filter(s => s.latency !== null)
  if (tested.length === 0) return null
  return tested.reduce((fastest, current) =>
    (current.latency! < fastest.latency!) ? current : fastest
  )
})

const AI_API_KEY_STORAGE='similar_ai_api_storage'

const {
  activePresetIndex,
  clearData,
  concurrentCount,
  currentPreset,
  displayOutputs,
  exportResults,
  fetchModels,
  fetchingModels,
  inputNames,
  isProcessing,
  listACount,
  loadSample,
  modelList,
  outputResults,
  presets,
  processedCount,
  splitMode,
  startBatchRequest,
  stopBatchRequest,
  textData,
} = useAIBatchWorkspace()

onMounted(() => {
  // 恢复保存的 OpenAI-compatible API Key
  const savedKey = localStorage.getItem(AI_API_KEY_STORAGE)
  if (savedKey && currentPreset.value.mode === 'openai' && !currentPreset.value.apiKey) {
    currentPreset.value.apiKey = savedKey
  }
})

function handleModeChange() {
  if (currentPreset.value.mode === 'openai' || currentPreset.value.mode === 'claude') {
    // 设置默认服务器为当前模式的第一条线路
    if (!currentPreset.value.baseUrl || !isOpenAIServer(currentPreset.value.baseUrl)) {
      currentPreset.value.baseUrl = AI_ENDPOINT_PRESETS.find((preset) => preset.provider === currentPreset.value.mode)!.baseUrl
    }

    // 恢复保存的 API Key，否则使用本次预设 Key
    const savedKey = localStorage.getItem(AI_API_KEY_STORAGE)
    currentPreset.value.apiKey = savedKey || currentPreset.value.apiKey || DEFAULT_AI_API_KEY
    currentPreset.value.model = currentPreset.value.model || DEFAULT_AI_MODEL

    fetchModels()
  }
}

function isOpenAIServer(url: string): boolean {
  const normalized = normalizeOpenAIBaseUrl(url)
  return endpointServers.value.some(s => normalizeOpenAIBaseUrl(s.url) === normalized)
}

function saveApiKey() {
  if ((currentPreset.value.mode === 'openai' || currentPreset.value.mode === 'claude') && currentPreset.value.apiKey) {
    localStorage.setItem(AI_API_KEY_STORAGE, currentPreset.value.apiKey)
  }
}

function getServerLabel(server: OpenAIServer): string {
  if (server.latency !== null) {
    return `${server.name} (${server.latency}ms)`
  }
  return server.name
}

function getLatencyColor(latency: number): string {
  if (latency < 200) return 'text-green-600 dark:text-green-400'
  if (latency < 500) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

async function testSingleServer(server: OpenAIServer): Promise<void> {
  server.testing = true
  server.latency = null

  const startTime = Date.now()

  try {
    const url = server.url.endsWith('/') ? server.url : server.url + '/'

    await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache',
    })

    const elapsed = Date.now() - startTime
    server.latency = elapsed
  } catch (error) {
    const elapsed = Date.now() - startTime
    // 即使出错，如果响应快速也说明服务器可达
    if (elapsed < 10000) {
      server.latency = elapsed
    } else {
      server.latency = 9999 // 超时标记
    }
  } finally {
    server.testing = false
  }
}

async function testAllServers() {
  testingSpeed.value = true

  try {
    // 并行测试所有服务器
    await Promise.all(currentEndpointServers.value.map(server => testSingleServer(server)))

    const fastest = recommendedServer.value
    if (fastest) {
      ElMessage.success(`测速完成！推荐使用: ${fastest.name} (${fastest.latency}ms)`)
      // 自动切换到最快的服务器
      currentPreset.value.baseUrl = fastest.url
    } else {
      ElMessage.warning('所有服务器测速失败')
    }
  } catch (error: any) {
    ElMessage.error(`测速失败: ${error.message}`)
  } finally {
    testingSpeed.value = false
  }
}
</script>

<style scoped>
.custom-small-textarea :deep(.el-textarea__inner) {
    border-radius: 8px;
    font-size: 11px;
    background: #fff;
}

.dark .custom-small-textarea :deep(.el-textarea__inner) {
    background: rgba(15, 23, 42, 0.5);
    border-color: rgba(51, 65, 85, 0.8);
}

.custom-no-border-textarea :deep(.el-textarea__inner) {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    font-family: 'JetBrains Mono', 'Monaco', monospace;
    font-size: 13px;
    padding: 12px;
    height: 100% !important;
}

.premium-textarea :deep(.el-textarea__inner:focus) {
    box-shadow: none !important;
}
</style>


