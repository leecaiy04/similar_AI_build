import { describe, expect, it } from 'vitest'
import { buildHeaderNames, parseDelimitedTable, recommendSkipRows } from '../tableMergeParser'

describe('tableMergeParser', () => {
  it('recommends skipping leading merged title rows with only one cell', () => {
    const content = [
      '杭州市项目清单',
      '单位：测试中心',
      '项目名称\t金额\t负责人',
      '智慧园区\t100\t张三',
    ].join('\n')

    expect(recommendSkipRows(content)).toBe(2)
  })

  it('does not skip a normal multi-column header', () => {
    const content = '项目名称\t金额\t负责人\n智慧园区\t100\t张三'
    expect(recommendSkipRows(content)).toBe(0)
  })

  it('parses table after skipped rows', () => {
    const content = '合并标题\n项目名称\t金额\n智慧园区\t100'
    const parsed = parseDelimitedTable(content, { skipRows: 1, headerRowCount: 1 })

    expect(parsed?.headers).toEqual(['项目名称', '金额'])
    expect(parsed?.rows).toEqual([['智慧园区', '100']])
    expect(parsed?.skippedRows).toBe(1)
  })

  it('combines multiple header rows by column', () => {
    expect(buildHeaderNames(['基本信息\t基本信息', '姓名\t部门'])).toEqual(['基本信息 / 姓名', '基本信息 / 部门'])
  })
})
