export interface SimilarityWorkspaceStateV2 {
  sourceText: string
  targetText: string
  synonymText: string
  ignoreText: string
  options: {
    threshold: number
    ignorePunctuation: boolean
    fullwidthToHalfwidth: boolean
    ignoreInvisibleChars: boolean
    weights: { edit: number; jaro: number }
  }
  selectedAlgorithm: 'hybrid' | 'edit' | 'jaro'
  editWeight: number
  joinMode: 'left' | 'right' | 'inner' | 'outer'
  lockedItems: Array<[string, { matchIndex: number; text: string; similarity: number }]>
  filterOptions: {
    lockStatus: 'all' | 'locked' | 'unlocked'
    matchStatus: 'all' | 'matched' | 'unmatched'
    searchQuery: string
    isRegexSearch: boolean
  }
}

export function getDefaultSimilarityWorkspaceState(): SimilarityWorkspaceStateV2 {
  return {
    sourceText: '',
    targetText: '',
    synonymText: '',
    ignoreText: '',
    options: {
      threshold: 70,
      ignorePunctuation: true,
      fullwidthToHalfwidth: true,
      ignoreInvisibleChars: true,
      weights: { edit: 0.6, jaro: 0.4 },
    },
    selectedAlgorithm: 'edit',
    editWeight: 60,
    joinMode: 'left',
    lockedItems: [],
    filterOptions: {
      lockStatus: 'all',
      matchStatus: 'all',
      searchQuery: '',
      isRegexSearch: false,
    },
  }
}

export function migrateSimilarityWorkspaceToV2(legacy: Record<string, unknown>) {
  return {
    ...getDefaultSimilarityWorkspaceState(),
    ...legacy,
    options: {
      ...getDefaultSimilarityWorkspaceState().options,
      ...(legacy.options as Record<string, unknown> | undefined),
    },
    filterOptions: {
      ...getDefaultSimilarityWorkspaceState().filterOptions,
      ...(legacy.filterOptions as Record<string, unknown> | undefined),
    },
    version: 2,
  }
}
