import { describe, expect, it, vi } from 'vitest'
import {
  buildLockFeedbackLogExportHeader,
  buildLockFeedbackLogExportRow,
  buildDetailedExportHeader,
  buildDetailedExportRow,
  normalizePreprocessOptions,
  useSimilarityWorkspace,
} from '../composables/useSimilarityWorkspace'

vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
  ElMessageBox: {
    confirm: vi.fn(),
  },
  ElNotification: vi.fn(),
}))

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

  it('records a reusable feedback log when a user locks a match', () => {
    const workspace = useSimilarityWorkspace()
    const item = {
      source: '关于杭政储出2026 33号地块住宅商业项目的批复',
      index: 3,
      matches: [
        {
          text: '杭政储出【2026】33号地块住宅兼商业商务项目',
          similarity: 0.96,
          index: 7,
          ruleType: 'projectAnchor' as const,
          reason: '杭政储出编号一致',
          anchors: [{ type: 'landParcel', value: '杭政储出2026 33号', weight: 1.2 }],
        },
      ],
    }

    workspace.lockMatch(item, item.matches[0]!)

    expect(workspace.lockFeedbackLogs.value).toHaveLength(1)
    expect(workspace.lockFeedbackLogs.value[0]).toMatchObject({
      action: 'manual-lock',
      source: item.source,
      matchedText: item.matches[0]!.text,
      similarity: 0.96,
      rank: 1,
      ruleType: 'projectAnchor',
      reason: '杭政储出编号一致',
      anchors: [{ type: 'landParcel', value: '杭政储出2026 33号', weight: 1.2 }],
    })
  })

  it('keeps the latest lock feedback note in sync with row notes', () => {
    const workspace = useSimilarityWorkspace()
    const item = {
      source: '云河环路云创路至云洪路道路工程可研',
      index: 0,
      matches: [{ text: '云河环路（云创路-云洪路）道路工程', similarity: 0.94, index: 1 }],
    }

    workspace.lockMatch(item, item.matches[0]!)
    workspace.updateNote(item, '人工确认：起止点一致')

    expect(workspace.lockFeedbackLogs.value[0]?.note).toBe('人工确认：起止点一致')
  })

  it('puts notes at the end of lock feedback log export rows', () => {
    const header = buildLockFeedbackLogExportHeader()
    const row = buildLockFeedbackLogExportRow({
      id: 'lock-1',
      action: 'manual-lock',
      timestamp: '2026-07-10T10:00:00.000Z',
      joinMode: 'left',
      rowSide: 'left',
      source: '源项目',
      sourceIndex: 0,
      matchedText: '目标项目',
      matchedIndex: 1,
      similarity: 0.88,
      rank: 2,
      thresholdPercent: 70,
      selectedAlgorithm: 'edit',
      preprocessEnabled: true,
      anchors: [{ type: 'road', value: '云创路-云洪路' }],
      conflictingAnchors: [],
      note: '后续用于路段规则优化',
    })

    expect(header[header.length - 1]).toBe('备注')
    expect(row[row.length - 1]).toBe('后续用于路段规则优化')
  })
})
