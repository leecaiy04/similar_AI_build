import type { LlmInvoke, LlmRequest, LlmResponse } from './types'

export function createClaudeAdapter(fetchImpl: typeof fetch = fetch): LlmInvoke {
  return async (request: LlmRequest, signal: AbortSignal): Promise<LlmResponse> => {
    // 使用服务器代理避免CORS问题
    const proxyUrl = '/api/claude-proxy'

    const response = await fetchImpl(proxyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        baseUrl: request.baseUrl,
        apiKey: request.apiKey,
        model: request.model,
        systemPrompt: request.systemPrompt,
        prompt: request.prompt,
      }),
      signal,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Claude request failed: ${error}`)
    }

    const json = await response.json()
    return { content: json.content?.[0]?.text ?? '' }
  }
}
