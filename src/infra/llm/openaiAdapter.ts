import type { LlmInvoke, LlmRequest, LlmResponse } from './types'

export function createOpenAIAdapter(fetchImpl: typeof fetch = fetch): LlmInvoke {
  return async (request: LlmRequest, signal: AbortSignal): Promise<LlmResponse> => {
    const url = request.baseUrl.endsWith('/')
      ? `${request.baseUrl}chat/completions`
      : `${request.baseUrl}/chat/completions`
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${request.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: 'system', content: request.systemPrompt ?? '' },
          { role: 'user', content: request.prompt },
        ],
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`)
    }

    const json = await response.json()
    return { content: json.choices?.[0]?.message?.content ?? '' }
  }
}
