import { createProcessResult, type InputRecord, type ProcessResult, toAppError } from '../../../core/contracts'
import type { AppError } from '../../../core/errors'
import { createBatchQueue } from '../../../core/task/batchQueue'
import type { LlmInvoke, LlmRequest } from '../../../infra/llm'

export interface BatchRunOptions extends Partial<Omit<LlmRequest, 'prompt'>> {
  promptTemplate: string
  maxRetries?: number
}

export interface BatchInferenceServiceOptions {
  concurrency: number
  invoke: LlmInvoke
}

function isAppError(error: unknown): error is AppError {
  return typeof error === 'object'
    && error !== null
    && 'type' in error
    && 'message' in error
    && 'retryable' in error
}

function renderPrompt(template: string, fields: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => fields[key.trim()] ?? '')
}

function normalizeError(error: unknown): AppError {
  return isAppError(error) ? error : toAppError(error)
}

async function invokeWithRetry(
  invoke: LlmInvoke,
  request: LlmRequest,
  signal: AbortSignal,
  maxRetries: number,
): Promise<string> {
  let attempts = 0

  while (true) {
    try {
      const response = await invoke(request, signal)
      return response.content
    } catch (error) {
      const appError = normalizeError(error)
      if (!appError.retryable || attempts >= maxRetries) {
        throw appError
      }
      attempts++
    }
  }
}

export function createBatchInferenceService({ concurrency, invoke }: BatchInferenceServiceOptions) {
  const normalizedConcurrency = Math.min(3, Math.max(1, Math.floor(concurrency)))

  return {
    async runBatch(inputs: InputRecord[], options: BatchRunOptions, externalSignal?: AbortSignal): Promise<ProcessResult[]> {
      const queue = createBatchQueue({ concurrency: normalizedConcurrency })
      const results = inputs.map((input) => createProcessResult(input.id))
      const abortListener = () => queue.cancelAll('Aborted')

      externalSignal?.addEventListener('abort', abortListener)

      try {
        await Promise.all(
          inputs.map((input, index) =>
            queue.enqueue(async (signal) => {
              const prompt = renderPrompt(options.promptTemplate, input.fields)
              try {
                const content = await invokeWithRetry(
                  invoke,
                  {
                    baseUrl: options.baseUrl ?? '',
                    apiKey: options.apiKey ?? '',
                    model: options.model ?? '',
                    systemPrompt: options.systemPrompt,
                    prompt,
                  },
                  signal,
                  options.maxRetries ?? 0,
                )

                results[index] = {
                  id: input.id,
                  status: 'success',
                  output: { content },
                }
              } catch (error) {
                results[index] = {
                  id: input.id,
                  status: 'error',
                  output: {},
                  error: normalizeError(error),
                }
              }
            }),
          ),
        )
      } catch (error) {
        if (externalSignal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        throw error
      } finally {
        externalSignal?.removeEventListener('abort', abortListener)
      }

      return results
    },
  }
}
