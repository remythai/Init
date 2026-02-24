import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = {
  query: vi.fn(),
  release: vi.fn(),
};

// Use a class so it can be called with `new`
vi.mock('pg', () => ({
  Pool: class MockPool {
    connect = vi.fn().mockResolvedValue(mockClient);
    on = vi.fn();
    query = vi.fn();
  },
}));

// Mock dotenv
vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

// Set required env vars before import
process.env.DB_USER = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_NAME = 'testdb';
process.env.DB_PASSWORD = 'testpass';
process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

describe('database config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-setup mockResolvedValue after clearAllMocks clears call history
    // (clearAllMocks preserves implementations, but the pool instance
    // connect mock was created in the class constructor, so re-mock it)
  });

  it('should export pool as default', async () => {
    const { default: pool } = await import('../../config/database');
    expect(pool).toBeDefined();
    expect(pool.connect).toBeDefined();
    expect(pool.on).toBeDefined();
  });

  it('should export withTransaction function', async () => {
    const { withTransaction } = await import('../../config/database');
    expect(typeof withTransaction).toBe('function');
  });

  describe('withTransaction', () => {
    it('should BEGIN, execute callback, and COMMIT on success', async () => {
      const { default: pool, withTransaction } = await import('../../config/database');
      // Ensure connect returns our mockClient
      (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

      const callback = vi.fn().mockResolvedValue({ id: 1 });
      const result = await withTransaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toEqual({ id: 1 });
    });

    it('should ROLLBACK on error and rethrow', async () => {
      const { default: pool, withTransaction } = await import('../../config/database');
      (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

      const error = new Error('DB error');
      const callback = vi.fn().mockRejectedValue(error);

      await expect(withTransaction(callback)).rejects.toThrow('DB error');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should always release client even on error', async () => {
      const { default: pool, withTransaction } = await import('../../config/database');
      (pool.connect as ReturnType<typeof vi.fn>).mockResolvedValue(mockClient);

      const callback = vi.fn().mockRejectedValue(new Error('fail'));

      try { await withTransaction(callback); } catch {}
      expect(mockClient.release).toHaveBeenCalledTimes(1);
    });
  });
});
