import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import type { ProcessResult } from '../../../core/contracts'
import { useAIBatchWorkspace } from '../composables/useAIBatchWorkspace'

describe('useAIBatchWorkspace', () => {
  it('transitions from loading to success and error results', async () => {
    let resolveBatch!: (value: ProcessResult[]) => void
    const runBatch = vi.fn(
      () =>
        new Promise<ProcessResult[]>((resolve) => {
          resolveBatch = resolve
        }),
    )

    const workspace = useAIBatchWorkspace({ runBatch })
    workspace.textData.value.input = 'a\nb'

    const pending = workspace.startBatchRequest()
    await nextTick()

    expect(workspace.isProcessing.value).toBe(true)
    expect(workspace.outputResults.value.every((row) => row.status === 'loading')).toBe(true)

    resolveBatch([
      { id: '1', status: 'success', output: { content: 'A' } },
      { id: '2', status: 'error', output: {}, error: { type: 'ProviderError', message: 'boom', retryable: false } },
    ])
    await pending

    expect(workspace.isProcessing.value).toBe(false)
    expect(workspace.outputResults.value[0]?.status).toBe('success')
    expect(workspace.outputResults.value[1]?.status).toBe('error')
  })

  it('marks loading rows as aborted when stopped', async () => {
    const runBatch = vi.fn(
      (_inputs, _options, signal?: AbortSignal) =>
        new Promise<ProcessResult[]>((_, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )

    const workspace = useAIBatchWorkspace({ runBatch })
    workspace.textData.value.input = 'a'

    const pending = workspace.startBatchRequest()
    workspace.stopBatchRequest()
    await pending

    expect(workspace.isProcessing.value).toBe(false)
    expect(workspace.outputResults.value[0]?.error).toBe('Aborted')
  })
})
