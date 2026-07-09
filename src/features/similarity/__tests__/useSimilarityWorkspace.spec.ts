import { describe, expect, it } from 'vitest'
import {
  buildDetailedExportHeader,
  buildDetailedExportRow,
  normalizePreprocessOptions,
  useSimilarityWorkspace,
} from '../composables/useSimilarityWorkspace'

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

  it('stores notes for unlocked comparison rows', () => {
    const workspace = useSimilarityWorkspace()
    const item = { source: '未锁定项目', matches: [], index: 0 }

    workspace.updateNote(item, '需要人工复核来源')

    expect(workspace.getNote(item)).toBe('需要人工复核来源')
  })

  it('puts notes at the end of detailed export rows', () => {
    const row = {
      source: '源项目',
      index: 0,
      matches: [{ text: '目标项目', similarity: 0.91, index: 1 }],
    }

    const header = buildDetailedExportHeader(1)
    const exportRow = buildDetailedExportRow(row, undefined, false, '备注内容', 1)

    expect(header[header.length - 1]).toBe('备注')
    expect(exportRow[exportRow.length - 1]).toBe('备注内容')
  })
})
