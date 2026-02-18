import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockJwt = vi.hoisted(() => ({
  sign: vi.fn(),
}));

const mockCrypto = vi.hoisted(() => ({
  randomBytes: vi.fn(),
}));

const mockTokenModel = vi.hoisted(() => ({
  create: vi.fn(),
  findValidToken: vi.fn(),
  delete: vi.fn(),
}));

vi.hoisted(() => {
  process.env.JWT_SECRET = 'testsecret';
});

vi.mock('jsonwebtoken', () => ({
  default: mockJwt,
}));

vi.mock('crypto', () => ({
  default: mockCrypto,
}));

vi.mock('../../models/token.model.js', () => ({
  TokenModel: mockTokenModel,
}));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { AuthService } from '../../services/auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateTokens', () => {
    it('should sign JWT, create refresh token, store it, and return both tokens', async () => {
      mockJwt.sign.mockReturnValueOnce('access-token');
      mockCrypto.randomBytes.mockReturnValueOnce({
        toString: () => 'refresh-token',
      });
      mockTokenModel.create.mockResolvedValueOnce(undefined);

      const result = await AuthService.generateTokens(42, 'user');

      expect(result).toEqual({ accessToken: 'access-token', refreshToken: 'refresh-token' });
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: 42, role: 'user' },
        'testsecret',
        { expiresIn: '15m' }
      );
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(64);
      expect(mockTokenModel.create).toHaveBeenCalledWith(
        42,
        'refresh-token',
        expect.any(Date),
        'user'
      );
    });

    it('should work with orga role', async () => {
      mockJwt.sign.mockReturnValueOnce('orga-access-token');
      mockCrypto.randomBytes.mockReturnValueOnce({
        toString: () => 'orga-refresh-token',
      });
      mockTokenModel.create.mockResolvedValueOnce(undefined);

      const result = await AuthService.generateTokens(10, 'orga');

      expect(result).toEqual({ accessToken: 'orga-access-token', refreshToken: 'orga-refresh-token' });
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: 10, role: 'orga' },
        'testsecret',
        { expiresIn: '15m' }
      );
      expect(mockTokenModel.create).toHaveBeenCalledWith(
        10,
        'orga-refresh-token',
        expect.any(Date),
        'orga'
      );
    });
  });

  describe('rotateRefreshToken', () => {
    it('should validate, delete old token, create new one, and return both tokens', async () => {
      mockTokenModel.findValidToken.mockResolvedValueOnce({
        user_id: 42,
        orga_id: null,
        user_type: 'user',
      });
      mockTokenModel.delete.mockResolvedValueOnce(undefined);
      mockJwt.sign.mockReturnValueOnce('new-access-token');
      mockCrypto.randomBytes.mockReturnValueOnce({
        toString: () => 'new-refresh-token',
      });
      mockTokenModel.create.mockResolvedValueOnce(undefined);

      const result = await AuthService.rotateRefreshToken('old-refresh-token');

      expect(result).toEqual({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' });
      expect(mockTokenModel.findValidToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mockTokenModel.delete).toHaveBeenCalledWith('old-refresh-token');
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: 42, role: 'user' },
        'testsecret',
        { expiresIn: '15m' }
      );
      expect(mockTokenModel.create).toHaveBeenCalledWith(
        42,
        'new-refresh-token',
        expect.any(Date),
        'user'
      );
    });

    it('should work with orga token', async () => {
      mockTokenModel.findValidToken.mockResolvedValueOnce({
        user_id: null,
        orga_id: 10,
        user_type: 'orga',
      });
      mockTokenModel.delete.mockResolvedValueOnce(undefined);
      mockJwt.sign.mockReturnValueOnce('orga-access-token');
      mockCrypto.randomBytes.mockReturnValueOnce({
        toString: () => 'orga-refresh-token',
      });
      mockTokenModel.create.mockResolvedValueOnce(undefined);

      const result = await AuthService.rotateRefreshToken('old-token');

      expect(result).toEqual({ accessToken: 'orga-access-token', refreshToken: 'orga-refresh-token' });
      expect(mockJwt.sign).toHaveBeenCalledWith(
        { id: 10, role: 'orga' },
        'testsecret',
        { expiresIn: '15m' }
      );
    });

    it('should throw ValidationError when cookie is undefined', async () => {
      await expect(
        AuthService.rotateRefreshToken(undefined)
      ).rejects.toThrow('Refresh token requis');
    });

    it('should throw UnauthorizedError when token is invalid', async () => {
      mockTokenModel.findValidToken.mockResolvedValueOnce(null);

      await expect(
        AuthService.rotateRefreshToken('bad-token')
      ).rejects.toThrow('Refresh token invalide ou expiré');
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete token when token exists', async () => {
      mockTokenModel.delete.mockResolvedValueOnce(undefined);

      await AuthService.revokeRefreshToken('some-token');

      expect(mockTokenModel.delete).toHaveBeenCalledWith('some-token');
    });

    it('should not delete when no token provided', async () => {
      await AuthService.revokeRefreshToken(undefined);

      expect(mockTokenModel.delete).not.toHaveBeenCalled();
    });
  });
});
