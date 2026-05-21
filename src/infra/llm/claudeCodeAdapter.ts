import type { LlmInvoke, LlmRequest, LlmResponse } from './types'

export function createClaudeCodeAdapter(fetchImpl: typeof fetch = fetch): LlmInvoke {
  return async (request: LlmRequest, signal: AbortSignal): Promise<LlmResponse> => {
    const url = request.baseUrl.endsWith('/') ? `${request.baseUrl}messages` : `${request.baseUrl}/messages`

    const body: any = {
      model: request.model,
      messages: [{ role: 'user', content: request.prompt }],
      max_tokens: 1024,
    }

    // 只在有 systemPrompt 时才添加 system 字段
    if (request.systemPrompt && request.systemPrompt.trim()) {
      body.system = request.systemPrompt
    }

    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${request.apiKey}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Claude Code request failed with status ${response.status}: ${errorText}`)
    }

    const json = await response.json()
    // 支持两种响应格式：标准 Claude API 和 Claude Code API
    const content = json.content?.[0]?.text ?? json.text ?? ''
    return { content }
  }
}
