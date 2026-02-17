import { describe, it, expect, vi, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';

describe('multer config - utility functions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveUploadPath', () => {
    it('should resolve valid paths within upload dir', async () => {
      const mod = await import('../../config/multer.config');
      const resolved = mod.resolveUploadPath(path.join('uploads', 'photos', 'test.jpg'));
      expect(resolved).toContain(mod.UPLOAD_DIR);
    });

    it('should throw for path traversal', async () => {
      const mod = await import('../../config/multer.config');
      expect(() => mod.resolveUploadPath('../../etc/passwd')).toThrow('Chemin de fichier invalide');
    });
  });

  describe('getPhotoUrl', () => {
    it('should return correct URL pattern', async () => {
      const mod = await import('../../config/multer.config');
      const url = mod.getPhotoUrl(42, 'photo-123.jpg');
      expect(url).toBe('/uploads/photos/42/photo-123.jpg');
    });
  });

  describe('getOrgaLogoUrl', () => {
    it('should return correct URL pattern', async () => {
      const mod = await import('../../config/multer.config');
      const url = mod.getOrgaLogoUrl(7, 'logo.png');
      expect(url).toBe('/uploads/orga/7/logo.png');
    });
  });

  describe('getEventBannerUrl', () => {
    it('should return correct URL pattern', async () => {
      const mod = await import('../../config/multer.config');
      const url = mod.getEventBannerUrl(15, 'banner.jpg');
      expect(url).toBe('/uploads/events/15/banner.jpg');
    });
  });

  describe('deleteUserPhotosDir', () => {
    it('should delete existing directory and return true', async () => {
      const mod = await import('../../config/multer.config');
      const expectedDir = path.join(mod.PHOTOS_DIR, '999');

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const rmSpy = vi.spyOn(fs, 'rmSync').mockReturnValue(undefined);

      const result = mod.deleteUserPhotosDir(999);
      expect(result).toBe(true);
      expect(rmSpy).toHaveBeenCalledWith(expectedDir, { recursive: true });
    });

    it('should return false for non-existing directory', async () => {
      const mod = await import('../../config/multer.config');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = mod.deleteUserPhotosDir(99999);
      expect(result).toBe(false);
    });
  });

  describe('deleteOrgaDir', () => {
    it('should delete existing directory and return true', async () => {
      const mod = await import('../../config/multer.config');
      const expectedDir = path.join(mod.ORGA_DIR, '999');

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const rmSpy = vi.spyOn(fs, 'rmSync').mockReturnValue(undefined);

      const result = mod.deleteOrgaDir(999);
      expect(result).toBe(true);
      expect(rmSpy).toHaveBeenCalledWith(expectedDir, { recursive: true });
    });

    it('should return false for non-existing directory', async () => {
      const mod = await import('../../config/multer.config');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = mod.deleteOrgaDir(99999);
      expect(result).toBe(false);
    });
  });

  describe('deleteEventDir', () => {
    it('should delete existing directory and return true', async () => {
      const mod = await import('../../config/multer.config');
      const expectedDir = path.join(mod.EVENTS_DIR, '999');

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const rmSpy = vi.spyOn(fs, 'rmSync').mockReturnValue(undefined);

      const result = mod.deleteEventDir(999);
      expect(result).toBe(true);
      expect(rmSpy).toHaveBeenCalledWith(expectedDir, { recursive: true });
    });

    it('should return false for non-existing directory', async () => {
      const mod = await import('../../config/multer.config');
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = mod.deleteEventDir(99999);
      expect(result).toBe(false);
    });
  });

  describe('exports', () => {
    it('should export all multer instances', async () => {
      const mod = await import('../../config/multer.config');
      expect(mod.photoUpload).toBeDefined();
      expect(mod.photosUpload).toBeDefined();
      expect(mod.orgaLogoUpload).toBeDefined();
      expect(mod.eventBannerUpload).toBeDefined();
    });

    it('should export all directory constants', async () => {
      const mod = await import('../../config/multer.config');
      expect(mod.UPLOAD_DIR).toBeDefined();
      expect(mod.PHOTOS_DIR).toBeDefined();
      expect(mod.ORGA_DIR).toBeDefined();
      expect(mod.EVENTS_DIR).toBeDefined();
    });

    it('should export all utility functions', async () => {
      const mod = await import('../../config/multer.config');
      expect(typeof mod.stripExif).toBe('function');
      expect(typeof mod.getPhotoUrl).toBe('function');
      expect(typeof mod.getPhotoPath).toBe('function');
      expect(typeof mod.deletePhotoFile).toBe('function');
      expect(typeof mod.deleteOrgaLogo).toBe('function');
      expect(typeof mod.deleteEventBanner).toBe('function');
      expect(typeof mod.deleteUserPhotosDir).toBe('function');
      expect(typeof mod.deleteOrgaDir).toBe('function');
      expect(typeof mod.deleteEventDir).toBe('function');
    });
  });
});
