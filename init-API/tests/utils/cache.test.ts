import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getCache, setCache } from '../../utils/cache';

describe('cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null for missing keys', () => {
    expect(getCache('nonexistent')).toBeNull();
  });

  it('should store and retrieve values', () => {
    setCache('key1', { data: 42 });
    expect(getCache('key1')).toEqual({ data: 42 });
  });

  it('should expire after TTL', () => {
    setCache('key2', 'value', 1000);
    expect(getCache('key2')).toBe('value');

    vi.advanceTimersByTime(1001);
    expect(getCache('key2')).toBeNull();
  });

  it('should use default 30s TTL', () => {
    setCache('key3', 'value');
    vi.advanceTimersByTime(29999);
    expect(getCache('key3')).toBe('value');

    vi.advanceTimersByTime(2);
    expect(getCache('key3')).toBeNull();
  });

  it('should support generic types', () => {
    setCache<number[]>('nums', [1, 2, 3]);
    const result = getCache<number[]>('nums');
    expect(result).toEqual([1, 2, 3]);
  });

  it('should overwrite existing keys', () => {
    setCache('key4', 'old');
    setCache('key4', 'new');
    expect(getCache('key4')).toBe('new');
  });
});
