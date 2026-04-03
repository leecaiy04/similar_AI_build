import type { LlmInvoke, LlmRequest, LlmResponse } from './types'

export function createClaudeAdapter(fetchImpl: typeof fetch = fetch): LlmInvoke {
  return async (request: LlmRequest, signal: AbortSignal): Promise<LlmResponse> => {
    const url = request.baseUrl.endsWith('/') ? `${request.baseUrl}messages` : `${request.baseUrl}/messages`
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': request.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        system: request.systemPrompt ?? '',
        messages: [{ role: 'user', content: request.prompt }],
        max_tokens: 1024,
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Claude request failed with status ${response.status}`)
    }

    const json = await response.json()
    return { content: json.content?.[0]?.text ?? '' }
  }
}
