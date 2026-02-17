export function detectDelimiter(content: string): string {
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
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
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
        if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
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

export function parseCSVLineWithDelimiter(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
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

export function parseCSVSimple(content: string): string[] {
  const phones: string[] = [];
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

export function parseCSVWithColumn(content: string, columnIndex: number): string[] {
  const phones: string[] = [];
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

export interface CSVHeadersResult {
  headers: Array<{ index: number; name: string }>;
  preview: string[][];
  totalRows: number;
  delimiter: string;
}

export function getCSVHeaders(content: string): CSVHeadersResult {
  const lines = content.split(/[\r\n]+/).filter(line => line.trim());
  if (lines.length === 0) return { headers: [], preview: [], totalRows: 0, delimiter: ';' };

  const delimiter = detectDelimiter(content);

  const headerLine = lines[0];
  const headerParts = parseCSVLineWithDelimiter(headerLine, delimiter);
  const headers = headerParts.map((h, index) => ({
    index,
    name: h
  }));

  const preview: string[][] = [];
  for (let i = 1; i < Math.min(4, lines.length); i++) {
    const parts = parseCSVLineWithDelimiter(lines[i], delimiter);
    preview.push(parts);
  }

  return { headers, preview, totalRows: lines.length - 1, delimiter };
}

export function parseXML(content: string): string[] {
  const phones: string[] = [];
  const regex = /<(?:phone|tel|numero)>([^<]+)<\/(?:phone|tel|numero)>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const phone = match[1].trim();
    if (phone) {
      phones.push(phone);
    }
  }

  return phones;
}
