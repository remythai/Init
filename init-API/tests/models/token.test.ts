import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

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

import { TokenModel } from '../../models/token.model';

function expectedHash(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('TokenModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a token with user_id for user type', async () => {
      const mockRow = { id: 1, user_id: 10, orga_id: null, token: 'hashed', expiry: '2025-01-01', user_type: 'user' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const expiry = new Date('2025-01-01');
      const result = await TokenModel.create(10, 'raw-token-123', expiry, 'user');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        [10, null, expectedHash('raw-token-123'), expiry, 'user']
      );
      expect(result).toEqual(mockRow);
    });

    it('should insert a token with orga_id for orga type', async () => {
      const mockRow = { id: 2, user_id: null, orga_id: 5, token: 'hashed', expiry: '2025-01-01', user_type: 'orga' };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const expiry = new Date('2025-01-01');
      const result = await TokenModel.create(5, 'raw-token-456', expiry, 'orga');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        [null, 5, expectedHash('raw-token-456'), expiry, 'orga']
      );
      expect(result).toEqual(mockRow);
    });

    it('should throw an error for invalid userType', async () => {
      await expect(
        TokenModel.create(1, 'token', new Date(), 'invalid' as any)
      ).rejects.toThrow('userType doit');
    });
  });

  describe('findValidToken', () => {
    it('should hash the token before querying and return the row', async () => {
      const mockRow = { id: 1, token: 'hashed', user_id: 10 };
      mockQuery.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await TokenModel.findValidToken('raw-token-789');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM refresh_tokens WHERE token = $1'),
        [expectedHash('raw-token-789')]
      );
      expect(result).toEqual(mockRow);
    });

    it('should return undefined when no valid token is found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await TokenModel.findValidToken('expired-token');

      expect(result).toBeUndefined();
    });
  });

  describe('findValidTokenForUpdate', () => {
    it('should query with FOR UPDATE using the provided client', async () => {
      const mockRow = { id: 1, token: 'hashed', user_id: 10, user_type: 'user' };
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [mockRow] }) };

      const result = await TokenModel.findValidTokenForUpdate('raw-token-lock', mockClient as any);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('FOR UPDATE'),
        [expectedHash('raw-token-lock')]
      );
      expect(result).toEqual(mockRow);
    });

    it('should return undefined when no valid token found', async () => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };

      const result = await TokenModel.findValidTokenForUpdate('expired-token', mockClient as any);

      expect(result).toBeUndefined();
    });
  });

  describe('create with client', () => {
    it('should use provided client instead of pool', async () => {
      const mockRow = { id: 3, user_id: 10, token: 'hashed', user_type: 'user' };
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [mockRow] }) };

      const expiry = new Date('2025-01-01');
      await TokenModel.create(10, 'raw-token-tx', expiry, 'user', mockClient as any);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO refresh_tokens'),
        [10, null, expectedHash('raw-token-tx'), expiry, 'user']
      );
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('delete with client', () => {
    it('should use provided client instead of pool', async () => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [] }) };

      await TokenModel.delete('raw-token-tx-del', mockClient as any);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE token = $1'),
        [expectedHash('raw-token-tx-del')]
      );
      expect(mockQuery).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should hash the token before deleting', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await TokenModel.delete('raw-token-to-delete');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE token = $1'),
        [expectedHash('raw-token-to-delete')]
      );
    });
  });

  describe('deleteAllForUser', () => {
    it('should delete by user_id for user type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await TokenModel.deleteAllForUser(10, 'user');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE user_id = $1'),
        [10]
      );
    });

    it('should delete by orga_id for orga type', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await TokenModel.deleteAllForUser(5, 'orga');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM refresh_tokens WHERE orga_id = $1'),
        [5]
      );
    });
  });
});
