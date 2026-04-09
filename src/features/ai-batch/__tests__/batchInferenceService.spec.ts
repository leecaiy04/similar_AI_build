import { describe, expect, it } from 'vitest'
import { createBatchInferenceService } from '../service/batchInferenceService'

describe('batchInferenceService', () => {
  it('does not retry non-retryable provider errors', async () => {
    let attempts = 0
    const service = createBatchInferenceService({
      concurrency: 1,
      invoke: async () => {
        attempts++
        throw {
          type: 'ProviderError',
          message: 'quota exceeded',
          retryable: false,
        }
      },
    })

    const results = await service.runBatch([{ id: '1', fields: { input: 'hello' } }], {
      maxRetries: 2,
      promptTemplate: '{{input}}',
    })

    expect(attempts).toBe(1)
    expect(results[0]?.status).toBe('error')
    expect(results[0]?.error?.type).toBe('ProviderError')
  })

  it('caps run concurrency at 3 when configured higher', async () => {
    let active = 0
    let maxActive = 0

    const service = createBatchInferenceService({
      concurrency: 10,
      invoke: async (request) => {
        active++
        maxActive = Math.max(maxActive, active)
        await new Promise((resolve) => setTimeout(resolve, 20))
        active--
        return { content: request.prompt }
      },
    })

    const inputs = Array.from({ length: 6 }, (_, index) => ({
      id: String(index + 1),
      fields: { input: String(index + 1) },
    }))

    const results = await service.runBatch(inputs, {
      promptTemplate: '{{input}}',
    })

    expect(maxActive).toBeLessThanOrEqual(3)
    expect(results).toHaveLength(6)
    expect(results.every((item) => item.status === 'success')).toBe(true)
  })
})
