export function splitExcelLines(text: string): string[] {
    if (!text) return [];
    
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (char === '"') {
            if (inQuotes) {
                if (text[i + 1] === '"') {
                    // Excel escapes quotes by doubling them
                    current += '"';
                    i++;
                } else {
                    // End of quoted cell
                    inQuotes = false;
                }
            } else if (current.length === 0) {
                // Start of quoted cell
                inQuotes = true;
            } else {
                // Literal quote in unquoted text
                current += '"';
            }
        } else if (char === '\r') {
            // Normalize by skipping \r
            continue;
        } else if (char === '\n') {
            if (inQuotes) {
                // Newline inside an Excel cell (Alt+Enter)
                current += '\n';
            } else {
                // End of row
                result.push(current);
                current = '';
            }
        } else {
            current += char;
        }
    }
    
    // Push the last item
    if (current.length > 0 || (text.length > 0 && text.endsWith('\n') && !inQuotes)) {
        result.push(current);
    }
    
    return result;
}

export function splitTextData(text: string, mode: 'newline' | 'blankline' = 'newline'): string[] {
    if (!text) return [];
    if (mode === 'blankline') {
        return text.split(/\r?\n\s*\r?\n/);
    }
    return splitExcelLines(text);
}
