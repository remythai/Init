import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockArgon2 = vi.hoisted(() => {
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    hash: vi.fn(),
    verify: vi.fn(),
  };
});

const mockUserModel = vi.hoisted(() => ({
  create: vi.fn(),
  findByTel: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findByIdWithHash: vi.fn(),
  updatePasswordHash: vi.fn(),
  setLogoutAt: vi.fn(),
}));

const mockTokenModel = vi.hoisted(() => ({
  deleteAllForUser: vi.fn(),
}));

const mockAuthService = vi.hoisted(() => ({
  generateTokens: vi.fn(),
}));

const mockNormalizePhone = vi.hoisted(() => vi.fn((p: string) => `+33${p.substring(1)}`));

const mockDeleteUserPhotosDir = vi.hoisted(() => vi.fn());
const mockWithTransaction = vi.hoisted(() => vi.fn());

vi.mock('argon2', () => ({ default: mockArgon2 }));
vi.mock('../../models/user.model.js', () => ({ UserModel: mockUserModel }));
vi.mock('../../models/token.model.js', () => ({ TokenModel: mockTokenModel }));
vi.mock('../../services/auth.service.js', () => ({ AuthService: mockAuthService }));
vi.mock('../../utils/phone.js', () => ({ normalizePhone: mockNormalizePhone }));
vi.mock('../../config/multer.config.js', () => ({ deleteUserPhotosDir: mockDeleteUserPhotosDir }));
vi.mock('../../config/database.js', () => ({ withTransaction: mockWithTransaction, default: {} }));
const mockLogger = vi.hoisted(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }));
vi.mock('../../utils/logger.js', () => ({
  default: mockLogger,
}));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { UserService } from '../../services/user.service';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithTransaction.mockImplementation(async (cb: (client: unknown) => Promise<unknown>) => cb({}));
  });

  describe('register', () => {
    it('should hash password, normalize phone, and create user', async () => {
      mockArgon2.hash.mockResolvedValueOnce('hashed_password');
      const createdUser = { id: 1, firstname: 'Jean', lastname: 'Dupont' };
      mockUserModel.create.mockResolvedValueOnce(createdUser);

      const result = await UserService.register({
        firstname: 'Jean',
        lastname: 'Dupont',
        mail: 'Jean@Test.com',
        tel: '0612345678',
        birthday: '1990-01-01',
        password: 'MyPass123!',
      });

      expect(mockArgon2.hash).toHaveBeenCalledWith('MyPass123!');
      expect(mockNormalizePhone).toHaveBeenCalledWith('0612345678');
      expect(mockUserModel.create).toHaveBeenCalledWith({
        firstname: 'Jean',
        lastname: 'Dupont',
        mail: 'jean@test.com',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password_hash: 'hashed_password',
      });
      expect(result).toBe(createdUser);
    });

    it('should handle undefined mail', async () => {
      mockArgon2.hash.mockResolvedValueOnce('hashed');
      mockUserModel.create.mockResolvedValueOnce({ id: 1 });

      await UserService.register({
        firstname: 'A',
        lastname: 'B',
        tel: '0612345678',
        birthday: '1990-01-01',
        password: 'Pass123!',
      });

      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ mail: undefined })
      );
    });
  });

  describe('login', () => {
    it('should verify credentials and return tokens + user', async () => {
      const foundUser = {
        id: 42,
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        mail: 'jean@test.com',
        password_hash: 'stored_hash',
      };
      mockUserModel.findByTel.mockResolvedValueOnce(foundUser);
      mockArgon2.verify.mockResolvedValueOnce(true);
      mockAuthService.generateTokens.mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await UserService.login('0612345678', 'MyPass123!');

      expect(mockNormalizePhone).toHaveBeenCalledWith('0612345678');
      expect(mockUserModel.findByTel).toHaveBeenCalledWith('+33612345678');
      expect(mockArgon2.verify).toHaveBeenCalledWith('stored_hash', 'MyPass123!');
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(42, 'user');
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 42,
          firstname: 'Jean',
          lastname: 'Dupont',
          tel: '+33612345678',
          mail: 'jean@test.com',
        },
      });
    });

    it('should throw UnauthorizedError when user not found', async () => {
      mockUserModel.findByTel.mockResolvedValueOnce(undefined);

      await expect(UserService.login('0600000000', 'wrong')).rejects.toThrow('Identifiants incorrects');
    });

    it('should throw UnauthorizedError on wrong password', async () => {
      mockUserModel.findByTel.mockResolvedValueOnce({
        id: 42,
        password_hash: 'stored_hash',
      });
      mockArgon2.verify.mockResolvedValueOnce(false);

      await expect(UserService.login('0612345678', 'wrong')).rejects.toThrow('Identifiants incorrects');
    });

    it('should log security.login_failed on failure', async () => {
      mockUserModel.findByTel.mockResolvedValueOnce(undefined);

      await expect(UserService.login('0600000000', 'wrong')).rejects.toThrow();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'security.login_failed', type: 'user' }),
        expect.any(String)
      );
    });

    it('should log security.login_success on success', async () => {
      mockUserModel.findByTel.mockResolvedValueOnce({ id: 42, firstname: 'J', lastname: 'D', tel: '+33612345678', mail: 'j@t.com', password_hash: 'hash' });
      mockArgon2.verify.mockResolvedValueOnce(true);
      mockAuthService.generateTokens.mockResolvedValueOnce({ accessToken: 'a', refreshToken: 'r' });

      await UserService.login('0612345678', 'Pass1!');

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'security.login_success', type: 'user', userId: 42 }),
        expect.any(String)
      );
    });
  });

  describe('updateProfile', () => {
    it('should normalize fields and update', async () => {
      const updatedUser = { id: 42, firstname: 'Pierre', mail: 'pierre@test.com' };
      mockUserModel.update.mockResolvedValueOnce(updatedUser);

      const result = await UserService.updateProfile(42, {
        firstname: 'Pierre',
        mail: 'Pierre@Test.com',
      });

      expect(mockUserModel.update).toHaveBeenCalledWith(42, {
        firstname: 'Pierre',
        mail: 'pierre@test.com',
      });
      expect(result).toBe(updatedUser);
    });

    it('should normalize phone when tel is provided', async () => {
      mockUserModel.update.mockResolvedValueOnce({ id: 42 });

      await UserService.updateProfile(42, { tel: '0612345678' });

      expect(mockNormalizePhone).toHaveBeenCalledWith('0612345678');
      expect(mockUserModel.update).toHaveBeenCalledWith(42, { tel: '+33612345678' });
    });

    it('should throw ValidationError when no data to update', async () => {
      await expect(UserService.updateProfile(42, {})).rejects.toThrow('Aucune donnée à mettre à jour');
    });
  });

  describe('changePassword', () => {
    it('should verify old password, hash new one, update, and revoke tokens', async () => {
      mockUserModel.findByIdWithHash.mockResolvedValueOnce({
        id: 42,
        password_hash: 'old_hash',
      });
      mockArgon2.verify.mockResolvedValueOnce(true);
      mockArgon2.hash.mockResolvedValueOnce('new_hash');
      mockUserModel.updatePasswordHash.mockResolvedValueOnce(undefined);
      mockTokenModel.deleteAllForUser.mockResolvedValueOnce(undefined);
      mockUserModel.setLogoutAt.mockResolvedValueOnce(undefined);

      await UserService.changePassword(42, 'oldPass', 'newPass');

      expect(mockUserModel.findByIdWithHash).toHaveBeenCalledWith(42);
      expect(mockArgon2.verify).toHaveBeenCalledWith('old_hash', 'oldPass');
      expect(mockArgon2.hash).toHaveBeenCalledWith('newPass');
      expect(mockUserModel.updatePasswordHash).toHaveBeenCalledWith(42, 'new_hash');
      expect(mockTokenModel.deleteAllForUser).toHaveBeenCalledWith(42, 'user');
      expect(mockUserModel.setLogoutAt).toHaveBeenCalledWith(42);
    });

    it('should throw UnauthorizedError if user not found', async () => {
      mockUserModel.findByIdWithHash.mockResolvedValueOnce(null);

      await expect(UserService.changePassword(42, 'old', 'new')).rejects.toThrow('Utilisateur non trouvé');
    });

    it('should throw UnauthorizedError on wrong current password', async () => {
      mockUserModel.findByIdWithHash.mockResolvedValueOnce({
        id: 42,
        password_hash: 'stored_hash',
      });
      mockArgon2.verify.mockResolvedValueOnce(false);

      await expect(UserService.changePassword(42, 'wrong', 'new')).rejects.toThrow('Mot de passe actuel incorrect');
    });
  });

  describe('deleteAccount', () => {
    it('should log security.account_deleted', async () => {
      mockTokenModel.deleteAllForUser.mockResolvedValueOnce(undefined);
      mockUserModel.delete.mockResolvedValueOnce(undefined);

      await UserService.deleteAccount(42);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'security.account_deleted', type: 'user', userId: 42 }),
        expect.any(String)
      );
    });

    it('should catch and log photo cleanup failure', async () => {
      mockTokenModel.deleteAllForUser.mockResolvedValueOnce(undefined);
      mockUserModel.delete.mockResolvedValueOnce(undefined);
      mockDeleteUserPhotosDir.mockImplementationOnce(() => { throw new Error('ENOENT'); });

      await UserService.deleteAccount(42);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42 }),
        expect.any(String)
      );
    });

    it('should delete tokens and user in transaction, then clean up photos', async () => {
      mockTokenModel.deleteAllForUser.mockResolvedValueOnce(undefined);
      mockUserModel.delete.mockResolvedValueOnce(undefined);

      await UserService.deleteAccount(42);

      expect(mockWithTransaction).toHaveBeenCalledTimes(1);
      expect(mockTokenModel.deleteAllForUser).toHaveBeenCalledWith(42, 'user');
      expect(mockUserModel.delete).toHaveBeenCalledWith(42);
      expect(mockDeleteUserPhotosDir).toHaveBeenCalledWith(42);
    });
  });
});
