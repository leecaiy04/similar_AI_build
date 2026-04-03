import { computed, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { buildCsvRows } from '../../../core/io/csv'
import { type InputRecord, type ProcessResult } from '../../../core/contracts'
import { createBatchInferenceService } from '../service/batchInferenceService'
import { createLlmInvoke, type LlmInvoke } from '../../../infra/llm'
import { splitTextData } from '../../../utils/textParser'

export interface AIPreset {
  name?: string
  mode: 'openai' | 'claude' | 'gemini' | 'test'
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  promptTemplate: string
}

export interface OutputResult {
  status: 'idle' | 'loading' | 'success' | 'error'
  result: string
  error: string
}

export interface AIBatchRunner {
  runBatch: (
    inputs: InputRecord[],
    options: {
      baseUrl?: string
      apiKey?: string
      model?: string
      systemPrompt?: string
      promptTemplate: string
      maxRetries?: number
    },
    signal?: AbortSignal,
  ) => Promise<ProcessResult[]>
}

const STORAGE_KEY = 'premium_ai_batch_v1'

const defaultPresets: AIPreset[] = [
  {
    name: 'OpenAI',
    mode: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    systemPrompt: '你是一个得力的数据处理助手。',
    promptTemplate: '帮忙处理以下文本到英文，只需返回结果：\n{{input}}',
  },
  {
    name: 'Claude',
    mode: 'claude',
    baseUrl: 'https://api123.icu/v1',
    apiKey: '',
    model: 'claude-sonnet-4-6',
    systemPrompt: '你是强大的分析助手。',
    promptTemplate: '分析下列内容并提取关键词，以逗号分隔：\n{{input}}',
  },
  {
    name: '本地测试 (Echo)',
    mode: 'test',
    baseUrl: 'http://localhost/test',
    apiKey: 'test-key',
    model: 'echo-test-model',
    systemPrompt: '本地测试模式',
    promptTemplate: '这是模拟的原样返回内容：\n{{input}}',
  },
  {
    name: 'DeepSeek',
    mode: 'openai',
    baseUrl: 'https://api.deepseek.com',
    apiKey: '',
    model: 'deepseek-chat',
    systemPrompt: '你是专业的文本助手。',
    promptTemplate: '纠正下列文本中的错别字：\n{{input}}',
  },
  {
    name: 'Kimi',
    mode: 'openai',
    baseUrl: 'https://api.moonshot.cn/v1',
    apiKey: '',
    model: 'moonshot-v1-8k',
    systemPrompt: '你是一名擅长精细文本处理的助手。',
    promptTemplate: '请对以下文本进行信息摘要：\n{{input}}',
  },
  {
    name: 'Gemini',
    mode: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKey: '',
    model: 'gemini-1.5-flash',
    systemPrompt: '你是一位高效的数据分析师。',
    promptTemplate: '将以下内容转换成积极正向的语调：\n{{input}}',
  },
]

function getTimestamp() {
  return new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
}

function extractPromptVariables(template: string) {
  const matches = template.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return ['input']
  return Array.from(new Set(matches.map((match) => match.slice(2, -2).trim()).filter(Boolean)))
}

function createTestInvoke(): LlmInvoke {
  return async (request, signal) => {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, 50)
      signal.addEventListener('abort', () => {
        clearTimeout(timeout)
        reject(new DOMException('Aborted', 'AbortError'))
      })
    })
    return { content: request.prompt }
  }
}

function downloadContent(content: string, filename: string, type: string) {
  if (typeof document === 'undefined') return
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function canUseLocalStorage() {
  return typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function' && typeof localStorage.setItem === 'function'
}

export function useAIBatchWorkspace(runner?: AIBatchRunner) {
  const presets = ref<AIPreset[]>(JSON.parse(JSON.stringify(defaultPresets)))
  const activePresetIndex = ref(0)
  const currentPreset = computed(() => presets.value[activePresetIndex.value]!)
  const textData = ref<Record<string, string>>({})
  const splitMode = ref<'newline' | 'blankline'>('newline')
  const outputResults = ref<OutputResult[]>([])
  const concurrentCount = ref(3)
  const isProcessing = ref(false)
  const fetchingModels = ref(false)
  const modelList = ref<string[]>([])
  const activeInputLines = ref<string[]>([])
  let abortController: AbortController | null = null

  const inputNames = computed(() => {
    const names = extractPromptVariables(currentPreset.value.promptTemplate)
    names.forEach((name) => {
      if (textData.value[name] === undefined) {
        textData.value[name] = ''
      }
    })
    return names
  })

  const listACount = computed(() => {
    let max = 0
    inputNames.value.forEach((name) => {
      const items = splitTextData(textData.value[name] || '', splitMode.value).filter((value) => value.trim())
      if (items.length > max) max = items.length
    })
    return max
  })

  const processedCount = computed(
    () => outputResults.value.filter((row) => row.status === 'success' || row.status === 'error').length,
  )

  const displayOutputs = computed(() => {
    const outputs: OutputResult[] = []
    for (let index = 0; index < activeInputLines.value.length; index++) {
      outputs.push(outputResults.value[index] ?? { status: 'idle', result: '', error: '' })
    }
    return outputs
  })

  const loadSample = () => {
    textData.value = {
      input: ['苹果', '香蕉', '长颈鹿', '西瓜'].join('\n'),
    }
    splitMode.value = 'newline'
    currentPreset.value.systemPrompt = '你是一个简单的词典'
    currentPreset.value.promptTemplate = '请将下列词汇翻译成英文，直接给出结果不要多余换行：\n{{input}}'
  }

  const fetchModels = async () => {
    const config = currentPreset.value
    if (!config.apiKey || !config.baseUrl) {
      ElMessage.warning('需先填写 Base URL 和 API Key')
      return
    }

    fetchingModels.value = true
    modelList.value = []

    try {
      if (config.mode === 'test') {
        modelList.value = ['echo-test-model']
      } else if (config.mode === 'openai') {
        const url = config.baseUrl.endsWith('/') ? `${config.baseUrl}models` : `${config.baseUrl}/models`
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${config.apiKey}` },
        })
        if (!response.ok) throw new Error(response.statusText || `HTTP ${response.status}`)
        const json = await response.json()
        modelList.value = Array.isArray(json.data) ? json.data.map((item: { id: string }) => item.id).sort() : []
      } else if (config.mode === 'gemini') {
        const url = `${config.baseUrl.replace(/\/$/, '')}/models?key=${config.apiKey}`
        const response = await fetch(url)
        if (!response.ok) throw new Error(response.statusText || `HTTP ${response.status}`)
        const json = await response.json()
        modelList.value = Array.isArray(json.models)
          ? json.models.map((item: { name: string }) => item.name.replace('models/', '')).sort()
          : []
      } else if (config.mode === 'claude') {
        if (config.baseUrl.includes('api123.icu')) {
          modelList.value = [
            'claude-haiku-4-5-20251001',
            'claude-sonnet-4-6',
            'claude-opus-4-6',
            'claude-sonnet-4-5-20250929',
          ]
        }
      }
      ElMessage.success(`成功获取 ${modelList.value.length} 个模型`)
    } catch (error) {
      ElMessage.error(`获取模型失败: ${(error as Error).message}`)
    } finally {
      fetchingModels.value = false
    }
  }

  const clearData = () => {
    Object.keys(textData.value).forEach((key) => {
      textData.value[key] = ''
    })
    outputResults.value = []
    activeInputLines.value = []
  }

  const startBatchRequest = async () => {
    if (listACount.value === 0) {
      ElMessage.warning('请输入要处理的源数据')
      return
    }

    const config = currentPreset.value
    if (!config.apiKey && config.mode !== 'test') {
      ElMessage.warning('API Key 不能为空')
      return
    }
    if (!config.baseUrl && config.mode !== 'test') {
      ElMessage.warning('Base URL 不能为空')
      return
    }

    const parsedData: Record<string, string[]> = {}
    inputNames.value.forEach((name) => {
      parsedData[name] = splitTextData(textData.value[name] || '', splitMode.value).filter((value) => value.trim())
    })

    const inputs: InputRecord[] = []
    activeInputLines.value = []

    for (let index = 0; index < listACount.value; index++) {
      const fields: Record<string, string> = {}
      const summary: string[] = []
      inputNames.value.forEach((name) => {
        const value = parsedData[name]?.[index] || ''
        fields[name] = value
        summary.push(value)
      })
      inputs.push({ id: String(index + 1), fields })
      activeInputLines.value.push(summary.join(' | '))
    }

    outputResults.value = activeInputLines.value.map(() => ({ status: 'loading', result: '', error: '' }))
    isProcessing.value = true
    abortController = new AbortController()

    const invoke = config.mode === 'test' ? createTestInvoke() : createLlmInvoke(config.mode)
    const service = createBatchInferenceService({
      concurrency: Math.min(concurrentCount.value, listACount.value),
      invoke,
    })
    const runBatch = runner?.runBatch ?? service.runBatch

    try {
      const results = await runBatch(
        inputs,
        {
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
          systemPrompt: config.systemPrompt,
          promptTemplate: config.promptTemplate,
          maxRetries: 0,
        },
        abortController.signal,
      )

      outputResults.value = results.map((result) =>
        result.status === 'error'
          ? { status: 'error', result: '', error: result.error?.message ?? '请求失败' }
          : { status: 'success', result: result.output.content ?? '', error: '' },
      )
      ElMessage.success('全部处理完成')
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError'
      outputResults.value = outputResults.value.map((row) =>
        row.status === 'loading'
          ? { status: 'error', result: '', error: isAbort ? 'Aborted' : '请求失败' }
          : row,
      )
      if (isAbort && typeof document !== 'undefined') {
        ElMessage.info('任务已手动终止')
      }
    } finally {
      isProcessing.value = false
      abortController = null
    }
  }

  const stopBatchRequest = () => {
    abortController?.abort()
  }

  const exportResults = () => {
    if (activeInputLines.value.length === 0) return
    const rows = activeInputLines.value.map((input, index) => {
      const result = outputResults.value[index]
      return [
        String(index + 1),
        input,
        result?.status === 'error' ? `[ERROR] ${result.error}` : result?.result ?? '',
        result?.status ?? '未执行',
      ]
    })

    downloadContent(
      buildCsvRows([['行号', '输入数据', 'AI处理结果', '状态'], ...rows]),
      `AI批量处理结果_${getTimestamp()}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  const saveState = () => {
    if (!canUseLocalStorage()) return
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        presets: presets.value,
        activePresetIndex: activePresetIndex.value,
        concurrentCount: concurrentCount.value,
        textData: textData.value,
        splitMode: splitMode.value,
      }),
    )
  }

  onMounted(() => {
    if (!canUseLocalStorage()) return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (parsed.presets && Array.isArray(parsed.presets)) {
        parsed.presets.forEach((preset: Partial<AIPreset>, index: number) => {
          if (index < presets.value.length) {
            presets.value[index] = { ...presets.value[index]!, ...preset }
          }
        })
      }
      if (parsed.activePresetIndex !== undefined && parsed.activePresetIndex < presets.value.length) {
        activePresetIndex.value = parsed.activePresetIndex
      }
      if (parsed.concurrentCount !== undefined) concurrentCount.value = parsed.concurrentCount
      if (parsed.textData) textData.value = parsed.textData
      else if (parsed.textA) textData.value = { input: parsed.textA }
      if (parsed.splitMode) splitMode.value = parsed.splitMode
    } catch {
      // ignore malformed local state
    }
  })

  watch([presets, activePresetIndex, concurrentCount, textData, splitMode], saveState, { deep: true })

  return {
    activeInputLines,
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
  }
}
