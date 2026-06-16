import { ref, watch } from 'vue'

export interface SharedAIConfig {
  mode: 'openai' | 'claude' | 'claude-code'
  baseUrl: string
  apiKey: string
  model: string
  systemPrompt: string
}

const STORAGE_KEY = 'shared-ai-config'

// 默认配置
const defaultConfig: SharedAIConfig = {
  mode: 'claude',
  baseUrl: 'http://118.89.81.103:8081',
  apiKey: '',
  model: 'claude-opus-4-8',
  systemPrompt: '你是一个有帮助的AI助手。'
}

// 全局共享配置
const sharedConfig = ref<SharedAIConfig>({ ...defaultConfig })

// 从localStorage加载
function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      sharedConfig.value = { ...defaultConfig, ...parsed }
    }
  } catch (e) {
    console.error('Failed to load shared AI config:', e)
  }
}

// 保存到localStorage
function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sharedConfig.value))
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
