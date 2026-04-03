import { computed, ref } from 'vue'
import type { InputRecord, ProcessResult } from '../../../core/contracts'
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
  runBatch: (inputs: InputRecord[], options: {
    baseUrl?: string
    apiKey?: string
    model?: string
    systemPrompt?: string
    promptTemplate: string
    maxRetries?: number
  }, signal?: AbortSignal) => Promise<ProcessResult[]>
}

function extractPromptVariables(template: string) {
  const matches = template.match(/\{\{([^}]+)\}\}/g)
  if (!matches) return ['input']
  return Array.from(new Set(matches.map((match) => match.slice(2, -2).trim()).filter(Boolean)))
}

export function useAIBatchWorkspace(runner: AIBatchRunner) {
  const currentPreset = ref<AIPreset>({
    name: 'Test',
    mode: 'test',
    baseUrl: '',
    apiKey: '',
    model: '',
    systemPrompt: '',
    promptTemplate: '{{input}}',
  })
  const textData = ref<Record<string, string>>({ input: '' })
  const splitMode = ref<'newline' | 'blankline'>('newline')
  const outputResults = ref<OutputResult[]>([])
  const activeInputLines = ref<string[]>([])
  const isProcessing = ref(false)
  const concurrentCount = ref(3)
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

  const displayOutputs = computed(() => {
    const outputs: OutputResult[] = []
    for (let index = 0; index < activeInputLines.value.length; index++) {
      outputs.push(outputResults.value[index] ?? { status: 'idle', result: '', error: '' })
    }
    return outputs
  })

  const startBatchRequest = async () => {
    const maxLength = listACount.value
    if (maxLength === 0) return

    const parsedData: Record<string, string[]> = {}
    inputNames.value.forEach((name) => {
      parsedData[name] = splitTextData(textData.value[name] || '', splitMode.value).filter((value) => value.trim())
    })

    const inputs: InputRecord[] = []
    activeInputLines.value = []

    for (let index = 0; index < maxLength; index++) {
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

    try {
      const results = await runner.runBatch(
        inputs,
        {
          baseUrl: currentPreset.value.baseUrl,
          apiKey: currentPreset.value.apiKey,
          model: currentPreset.value.model,
          systemPrompt: currentPreset.value.systemPrompt,
          promptTemplate: currentPreset.value.promptTemplate,
          maxRetries: 0,
        },
        abortController.signal,
      )

      outputResults.value = results.map((result) =>
        result.status === 'error'
          ? { status: 'error', result: '', error: result.error?.message ?? 'Unknown error' }
          : { status: 'success', result: result.output.content ?? '', error: '' },
      )
    } catch (error) {
      const isAbort = error instanceof Error && error.name === 'AbortError'
      outputResults.value = outputResults.value.map((row) =>
        row.status === 'loading'
          ? { status: 'error', result: '', error: isAbort ? 'Aborted' : 'Failed' }
          : row,
      )
    } finally {
      isProcessing.value = false
      abortController = null
    }
  }

  const stopBatchRequest = () => {
    abortController?.abort()
  }

  return {
    activeInputLines,
    concurrentCount,
    currentPreset,
    displayOutputs,
    inputNames,
    isProcessing,
    listACount,
    outputResults,
    splitMode,
    startBatchRequest,
    stopBatchRequest,
    textData,
  }
}
