export interface NormalizeTextOptions {
  trim?: boolean
  lowerCase?: boolean
  collapseWhitespace?: boolean
}

export function normalizeText(text: string, options: NormalizeTextOptions = {}): string {
  let value = text

  if (options.trim) {
    value = value.trim()
  }

  if (options.lowerCase) {
    value = value.toLowerCase()
  }

  if (options.collapseWhitespace) {
    value = value.replace(/\s+/g, ' ').trim()
  }

  return value
}
