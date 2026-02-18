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

import { EventModel } from '../../models/event.model';

describe('EventModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should INSERT with 17 params and JSON.stringify custom_fields', async () => {
      const eventData = {
        orga_id: 1,
        name: 'Test Event',
        description: 'A test event',
        start_at: '2025-06-01T10:00:00Z',
        end_at: '2025-06-01T18:00:00Z',
        location: 'Paris',
        app_start_at: '2025-05-25T00:00:00Z',
        app_end_at: '2025-06-01T23:59:59Z',
        theme: 'summer',
        max_participants: 100,
        is_public: true,
        has_whitelist: false,
        has_link_access: true,
        has_password_access: false,
        access_password_hash: null,
        cooldown: 30,
        custom_fields: { question: 'What is your hobby?' },
      };

      const createdRow = { id: 1, ...eventData, custom_fields: JSON.stringify(eventData.custom_fields) };
      mockQuery.mockResolvedValueOnce({ rows: [createdRow] });

      const result = await EventModel.create(eventData);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('INSERT INTO events'));
      expect(sql).toEqual(expect.stringContaining('$17'));
      expect(params).toHaveLength(17);
      expect(params[16]).toBe(JSON.stringify(eventData.custom_fields));
      const returningClause = sql.split('RETURNING')[1];
      expect(returningClause).not.toEqual(expect.stringContaining('access_password_hash'));
      expect(result).toEqual(createdRow);
    });
  });

  describe('findById', () => {
    it('should query with JOIN and SAFE_COLUMNS (no access_password_hash)', async () => {
      const row = { id: 1, name: 'Test Event', orga_nom: 'Org1' };
      mockQuery.mockResolvedValueOnce({ rows: [row] });

      const result = await EventModel.findById(1);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('JOIN orga o ON e.orga_id = o.id'));
      expect(sql).toEqual(expect.stringContaining('e.id'));
      expect(sql).toEqual(expect.stringContaining('e.name'));
      expect(sql).not.toEqual(expect.stringContaining('access_password_hash'));
      expect(params).toEqual([1]);
      expect(result).toEqual(row);
    });
  });

  describe('getAccessPasswordHash', () => {
    it('should query only access_password_hash', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ access_password_hash: 'hash123' }] });

      const result = await EventModel.getAccessPasswordHash(42);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT access_password_hash FROM events'));
      expect(sql).toEqual(expect.stringContaining('WHERE id = $1'));
      expect(params).toEqual([42]);
      expect(result).toBe('hash123');
    });

    it('should return undefined when event not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await EventModel.getAccessPasswordHash(999);

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should UPDATE with allowed columns and JSON.stringify custom_fields', async () => {
      const updates = {
        name: 'Updated Event',
        custom_fields: { question: 'Updated?' },
      };
      const updatedRow = { id: 1, name: 'Updated Event' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      const result = await EventModel.update(1, updates);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('UPDATE events SET'));
      expect(sql).toEqual(expect.stringContaining('name = $1'));
      expect(sql).toEqual(expect.stringContaining('custom_fields = $2'));
      expect(params).toContain('Updated Event');
      expect(params).toContain(JSON.stringify({ question: 'Updated?' }));
      expect(params[params.length - 1]).toBe(1);
      expect(result).toEqual(updatedRow);
    });

    it('should filter out disallowed columns', async () => {
      const updates = {
        name: 'Allowed',
        orga_id: 999,
        id: 42,
      };
      const updatedRow = { id: 1, name: 'Allowed' };
      mockQuery.mockResolvedValueOnce({ rows: [updatedRow] });

      await EventModel.update(1, updates);

      const [sql, params] = mockQuery.mock.calls[0];
      const setClause = sql.split('SET')[1].split('WHERE')[0];
      expect(setClause).toEqual(expect.stringContaining('name = $1'));
      expect(setClause).not.toEqual(expect.stringContaining('orga_id'));
      expect(setClause).not.toEqual(expect.stringContaining('id ='));
      expect(params).toEqual(['Allowed', 1]);
    });
  });

  describe('delete', () => {
    it('should DELETE by id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await EventModel.delete(5);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('DELETE FROM events WHERE id = $1'));
      expect(params).toEqual([5]);
    });
  });

  describe('countParticipants', () => {
    it('should return parsed int from COUNT query', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ count: '25' }] });

      const result = await EventModel.countParticipants(10);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT COUNT(*)'));
      expect(sql).toEqual(expect.stringContaining('user_event_rel'));
      expect(params).toEqual([10]);
      expect(result).toBe(25);
      expect(typeof result).toBe('number');
    });
  });

  describe('findByIdForUpdate', () => {
    it('should use SELECT FOR UPDATE query', async () => {
      const mockClient = { query: vi.fn() };
      mockClient.query.mockResolvedValueOnce({ rows: [{ max_participants: 100 }] });

      const result = await EventModel.findByIdForUpdate(7, mockClient);

      expect(mockClient.query).toHaveBeenCalledTimes(1);
      const [sql, params] = mockClient.query.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT max_participants FROM events'));
      expect(sql).toEqual(expect.stringContaining('FOR UPDATE'));
      expect(params).toEqual([7]);
      expect(result).toEqual({ max_participants: 100 });
    });
  });
});
