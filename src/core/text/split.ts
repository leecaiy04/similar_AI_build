export function splitExcelLines(text: string): string[] {
  if (!text) return []

  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (char === '"') {
      if (inQuotes) {
        if (text[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else if (current.length === 0) {
        inQuotes = true
      } else {
        current += '"'
      }
    } else if (char === '\r') {
      continue
    } else if (char === '\n') {
      if (inQuotes) {
        current += '\n'
      } else {
        result.push(current)
        current = ''
      }
    } else {
      current += char
    }
  }

  if (current.length > 0 || (text.length > 0 && text.endsWith('\n') && !inQuotes)) {
    result.push(current)
  }

  return result
}

export function splitTextData(text: string, mode: 'newline' | 'blankline' = 'newline'): string[] {
  if (!text) return []
  if (mode === 'blankline') {
    return text.split(/\r?\n\s*\r?\n/)
  }
  return splitExcelLines(text)
}
