/**
 * Detect the delimiter used in CSV content
 * Prefers semicolon (European convention) if consistent
 */
export function detectDelimiter(content) {
  const lines = content.split(/[\r\n]+/).filter(line => line.trim());
  if (lines.length === 0) return ';';

  const sampleLines = lines.slice(0, Math.min(5, lines.length));

  const delimiters = [';', '\t', ','];

  for (const delimiter of delimiters) {
    const counts = sampleLines.map(line => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          count++;
        }
      }
      return count;
    });

    const firstCount = counts[0];
    if (firstCount > 0 && counts.every(c => c === firstCount)) {
      return delimiter;
    }
  }

  for (const delimiter of delimiters) {
    const counts = sampleLines.map(line => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          count++;
        }
      }
      return count;
    });

    if (counts.some(c => c > 0)) {
      return delimiter;
    }
  }

  return ';';
}

/**
 * Parse CSV line with specific delimiter, handling quoted fields
 */
export function parseCSVLineWithDelimiter(line, delimiter) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i-1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ''));
  return result;
}

/**
 * Parse CSV content - simple mode (one phone per line or delimiter-separated)
 */
export function parseCSVSimple(content) {
  const phones = [];
  const lines = content.split(/[\r\n]+/);
  const delimiter = detectDelimiter(content);

  for (const line of lines) {
    const parts = parseCSVLineWithDelimiter(line, delimiter);
    for (const part of parts) {
      const phone = part.trim();
      if (phone && phone.length > 0) {
        phones.push(phone);
      }
    }
  }

  return phones;
}

/**
 * Parse CSV with headers and extract specific column
 */
export function parseCSVWithColumn(content, columnIndex) {
  const phones = [];
  const lines = content.split(/[\r\n]+/).filter(line => line.trim());
  const delimiter = detectDelimiter(content);

  for (let i = 1; i < lines.length; i++) {
    const parts = parseCSVLineWithDelimiter(lines[i], delimiter);
    if (parts[columnIndex] !== undefined) {
      const phone = parts[columnIndex];
      if (phone && phone.length > 0) {
        phones.push(phone);
      }
    }
  }

  return phones;
}

/**
 * Extract CSV headers for column selection
 * Auto-detects delimiter
 */
export function getCSVHeaders(content) {
  const lines = content.split(/[\r\n]+/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], preview: [], totalRows: 0, delimiter: ';' };

  const delimiter = detectDelimiter(content);

  const headerLine = lines[0];
  const headerParts = parseCSVLineWithDelimiter(headerLine, delimiter);
  const headers = headerParts.map((h, index) => ({
    index,
    name: h
  }));

  const preview = [];
  for (let i = 1; i < Math.min(4, lines.length); i++) {
    const parts = parseCSVLineWithDelimiter(lines[i], delimiter);
    preview.push(parts);
  }

  return { headers, preview, totalRows: lines.length - 1, delimiter };
}

/**
 * Parse XML content
 * Expects <phone>...</phone> or <tel>...</tel> tags
 */
export function parseXML(content) {
  const phones = [];
  const regex = /<(?:phone|tel|numero)>([^<]+)<\/(?:phone|tel|numero)>/gi;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const phone = match[1].trim();
    if (phone) {
      phones.push(phone);
    }
  }

  return phones;
}
