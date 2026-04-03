import { createClaudeAdapter } from './claudeAdapter'
import { createGeminiAdapter } from './geminiAdapter'
import { createOpenAIAdapter } from './openaiAdapter'
import type { LlmInvoke, LlmProvider } from './types'

export function createLlmInvoke(provider: LlmProvider, fetchImpl?: typeof fetch): LlmInvoke {
  if (provider === 'claude') return createClaudeAdapter(fetchImpl)
  if (provider === 'gemini') return createGeminiAdapter(fetchImpl)
  return createOpenAIAdapter(fetchImpl)
}

export * from './types'
