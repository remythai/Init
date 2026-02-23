import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockConnect, mockOn } = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

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

import { BlockedUserModel } from '../../models/blockedUser.model';

describe('BlockedUserModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('block', () => {
    it('should insert a blocked user with ON CONFLICT and return the row', async () => {
      const mockRow = { event_id: 1, user_id: 2, reason: 'Bad behavior', blocked_at: '2024-06-01' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await BlockedUserModel.block(1, 2, 'Bad behavior');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO event_blocked_users'),
        [1, 2, 'Bad behavior']
      );
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).toContain('ON CONFLICT');
      expect(result).toEqual(mockRow);
    });

    it('should default reason to null when not provided', async () => {
      const mockRow = { event_id: 1, user_id: 3, reason: null };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await BlockedUserModel.block(1, 3);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO event_blocked_users'),
        [1, 3, null]
      );
      expect(result).toEqual(mockRow);
    });
  });

  describe('isBlocked', () => {
    it('should return true when the user is blocked', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await BlockedUserModel.isBlocked(1, 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM event_blocked_users'),
        [1, 2]
      );
      expect(result).toBe(true);
    });

    it('should return false when the user is not blocked', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await BlockedUserModel.isBlocked(1, 99);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT 1 FROM event_blocked_users'),
        [1, 99]
      );
      expect(result).toBe(false);
    });
  });

  describe('unblock', () => {
    it('should delete the blocked user entry and return the row', async () => {
      const mockRow = { event_id: 1, user_id: 2, reason: 'Bad behavior' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await BlockedUserModel.unblock(1, 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM event_blocked_users'),
        [1, 2]
      );
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).toContain('RETURNING');
      expect(result).toEqual(mockRow);
    });

    it('should return undefined when there was nothing to unblock', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await BlockedUserModel.unblock(1, 99);

      expect(result).toBeUndefined();
    });
  });

  describe('getByEventId', () => {
    it('should return all blocked users for the event with user info via JOIN', async () => {
      const mockRows = [
        { event_id: 1, user_id: 2, firstname: 'Jean', lastname: 'Dupont', mail: 'jean@test.com', tel: '0612345678', blocked_at: '2024-06-01' },
        { event_id: 1, user_id: 3, firstname: 'Marie', lastname: 'Martin', mail: 'marie@test.com', tel: '0698765432', blocked_at: '2024-06-02' },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await BlockedUserModel.getByEventId(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN users'),
        [1, 50, 0]
      );
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).toContain('event_blocked_users');
      expect(sqlArg).toContain('ORDER BY');
      expect(result).toEqual(mockRows);
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when no users are blocked', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await BlockedUserModel.getByEventId(999);

      expect(result).toEqual([]);
    });
  });
});
