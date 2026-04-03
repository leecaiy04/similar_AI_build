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
})
