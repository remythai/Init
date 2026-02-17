import { describe, it, expect } from 'vitest';
import { normalizePhone, isValidPhone } from '../../utils/phone';

describe('normalizePhone', () => {
  it('should convert 06... to +336...', () => {
    expect(normalizePhone('0612345678')).toBe('+33612345678');
  });

  it('should convert 07... to +337...', () => {
    expect(normalizePhone('0712345678')).toBe('+33712345678');
  });

  it('should add + to 33...', () => {
    expect(normalizePhone('33612345678')).toBe('+33612345678');
  });

  it('should keep +33... as is', () => {
    expect(normalizePhone('+33612345678')).toBe('+33612345678');
  });

  it('should strip spaces and dashes', () => {
    expect(normalizePhone('06 12 34 56 78')).toBe('+33612345678');
    expect(normalizePhone('06-12-34-56-78')).toBe('+33612345678');
  });

  it('should return null for null/undefined/empty', () => {
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(undefined)).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  it('should add +33 prefix if no recognized prefix', () => {
    expect(normalizePhone('612345678')).toBe('+33612345678');
  });
});

describe('isValidPhone', () => {
  it('should validate correct French numbers', () => {
    expect(isValidPhone('0612345678')).toBe(true);
    expect(isValidPhone('+33612345678')).toBe(true);
  });

  it('should reject too short numbers', () => {
    expect(isValidPhone('061234')).toBe(false);
  });

  it('should reject null/undefined', () => {
    expect(isValidPhone(null)).toBe(false);
    expect(isValidPhone(undefined)).toBe(false);
  });

  it('should validate international numbers', () => {
    expect(isValidPhone('+14155552671')).toBe(true);
  });
});
