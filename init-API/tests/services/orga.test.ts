import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockArgon2 = vi.hoisted(() => {
  process.env.JWT_SECRET = 'testsecret';

  return {
    hash: vi.fn(),
    verify: vi.fn(),
  };
});

const mockOrgaModel = vi.hoisted(() => ({
  create: vi.fn(),
  findByMail: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

const mockTokenModel = vi.hoisted(() => ({
  deleteAllForUser: vi.fn(),
}));

const mockEventModel = vi.hoisted(() => ({
  findByOrgaId: vi.fn(),
}));

const mockAuthService = vi.hoisted(() => ({
  generateTokens: vi.fn(),
}));

const mockNormalizePhone = vi.hoisted(() => vi.fn((p: string) => p ? `+33${p.substring(1)}` : null));

const mockGetOrgaLogoUrl = vi.hoisted(() => vi.fn());
const mockDeleteOrgaLogo = vi.hoisted(() => vi.fn());
const mockDeleteOrgaDir = vi.hoisted(() => vi.fn());
const mockDeleteEventDir = vi.hoisted(() => vi.fn());

vi.mock('argon2', () => ({ default: mockArgon2 }));
vi.mock('../../models/orga.model.js', () => ({ OrgaModel: mockOrgaModel }));
vi.mock('../../models/token.model.js', () => ({ TokenModel: mockTokenModel }));
vi.mock('../../models/event.model.js', () => ({ EventModel: mockEventModel }));
vi.mock('../../services/auth.service.js', () => ({ AuthService: mockAuthService }));
vi.mock('../../utils/phone.js', () => ({ normalizePhone: mockNormalizePhone }));
vi.mock('../../config/multer.config.js', () => ({
  getOrgaLogoUrl: mockGetOrgaLogoUrl,
  deleteOrgaLogo: mockDeleteOrgaLogo,
  deleteOrgaDir: mockDeleteOrgaDir,
  deleteEventDir: mockDeleteEventDir,
}));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { OrgaService } from '../../services/orga.service';

describe('OrgaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should hash password, normalize phone and mail, and create orga', async () => {
      mockArgon2.hash.mockResolvedValueOnce('hashed_password');
      const createdOrga = { id: 1, nom: 'My Org', mail: 'org@test.com' };
      mockOrgaModel.create.mockResolvedValueOnce(createdOrga);

      const result = await OrgaService.register({
        name: 'My Org',
        mail: 'Org@Test.com',
        description: 'A great org',
        tel: '0612345678',
        password: 'SecurePass1!',
      });

      expect(mockArgon2.hash).toHaveBeenCalledWith('SecurePass1!');
      expect(mockNormalizePhone).toHaveBeenCalledWith('0612345678');
      expect(mockOrgaModel.create).toHaveBeenCalledWith({
        name: 'My Org',
        mail: 'org@test.com',
        description: 'A great org',
        tel: '+33612345678',
        password_hash: 'hashed_password',
      });
      expect(result).toBe(createdOrga);
    });
  });

  describe('login', () => {
    it('should verify credentials and return tokens + orga', async () => {
      const foundOrga = {
        id: 10,
        nom: 'My Org',
        mail: 'org@test.com',
        description: 'A great org',
        password_hash: 'stored_hash',
      };
      mockOrgaModel.findByMail.mockResolvedValueOnce(foundOrga);
      mockArgon2.verify.mockResolvedValueOnce(true);
      mockAuthService.generateTokens.mockResolvedValueOnce({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      const result = await OrgaService.login('Org@Test.com', 'SecurePass1!');

      expect(mockOrgaModel.findByMail).toHaveBeenCalledWith('org@test.com');
      expect(mockArgon2.verify).toHaveBeenCalledWith('stored_hash', 'SecurePass1!');
      expect(mockAuthService.generateTokens).toHaveBeenCalledWith(10, 'orga');
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        orga: { id: 10, nom: 'My Org', mail: 'org@test.com', description: 'A great org' },
      });
    });

    it('should throw ValidationError when mail or password is missing', async () => {
      await expect(OrgaService.login('', '')).rejects.toThrow('Email et mot de passe requis');
    });

    it('should throw UnauthorizedError when orga not found', async () => {
      mockOrgaModel.findByMail.mockResolvedValueOnce(undefined);
      await expect(OrgaService.login('unknown@test.com', 'pass')).rejects.toThrow('Identifiants incorrects');
    });

    it('should throw UnauthorizedError on wrong password', async () => {
      mockOrgaModel.findByMail.mockResolvedValueOnce({ id: 10, password_hash: 'hash' });
      mockArgon2.verify.mockResolvedValueOnce(false);
      await expect(OrgaService.login('org@test.com', 'wrong')).rejects.toThrow('Identifiants incorrects');
    });
  });

  describe('updateProfile', () => {
    it('should normalize fields and update', async () => {
      const updatedOrga = { id: 10, nom: 'New Name' };
      mockOrgaModel.update.mockResolvedValueOnce(updatedOrga);

      const result = await OrgaService.updateProfile(10, { nom: 'New Name', mail: 'New@Test.com' });

      expect(mockOrgaModel.update).toHaveBeenCalledWith(10, { nom: 'New Name', mail: 'new@test.com' });
      expect(result).toBe(updatedOrga);
    });

    it('should allow setting description to empty string', async () => {
      mockOrgaModel.update.mockResolvedValueOnce({ id: 10 });
      await OrgaService.updateProfile(10, { description: '' });
      expect(mockOrgaModel.update).toHaveBeenCalledWith(10, { description: '' });
    });

    it('should throw ValidationError when no data to update', async () => {
      await expect(OrgaService.updateProfile(10, {})).rejects.toThrow('Aucune donnée à mettre à jour');
    });
  });

  describe('deleteAccount', () => {
    it('should delete event dirs, orga dir, tokens, and orga', async () => {
      mockEventModel.findByOrgaId.mockResolvedValueOnce([{ id: 100 }, { id: 200 }]);
      mockTokenModel.deleteAllForUser.mockResolvedValueOnce(undefined);
      mockOrgaModel.delete.mockResolvedValueOnce(undefined);

      await OrgaService.deleteAccount(10);

      expect(mockEventModel.findByOrgaId).toHaveBeenCalledWith(10);
      expect(mockDeleteEventDir).toHaveBeenCalledWith(100);
      expect(mockDeleteEventDir).toHaveBeenCalledWith(200);
      expect(mockDeleteOrgaDir).toHaveBeenCalledWith(10);
      expect(mockTokenModel.deleteAllForUser).toHaveBeenCalledWith(10, 'orga');
      expect(mockOrgaModel.delete).toHaveBeenCalledWith(10);
    });
  });

  describe('uploadLogo', () => {
    it('should generate logo url and update orga', async () => {
      mockGetOrgaLogoUrl.mockReturnValueOnce('/uploads/orga/10/logo.png');
      mockOrgaModel.update.mockResolvedValueOnce({ id: 10, logo_path: '/uploads/orga/10/logo.png' });

      const result = await OrgaService.uploadLogo(10, 'logo.png');

      expect(mockGetOrgaLogoUrl).toHaveBeenCalledWith(10, 'logo.png');
      expect(mockOrgaModel.update).toHaveBeenCalledWith(10, { logo_path: '/uploads/orga/10/logo.png' });
      expect(result).toEqual({ logo_path: '/uploads/orga/10/logo.png' });
    });
  });

  describe('deleteLogo', () => {
    it('should delete logo file and set logo_path to null', async () => {
      mockOrgaModel.update.mockResolvedValueOnce({ id: 10, logo_path: null });

      await OrgaService.deleteLogo(10);

      expect(mockDeleteOrgaLogo).toHaveBeenCalledWith(10);
      expect(mockOrgaModel.update).toHaveBeenCalledWith(10, { logo_path: null });
    });
  });
});
