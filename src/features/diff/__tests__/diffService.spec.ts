import { describe, expect, it, vi } from 'vitest'
import { createDiffService } from '../service/diffService'

describe('diffService', () => {
  it('passes the selected diff algorithm through to the calculator', () => {
    const calculateCharDiff = vi.fn(() => ({
      diff: [],
      added: 0,
      removed: 0,
      unchanged: 0,
      similarity: 1,
    }))
    const service = createDiffService({ calculateCharDiff } as never)

    service.compareRows({
      textA: 'A',
      textB: 'B',
      ignoreCase: false,
      ignoreSpace: false,
      algorithm: 'myers',
    })

    expect(calculateCharDiff).toHaveBeenCalledWith('B', 'A', 'myers')
  })
})
