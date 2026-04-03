import { splitTextData } from '../../../utils/textParser'

export interface DataRow {
  id: string
  value: string
  isHighlighted: boolean
  count: number
}

export type RegexAction = 'match' | 'filter' | 'keep'

function createRow(value: string): DataRow {
  return {
    id: Math.random().toString(36).slice(2, 11),
    value,
    isHighlighted: false,
    count: 0,
  }
}

export function createTransformService() {
  return {
    addRows(input: { existing: DataRow[]; inputText: string; splitMode: 'newline' | 'blankline'; preventDuplicates: boolean }) {
      const lines = splitTextData(input.inputText, input.splitMode).map((line) => line.trim()).filter(Boolean)
      const existingValues = new Set(input.existing.map((row) => row.value))
      const nextRows = [...input.existing]
      let addedCount = 0
      let rejectedCount = 0

      lines.forEach((line) => {
        if (input.preventDuplicates && existingValues.has(line)) {
          rejectedCount++
          return
        }
        nextRows.push(createRow(line))
        existingValues.add(line)
        addedCount++
      })

      return { rows: nextRows, addedCount, rejectedCount }
    },
    countDuplicates(rows: DataRow[]) {
      const counts = new Map<string, number>()
      rows.forEach((row) => counts.set(row.value, (counts.get(row.value) || 0) + 1))
      return rows.map((row) => ({
        ...row,
        count: counts.get(row.value) || 1,
        isHighlighted: (counts.get(row.value) || 0) > 1,
      }))
    },
    removeDuplicates(rows: DataRow[]) {
      const seen = new Set<string>()
      return rows.filter((row) => {
        if (seen.has(row.value)) return false
        seen.add(row.value)
        return true
      })
    },
    applyRegex(rows: DataRow[], pattern: string, action: RegexAction) {
      const regex = new RegExp(pattern, 'g')

      if (action === 'match') {
        return rows.flatMap((row) => {
          const matches = row.value.match(regex)
          if (!matches) return []
          return [{ ...row, value: matches.join(' '), isHighlighted: false, count: 0 }]
        })
      }

      if (action === 'filter') {
        return rows.filter((row) => !regex.test(row.value))
      }

      return rows.filter((row) => regex.test(row.value))
    },
  }
}
