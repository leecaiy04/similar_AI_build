import { normalizeOpenAIBaseUrl } from '../../config/aiProviders'
import type { LlmInvoke, LlmRequest, LlmResponse } from './types'

function getChatCompletionsUrl(baseUrl: string): string {
  return `${normalizeOpenAIBaseUrl(baseUrl)}/chat/completions`
}

function shouldUseSameOriginProxy(baseUrl: string): boolean {
  return typeof window !== 'undefined' && !baseUrl.startsWith('/api/')
}

export function createOpenAIAdapter(fetchImpl: typeof fetch = fetch): LlmInvoke {
  return async (request: LlmRequest, signal: AbortSignal): Promise<LlmResponse> => {
    const useProxy = shouldUseSameOriginProxy(request.baseUrl)
    const url = useProxy ? '/api/openai-proxy' : getChatCompletionsUrl(request.baseUrl)
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: useProxy
        ? { 'Content-Type': 'application/json' }
        : {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${request.apiKey}`,
          },
      body: JSON.stringify(
        useProxy
          ? {
              baseUrl: request.baseUrl,
              apiKey: request.apiKey,
              model: request.model,
              systemPrompt: request.systemPrompt ?? '',
              prompt: request.prompt,
            }
          : {
              model: request.model,
              messages: [
                { role: 'system', content: request.systemPrompt ?? '' },
                { role: 'user', content: request.prompt },
              ],
            },
      ),
      signal,
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`OpenAI request failed with status ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
    }

    const json = await response.json()
    return { content: json.choices?.[0]?.message?.content ?? '' }
  }
}
