import { ref, watch } from 'vue'
import { DEFAULT_AI_API_KEY, DEFAULT_AI_MODEL, DEFAULT_OPENAI_ENDPOINT, DEFAULT_CLAUDE_ENDPOINT, DEFAULT_CLAUDE_MODEL } from '../config/aiProviders'

export interface SharedAIConfig {
  mode: 'openai' | 'claude' | 'claude-code'
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
  configVersion?: string
}

const STORAGE_KEY = 'shared-ai-config'
const CONFIG_VERSION = '2026-07-02-gpt-claude-short-presets'

// 默认配置：统一使用 OpenAI-compatible 接口
const defaultConfig: SharedAIConfig = {
  mode: 'openai',
  baseUrl: DEFAULT_OPENAI_ENDPOINT.baseUrl,
  apiKey: DEFAULT_AI_API_KEY,
  model: DEFAULT_AI_MODEL,
  systemPrompt: '你是一个有帮助的AI助手。',
  configVersion: CONFIG_VERSION,
}

// 全局共享配置
const sharedConfig = ref<SharedAIConfig>({ ...defaultConfig })

function normalizeLoadedConfig(raw: Partial<SharedAIConfig>): SharedAIConfig {
  const mode = raw.mode === 'claude' || raw.mode === 'claude-code' ? raw.mode : 'openai'
  const isClaude = mode === 'claude'
  const fallbackBaseUrl = isClaude ? DEFAULT_CLAUDE_ENDPOINT.baseUrl : DEFAULT_OPENAI_ENDPOINT.baseUrl
  const fallbackModel = isClaude ? DEFAULT_CLAUDE_MODEL : DEFAULT_AI_MODEL
  const rawModel = raw.model || fallbackModel
  const normalizedModel =
    mode === 'openai' && rawModel.startsWith('claude')
      ? DEFAULT_AI_MODEL
      : mode === 'claude' && rawModel.startsWith('gpt')
        ? DEFAULT_CLAUDE_MODEL
        : rawModel

  return {
    ...defaultConfig,
    ...raw,
    mode,
    baseUrl: raw.baseUrl || fallbackBaseUrl,
    apiKey: raw.apiKey || DEFAULT_AI_API_KEY,
    model: normalizedModel,
    systemPrompt: raw.systemPrompt || defaultConfig.systemPrompt,
    configVersion: CONFIG_VERSION,
  }
}

// 从localStorage加载
function loadConfig() {
  if (typeof localStorage === 'undefined') return
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      sharedConfig.value = normalizeLoadedConfig(parsed)
      saveConfig()
    }
  } catch (e) {
    console.error('Failed to load shared AI config:', e)
  }
}

// 保存到localStorage
function saveConfig() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...sharedConfig.value, configVersion: CONFIG_VERSION }))
  } catch (e) {
    console.error('Failed to save shared AI config:', e)
  }
}

// 初始化时加载
loadConfig()

// 监听变化自动保存
watch(sharedConfig, saveConfig, { deep: true })

// 导出
export function useSharedAIConfig() {
  return {
    config: sharedConfig,
    loadConfig,
    saveConfig
  }
}
