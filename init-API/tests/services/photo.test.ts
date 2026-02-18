import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPhotoModel = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret';

  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserAndEvent: vi.fn(),
    findAllByUserId: vi.fn(),
    countByUserAndEvent: vi.fn(),
    delete: vi.fn(),
    setPrimary: vi.fn(),
    reorder: vi.fn(),
  };
});

const mockBlockedUserModel = vi.hoisted(() => ({
  isBlocked: vi.fn(),
}));

const mockGetPhotoUrl = vi.hoisted(() => vi.fn());
const mockDeletePhotoFile = vi.hoisted(() => vi.fn());
const mockStripExif = vi.hoisted(() => vi.fn());

vi.mock('../../models/photo.model.js', () => ({ PhotoModel: mockPhotoModel }));
vi.mock('../../models/blockedUser.model.js', () => ({ BlockedUserModel: mockBlockedUserModel }));
vi.mock('../../config/multer.config.js', () => ({
  getPhotoUrl: mockGetPhotoUrl,
  deletePhotoFile: mockDeletePhotoFile,
  stripExif: mockStripExif,
}));
vi.mock('../../utils/logger.js', () => ({
  default: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));
vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { PhotoService } from '../../services/photo.service';

async function expectAppError(fn: () => Promise<unknown>, expectedStatusCode: number, expectedMessage: string) {
  let caught: any;
  try { await fn(); } catch (e) { caught = e; }
  expect(caught).toBeDefined();
  expect(caught.isOperational).toBe(true);
  const allText = `${caught.message}|${caught.statusCode}`;
  expect(allText).toContain(String(expectedStatusCode));
  expect(allText).toContain(expectedMessage);
}

describe('PhotoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBlockedUserModel.isBlocked.mockResolvedValue(false);
  });

  describe('uploadPhoto', () => {
    it('should check blocked, count, strip exif, and create photo', async () => {
      mockPhotoModel.countByUserAndEvent.mockResolvedValueOnce(2);
      mockGetPhotoUrl.mockReturnValue('/uploads/photos/1/photo.jpg');
      mockStripExif.mockResolvedValueOnce(undefined);
      mockPhotoModel.create.mockResolvedValueOnce({ id: 10, user_id: 1 });

      const result = await PhotoService.uploadPhoto(1, 'photo.jpg', '5', 'false');

      expect(mockBlockedUserModel.isBlocked).toHaveBeenCalledWith(5, 1);
      expect(mockPhotoModel.countByUserAndEvent).toHaveBeenCalledWith(1, 5);
      expect(mockStripExif).toHaveBeenCalledWith('/uploads/photos/1/photo.jpg');
      expect(mockPhotoModel.create).toHaveBeenCalledWith({
        userId: 1, filePath: '/uploads/photos/1/photo.jpg', eventId: 5, displayOrder: 2, isPrimary: false,
      });
      expect(result).toEqual({ id: 10, user_id: 1 });
    });

    it('should set isPrimary true when first photo', async () => {
      mockPhotoModel.countByUserAndEvent.mockResolvedValueOnce(0);
      mockGetPhotoUrl.mockReturnValue('/uploads/photos/1/first.jpg');
      mockStripExif.mockResolvedValueOnce(undefined);
      mockPhotoModel.create.mockResolvedValueOnce({ id: 1, is_primary: true });

      await PhotoService.uploadPhoto(1, 'first.jpg');

      expect(mockPhotoModel.create).toHaveBeenCalledWith(expect.objectContaining({ isPrimary: true }));
    });

    it('should throw if max photos exceeded', async () => {
      mockPhotoModel.countByUserAndEvent.mockResolvedValueOnce(6);
      mockGetPhotoUrl.mockReturnValue('/uploads/photos/1/max.jpg');

      await expectAppError(() => PhotoService.uploadPhoto(1, 'max.jpg'), 400, 'plus de 6 photos');
    });

    it('should clean up file on error', async () => {
      mockPhotoModel.countByUserAndEvent.mockRejectedValueOnce(new Error('db down'));
      mockGetPhotoUrl.mockReturnValue('/uploads/photos/1/err.jpg');

      await expect(PhotoService.uploadPhoto(1, 'err.jpg', '5')).rejects.toThrow('db down');
      expect(mockDeletePhotoFile).toHaveBeenCalledWith('/uploads/photos/1/err.jpg');
    });

    it('should throw if stripExif fails', async () => {
      mockPhotoModel.countByUserAndEvent.mockResolvedValueOnce(0);
      mockGetPhotoUrl.mockReturnValue('/uploads/photos/1/bad.jpg');
      mockStripExif.mockRejectedValueOnce(new Error('not an image'));

      await expectAppError(() => PhotoService.uploadPhoto(1, 'bad.jpg'), 400, "pas une image valide");
    });
  });

  describe('getPhotos', () => {
    it('returns photos by user when no eventId', async () => {
      const photos = [{ id: 1 }];
      mockPhotoModel.findByUserId.mockResolvedValueOnce(photos);

      const result = await PhotoService.getPhotos(1);

      expect(mockPhotoModel.findByUserId).toHaveBeenCalledWith(1);
      expect(result).toBe(photos);
    });

    it('returns photos by user+event when eventId provided', async () => {
      const photos = [{ id: 3 }];
      mockPhotoModel.findByUserAndEvent.mockResolvedValueOnce(photos);

      const result = await PhotoService.getPhotos(1, '5');

      expect(mockPhotoModel.findByUserAndEvent).toHaveBeenCalledWith(1, 5);
      expect(result).toBe(photos);
    });
  });

  describe('getAllPhotos', () => {
    it('groups photos into general and events', async () => {
      const photos = [
        { id: 1, event_id: null, event_name: null },
        { id: 3, event_id: 10, event_name: 'Party' },
      ];
      mockPhotoModel.findAllByUserId.mockResolvedValueOnce(photos);

      const result = await PhotoService.getAllPhotos(1);

      expect(result.general).toHaveLength(1);
      expect(result.events[10].photos).toHaveLength(1);
      expect(result.events[10].event_name).toBe('Party');
    });
  });

  describe('deletePhoto', () => {
    it('should throw 404 if photo not found', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce(undefined);
      await expectAppError(() => PhotoService.deletePhoto(1, 99), 404, 'Photo non trouvée');
    });

    it('should throw 403 if not owner', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce({ id: 10, user_id: 999 });
      await expectAppError(() => PhotoService.deletePhoto(1, 10), 403, 'supprimer cette photo');
    });

    it('should delete and promote next photo if primary', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce({ id: 10, user_id: 1, file_path: '/a.jpg', is_primary: true, event_id: null });
      mockPhotoModel.delete.mockResolvedValueOnce(undefined);
      mockPhotoModel.findByUserId.mockResolvedValueOnce([{ id: 11 }]);
      mockPhotoModel.setPrimary.mockResolvedValueOnce({ id: 11, is_primary: true });

      await PhotoService.deletePhoto(1, 10);

      expect(mockPhotoModel.delete).toHaveBeenCalledWith(10);
      expect(mockDeletePhotoFile).toHaveBeenCalledWith('/a.jpg');
      expect(mockPhotoModel.setPrimary).toHaveBeenCalledWith(11);
    });

    it('should not promote if deleted was not primary', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce({ id: 10, user_id: 1, file_path: '/a.jpg', is_primary: false, event_id: null });
      mockPhotoModel.delete.mockResolvedValueOnce(undefined);

      await PhotoService.deletePhoto(1, 10);

      expect(mockPhotoModel.setPrimary).not.toHaveBeenCalled();
    });
  });

  describe('setPrimaryPhoto', () => {
    it('should throw 404 if photo not found', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce(undefined);
      await expectAppError(() => PhotoService.setPrimaryPhoto(1, 99), 404, 'Photo non trouvée');
    });

    it('should throw 403 if not owner', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce({ id: 10, user_id: 999, event_id: null });
      await expectAppError(() => PhotoService.setPrimaryPhoto(1, 10), 403, 'modifier cette photo');
    });

    it('should set primary photo', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce({ id: 10, user_id: 1, event_id: null });
      mockPhotoModel.setPrimary.mockResolvedValueOnce({ id: 10, is_primary: true });

      const result = await PhotoService.setPrimaryPhoto(1, 10);

      expect(mockPhotoModel.setPrimary).toHaveBeenCalledWith(10);
      expect(result).toEqual({ id: 10, is_primary: true });
    });
  });

  describe('reorderPhotos', () => {
    it('should throw 400 if photoIds is not an array', async () => {
      await expectAppError(() => PhotoService.reorderPhotos(1, 'bad' as any), 400, 'tableau non vide');
    });

    it('should throw 403 if photo not owned', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce({ id: 1, user_id: 1 }).mockResolvedValueOnce({ id: 2, user_id: 999 });
      await expectAppError(() => PhotoService.reorderPhotos(1, [1, 2]), 403, 'ne vous appartiennent pas');
    });

    it('should reorder and return photos', async () => {
      mockPhotoModel.findById.mockResolvedValueOnce({ id: 2, user_id: 1 }).mockResolvedValueOnce({ id: 1, user_id: 1 });
      mockPhotoModel.reorder.mockResolvedValueOnce(true);
      mockPhotoModel.findByUserId.mockResolvedValueOnce([{ id: 2 }, { id: 1 }]);

      const result = await PhotoService.reorderPhotos(1, [2, 1]);

      expect(mockPhotoModel.reorder).toHaveBeenCalledWith(1, null, [2, 1]);
      expect(result).toEqual([{ id: 2 }, { id: 1 }]);
    });
  });

  describe('copyPhotosToEvent', () => {
    it('should throw 400 if eventId missing', async () => {
      await expectAppError(() => PhotoService.copyPhotosToEvent(1, 0), 400, 'eventId requis');
    });

    it('should copy general photos to event', async () => {
      const sourcePhotos = [
        { id: 1, user_id: 1, file_path: '/a.jpg' },
        { id: 2, user_id: 1, file_path: '/b.jpg' },
      ];
      mockPhotoModel.findByUserId.mockResolvedValueOnce(sourcePhotos);
      mockPhotoModel.countByUserAndEvent.mockResolvedValueOnce(0);
      mockPhotoModel.create.mockResolvedValueOnce({ id: 100 }).mockResolvedValueOnce({ id: 101 });

      const result = await PhotoService.copyPhotosToEvent(1, 10);

      expect(mockPhotoModel.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should throw if max exceeded', async () => {
      mockPhotoModel.findByUserId.mockResolvedValueOnce([{ id: 1, user_id: 1, file_path: '/a.jpg' }, { id: 2, user_id: 1, file_path: '/b.jpg' }]);
      mockPhotoModel.countByUserAndEvent.mockResolvedValueOnce(5);

      await expectAppError(() => PhotoService.copyPhotosToEvent(1, 10), 400, 'plus de 6 photos par événement');
    });

    it('should throw 400 if no photos to copy', async () => {
      mockPhotoModel.findByUserId.mockResolvedValueOnce([]);
      await expectAppError(() => PhotoService.copyPhotosToEvent(1, 10), 400, 'Aucune photo à copier');
    });
  });
});
