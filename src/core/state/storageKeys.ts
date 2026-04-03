export const storageKeys = {
  similarity: 'premium_similarity_app_cache_v2',
  diff: 'premium_diff_tool_v1',
  dataProcessing: 'premium_data_proc_v1',
  aiBatch: 'premium_ai_batch_v1',
} as const

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys]
