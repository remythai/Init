import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.JWT_SECRET = 'testsecret';

  return {
    OrgaService: {
      register: vi.fn(),
      login: vi.fn(),
      updateProfile: vi.fn(),
      deleteAccount: vi.fn(),
      uploadLogo: vi.fn(),
      deleteLogo: vi.fn(),
    },
    OrgaModel: {
      findById: vi.fn(),
    },
    AuthService: {
      rotateRefreshToken: vi.fn(),
      revokeRefreshToken: vi.fn(),
    },
    successFn: vi.fn(),
    createdFn: vi.fn(),
    setRefreshCookie: vi.fn(),
    clearRefreshCookie: vi.fn(),
  };
});

vi.mock('../../services/orga.service.js', () => ({ OrgaService: mocks.OrgaService }));
vi.mock('../../models/orga.model.js', () => ({ OrgaModel: mocks.OrgaModel }));
vi.mock('../../services/auth.service.js', () => ({ AuthService: mocks.AuthService }));
vi.mock('../../utils/responses.js', () => ({ success: mocks.successFn, created: mocks.createdFn }));
vi.mock('../../utils/cookie.js', () => ({ setRefreshCookie: mocks.setRefreshCookie, clearRefreshCookie: mocks.clearRefreshCookie }));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { OrgaController } from '../../controllers/orga.controller';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    body: {},
    params: {},
    cookies: {},
    user: { id: 1, role: 'orga' },
    file: undefined as unknown,
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

describe('OrgaController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('delegates to OrgaService.register and calls created()', async () => {
      const body = { name: 'My Org', mail: 'Org@Test.com', password: 'SecurePass1!' };
      const createdOrga = { id: 1, nom: 'My Org' };
      mocks.OrgaService.register.mockResolvedValueOnce(createdOrga);

      const req = mockReq({ body });
      const res = mockRes();
      await OrgaController.register(req as any, res as any);

      expect(mocks.OrgaService.register).toHaveBeenCalledWith(body);
      expect(mocks.createdFn).toHaveBeenCalledWith(res, createdOrga, 'Organisation cr\u00e9\u00e9e avec succ\u00e8s');
    });
  });

  describe('login', () => {
    it('delegates to OrgaService.login, sets cookie, and calls success()', async () => {
      const body = { mail: 'Org@Test.com', password: 'SecurePass1!' };
      const loginResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        orga: { id: 10, nom: 'My Org', mail: 'org@test.com', description: 'A great org' },
      };
      mocks.OrgaService.login.mockResolvedValueOnce(loginResult);

      const req = mockReq({ body });
      const res = mockRes();
      await OrgaController.login(req as any, res as any);

      expect(mocks.OrgaService.login).toHaveBeenCalledWith('Org@Test.com', 'SecurePass1!');
      expect(mocks.setRefreshCookie).toHaveBeenCalledWith(res, 'refresh-token');
      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { accessToken: 'access-token', orga: loginResult.orga },
        'Connexion r\u00e9ussie'
      );
    });

    it('propagates ValidationError from service', async () => {
      mocks.OrgaService.login.mockRejectedValueOnce(
        new (await import('../../utils/errors.js')).ValidationError('Email et mot de passe requis')
      );

      const req = mockReq({ body: { mail: '', password: '' } });
      const res = mockRes();
      await expect(OrgaController.login(req as any, res as any)).rejects.toThrow('Email et mot de passe requis');
    });

    it('propagates UnauthorizedError from service', async () => {
      mocks.OrgaService.login.mockRejectedValueOnce(
        new (await import('../../utils/errors.js')).UnauthorizedError('Identifiants incorrects')
      );

      const req = mockReq({ body: { mail: 'unknown@test.com', password: 'Pass1!' } });
      const res = mockRes();
      await expect(OrgaController.login(req as any, res as any)).rejects.toThrow('Identifiants incorrects');
    });
  });

  describe('getProfile', () => {
    it('returns orga data from OrgaModel', async () => {
      const orgaData = { id: 10, nom: 'My Org' };
      mocks.OrgaModel.findById.mockResolvedValueOnce(orgaData);

      const req = mockReq({ user: { id: 10 } });
      const res = mockRes();
      await OrgaController.getProfile(req as any, res as any);

      expect(mocks.OrgaModel.findById).toHaveBeenCalledWith(10);
      expect(mocks.successFn).toHaveBeenCalledWith(res, orgaData);
    });

    it('throws NotFoundError if orga is missing', async () => {
      mocks.OrgaModel.findById.mockResolvedValueOnce(undefined);

      const req = mockReq({ user: { id: 999 } });
      const res = mockRes();
      await expect(OrgaController.getProfile(req as any, res as any)).rejects.toThrow('Organisation non trouv\u00e9e');
    });
  });

  describe('updateProfile', () => {
    it('delegates to OrgaService.updateProfile', async () => {
      const updatedOrga = { id: 10, nom: 'New Name' };
      mocks.OrgaService.updateProfile.mockResolvedValueOnce(updatedOrga);

      const req = mockReq({ user: { id: 10 }, body: { nom: 'New Name' } });
      const res = mockRes();
      await OrgaController.updateProfile(req as any, res as any);

      expect(mocks.OrgaService.updateProfile).toHaveBeenCalledWith(10, { nom: 'New Name' });
      expect(mocks.successFn).toHaveBeenCalledWith(res, updatedOrga, 'Profil mis \u00e0 jour');
    });

    it('propagates ValidationError from service', async () => {
      mocks.OrgaService.updateProfile.mockRejectedValueOnce(
        new (await import('../../utils/errors.js')).ValidationError('Aucune donn\u00e9e \u00e0 mettre \u00e0 jour')
      );

      const req = mockReq({ user: { id: 10 }, body: {} });
      const res = mockRes();
      await expect(OrgaController.updateProfile(req as any, res as any)).rejects.toThrow('Aucune donn\u00e9e');
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
      await OrgaController.refreshToken(req as any, res as any);

      expect(mocks.AuthService.rotateRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mocks.setRefreshCookie).toHaveBeenCalledWith(res, 'new-refresh-token');
      expect(mocks.successFn).toHaveBeenCalledWith(res, { accessToken: 'new-access-token' }, 'Token rafra\u00eechi');
    });
  });

  describe('logout', () => {
    it('delegates to AuthService.revokeRefreshToken and clears cookie', async () => {
      mocks.AuthService.revokeRefreshToken.mockResolvedValueOnce(undefined);

      const req = mockReq({ cookies: { refreshToken: 'some-token' } });
      const res = mockRes();
      await OrgaController.logout(req as any, res as any);

      expect(mocks.AuthService.revokeRefreshToken).toHaveBeenCalledWith('some-token');
      expect(mocks.clearRefreshCookie).toHaveBeenCalledWith(res);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'D\u00e9connexion r\u00e9ussie');
    });
  });

  describe('deleteAccount', () => {
    it('delegates to OrgaService.deleteAccount', async () => {
      mocks.OrgaService.deleteAccount.mockResolvedValueOnce(undefined);

      const req = mockReq({ user: { id: 10 } });
      const res = mockRes();
      await OrgaController.deleteAccount(req as any, res as any);

      expect(mocks.OrgaService.deleteAccount).toHaveBeenCalledWith(10);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Compte supprim\u00e9');
    });
  });

  describe('uploadLogo', () => {
    it('validates file and delegates to OrgaService.uploadLogo', async () => {
      const result = { logo_path: '/uploads/orga/10/logo.png' };
      mocks.OrgaService.uploadLogo.mockResolvedValueOnce(result);

      const req = mockReq({ user: { id: 10 }, file: { filename: 'logo.png' } });
      const res = mockRes();
      await OrgaController.uploadLogo(req as any, res as any);

      expect(mocks.OrgaService.uploadLogo).toHaveBeenCalledWith(10, 'logo.png');
      expect(mocks.successFn).toHaveBeenCalledWith(res, result, 'Logo upload\u00e9 avec succ\u00e8s');
    });

    it('throws ValidationError if no file uploaded', async () => {
      const req = mockReq({ user: { id: 10 }, file: undefined });
      const res = mockRes();
      await expect(OrgaController.uploadLogo(req as any, res as any)).rejects.toThrow('Aucun fichier upload\u00e9');
    });
  });

  describe('deleteLogo', () => {
    it('delegates to OrgaService.deleteLogo', async () => {
      mocks.OrgaService.deleteLogo.mockResolvedValueOnce(undefined);

      const req = mockReq({ user: { id: 10 } });
      const res = mockRes();
      await OrgaController.deleteLogo(req as any, res as any);

      expect(mocks.OrgaService.deleteLogo).toHaveBeenCalledWith(10);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Logo supprim\u00e9 avec succ\u00e8s');
    });
  });
});
