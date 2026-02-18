import { describe, it, expect } from 'vitest';
import {
  detectDelimiter, parseCSVLineWithDelimiter, parseCSVSimple,
  parseCSVWithColumn, getCSVHeaders, parseXML
} from '../../utils/fileParser';

describe('detectDelimiter', () => {
  it('should detect semicolon', () => {
    expect(detectDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('should detect comma', () => {
    expect(detectDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('should detect tab', () => {
    expect(detectDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('should prefer semicolon over comma when consistent', () => {
    expect(detectDelimiter('a;b;c\n1;2;3\n4;5;6')).toBe(';');
  });

  it('should return semicolon for empty content', () => {
    expect(detectDelimiter('')).toBe(';');
  });
});

describe('parseCSVLineWithDelimiter', () => {
  it('should split by semicolon', () => {
    expect(parseCSVLineWithDelimiter('a;b;c', ';')).toEqual(['a', 'b', 'c']);
  });

  it('should handle quoted fields', () => {
    expect(parseCSVLineWithDelimiter('"hello";world', ';')).toEqual(['hello', 'world']);
  });

  it('should handle delimiter inside quotes', () => {
    expect(parseCSVLineWithDelimiter('"a;b";c', ';')).toEqual(['a;b', 'c']);
  });

  it('should trim whitespace', () => {
    expect(parseCSVLineWithDelimiter(' a ; b ; c ', ';')).toEqual(['a', 'b', 'c']);
  });
});

describe('parseCSVSimple', () => {
  it('should extract all values from simple CSV', () => {
    const result = parseCSVSimple('0612345678\n0712345678');
    expect(result).toEqual(['0612345678', '0712345678']);
  });

  it('should handle semicolon-separated values', () => {
    const result = parseCSVSimple('0612345678;0712345678');
    expect(result).toEqual(['0612345678', '0712345678']);
  });

  it('should skip empty lines', () => {
    const result = parseCSVSimple('0612345678\n\n0712345678\n');
    expect(result).toEqual(['0612345678', '0712345678']);
  });
});

describe('parseCSVWithColumn', () => {
  it('should extract specific column (skip header)', () => {
    const csv = 'nom;tel;email\nJohn;0612345678;john@test.com\nJane;0712345678;jane@test.com';
    const result = parseCSVWithColumn(csv, 1);
    expect(result).toEqual(['0612345678', '0712345678']);
  });

  it('should handle missing column gracefully', () => {
    const csv = 'nom;tel\nJohn;0612345678';
    const result = parseCSVWithColumn(csv, 5);
    expect(result).toEqual([]);
  });
});

describe('getCSVHeaders', () => {
  it('should return headers with indexes', () => {
    const csv = 'nom;tel;email\nJohn;0612345678;john@test.com\nJane;0712345678;jane@test.com';
    const result = getCSVHeaders(csv);
    expect(result.headers).toEqual([
      { index: 0, name: 'nom' },
      { index: 1, name: 'tel' },
      { index: 2, name: 'email' }
    ]);
    expect(result.totalRows).toBe(2);
    expect(result.delimiter).toBe(';');
    expect(result.preview).toHaveLength(2);
  });

  it('should return empty for empty content', () => {
    const result = getCSVHeaders('');
    expect(result.headers).toEqual([]);
    expect(result.totalRows).toBe(0);
  });

  it('should limit preview to 3 rows', () => {
    const csv = 'h\n1\n2\n3\n4\n5';
    const result = getCSVHeaders(csv);
    expect(result.preview).toHaveLength(3);
  });
});

describe('parseXML', () => {
  it('should extract phone tags', () => {
    const xml = '<data><phone>0612345678</phone><phone>0712345678</phone></data>';
    expect(parseXML(xml)).toEqual(['0612345678', '0712345678']);
  });

  it('should extract tel tags', () => {
    const xml = '<data><tel>0612345678</tel></data>';
    expect(parseXML(xml)).toEqual(['0612345678']);
  });

  it('should extract numero tags', () => {
    const xml = '<data><numero>0612345678</numero></data>';
    expect(parseXML(xml)).toEqual(['0612345678']);
  });

  it('should be case-insensitive', () => {
    const xml = '<data><PHONE>0612345678</PHONE></data>';
    expect(parseXML(xml)).toEqual(['0612345678']);
  });

  it('should return empty for no matches', () => {
    const xml = '<data><name>John</name></data>';
    expect(parseXML(xml)).toEqual([]);
  });

  it('should trim whitespace in values', () => {
    const xml = '<phone> 0612345678 </phone>';
    expect(parseXML(xml)).toEqual(['0612345678']);
  });
});
