import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockConnect, mockOn } = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret';

  return {
    mockQuery: vi.fn(),
    mockConnect: vi.fn(),
    mockOn: vi.fn(),
  };
});

vi.mock('pg', () => ({
  Pool: class {
    query = mockQuery;
    connect = mockConnect;
    on = mockOn;
  },
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

vi.mock('../../utils/phone', () => ({
  normalizePhone: (phone: string) => phone.startsWith('+33') ? phone : `+33${phone.slice(1)}`,
  isValidPhone: (phone: string) => /^\+\d{10,15}$/.test(phone),
}));

import { WhitelistModel } from '../../models/whitelist.model';

describe('WhitelistModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('isWhitelisted', () => {
    it('should normalize phone and return true when whitelisted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await WhitelistModel.isWhitelisted(5, '0612345678');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT 1 FROM event_whitelist'));
      expect(sql).toEqual(expect.stringContaining("status = 'active'"));
      expect(params).toEqual([5, '+33612345678']);
      expect(result).toBe(true);
    });

    it('should return false when phone is not whitelisted', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await WhitelistModel.isWhitelisted(5, '0699999999');

      expect(result).toBe(false);
    });

    it('should not re-normalize a phone already in +33 format', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      await WhitelistModel.isWhitelisted(5, '+33612345678');

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([5, '+33612345678']);
    });
  });

  describe('linkUser', () => {
    it('should UPDATE whitelist entries with user_id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await WhitelistModel.linkUser('0612345678', 42);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('UPDATE event_whitelist'));
      expect(sql).toEqual(expect.stringContaining('SET user_id = $2'));
      expect(sql).toEqual(expect.stringContaining('WHERE phone = $1 AND user_id IS NULL'));
      expect(params).toEqual(['+33612345678', 42]);
    });
  });

  describe('getByEventId', () => {
    it('should return only active entries by default', async () => {
      const rows = [
        { id: 1, phone: '+33612345678', status: 'active', firstname: 'Alice' },
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await WhitelistModel.getByEventId(5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('LEFT JOIN users u ON w.user_id = u.id'));
      expect(sql).toEqual(expect.stringContaining('WHERE w.event_id = $1'));
      expect(sql).toEqual(expect.stringContaining("w.status = 'active'"));
      expect(sql).toEqual(expect.stringContaining('ORDER BY w.created_at DESC'));
      expect(params).toEqual([5, 50, 0]);
      expect(result).toEqual(rows);
    });

    it('should return all entries including removed when includeRemoved is true', async () => {
      const rows = [
        { id: 1, phone: '+33612345678', status: 'active' },
        { id: 2, phone: '+33698765432', status: 'removed' },
      ];
      mockQuery.mockResolvedValueOnce({ rows });

      const result = await WhitelistModel.getByEventId(5, true);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).not.toEqual(expect.stringContaining("w.status = 'active'"));
      expect(params).toEqual([5, 50, 0]);
      expect(result).toEqual(rows);
    });
  });

  describe('reactivate', () => {
    it('should UPDATE with status check for removed', async () => {
      const reactivatedRow = { id: 1, phone: '+33612345678', status: 'active', removed_at: null };
      mockQuery.mockResolvedValueOnce({ rows: [reactivatedRow] });

      const result = await WhitelistModel.reactivate(5, '0612345678');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('UPDATE event_whitelist'));
      expect(sql).toEqual(expect.stringContaining("SET status = 'active'"));
      expect(sql).toEqual(expect.stringContaining('removed_at = NULL'));
      expect(sql).toEqual(expect.stringContaining("status = 'removed'"));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([5, '+33612345678']);
      expect(result).toEqual(reactivatedRow);
    });

    it('should return undefined when phone was not in removed status', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await WhitelistModel.reactivate(5, '0699999999');

      expect(result).toBeUndefined();
    });
  });
});
