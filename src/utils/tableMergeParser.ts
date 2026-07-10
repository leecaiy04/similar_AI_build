export interface TableParseOptions {
  skipRows?: number
  headerRowCount?: number
}

export interface ParsedDelimitedTable {
  headers: string[]
  rows: string[][]
  skippedRows: number
  originalLineCount: number
}

export function getTableLines(content: string): string[] {
  return content
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(line => line.trimEnd())
    .filter(line => line.trim())
}

export function parseDelimitedLine(line: string): string[] {
  const separator = line.includes('\t') ? '\t' : ','
  return line
    .split(separator)
    .map(cell => cell.trim())
}

export function countNonEmptyCells(line: string): number {
  return parseDelimitedLine(line).filter(Boolean).length
}

export function recommendSkipRows(content: string, maxScanRows = 10): number {
  const lines = getTableLines(content).slice(0, maxScanRows)
  let recommended = 0

  for (const line of lines) {
    const nonEmptyCount = countNonEmptyCells(line)
    if (nonEmptyCount <= 1) {
      recommended += 1
      continue
    }
    break
  }

  return recommended
}

export function buildHeaderNames(headerLines: string[]): string[] {
  const parsedHeaderRows = headerLines.map(parseDelimitedLine)
  const maxColumnCount = Math.max(0, ...parsedHeaderRows.map(row => row.length))

  return Array.from({ length: maxColumnCount }, (_unused, columnIndex) => {
    const parts = parsedHeaderRows
      .map(row => row[columnIndex]?.trim() || '')
      .filter(Boolean)
    return Array.from(new Set(parts)).join(' / ') || `列${columnIndex + 1}`
  })
}

export function parseDelimitedTable(content: string, options: TableParseOptions = {}): ParsedDelimitedTable | null {
  const lines = getTableLines(content)
  const safeSkipRows = Math.max(0, Math.min(Math.floor(Number(options.skipRows ?? 0) || 0), lines.length))
  const safeHeaderRows = Math.max(1, Math.min(Math.floor(Number(options.headerRowCount ?? 1) || 1), 10))

  if (lines.length <= safeSkipRows + safeHeaderRows - 1) return null

  const headerLines = lines.slice(safeSkipRows, safeSkipRows + safeHeaderRows)
  const headers = buildHeaderNames(headerLines)
  const dataLines = lines.slice(safeSkipRows + safeHeaderRows)
  const rows = dataLines.map(parseDelimitedLine)

  if (headers.length === 0 || rows.length === 0) return null

  return {
    headers,
    rows,
    skippedRows: safeSkipRows,
    originalLineCount: lines.length,
  }
}
