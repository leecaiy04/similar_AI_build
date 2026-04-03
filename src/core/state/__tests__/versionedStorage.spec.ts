import { describe, expect, it } from 'vitest'
import { getDefaultSimilarityWorkspaceState, migrateSimilarityWorkspaceToV2 } from '../migrations/v2'
import { loadVersionedState, saveVersionedState } from '../versionedStorage'

describe('versionedStorage', () => {
  it('migrates legacy payloads into the v2 schema', () => {
    const legacyRaw = JSON.stringify({
      sourceText: 'source',
      targetText: 'target',
      options: { threshold: 90 },
    })

    const state = loadVersionedState(
      legacyRaw,
      getDefaultSimilarityWorkspaceState(),
      2,
      migrateSimilarityWorkspaceToV2,
    )

    expect(state.version).toBe(2)
    expect(state.data.sourceText).toBe('source')
    expect(state.data.options.threshold).toBe(90)
    expect(state.data.filterOptions.lockStatus).toBe('all')
  })

  it('fills missing fields from defaults for already versioned payloads', () => {
    const raw = saveVersionedState({ sourceText: 'hello' }, 2)
    const state = loadVersionedState(
      raw,
      getDefaultSimilarityWorkspaceState(),
      2,
      migrateSimilarityWorkspaceToV2,
    )

    expect(state.version).toBe(2)
    expect(state.data.sourceText).toBe('hello')
    expect(state.data.targetText).toBe('')
    expect(state.data.filterOptions.matchStatus).toBe('all')
  })
})
