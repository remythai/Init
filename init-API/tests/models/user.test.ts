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

import { UserModel } from '../../models/user.model';

describe('UserModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a new user and return the created row', async () => {
      const mockUser = { id: 1, firstname: 'Jean', lastname: 'Dupont', mail: 'jean@test.com', tel: '0612345678', birthday: '1990-01-01', created_at: '2024-01-01' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const userData = {
        firstname: 'Jean',
        lastname: 'Dupont',
        mail: 'jean@test.com',
        tel: '0612345678',
        birthday: '1990-01-01',
        password_hash: 'hashed_password',
      };

      const result = await UserModel.create(userData);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        ['Jean', 'Dupont', 'jean@test.com', '0612345678', '1990-01-01', 'hashed_password']
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByTel', () => {
    it('should query users by tel and return the first row', async () => {
      const mockUser = { id: 1, firstname: 'Jean', tel: '0612345678' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.findByTel('0612345678');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE tel = $1'),
        ['0612345678']
      );
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when no user is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await UserModel.findByTel('0000000000');

      expect(result).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('should query users by id and return the first row', async () => {
      const mockUser = { id: 42, firstname: 'Jean', lastname: 'Dupont' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.findById(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [42]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when no user is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await UserModel.findById(999);

      expect(result).toBeUndefined();
    });
  });

  describe('findByMail', () => {
    it('should query users by mail and return the first row', async () => {
      const mockUser = { id: 1, mail: 'jean@test.com' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.findByMail('jean@test.com');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE mail = $1'),
        ['jean@test.com']
      );
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('should update allowed columns and return the updated row', async () => {
      const mockUpdated = { id: 1, firstname: 'Pierre', lastname: 'Dupont', mail: 'pierre@test.com', tel: '0612345678', birthday: '1990-01-01', updated_at: '2024-06-01' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdated] });

      const result = await UserModel.update(1, { firstname: 'Pierre', mail: 'pierre@test.com' });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        ['Pierre', 'pierre@test.com', 1]
      );
      expect(result).toEqual(mockUpdated);
    });

    it('should filter out disallowed columns', async () => {
      const mockUpdated = { id: 1, firstname: 'Pierre' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdated] });

      await UserModel.update(1, { firstname: 'Pierre', password_hash: 'evil', is_admin: true });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET'),
        ['Pierre', 1]
      );
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).not.toContain('password_hash');
      expect(sqlArg).not.toContain('is_admin');
    });
  });

  describe('findByIdWithHash', () => {
    it('should return user with password_hash (SELECT *)', async () => {
      const mockUser = { id: 42, firstname: 'Jean', password_hash: 'hashed' };
      mockQuery.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await UserModel.findByIdWithHash(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM users WHERE id = $1'),
        [42]
      );
      expect(result).toEqual(mockUser);
    });

    it('should return undefined when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await UserModel.findByIdWithHash(999);

      expect(result).toBeUndefined();
    });
  });

  describe('updatePasswordHash', () => {
    it('should update password_hash for user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await UserModel.updatePasswordHash(42, 'new_hash');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash = $1 WHERE id = $2'),
        ['new_hash', 42]
      );
    });
  });

  describe('setLogoutAt', () => {
    it('should set logout_at to NOW() for user', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await UserModel.setLogoutAt(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET logout_at = NOW() WHERE id = $1'),
        [42]
      );
    });
  });

  describe('getLogoutAt', () => {
    it('should return logout_at date when set', async () => {
      const date = new Date('2024-06-01T12:00:00Z');
      mockQuery.mockResolvedValueOnce({ rows: [{ logout_at: date }] });

      const result = await UserModel.getLogoutAt(42);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT logout_at FROM users WHERE id = $1'),
        [42]
      );
      expect(result).toEqual(date);
    });

    it('should return null when logout_at is null', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ logout_at: null }] });

      const result = await UserModel.getLogoutAt(42);

      expect(result).toBeNull();
    });

    it('should return null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await UserModel.getLogoutAt(999);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete the user by id', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await UserModel.delete(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users WHERE id = $1'),
        [1]
      );
    });
  });
});
