import { describe, expect, it } from 'vitest'
import { useSimilarityWorkspace } from '../composables/useSimilarityWorkspace'

describe('useSimilarityWorkspace', () => {
  it('keeps version normalization disabled by default', () => {
    const workspace = useSimilarityWorkspace()

    expect(workspace.preprocessOptions.value.enableVersionNormalization).toBe(false)
  })
})
