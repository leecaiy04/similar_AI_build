<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
    <!-- Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-1.5 flex justify-between items-center h-12 shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-sm font-bold flex items-center gap-2">
          <span>🤖 批量 AI 助手</span>
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
                 <label class="text-[10px] font-bold text-gray-400 uppercase text-blue-500">🔖 预设标签重命名</label>
                 <el-input v-model="currentPreset.name" size="small" placeholder="例如：我的 DeepSeek 分析专用" />
              </div>

              <div class="space-y-1">
                 <div class="flex justify-between items-center">
                    <label class="text-[10px] font-bold text-gray-400 uppercase">接口模式</label>
                 </div>
                 <el-select v-model="currentPreset.mode" size="small" class="w-full">
                    <el-option label="OpenAI (兼容格式)" value="openai" />
                    <el-option label="Anthropic (Claude)" value="claude" />
                    <el-option label="Google (Gemini)" value="gemini" />
                    <el-option label="本地测试 (原样返回)" value="test" />
                 </el-select>
              </div>

              <div class="space-y-1">
                 <label class="text-[10px] font-bold text-gray-400 uppercase">Base URL (API 地址 / 代理网关)</label>
                 <el-input v-model="currentPreset.baseUrl" size="small" placeholder="https://api.openai.com/v1" />
                 <div class="text-[9px] text-gray-400 mt-1 leading-tight">
                    <span class="text-orange-400 font-bold">代理说明：</span>纯前端无法直接配置系统底层 HTTP 代理，需科学上网或改用 Cloudflare、OneAPI 等中转 Base URL。
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
                    <el-input v-model="currentPreset.systemPrompt" type="textarea" :rows="2" size="small" placeholder="如：你是一个翻译专家..." class="custom-small-textarea" />
                </div>
                <div class="space-y-1">
                    <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">
                        用户提示词模板 <span class="text-blue-500 bg-blue-50 dark:bg-blue-900/40 px-1 rounded ml-1" v-pre>{{input}}</span>
                    </label>
                    <el-input v-model="currentPreset.promptTemplate" type="textarea" :rows="3" size="small" placeholder="请处理以下数据：\n{{input}}" class="custom-small-textarea" />
                    <div class="text-[9px] text-gray-400 mt-1">请务必包含 <span v-pre>{{input}}</span> 占位符，执行时会被替换为左侧每行数据。</div>
                </div>
                
                <div class="space-y-1 pt-2">
                    <label class="text-[11px] font-bold text-gray-500 uppercase tracking-wide block">并发请求数量 (Max Concurrent)</label>
                    <el-slider v-model="concurrentCount" :min="1" :max="10" size="small" />
                </div>
            </div>
          </section>
        </div>

        <footer class="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <el-button v-if="!isProcessing" type="primary" class="w-full !h-10 !rounded-xl !text-sm font-black shadow-lg shadow-blue-500/10 active:scale-95 transition-all" @click="startBatchRequest">
            开始批量请求
          </el-button>
          <el-button v-else type="danger" class="w-full !h-10 !rounded-xl !text-sm font-black shadow-lg shadow-rose-500/10 active:scale-95 transition-all" @click="stopBatchRequest">
            终止任务
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
                             <el-option label="按空行处理(多行)" value="blankline"></el-option>
                         </el-select>
                     </div>
                     <span class="text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{{ listACount }} 项</span>
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
                     <span class="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">AI 处理结果列</span>
                     <el-button size="small" type="primary" plain class="!h-6 !px-2 !text-[10px]" @click="exportResults" :disabled="outputResults.length === 0">导出</el-button>
                 </div>
                 
                 <div class="flex-1 overflow-auto p-2 bg-gray-50/30 dark:bg-gray-900/30">
                     <div v-if="outputResults.length === 0 && !isProcessing" class="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 select-none">
                         <div class="text-4xl mb-2">✨</div>
                         <p class="text-[10px] font-bold uppercase tracking-widest">等待执行</p>
                     </div>
                     <div class="space-y-[1px]">
                         <div v-for="(res, idx) in displayOutputs" :key="idx" 
                              class="flex bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-sm hover:border-blue-300 transition-colors">
                             <div class="w-8 shrink-0 bg-gray-50 dark:bg-gray-900/50 flex flex-col items-center justify-start py-2 border-r border-gray-100 dark:border-gray-700">
                                 <span class="text-[9px] font-mono text-gray-400">{{ idx + 1 }}</span>
                                 <div v-if="res.status === 'loading'" class="mt-2 w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                 <span v-else-if="res.status === 'success'" class="mt-2 text-green-500 text-[10px]">✔</span>
                                 <span v-else-if="res.status === 'error'" class="mt-2 text-red-500 text-[10px]">✖</span>
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
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { splitTextData } from '../utils/textParser'

interface AIPreset {
    name?: string;
    mode: 'openai' | 'claude' | 'gemini' | 'test';
    baseUrl: string;
    apiKey: string;
    model: string;
    systemPrompt: string;
    promptTemplate: string;
}

interface OutputResult {
    status: 'idle' | 'loading' | 'success' | 'error';
    result: string;
    error: string;
}

// Preset State
const defaultPresets: AIPreset[] = [
    {
        name: 'OpenAI',
        mode: 'openai',
        baseUrl: 'https://api.openai.com/v1',
        apiKey: '',
        model: 'gpt-4o-mini',
        systemPrompt: '你是一个得力的数据处理助手。',
        promptTemplate: '帮忙处理以下文本到英文，只需返回结果：\n{{input}}'
    },
    {
        name: 'Claude',
        mode: 'claude',
        baseUrl: 'https://api123.icu/v1',
        apiKey: '',
        model: 'claude-sonnet-4-6',
        systemPrompt: '你是强大的分析助手。',
        promptTemplate: '分析下列内容并提取关键字，以逗号分隔：\n{{input}}'
    },
    {
        name: '本地测试 (Echo)',
        mode: 'test',
        baseUrl: 'http://localhost/test',
        apiKey: 'test-key',
        model: 'echo-test-model',
        systemPrompt: '本地测试模式',
        promptTemplate: '这是模拟的原样返回内容：\n{{input}}'
    },
    {
        name: 'DeepSeek',
        mode: 'openai',
        baseUrl: 'https://api.deepseek.com',
        apiKey: '',
        model: 'deepseek-chat',
        systemPrompt: '你是专业的文本助手。',
        promptTemplate: '纠正下列文本中的错别字：\n{{input}}'
    },
    {
        name: 'Kimi',
        mode: 'openai',
        baseUrl: 'https://api.moonshot.cn/v1',
        apiKey: '',
        model: 'moonshot-v1-8k',
        systemPrompt: '你是一名擅长精细文本处理的助手。',
        promptTemplate: '请对以下文本进行信息摘要：\n{{input}}'
    },
    {
        name: 'Gemini',
        mode: 'gemini',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        apiKey: '',
        model: 'gemini-1.5-flash',
        systemPrompt: '你是一位高效的数据分析师。',
        promptTemplate: '将以下内容转换成积极正向的语调：\n{{input}}'
    }
]

const presets = ref<AIPreset[]>(JSON.parse(JSON.stringify(defaultPresets)))
const activePresetIndex = ref(0)
const currentPreset = computed(() => presets.value[activePresetIndex.value]!)

// Data State
const textData = ref<Record<string, string>>({})
const splitMode = ref('newline')

const inputNames = computed(() => {
    const config = currentPreset.value;
    if (!config || !config.promptTemplate) return ['input'];
    const matches = config.promptTemplate.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return ['input'];
    const names = matches.map(m => m.slice(2, -2).trim()).filter(Boolean);
    const uniqueNames = Array.from(new Set(names));
    
    uniqueNames.forEach(name => {
        if (textData.value[name] === undefined) {
            textData.value[name] = '';
        }
    });
    
    return uniqueNames.length > 0 ? uniqueNames : ['input'];
})

const outputResults = ref<OutputResult[]>([])
const concurrentCount = ref(3)
const isProcessing = ref(false)
const fetchingModels = ref(false)
const modelList = ref<string[]>([])
let abortController: AbortController | null = null

const getSplitItems = (text: string) => {
    return splitTextData(text, splitMode.value as any).filter(x => x.trim())
}

const listACount = computed(() => {
    let max = 0;
    inputNames.value.forEach(name => {
        const items = getSplitItems(textData.value[name] || '');
        if (items.length > max) max = items.length;
    });
    return max;
})
const processedCount = computed(() => outputResults.value.filter(r => r.status === 'success' || r.status === 'error').length)

// We want display outputs to match line by line with the actual data lines.
// So we extract valid lines first when batch starts.
const activeInputLines = ref<string[]>([])

const displayOutputs = computed(() => {
    // Fill up to activeInputLines length
    const outputs: OutputResult[] = []
    for(let i=0; i<activeInputLines.value.length; i++) {
        if (outputResults.value[i]) {
            outputs.push(outputResults.value[i]!)
        } else {
            outputs.push({ status: 'idle', result: '', error: '' })
        }
    }
    return outputs
})

// Storage Config
const STORAGE_KEY = 'premium_ai_batch_v1'

const loadSample = () => {
    textData.value = { input: [
        '苹果',
        '香蕉',
        '长颈鹿',
        '西瓜'
    ].join('\n') }
    splitMode.value = 'newline'
    const config = presets.value[activePresetIndex.value]
    if (config) {
        config.systemPrompt = '你是一个简单的词典'
        config.promptTemplate = '请将下列词汇翻译为英文，直接给出结果不要多余换行：\n{{input}}'
    }
}

const fetchModels = async () => {
    const config = presets.value[activePresetIndex.value]
    if (!config) return
    if (!config.apiKey || !config.baseUrl) {
        ElMessage.warning('需先填写 Base URL 和 API Key')
        return
    }
    
    fetchingModels.value = true
    modelList.value = []
    
    try {
        if (config.mode === 'test') {
            modelList.value = ['echo-test-model']
            ElMessage.success(`成功获取 1 个测试模型`)
        } else if (config.mode === 'openai') {
            const url = config.baseUrl.endsWith('/') ? `${config.baseUrl}models` : `${config.baseUrl}/models`
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${config.apiKey}` }
            })
            if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`)
            const json = await res.json()
            if (json.data && Array.isArray(json.data)) {
                modelList.value = json.data.map((m: any) => m.id).sort()
                ElMessage.success(`成功获取 ${modelList.value.length} 个模型`)
            } else {
                ElMessage.error('API 返回格式异常，缺少 data 字段')
            }
        } else if (config.mode === 'gemini') {
            const base = config.baseUrl.replace(/\/$/, '')
            const url = `${base}/models?key=${config.apiKey}`
            const res = await fetch(url)
            if (!res.ok) throw new Error(res.statusText || `HTTP ${res.status}`)
            const json = await res.json()
            if (json.models && Array.isArray(json.models)) {
                modelList.value = json.models.map((m: any) => m.name.replace('models/', '')).sort()
                ElMessage.success(`成功获取 ${modelList.value.length} 个模型`)
            } else {
                ElMessage.error('API 返回格式异常')
            }
        } else if (config.mode === 'claude') {
            if (config.baseUrl.includes('api123.icu')) {
                modelList.value = [
                    'claude-haiku-4-5-20251001',
                    'claude-sonnet-4-6',
                    'claude-opus-4-6',
                    'claude-sonnet-4-5-20250929'
                ]
                ElMessage.success('已载入 API123 代理专属可用模型')
            } else {
                ElMessage.info('Claude 原生 API 暂无标准获取模型列表的端点，请手动填写。')
            }
        }
    } catch (e: any) {
        ElMessage.error(`获取模型失败: ${e.message}`)
    } finally {
        fetchingModels.value = false
    }
}

const clearData = () => {
    for (const key in textData.value) {
        textData.value[key] = ''
    }
    outputResults.value = []
    activeInputLines.value = []
}

/**
 * 核心请求逻辑
 */
const makeAIRequest = async (rowData: Record<string, string>, index: number, signal: AbortSignal) => {
    const config = presets.value[activePresetIndex.value]!
    let replacedUserPrompt = config.promptTemplate
    
    inputNames.value.forEach(name => {
        const val = rowData[name] || ''
        replacedUserPrompt = replacedUserPrompt.replace(new RegExp('\\{\\{' + name + '\\}\\}', 'g'), val)
    })
    
    try {
        let response
        let content = ''

        if (config.mode === 'test') {
            await new Promise(r => setTimeout(r, 400))
            content = replacedUserPrompt
        } else if (config.mode === 'openai') {
            const url = config.baseUrl.endsWith('/') ? `${config.baseUrl}chat/completions` : `${config.baseUrl}/chat/completions`
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`
                },
                body: JSON.stringify({
                    model: config.model,
                    messages: [
                        { role: 'system', content: config.systemPrompt },
                        { role: 'user', content: replacedUserPrompt }
                    ],
                    temperature: 0.3
                }),
                signal
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
            const data = await response.json()
            content = data.choices?.[0]?.message?.content || ''
        } else if (config.mode === 'claude') {
            const url = config.baseUrl.endsWith('/') ? `${config.baseUrl}messages` : `${config.baseUrl}/messages`
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': config.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: config.model,
                    system: config.systemPrompt,
                    messages: [
                        { role: 'user', content: replacedUserPrompt }
                    ],
                    max_tokens: 1024
                }),
                signal
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
            const data = await response.json()
            content = data.content?.[0]?.text || ''
        } else if (config.mode === 'gemini') {
            const base = config.baseUrl.replace(/\/$/, '')
            const url = `${base}/models/${config.model}:generateContent?key=${config.apiKey}`
            
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    system_instruction: config.systemPrompt ? { parts: { text: config.systemPrompt } } : undefined,
                    contents: [
                        { parts: [{ text: replacedUserPrompt }] }
                    ]
                }),
                signal
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`)
            const data = await response.json()
            content = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
        }

        outputResults.value[index] = { status: 'success', result: content, error: '' }

    } catch (e: any) {
        if (e.name === 'AbortError') throw e // Re-throw aborts to cancel properly
        outputResults.value[index] = { status: 'error', result: '', error: e.message || '请求失败' }
    }
}

/**
 * 并发队列控制
 */
const startBatchRequest = async () => {
    const maxLen = listACount.value;
    if (maxLen === 0) {
        ElMessage.warning('请输入要处理的源数据')
        return
    }
    const config = presets.value[activePresetIndex.value]!
    if (!config.apiKey && config.mode !== 'test') {
        ElMessage.warning('API Key 不能为空')
        return
    }
    if (!config.baseUrl) {
        ElMessage.warning('Base URL 不能为空')
        return
    }

    const parsedData: Record<string, string[]> = {};
    inputNames.value.forEach(name => {
        parsedData[name] = getSplitItems(textData.value[name] || '');
    });

    const requestsData: Record<string, string>[] = [];
    const lines: string[] = [];

    for (let i = 0; i < maxLen; i++) {
        const rowData: Record<string, string> = {};
        const summaryParts: string[] = [];
        inputNames.value.forEach(name => {
            const val = parsedData[name]?.[i] || '';
            rowData[name] = val;
            summaryParts.push(val);
        });
        requestsData.push(rowData);
        lines.push(summaryParts.join(' | '));
    }

    activeInputLines.value = lines
    outputResults.value = lines.map(() => ({ status: 'idle', result: '', error: '' }))
    isProcessing.value = true
    
    abortController = new AbortController()
    const signal = abortController.signal

    let currentIndex = 0

    const worker = async () => {
        while (currentIndex < maxLen && !signal.aborted) {
            const index = currentIndex++
            outputResults.value[index] = { status: 'loading', result: '', error: '' }
            await makeAIRequest(requestsData[index]!, index, signal)
        }
    }

    const workers: Promise<void>[] = []
    const limit = Math.min(concurrentCount.value, maxLen)
    for (let i = 0; i < limit; i++) {
        workers.push(worker())
    }

    try {
        await Promise.all(workers)
        if (!signal.aborted) {
            ElMessage.success('全部处理完成')
        }
    } catch (e: any) {
        if (e.name === 'AbortError') {
            ElMessage.info('任务已手动终止')
        }
    } finally {
        isProcessing.value = false
        abortController = null
    }
}

const stopBatchRequest = () => {
    if (abortController) {
        abortController.abort()
        abortController = null
    }
}

/**
 * 导出
 */
const exportResults = () => {
    if (activeInputLines.value.length === 0) return
    let csv = '\uFEFF行号,输入数据,AI处理结果,状态\n'
    
    activeInputLines.value.forEach((input, idx) => {
        const res = outputResults.value[idx]
        const inSafe = `"${input.replace(/"/g, '""')}"`
        let outSafe = '""'
        let status = '未执行'
        if (res) {
             outSafe = `"${res.result.replace(/"/g, '""')}"`
             status = res.status === 'success' ? '成功' : (res.status === 'error' ? '失败' : res.status)
             if (res.status === 'error') outSafe = `"[ERROR] ${res.error.replace(/"/g, '""')}"`
        }
        csv += `${idx + 1},${inSafe},${outSafe},${status}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const ts = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
    link.download = `AI批量处理结果_${ts}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * 状态持久化
 */
const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        presets: presets.value,
        activePresetIndex: activePresetIndex.value,
        concurrentCount: concurrentCount.value,
        textData: textData.value,
        splitMode: splitMode.value
    }))
}

onMounted(() => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            // Restore presets safely merging with defaults structure bounds, but preserving default preset names/URIs if local storage corresponds to older empty presets
            if (parsed.presets && Array.isArray(parsed.presets)) {
                parsed.presets.forEach((p: any, i: number) => {
                    if (i < defaultPresets.length && presets.value[i]) {
                        // Priority to names/URLs from defaults unless explicitly saved before as customized URLs by the user
                        // Since this is a newly upgraded format, merge only apiKey/systemPrompt/template if user entered them.
                        // Or just completely merge (p overrides fallback).
                        // If p has no 'name' (from old save), append the current default name
                        const merged = { ...presets.value[i], ...p }
                        if (!p.name) merged.name = presets.value[i]!.name
                        presets.value[i] = merged as AIPreset
                    }
                })
            }
            if (parsed.activePresetIndex !== undefined && parsed.activePresetIndex < defaultPresets.length) {
                activePresetIndex.value = parsed.activePresetIndex
            }
            if (parsed.concurrentCount !== undefined) concurrentCount.value = parsed.concurrentCount
            if (parsed.textData) textData.value = parsed.textData
            else if (parsed.textA) textData.value = { input: parsed.textA }
            if (parsed.splitMode) splitMode.value = parsed.splitMode
        }
    } catch(e) {}
})

watch([presets, activePresetIndex, concurrentCount, textData, splitMode], saveState, { deep: true })
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
