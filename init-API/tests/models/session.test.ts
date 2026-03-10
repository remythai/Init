import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery } = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return { mockQuery: vi.fn() };
});

vi.mock('pg', () => ({
  Pool: class {
    query = mockQuery;
    connect = vi.fn();
    on = vi.fn();
  },
}));

vi.mock('dotenv', () => ({
  default: { config: vi.fn() },
}));

import { SessionModel } from '../../models/session.model';

describe('SessionModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('should insert a session and return the id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 42 }] });

      const result = await SessionModel.createSession(5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_sessions'),
        [5]
      );
      expect(result).toBe(42);
    });
  });

  describe('endSession', () => {
    it('should update disconnected_at for the session', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await SessionModel.endSession(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET disconnected_at = NOW()'),
        [42]
      );
    });
  });

  describe('updateLastActivity', () => {
    it('should update last_activity_at by session id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await SessionModel.updateLastActivity(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET last_activity_at = NOW()'),
        [42]
      );
    });
  });

  describe('updateLastActivityByUser', () => {
    it('should update last_activity_at by user id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await SessionModel.updateLastActivityByUser(5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_sessions SET last_activity_at = NOW()'),
        [5]
      );
    });
  });

  describe('getDailyStats', () => {
    it('should return stats for date range', async () => {
      const stats = [{ day: '2026-03-09', active_users: 10, avg_duration_seconds: 300, total_sessions: 15 }];
      mockQuery.mockResolvedValueOnce({ rows: stats });

      const result = await SessionModel.getDailyStats('2026-03-01', '2026-03-09');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM daily_stats'),
        ['2026-03-01', '2026-03-09']
      );
      expect(result).toEqual(stats);
    });
  });

  describe('getLiveStats', () => {
    it('should return current active users and sessions', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ active_users: '5', active_sessions: '8' }] });

      const result = await SessionModel.getLiveStats();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM user_sessions')
      );
      expect(result).toEqual({ active_users: 5, active_sessions: 8 });
    });
  });
});
