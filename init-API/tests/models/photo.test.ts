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

import { PhotoModel } from '../../models/photo.model';

describe('PhotoModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findById', () => {
    it('should SELECT by photo id', async () => {
      const photoRow = { id: 1, user_id: 10, file_path: '/uploads/photo1.jpg' };
      mockQuery.mockResolvedValueOnce({ rows: [photoRow] });

      const result = await PhotoModel.findById(1);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT * FROM photos WHERE id = $1'));
      expect(params).toEqual([1]);
      expect(result).toEqual(photoRow);
    });

    it('should return undefined when photo not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await PhotoModel.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('findByUserId', () => {
    it('should query WHERE event_id IS NULL', async () => {
      const photos = [
        { id: 1, user_id: 10, file_path: '/uploads/p1.jpg', event_id: null },
        { id: 2, user_id: 10, file_path: '/uploads/p2.jpg', event_id: null },
      ];
      mockQuery.mockResolvedValueOnce({ rows: photos });

      const result = await PhotoModel.findByUserId(10);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('WHERE user_id = $1 AND event_id IS NULL'));
      expect(params).toEqual([10]);
      expect(result).toEqual(photos);
    });
  });

  describe('findByUserAndEvent', () => {
    it('should query WHERE with userId and eventId', async () => {
      const photos = [
        { id: 3, user_id: 10, file_path: '/uploads/p3.jpg', event_id: 5 },
      ];
      mockQuery.mockResolvedValueOnce({ rows: photos });

      const result = await PhotoModel.findByUserAndEvent(10, 5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('WHERE user_id = $1 AND event_id = $2'));
      expect(params).toEqual([10, 5]);
      expect(result).toEqual(photos);
    });
  });

  describe('countByUserAndEvent', () => {
    it('should return parsed int with eventId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '3' }] });

      const result = await PhotoModel.countByUserAndEvent(10, 5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT COUNT(*)'));
      expect(sql).toEqual(expect.stringContaining('event_id = $2'));
      expect(params).toEqual([10, 5]);
      expect(result).toBe(3);
      expect(typeof result).toBe('number');
    });

    it('should return parsed int without eventId (event_id IS NULL)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '7' }] });

      const result = await PhotoModel.countByUserAndEvent(10);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT COUNT(*)'));
      expect(sql).toEqual(expect.stringContaining('event_id IS NULL'));
      expect(params).toEqual([10]);
      expect(result).toBe(7);
      expect(typeof result).toBe('number');
    });
  });

  describe('delete', () => {
    it('should DELETE RETURNING the deleted photo', async () => {
      const deletedPhoto = { id: 1, user_id: 10, file_path: '/uploads/p1.jpg' };
      mockQuery.mockResolvedValueOnce({ rows: [deletedPhoto] });

      const result = await PhotoModel.delete(1);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('DELETE FROM photos WHERE id = $1 RETURNING *'));
      expect(params).toEqual([1]);
      expect(result).toEqual(deletedPhoto);
    });

    it('should return undefined when photo does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await PhotoModel.delete(999);

      expect(result).toBeUndefined();
    });
  });
});
