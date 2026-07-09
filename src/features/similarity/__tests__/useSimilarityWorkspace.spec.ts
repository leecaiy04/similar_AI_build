import { describe, expect, it } from 'vitest'
import { normalizePreprocessOptions, useSimilarityWorkspace } from '../composables/useSimilarityWorkspace'

describe('useSimilarityWorkspace', () => {
  it('keeps version normalization disabled by default', () => {
    const workspace = useSimilarityWorkspace()

    expect(workspace.preprocessOptions.value.enableVersionNormalization).toBe(false)
  })

  it('treats land parcel and road section rules as project anchor subrules', () => {
    expect(normalizePreprocessOptions({
      enableVersionNormalization: true,
      enableLandParcelRule: false,
      enableRoadSectionRule: false,
      noiseWordAggressiveness: 'high',
    })).toEqual({
      enableVersionNormalization: false,
      enableLandParcelRule: true,
      enableRoadSectionRule: true,
      noiseWordAggressiveness: 'high',
    })
  })
})
