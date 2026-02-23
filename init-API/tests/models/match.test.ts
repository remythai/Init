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

import { MatchModel } from '../../models/match.model';

describe('MatchModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLike', () => {
    it('should INSERT into likes and return the row', async () => {
      const likeRow = { id: 1, liker_id: 10, liked_id: 20, event_id: 5, is_like: true };
      mockQuery.mockResolvedValueOnce({ rows: [likeRow] });

      const result = await MatchModel.createLike(10, 20, 5, true);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('INSERT INTO likes'));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([10, 20, 5, true]);
      expect(result).toEqual(likeRow);
    });

    it('should use provided client instead of pool', async () => {
      const mockClient = { query: vi.fn() };
      const likeRow = { id: 2, liker_id: 10, liked_id: 20, event_id: 5, is_like: false };
      mockClient.query.mockResolvedValueOnce({ rows: [likeRow] });

      const result = await MatchModel.createLike(10, 20, 5, false, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toEqual(likeRow);
    });
  });

  describe('findLike', () => {
    it('should SELECT with is_like = true', async () => {
      const likeRow = { id: 1, liker_id: 10, liked_id: 20, event_id: 5, is_like: true };
      mockQuery.mockResolvedValueOnce({ rows: [likeRow] });

      const result = await MatchModel.findLike(10, 20, 5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT * FROM likes'));
      expect(sql).toEqual(expect.stringContaining('is_like = true'));
      expect(params).toEqual([10, 20, 5]);
      expect(result).toEqual(likeRow);
    });
  });

  describe('hasAlreadySwiped', () => {
    it('should return true when rows exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

      const result = await MatchModel.hasAlreadySwiped(10, 20, 5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT 1 FROM likes'));
      expect(params).toEqual([10, 20, 5]);
      expect(result).toBe(true);
    });

    it('should return false when no rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await MatchModel.hasAlreadySwiped(10, 20, 5);

      expect(result).toBe(false);
    });
  });

  describe('createMatch', () => {
    it('should order user IDs so smaller is first', async () => {
      const matchRow = { id: 1, user1_id: 5, user2_id: 15, event_id: 3 };
      mockQuery.mockResolvedValueOnce({ rows: [matchRow] });

      const result = await MatchModel.createMatch(15, 5, 3);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('INSERT INTO matches'));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([5, 15, 3]);
      expect(result).toEqual(matchRow);
    });

    it('should keep order when user1 is already smaller', async () => {
      const matchRow = { id: 2, user1_id: 3, user2_id: 10, event_id: 7 };
      mockQuery.mockResolvedValueOnce({ rows: [matchRow] });

      await MatchModel.createMatch(3, 10, 7);

      const [, params] = mockQuery.mock.calls[0];
      expect(params).toEqual([3, 10, 7]);
    });
  });

  describe('findMatch', () => {
    it('should query with LEAST/GREATEST', async () => {
      const matchRow = { id: 1, user1_id: 5, user2_id: 15, event_id: 3 };
      mockQuery.mockResolvedValueOnce({ rows: [matchRow] });

      const result = await MatchModel.findMatch(15, 5, 3);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('LEAST(user1_id, user2_id) = LEAST($2, $3)'));
      expect(sql).toEqual(expect.stringContaining('GREATEST(user1_id, user2_id) = GREATEST($2, $3)'));
      expect(params).toEqual([3, 15, 5]);
      expect(result).toEqual(matchRow);
    });
  });

  describe('findById', () => {
    it('should SELECT by matchId', async () => {
      const matchRow = { id: 42, user1_id: 1, user2_id: 2, event_id: 3 };
      mockQuery.mockResolvedValueOnce({ rows: [matchRow] });

      const result = await MatchModel.findById(42);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT * FROM matches WHERE id = $1'));
      expect(params).toEqual([42]);
      expect(result).toEqual(matchRow);
    });

    it('should return undefined when no match found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await MatchModel.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('createMessage', () => {
    it('should INSERT into messages', async () => {
      const msgRow = { id: 1, match_id: 10, sender_id: 5, content: 'Hello!' };
      mockQuery.mockResolvedValueOnce({ rows: [msgRow] });

      const result = await MatchModel.createMessage(10, 5, 'Hello!');

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('INSERT INTO messages'));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([10, 5, 'Hello!']);
      expect(result).toEqual(msgRow);
    });
  });

  describe('markMessageAsRead', () => {
    it('should UPDATE is_read = true', async () => {
      const msgRow = { id: 7, is_read: true };
      mockQuery.mockResolvedValueOnce({ rows: [msgRow] });

      const result = await MatchModel.markMessageAsRead(7);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('UPDATE messages SET is_read = true'));
      expect(sql).toEqual(expect.stringContaining('WHERE id = $1'));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([7]);
      expect(result).toEqual(msgRow);
    });
  });

  describe('toggleMessageLike', () => {
    it('should UPDATE NOT is_liked', async () => {
      const msgRow = { id: 3, is_liked: true };
      mockQuery.mockResolvedValueOnce({ rows: [msgRow] });

      const result = await MatchModel.toggleMessageLike(3);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('UPDATE messages SET is_liked = NOT is_liked'));
      expect(sql).toEqual(expect.stringContaining('WHERE id = $1'));
      expect(sql).toEqual(expect.stringContaining('RETURNING *'));
      expect(params).toEqual([3]);
      expect(result).toEqual(msgRow);
    });
  });

  describe('isUserInMatch', () => {
    it('should return true when user is in match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] });

      const result = await MatchModel.isUserInMatch(1, 10);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT id FROM matches'));
      expect(sql).toEqual(expect.stringContaining('user1_id = $2 OR user2_id = $2'));
      expect(params).toEqual([1, 10]);
      expect(result).toBe(true);
    });

    it('should return false when user is not in match', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await MatchModel.isUserInMatch(1, 99);

      expect(result).toBe(false);
    });
  });

  describe('deleteUserLikesInEvent', () => {
    it('should DELETE and return rowCount', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 5 });

      const result = await MatchModel.deleteUserLikesInEvent(10, 3);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('DELETE FROM likes'));
      expect(sql).toEqual(expect.stringContaining('event_id = $1'));
      expect(sql).toEqual(expect.stringContaining('liker_id = $2'));
      expect(sql).toEqual(expect.stringContaining('liked_id = $2'));
      expect(params).toEqual([3, 10]);
      expect(result).toBe(5);
    });

    it('should return 0 when no likes deleted', async () => {
      mockQuery.mockResolvedValueOnce({ rowCount: 0 });

      const result = await MatchModel.deleteUserLikesInEvent(99, 1);

      expect(result).toBe(0);
    });
  });
});
