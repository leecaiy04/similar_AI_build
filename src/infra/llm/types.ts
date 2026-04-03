export type LlmProvider = 'openai' | 'claude' | 'gemini'

export interface LlmRequest {
  baseUrl: string
  apiKey: string
  model: string
  prompt: string
  systemPrompt?: string
}

export interface LlmResponse {
  content: string
}

export type LlmInvoke = (request: LlmRequest, signal: AbortSignal) => Promise<LlmResponse>
