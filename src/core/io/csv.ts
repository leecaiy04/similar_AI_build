function escapeCell(value: string): string {
  const escaped = value.replace(/"/g, '""')
  if (/[",\n\r]/.test(value)) {
    return `"${escaped}"`
  }
  return escaped
}

export function buildCsv(rows: string[]): string {
  return `\uFEFF${rows.map(escapeCell).join('\n')}`
}

export function buildCsvRows(rows: string[][]): string {
  const lines = rows.map((row) => row.map((cell) => escapeCell(cell)).join(','))
  return `\uFEFF${lines.join('\n')}`
}
