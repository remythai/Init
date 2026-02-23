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

import { RegistrationModel } from '../../models/registration.model';

describe('RegistrationModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a registration with JSON.stringify for profil_info', async () => {
      const mockRow = { user_id: 1, event_id: 2, profil_info: '{"bio":"Hello"}' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const profilInfo = { bio: 'Hello', age: 25 };
      const result = await RegistrationModel.create(1, 2, profilInfo);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_event_rel'),
        [1, 2, JSON.stringify(profilInfo)]
      );
      expect(result).toEqual(mockRow);
    });
  });

  describe('findByUserAndEvent', () => {
    it('should query by userId and eventId and return the row', async () => {
      const mockRow = { user_id: 1, event_id: 2, profil_info: '{}' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await RegistrationModel.findByUserAndEvent(1, 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE user_id = $1 AND event_id = $2'),
        [1, 2]
      );
      expect(result).toEqual(mockRow);
    });

    it('should return undefined when no registration is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await RegistrationModel.findByUserAndEvent(1, 999);

      expect(result).toBeUndefined();
    });
  });

  describe('findByUserId', () => {
    it('should return all registrations for a user with event and orga info via JOIN', async () => {
      const mockRows = [
        { user_id: 1, event_id: 2, name: 'Event A', start_at: '2024-07-01', orga_nom: 'Orga1' },
        { user_id: 1, event_id: 3, name: 'Event B', start_at: '2024-08-01', orga_nom: 'Orga2' },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const result = await RegistrationModel.findByUserId(1);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN events'),
        [1]
      );
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).toContain('JOIN orga');
      expect(sqlArg).toContain('ORDER BY');
      expect(result).toEqual(mockRows);
      expect(result).toHaveLength(2);
    });

    it('should return an empty array when user has no registrations', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await RegistrationModel.findByUserId(999);

      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update profil_info with JSON.stringify and return the updated row', async () => {
      const mockRow = { user_id: 1, event_id: 2, profil_info: '{"bio":"Updated"}' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const newProfilInfo = { bio: 'Updated', interests: ['music'] };
      const result = await RegistrationModel.update(1, 2, newProfilInfo);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE user_event_rel'),
        [JSON.stringify(newProfilInfo), 1, 2]
      );
      expect(result).toEqual(mockRow);
    });

    it('should return undefined when no matching registration exists', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await RegistrationModel.update(1, 999, { bio: 'test' });

      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete the registration by userId and eventId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await RegistrationModel.delete(1, 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM user_event_rel WHERE user_id = $1 AND event_id = $2'),
        [1, 2]
      );
    });
  });

  describe('findUserProfileByEvent', () => {
    it('should return user profile info with user details via JOIN', async () => {
      const mockRow = { profil_info: '{"bio":"Hello"}', firstname: 'Jean', lastname: 'Dupont', birthday: '1990-01-01' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await RegistrationModel.findUserProfileByEvent(1, 2);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('JOIN users'),
        [1, 2]
      );
      const sqlArg = mockQuery.mock.calls[0][0];
      expect(sqlArg).toContain('profil_info');
      expect(sqlArg).toContain('firstname');
      expect(sqlArg).toContain('lastname');
      expect(sqlArg).toContain('birthday');
      expect(result).toEqual(mockRow);
    });

    it('should return undefined when no profile is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await RegistrationModel.findUserProfileByEvent(1, 999);

      expect(result).toBeUndefined();
    });
  });

  describe('isUserRegistered', () => {
    it('should return true when user is registered for event', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ user_id: 1 }] });

      const result = await RegistrationModel.isUserRegistered(1, 2);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = mockQuery.mock.calls[0];
      expect(sql).toEqual(expect.stringContaining('SELECT user_id FROM user_event_rel'));
      expect(sql).toEqual(expect.stringContaining('WHERE user_id = $1 AND event_id = $2'));
      expect(params).toEqual([1, 2]);
      expect(result).toBe(true);
    });

    it('should return false when user is not registered', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await RegistrationModel.isUserRegistered(1, 999);

      expect(result).toBe(false);
    });
  });
});
