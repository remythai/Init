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

import { OrgaModel } from '../../models/orga.model';

describe('OrgaModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a new orga and return the created row', async () => {
      const mockOrga = { id: 1, nom: 'TestOrga', mail: 'orga@test.com', description: 'A test org', tel: '0612345678', created_at: '2024-01-01' };
      mockQuery.mockResolvedValueOnce({ rows: [mockOrga] });

      const orgaData = {
        name: 'TestOrga',
        mail: 'orga@test.com',
        description: 'A test org',
        tel: '0612345678',
        password_hash: 'hashed_password',
      };

      const result = await OrgaModel.create(orgaData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO orga'),
        ['TestOrga', 'orga@test.com', 'A test org', '0612345678', 'hashed_password']
      );
      expect(result).toEqual(mockOrga);
    });
  });

  describe('findByMail', () => {
    it('should query orga by mail and return the first row', async () => {
      const mockOrga = { id: 1, mail: 'orga@test.com' };
      mockQuery.mockResolvedValueOnce({ rows: [mockOrga] });

      const result = await OrgaModel.findByMail('orga@test.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM orga WHERE mail = $1'),
        ['orga@test.com']
      );
      expect(result).toEqual(mockOrga);
    });

    it('should return undefined when no orga is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await OrgaModel.findByMail('nonexistent@test.com');

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should query orga by id and return the first row', async () => {
      const mockOrga = { id: 5, nom: 'TestOrga', mail: 'orga@test.com' };
      mockQuery.mockResolvedValueOnce({ rows: [mockOrga] });

      const result = await OrgaModel.findById(5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [5]
      );
      expect(result).toEqual(mockOrga);
    });

    it('should return undefined when no orga is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await OrgaModel.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update allowed columns and return the updated row', async () => {
      const mockUpdated = { id: 1, nom: 'NewName', description: 'Updated desc', mail: 'orga@test.com', tel: '0612345678', logo_path: null, updated_at: '2024-06-01' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await OrgaModel.update(1, { nom: 'NewName', description: 'Updated desc' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orga SET'),
        ['NewName', 'Updated desc', 1]
      );
      expect(result).toEqual(mockUpdated);
    });

    it('should allow updating logo_path', async () => {
      const mockUpdated = { id: 1, logo_path: '/uploads/logo.png' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdated] });

      await OrgaModel.update(1, { logo_path: '/uploads/logo.png' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orga SET'),
        ['/uploads/logo.png', 1]
      );
    });

    it('should filter out disallowed columns', async () => {
      const mockUpdated = { id: 1, nom: 'NewName' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdated] });

      await OrgaModel.update(1, { nom: 'NewName', password_hash: 'evil', is_admin: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orga SET'),
        ['NewName', 1]
      );
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).not.toContain('password_hash');
      expect(sqlArg).not.toContain('is_admin');
    });
  });

  describe('setLogoutAt', () => {
    it('should set logout_at to NOW() for orga', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await OrgaModel.setLogoutAt(10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE orga SET logout_at = NOW() WHERE id = $1'),
        [10]
      );
    });
  });

  describe('getLogoutAt', () => {
    it('should return logout_at date when set', async () => {
      const date = new Date('2024-06-01T12:00:00Z');
      mockQuery.mockResolvedValueOnce({ rows: [{ logout_at: date }] });

      const result = await OrgaModel.getLogoutAt(10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT logout_at FROM orga WHERE id = $1'),
        [10]
      );
      expect(result).toEqual(date);
    });

    it('should return null when logout_at is null', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ logout_at: null }] });

      const result = await OrgaModel.getLogoutAt(10);

      expect(result).toBeNull();
    });

    it('should return null when orga not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await OrgaModel.getLogoutAt(999);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete the orga by id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await OrgaModel.delete(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM orga WHERE id = $1'),
        [1]
      );
    });
  });
});
