export type AppErrorType =
  | 'ValidationError'
  | 'NetworkError'
  | 'ProviderError'
  | 'InternalError'

export interface AppError {
  type: AppErrorType
  message: string
  retryable: boolean
}

export const toAppError = (err: unknown): AppError => ({
  type: 'InternalError',
  message: err instanceof Error ? err.message : 'Unknown error',
  retryable: false,
})
