import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    UserService: {
      register: vi.fn(),
      login: vi.fn(),
      updateProfile: vi.fn(),
      changePassword: vi.fn(),
      deleteAccount: vi.fn(),
    },
    UserModel: {
      findById: vi.fn(),
      setLogoutAt: vi.fn(),
    },
    AuthService: {
      rotateRefreshToken: vi.fn(),
      revokeRefreshToken: vi.fn(),
    },
    disconnectUser: vi.fn(),
    successFn: vi.fn(),
    createdFn: vi.fn(),
    setRefreshCookie: vi.fn(),
    clearRefreshCookie: vi.fn(),
  };
});

vi.mock('../../services/user.service.js', () => ({ UserService: mocks.UserService }));
vi.mock('../../models/user.model.js', () => ({ UserModel: mocks.UserModel }));
vi.mock('../../services/auth.service.js', () => ({ AuthService: mocks.AuthService }));
vi.mock('../../utils/responses.js', () => ({ success: mocks.successFn, created: mocks.createdFn }));
vi.mock('../../utils/cookie.js', () => ({ setRefreshCookie: mocks.setRefreshCookie, clearRefreshCookie: mocks.clearRefreshCookie }));
vi.mock('../../socket/emitters.js', () => ({ disconnectUser: mocks.disconnectUser }));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { UserController } from '../../controllers/user.controller';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    cookies: {},
    user: { id: 1, role: 'user' },
    ...overrides,
  };
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.cookie = vi.fn().mockReturnValue(res);
  res.clearCookie = vi.fn().mockReturnValue(res);
  return res;
}

describe('UserController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('delegates to UserService.register and calls created()', async () => {
      const body = { firstname: 'Jean', lastname: 'Dupont', tel: '0612345678', password: 'MyPass123!' };
      const createdUser = { id: 1, firstname: 'Jean' };
      mocks.UserService.register.mockResolvedValueOnce(createdUser);

      const req = mockReq({ body });
      const res = mockRes();
      await UserController.register(req as any, res as any);

      expect(mocks.UserService.register).toHaveBeenCalledWith(body);
      expect(mocks.createdFn).toHaveBeenCalledWith(res, createdUser, 'Utilisateur cr\u00e9\u00e9 avec succ\u00e8s');
    });
  });

  describe('login', () => {
    it('delegates to UserService.login, sets cookie, and calls success()', async () => {
      const body = { tel: '0612345678', password: 'MyPass123!' };
      const loginResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 42, firstname: 'Jean', lastname: 'Dupont', tel: '+33612345678', mail: 'jean@test.com' },
      };
      mocks.UserService.login.mockResolvedValueOnce(loginResult);

      const req = mockReq({ body });
      const res = mockRes();
      await UserController.login(req as any, res as any);

      expect(mocks.UserService.login).toHaveBeenCalledWith('0612345678', 'MyPass123!');
      expect(mocks.setRefreshCookie).toHaveBeenCalledWith(res, 'refresh-token');
      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { accessToken: 'access-token', user: loginResult.user },
        'Connexion r\u00e9ussie'
      );
    });

    it('propagates UnauthorizedError from service', async () => {
      mocks.UserService.login.mockRejectedValueOnce(
        new (await import('../../utils/errors.js')).UnauthorizedError('Identifiants incorrects')
      );

      const req = mockReq({ body: { tel: '0600000000', password: 'wrong' } });
      const res = mockRes();
      await expect(UserController.login(req as any, res as any)).rejects.toThrow('Identifiants incorrects');
    });
  });

  describe('refreshToken', () => {
    it('delegates to AuthService.rotateRefreshToken and sets cookie', async () => {
      mocks.AuthService.rotateRefreshToken.mockResolvedValueOnce({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const req = mockReq({ cookies: { refreshToken: 'old-refresh-token' } });
      const res = mockRes();
      await UserController.refreshToken(req as any, res as any);

      expect(mocks.AuthService.rotateRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mocks.setRefreshCookie).toHaveBeenCalledWith(res, 'new-refresh-token');
      expect(mocks.successFn).toHaveBeenCalledWith(res, { accessToken: 'new-access-token' }, 'Token rafra\u00eechi');
    });
  });

  describe('logout', () => {
    it('delegates to AuthService.revokeRefreshToken, sets logout_at, disconnects socket, and clears cookie', async () => {
      mocks.AuthService.revokeRefreshToken.mockResolvedValueOnce(undefined);
      mocks.UserModel.setLogoutAt.mockResolvedValueOnce(undefined);

      const req = mockReq({ cookies: { refreshToken: 'some-token' } });
      const res = mockRes();
      await UserController.logout(req as any, res as any);

      expect(mocks.AuthService.revokeRefreshToken).toHaveBeenCalledWith('some-token');
      expect(mocks.UserModel.setLogoutAt).toHaveBeenCalledWith(1);
      expect(mocks.disconnectUser).toHaveBeenCalledWith(1);
      expect(mocks.clearRefreshCookie).toHaveBeenCalledWith(res);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'D\u00e9connexion r\u00e9ussie');
    });

    it('passes undefined when no cookie and skips setLogoutAt when no user', async () => {
      mocks.AuthService.revokeRefreshToken.mockResolvedValueOnce(undefined);

      const req = mockReq({ cookies: {}, user: undefined });
      const res = mockRes();
      await UserController.logout(req as any, res as any);

      expect(mocks.AuthService.revokeRefreshToken).toHaveBeenCalledWith(undefined);
      expect(mocks.UserModel.setLogoutAt).not.toHaveBeenCalled();
      expect(mocks.disconnectUser).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('returns user data from UserModel', async () => {
      const userData = { id: 42, firstname: 'Jean' };
      mocks.UserModel.findById.mockResolvedValueOnce(userData);

      const req = mockReq({ user: { id: 42 } });
      const res = mockRes();
      await UserController.getProfile(req as any, res as any);

      expect(mocks.UserModel.findById).toHaveBeenCalledWith(42);
      expect(mocks.successFn).toHaveBeenCalledWith(res, userData);
    });

    it('throws NotFoundError if user is missing', async () => {
      mocks.UserModel.findById.mockResolvedValueOnce(undefined);

      const req = mockReq({ user: { id: 999 } });
      const res = mockRes();
      await expect(UserController.getProfile(req as any, res as any)).rejects.toThrow('Utilisateur non trouv\u00e9');
    });
  });

  describe('updateProfile', () => {
    it('delegates to UserService.updateProfile', async () => {
      const updatedUser = { id: 42, firstname: 'Pierre' };
      mocks.UserService.updateProfile.mockResolvedValueOnce(updatedUser);

      const req = mockReq({ user: { id: 42 }, body: { firstname: 'Pierre' } });
      const res = mockRes();
      await UserController.updateProfile(req as any, res as any);

      expect(mocks.UserService.updateProfile).toHaveBeenCalledWith(42, { firstname: 'Pierre' });
      expect(mocks.successFn).toHaveBeenCalledWith(res, updatedUser, 'Profil mis \u00e0 jour');
    });

    it('propagates ValidationError from service', async () => {
      mocks.UserService.updateProfile.mockRejectedValueOnce(
        new (await import('../../utils/errors.js')).ValidationError('Aucune donn\u00e9e \u00e0 mettre \u00e0 jour')
      );

      const req = mockReq({ user: { id: 42 }, body: {} });
      const res = mockRes();
      await expect(UserController.updateProfile(req as any, res as any)).rejects.toThrow('Aucune donn\u00e9e');
    });
  });

  describe('changePassword', () => {
    it('delegates to UserService.changePassword, clears cookie, and returns success', async () => {
      mocks.UserService.changePassword.mockResolvedValueOnce(undefined);

      const req = mockReq({ body: { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' } });
      const res = mockRes();
      await UserController.changePassword(req as any, res as any);

      expect(mocks.UserService.changePassword).toHaveBeenCalledWith(1, 'OldPass1!', 'NewPass1!');
      expect(mocks.clearRefreshCookie).toHaveBeenCalledWith(res);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Mot de passe modifié, veuillez vous reconnecter');
    });

    it('propagates UnauthorizedError from service', async () => {
      mocks.UserService.changePassword.mockRejectedValueOnce(
        new (await import('../../utils/errors.js')).UnauthorizedError('Mot de passe actuel incorrect')
      );

      const req = mockReq({ body: { currentPassword: 'wrong', newPassword: 'NewPass1!' } });
      const res = mockRes();
      await expect(UserController.changePassword(req as any, res as any)).rejects.toThrow('Mot de passe actuel incorrect');
    });
  });

  describe('deleteAccount', () => {
    it('delegates to UserService.deleteAccount', async () => {
      mocks.UserService.deleteAccount.mockResolvedValueOnce(undefined);

      const req = mockReq({ user: { id: 42 } });
      const res = mockRes();
      await UserController.deleteAccount(req as any, res as any);

      expect(mocks.UserService.deleteAccount).toHaveBeenCalledWith(42);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Compte supprim\u00e9');
    });
  });
});
