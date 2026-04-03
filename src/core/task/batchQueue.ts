export interface BatchQueueProgress {
  active: number
  queued: number
}

export interface BatchQueueOptions {
  concurrency: number
}

export type BatchQueueTask<T> = (signal: AbortSignal) => Promise<T>

interface PendingTask<T> {
  task: BatchQueueTask<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
}

export function createBatchQueue({ concurrency }: BatchQueueOptions) {
  const limit = Math.max(1, concurrency)
  const pending: PendingTask<any>[] = []
  const listeners = new Set<(progress: BatchQueueProgress) => void>()
  const controller = new AbortController()
  let active = 0
  let cancelled = false

  const emitProgress = () => {
    const snapshot = { active, queued: pending.length }
    listeners.forEach((listener) => listener(snapshot))
  }

  const drain = () => {
    while (!cancelled && active < limit && pending.length > 0) {
      const next = pending.shift()
      if (!next) break

      active++
      emitProgress()

      next.task(controller.signal)
        .then(next.resolve)
        .catch(next.reject)
        .finally(() => {
          active--
          emitProgress()
          drain()
        })
    }
  }

  return {
    enqueue<T>(task: BatchQueueTask<T>): Promise<T> {
      if (cancelled) {
        return Promise.reject(new Error('Queue cancelled'))
      }

      return new Promise<T>((resolve, reject) => {
        pending.push({ task, resolve, reject })
        emitProgress()
        drain()
      })
    },
    cancelAll(reason = 'Queue cancelled') {
      if (cancelled) return
      cancelled = true
      controller.abort()

      while (pending.length > 0) {
        const next = pending.shift()
        next?.reject(new Error(reason))
      }

      emitProgress()
    },
    onProgress(listener: (progress: BatchQueueProgress) => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
