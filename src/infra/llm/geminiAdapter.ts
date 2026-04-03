import type { LlmInvoke, LlmRequest, LlmResponse } from './types'

export function createGeminiAdapter(fetchImpl: typeof fetch = fetch): LlmInvoke {
  return async (request: LlmRequest, signal: AbortSignal): Promise<LlmResponse> => {
    const baseUrl = request.baseUrl.replace(/\/$/, '')
    const url = `${baseUrl}/models/${request.model}:generateContent?key=${request.apiKey}`
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: request.systemPrompt
          ? { parts: [{ text: request.systemPrompt }] }
          : undefined,
        contents: [{ parts: [{ text: request.prompt }] }],
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`Gemini request failed with status ${response.status}`)
    }

    const json = await response.json()
    return { content: json.candidates?.[0]?.content?.parts?.[0]?.text ?? '' }
  }
}
