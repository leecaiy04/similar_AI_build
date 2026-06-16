<template>
  <div class="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
    <!-- 统一Header -->
    <div class="app-header-gradient px-6 py-3 flex justify-between items-center shrink-0">
      <div class="flex items-center gap-3">
        <h2 class="text-base font-bold flex items-center gap-2 text-white">
          <span class="text-2xl">💬</span>
          <span>AI对话</span>
        </h2>
      </div>
      <div class="flex items-center gap-3">
        <el-button size="small" @click="addNewTab" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
          新建对话
        </el-button>
        <el-button size="small" @click="showSettings = true" class="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20">
          设置
        </el-button>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 flex overflow-hidden">
      <!-- 左侧对话列表 -->
      <aside class="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <!-- 对话列表 -->
        <div class="flex-1 overflow-y-auto p-3">
          <div
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTabId = tab.id"
            class="group relative p-3 mb-2 rounded-lg cursor-pointer transition-all"
            :class="activeTabId === tab.id
              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
              : 'bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border-2 border-transparent'"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {{ tab.name }}
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{ tab.messages.length }} 条消息
                </div>
              </div>
              <button
                v-if="tabs.length > 1"
                @click.stop="closeTab(tab.id)"
                class="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-opacity"
              >
                <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右侧聊天区域 -->
      <main class="flex-1 flex flex-col">
      <!-- 顶部工具栏 -->
      <div class="h-12 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">{{ currentTab?.name }}</h3>
          <el-tag size="small" v-if="currentTab">{{ currentTab.messages.length }} 条消息</el-tag>
        </div>
        <el-button size="small" @click="clearCurrentChat" link class="!text-red-500">清空对话</el-button>
      </div>

      <!-- 消息区域 -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-6 py-4">
        <!-- 空状态 -->
        <div v-if="currentTab && currentTab.messages.length === 0" class="h-full flex flex-col items-center justify-center text-gray-400">
          <div class="text-6xl mb-4">💬</div>
          <p class="text-lg font-medium">开始新对话</p>
          <p class="text-sm mt-2">输入消息开始与 AI 交流</p>
        </div>

        <!-- 消息列表 -->
        <div class="max-w-4xl mx-auto space-y-6">
          <div v-for="msg in (currentTab?.messages || [])" :key="msg.id" class="flex gap-4">
            <!-- 用户消息 -->
            <template v-if="msg.role === 'user'">
              <div class="flex-1"></div>
              <div class="flex gap-3 max-w-[80%]">
                <div class="flex-1 bg-blue-500 text-white rounded-xl px-4 py-3 shadow-sm">
                  <div class="text-sm whitespace-pre-wrap break-words">{{ msg.content }}</div>
                </div>
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                  U
                </div>
              </div>
            </template>

            <!-- AI消息 -->
            <template v-else>
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white font-bold shrink-0">
                AI
              </div>
              <div class="flex-1 max-w-[80%]">
                <div class="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                  <div class="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                    {{ msg.content }}
                    <span v-if="msg.isStreaming" class="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1"></span>
                  </div>
                  <div v-if="msg.error" class="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded px-2 py-1">
                    {{ msg.error }}
                  </div>
                </div>
                <!-- 消息操作按钮 -->
                <div class="flex gap-2 mt-2 ml-2">
                  <button @click="copyMessage(msg.content)" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
                    <span>📋</span>
                    <span>复制</span>
                  </button>
                  <button v-if="!msg.isStreaming" @click="regenerateMessage(msg)" class="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
                    <span>🔄</span>
                    <span>重新生成</span>
                  </button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
        <div class="max-w-4xl mx-auto">
          <div class="flex gap-3">
            <el-input
              v-model="inputMessage"
              type="textarea"
              :rows="3"
              placeholder="输入消息... (Ctrl+Enter 发送)"
              @keydown.ctrl.enter="sendMessage"
              @keydown.meta.enter="sendMessage"
              :disabled="isGenerating"
              class="flex-1"
            />
            <div class="flex flex-col gap-2">
              <el-button
                type="primary"
                @click="sendMessage"
                :loading="isGenerating"
                :disabled="!inputMessage.trim() || isGenerating"
                class="!h-full"
              >
                <span v-if="!isGenerating">发送</span>
                <span v-else>生成中...</span>
              </el-button>
              <el-button
                v-if="isGenerating"
                type="danger"
                @click="stopGeneration"
                plain
                size="small"
              >
                停止
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </main>
    </div>

    <!-- 设置对话框 -->
    <el-dialog v-model="showSettings" title="AI 设置" width="500px">
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium mb-2 block">接口模式</label>
          <el-select v-model="config.mode" class="w-full">
            <el-option label="Claude" value="claude" />
            <el-option label="OpenAI" value="openai" />
            <el-option label="Claude Code (本地)" value="claude-code" />
          </el-select>
        </div>
        <div v-if="config.mode !== 'claude-code'">
          <label class="text-sm font-medium mb-2 block">API 地址</label>
          <el-input v-model="config.baseUrl" placeholder="http://118.89.81.103:8081" />
        </div>
        <div v-if="config.mode !== 'claude-code'">
          <label class="text-sm font-medium mb-2 block">API Key</label>
          <el-input v-model="config.apiKey" type="password" show-password placeholder="输入 API Key" />
        </div>
        <div>
          <label class="text-sm font-medium mb-2 block">模型</label>
          <el-select v-model="config.model" class="w-full" filterable allow-create>
            <el-option label="claude-fable-5" value="claude-fable-5" />
            <el-option label="claude-opus-4-8" value="claude-opus-4-8" />
            <el-option label="claude-opus-4-7" value="claude-opus-4-7" />
            <el-option label="claude-opus-4-7-thinking" value="claude-opus-4-7-thinking" />
            <el-option label="claude-sonnet-4-6" value="claude-sonnet-4-6" />
          </el-select>
        </div>
        <div>
          <label class="text-sm font-medium mb-2 block">系统提示词</label>
          <el-input v-model="config.systemPrompt" type="textarea" :rows="3" placeholder="你是一个有帮助的AI助手..." />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { createLlmInvoke } from '../infra/llm'
import { useSharedAIConfig } from '../composables/useSharedAIConfig'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  isStreaming?: boolean
  error?: string
}

interface ChatTab {
  id: string
  name: string
  messages: Message[]
  createdAt: number
}

const messagesContainer = ref<HTMLElement | null>(null)
const inputMessage = ref('')
const tabs = ref<ChatTab[]>([])
const activeTabId = ref('')
const isGenerating = ref(false)
const showSettings = ref(false)
let abortController: AbortController | null = null
let tabCounter = 0
let messageCounter = 0

// 使用共享配置
const { config } = useSharedAIConfig()

const currentTab = computed(() => {
  return tabs.value.find(t => t.id === activeTabId.value) || tabs.value[0]
})

const TABS_KEY = 'chat-tabs-v2'
const ACTIVE_TAB_KEY = 'chat-active-tab-v2'

onMounted(() => {
  loadTabs()
  if (tabs.value.length === 0) {
    addNewTab()
  }
})

watch([tabs, activeTabId], () => {
  saveTabs()
}, { deep: true })

function loadTabs() {
  try {
    const savedTabs = localStorage.getItem(TABS_KEY)
    const savedActiveTab = localStorage.getItem(ACTIVE_TAB_KEY)

    if (savedTabs) {
      tabs.value = JSON.parse(savedTabs)
      tabCounter = Math.max(...tabs.value.map(t => parseInt(t.id.replace('tab-', '')) || 0), 0)

      // 恢复messageCounter
      tabs.value.forEach(tab => {
        tab.messages.forEach(msg => {
          const msgNum = parseInt(msg.id.replace('msg-', '')) || 0
          messageCounter = Math.max(messageCounter, msgNum)
        })
      })
    }

    if (savedActiveTab && tabs.value.find(t => t.id === savedActiveTab)) {
      activeTabId.value = savedActiveTab
    } else if (tabs.value.length > 0 && tabs.value[0]) {
      activeTabId.value = tabs.value[0].id
    }
  } catch (e) {
    console.error('Failed to load tabs:', e)
  }
}

function saveTabs() {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs.value.map(t => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      messages: t.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        error: m.error
      }))
    }))))
    localStorage.setItem(ACTIVE_TAB_KEY, activeTabId.value)
  } catch (e) {
    console.error('Failed to save tabs:', e)
  }
}

function addNewTab() {
  tabCounter++
  const newTab: ChatTab = {
    id: `tab-${tabCounter}`,
    name: `对话 ${tabCounter}`,
    messages: [],
    createdAt: Date.now()
  }
  tabs.value.push(newTab)
  activeTabId.value = newTab.id
}

function closeTab(tabId: string) {
  const index = tabs.value.findIndex(t => t.id === tabId)
  if (index === -1) return

  tabs.value.splice(index, 1)

  if (tabs.value.length === 0) {
    addNewTab()
  } else if (activeTabId.value === tabId) {
    const newIndex = Math.max(0, index - 1)
    if (tabs.value[newIndex]) {
      activeTabId.value = tabs.value[newIndex].id
    }
  }
}

async function sendMessage() {
  if (!inputMessage.value.trim() || isGenerating.value || !currentTab.value) return

  const userMessage = inputMessage.value.trim()
  inputMessage.value = ''

  messageCounter++
  currentTab.value.messages.push({
    id: `msg-${messageCounter}`,
    role: 'user',
    content: userMessage
  })

  messageCounter++
  const assistantMessage: Message = {
    id: `msg-${messageCounter}`,
    role: 'assistant',
    content: '',
    isStreaming: true
  }
  currentTab.value.messages.push(assistantMessage)

  // 更新对话名称（使用第一条用户消息）
  if (currentTab.value.messages.filter(m => m.role === 'user').length === 1) {
    currentTab.value.name = userMessage.length > 20 ? userMessage.substring(0, 20) + '...' : userMessage
  }

  await nextTick()
  scrollToBottom()

  isGenerating.value = true
  abortController = new AbortController()

  try {
    const invoke = createLlmInvoke(config.value.mode)

    const response = await invoke(
      {
        baseUrl: config.value.baseUrl,
        apiKey: config.value.apiKey,
        model: config.value.model,
        prompt: userMessage,
        systemPrompt: config.value.systemPrompt
      },
      abortController.signal
    )

    assistantMessage.content = response.content
    assistantMessage.isStreaming = false
  } catch (error: any) {
    assistantMessage.isStreaming = false
    if (error.name === 'AbortError') {
      assistantMessage.content = assistantMessage.content || '(已停止)'
    } else {
      assistantMessage.error = error.message || '生成失败'
      console.error('Chat error:', error)
    }
  } finally {
    isGenerating.value = false
    abortController = null
  }
}

function stopGeneration() {
  if (abortController) {
    abortController.abort()
  }
}

function clearCurrentChat() {
  if (currentTab.value) {
    currentTab.value.messages = []
    currentTab.value.name = `对话 ${currentTab.value.id.replace('tab-', '')}`
  }
}

function copyMessage(content: string) {
  navigator.clipboard.writeText(content).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

function regenerateMessage(msg: Message) {
  if (!currentTab.value) return

  const index = currentTab.value.messages.findIndex(m => m.id === msg.id)
  if (index === -1 || index === 0) return

  // 找到上一条用户消息
  const prevUserMsg = currentTab.value.messages[index - 1]
  if (!prevUserMsg || prevUserMsg.role !== 'user') return

  // 删除当前AI消息
  currentTab.value.messages.splice(index, 1)

  // 重新发送
  inputMessage.value = prevUserMsg.content
  sendMessage()
}

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}
</script>

<style scoped>
/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.dark ::-webkit-scrollbar-thumb {
  background: #4a5568;
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: #718096;
}
</style>
