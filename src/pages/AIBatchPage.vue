<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-1.5 flex justify-between items-center h-12 shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-bold flex items-center gap-2">
          <span>📊 批量 AI 助手</span>
        </h2>
        <el-button @click="loadSample" link class="!text-gray-500 hover:!text-blue-600" size="small">加载示例</el-button>
        <el-button @click="clearData" link class="!text-rose-500 hover:!text-rose-600" size="small">清除数据</el-button>
      </div>
      <div class="flex items-center gap-2">
        <el-tag size="small" type="success" effect="plain" round v-if="isProcessing">
          正在处理: {{ processedCount }} / {{ listACount }}
        </el-tag>
      </div>
    </div>

    <!-- Main Content Area -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Config Panel (Sidebar) -->
      <aside class="w-full md:w-[380px] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shadow-2xl relative z-10 shrink-0">
        <div class="flex-1 overflow-y-auto px-5 py-4 space-y-5 scrollbar-hide">
          <section class="space-y-4">
            <!-- Preset Selection -->
            <div class="flex justify-between items-center">
              <label class="text-[11px] font-bold text-gray-500 uppercase tracking-widest block">配置预设 (主流大模型)</label>
              <el-radio-group v-model="activePresetIndex" size="small">
                 <el-radio-button v-for="(p, n) in presets" :key="n" :value="n" class="px-0">
                   {{ p.name || `P${n+1}` }}
                 </el-radio-button>
              </el-radio-group>
            </div>

            <!-- Configuration Form -->
            <div class="space-y-4 bg-gray-50/50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700/50">
              <div class="space-y-1">
                 <label class="text-[10px] font-bold text-gray-400 uppercase text-blue-500">Preset label</label>
                 <el-input v-model="currentPreset.name" size="small" placeholder="例如：我的 DeepSeek 分析专用" />
              </div>

              <div class="space-y-1">
                 <div class="flex justify-between items-center">
                    <label class="text-[10px] font-bold text-gray-400 uppercase">接口模式</label>
                 </div>
                 <el-select v-model="currentPreset.mode" size="small" class="w-full">
                    <el-option label="OpenAI (通用格式)" value="openai" />
                    <el-option label="Anthropic (Claude)" value="claude" />
                    <el-option label="Google (Gemini)" value="gemini" />
                    <el-option label="本地测试 (原样返回)" value="test" />
                 </el-select>
              </div>

              <div class="space-y-1">
                 <label class="text-[10px] font-bold text-gray-400 uppercase">Base URL (API 地址 / 代理网关)</label>
                 <el-input v-model="currentPreset.baseUrl" size="small" placeholder="https://api.openai.com/v1" />
                 <div class="text-[9px] text-gray-400 mt-1 leading-tight">
                    <span class="text-orange-400 font-bold">Proxy note:</span> Frontend requests cannot attach a system HTTP proxy directly. Use a reachable base URL or a relay such as Cloudflare or OneAPI.
                 </div>
              </div>

              <div class="space-y-1">
                 <label class="text-[10px] font-bold text-gray-400 uppercase">API Key / Token</label>
                 <el-input v-model="currentPreset.apiKey" size="small" type="password" show-password placeholder="sk-..." />
              </div>
              
              <div class="space-y-1">
                 <div class="flex justify-between items-center">
                   <label class="text-[10px] font-bold text-gray-400 uppercase">模型名称 (Model)</label>
                   <el-button size="small" type="primary" link @click="fetchModels" :loading="fetchingModels">获取模型列表</el-button>
                 </div>
                 <el-select 
                    v-model="currentPreset.model" 
                    size="small" 
                    class="w-full"
                    filterable
                    allow-create
                    default-first-option
                    placeholder="可选择或自行输入模型名称..."
                 >
                    <el-option v-for="m in modelList" :key="m" :label="m" :value="m" />
                 </el-select>
              </div>
            </div>

            <!-- Prompt Settings -->
            <div class="space-y-3 pt-2">
                <div class="space-y-1">
                    <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">系统提示词 (System Prompt)</label>
                    <el-input v-model="currentPreset.systemPrompt" type="textarea" :rows="2" size="small" placeholder="例如：你是一个翻译专家..." class="custom-small-textarea" />
                </div>
                <div class="space-y-1">
                    <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
                        用户提示词模板<span class="text-blue-500 bg-blue-50 dark:bg-blue-900/40 px-1 rounded ml-1" v-pre>{{input}}</span>
                    </label>
                    <el-input v-model="currentPreset.promptTemplate" type="textarea" :rows="3" size="small" placeholder="请处理以下数据：\n{{input}}" class="custom-small-textarea" />
                    <div class="text-[9px] text-gray-400 mt-1">Include <span v-pre>{{input}}</span> in the template. It will be replaced with each input row.</div>
                </div>
                
                <div class="space-y-1 pt-2">
                    <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">并发请求数量 (Max Concurrent)</label>
                    <el-slider v-model="concurrentCount" :min="1" :max="3" size="small" />
                </div>
            </div>
          </section>
        </div>

        <footer class="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <el-button v-if="!isProcessing" type="primary" class="w-full !h-10 !rounded-xl !text-sm font-black shadow-lg shadow-blue-500/10 active:scale-95 transition-all" @click="startBatchRequest">
            开始批量请求
          </el-button>
          <el-button v-else type="danger" class="w-full !h-10 !rounded-xl !text-sm font-black shadow-lg shadow-rose-500/10 active:scale-95 transition-all" @click="stopBatchRequest">
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
                         <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">源数据 (输入)</span>
                         <el-select v-model="splitMode" size="small" class="w-32" placeholder="分隔模式">
                             <el-option label="按行处理" value="newline"></el-option>
                             <el-option label="按空行处理 (多段)" value="blankline"></el-option>
                         </el-select>
                     </div>
                     <span class="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{{ listACount }} items</span>
                 </div>
                 <div class="flex-1 flex overflow-hidden">
                     <div v-for="(name, idx) in inputNames" :key="name" 
                          class="flex-1 flex flex-col h-full overflow-hidden"
                          :class="{'border-r border-gray-200 dark:border-gray-700': idx < inputNames.length - 1}">
                         <div v-if="inputNames.length > 1" class="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30 text-[10px] font-bold text-blue-500 uppercase tracking-widest shrink-0">
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
import { useAIBatchWorkspace } from '../features/ai-batch/composables/useAIBatchWorkspace'

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


