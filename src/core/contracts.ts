import type { AppError } from './errors'

export interface InputRecord {
  id: string
  fields: Record<string, string>
}

export interface ProcessResult {
  id: string
  status: 'idle' | 'loading' | 'success' | 'error'
  output: Record<string, string>
  error?: AppError
}

export const createProcessResult = (id: string): ProcessResult => ({
  id,
  status: 'idle',
  output: {},
})

export { toAppError } from './errors'
