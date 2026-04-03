import { describe, expect, it } from 'vitest'
import { createBatchQueue } from '../batchQueue'

describe('batchQueue', () => {
  it('runs at most N tasks at once', async () => {
    const queue = createBatchQueue({ concurrency: 2 })
    let active = 0
    let maxActive = 0

    const tasks = Array.from({ length: 5 }, (_, index) =>
      queue.enqueue(async () => {
        active++
        maxActive = Math.max(maxActive, active)
        await new Promise((resolve) => setTimeout(resolve, 20))
        active--
        return index
      }),
    )

    const results = await Promise.all(tasks)

    expect(results).toEqual([0, 1, 2, 3, 4])
    expect(maxActive).toBeLessThanOrEqual(2)
  })
})
