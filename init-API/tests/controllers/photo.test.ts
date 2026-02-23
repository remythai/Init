import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    PhotoService: {
      uploadPhoto: vi.fn(),
      getPhotos: vi.fn(),
      getAllPhotos: vi.fn(),
      deletePhoto: vi.fn(),
      setPrimaryPhoto: vi.fn(),
      reorderPhotos: vi.fn(),
      copyPhotosToEvent: vi.fn(),
    },
    successFn: vi.fn(),
  };
});

vi.mock('../../services/photo.service.js', () => ({ PhotoService: mocks.PhotoService }));
vi.mock('../../utils/responses.js', () => ({ success: mocks.successFn }));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

import { PhotoController } from '../../controllers/photo.controller';

function mockReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 1 },
    body: {},
    params: {},
    query: {},
    file: undefined as undefined | Record<string, unknown>,
    ...overrides,
  };
}

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

async function expectAppError(fn: () => Promise<unknown>, expectedStatusCode: number, expectedMessage: string) {
  let caught: any;
  try { await fn(); } catch (e) { caught = e; }
  expect(caught).toBeDefined();
  expect(caught.isOperational).toBe(true);
  const allText = `${caught.message}|${caught.statusCode}`;
  expect(allText).toContain(String(expectedStatusCode));
  expect(allText).toContain(expectedMessage);
}

describe('PhotoController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadPhoto', () => {
    it('should throw AppError(400) if no file', async () => {
      const req = mockReq({ file: undefined });
      const res = mockRes();
      await expectAppError(() => PhotoController.uploadPhoto(req as any, res as any), 400, 'Aucun fichier fourni');
    });

    it('should delegate to PhotoService.uploadPhoto', async () => {
      const photo = { id: 10, user_id: 1 };
      mocks.PhotoService.uploadPhoto.mockResolvedValueOnce(photo);

      const buf = Buffer.from('fake-image');
      const req = mockReq({ body: { eventId: '5', isPrimary: 'false' }, file: { buffer: buf, originalname: 'photo.jpg' } });
      const res = mockRes();
      await PhotoController.uploadPhoto(req as any, res as any);

      expect(mocks.PhotoService.uploadPhoto).toHaveBeenCalledWith(1, buf, 'photo.jpg', '5', 'false');
      expect(mocks.successFn).toHaveBeenCalledWith(res, photo, 'Photo uploadée avec succès', 201);
    });
  });

  describe('getPhotos', () => {
    it('delegates to PhotoService.getPhotos without eventId', async () => {
      const photos = [{ id: 1 }];
      mocks.PhotoService.getPhotos.mockResolvedValueOnce(photos);

      const req = mockReq({ query: {} });
      const res = mockRes();
      await PhotoController.getPhotos(req as any, res as any);

      expect(mocks.PhotoService.getPhotos).toHaveBeenCalledWith(1, undefined);
      expect(mocks.successFn).toHaveBeenCalledWith(res, photos, 'Photos récupérées');
    });

    it('delegates to PhotoService.getPhotos with eventId', async () => {
      mocks.PhotoService.getPhotos.mockResolvedValueOnce([{ id: 3 }]);

      const req = mockReq({ query: { eventId: '5' } });
      const res = mockRes();
      await PhotoController.getPhotos(req as any, res as any);

      expect(mocks.PhotoService.getPhotos).toHaveBeenCalledWith(1, '5');
    });
  });

  describe('getAllPhotos', () => {
    it('delegates to PhotoService.getAllPhotos', async () => {
      const grouped = { general: [], events: {} };
      mocks.PhotoService.getAllPhotos.mockResolvedValueOnce(grouped);

      const req = mockReq();
      const res = mockRes();
      await PhotoController.getAllPhotos(req as any, res as any);

      expect(mocks.PhotoService.getAllPhotos).toHaveBeenCalledWith(1);
      expect(mocks.successFn).toHaveBeenCalledWith(res, grouped, 'Toutes les photos récupérées');
    });
  });

  describe('deletePhoto', () => {
    it('delegates to PhotoService.deletePhoto', async () => {
      mocks.PhotoService.deletePhoto.mockResolvedValueOnce(undefined);

      const req = mockReq({ params: { id: '10' } });
      const res = mockRes();
      await PhotoController.deletePhoto(req as any, res as any);

      expect(mocks.PhotoService.deletePhoto).toHaveBeenCalledWith(1, 10);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Photo supprimée avec succès');
    });

    it('propagates error from service', async () => {
      const { AppError } = await import('../../utils/errors.js');
      mocks.PhotoService.deletePhoto.mockRejectedValueOnce(new AppError(404, 'Photo non trouvée'));

      const req = mockReq({ params: { id: '99' } });
      const res = mockRes();
      await expect(PhotoController.deletePhoto(req as any, res as any)).rejects.toThrow('Photo non trouvée');
    });
  });

  describe('setPrimaryPhoto', () => {
    it('delegates to PhotoService.setPrimaryPhoto', async () => {
      const updatedPhoto = { id: 10, is_primary: true };
      mocks.PhotoService.setPrimaryPhoto.mockResolvedValueOnce(updatedPhoto);

      const req = mockReq({ params: { id: '10' } });
      const res = mockRes();
      await PhotoController.setPrimaryPhoto(req as any, res as any);

      expect(mocks.PhotoService.setPrimaryPhoto).toHaveBeenCalledWith(1, 10);
      expect(mocks.successFn).toHaveBeenCalledWith(res, updatedPhoto, 'Photo définie comme principale');
    });
  });

  describe('reorderPhotos', () => {
    it('delegates to PhotoService.reorderPhotos', async () => {
      const photos = [{ id: 2 }, { id: 1 }];
      mocks.PhotoService.reorderPhotos.mockResolvedValueOnce(photos);

      const req = mockReq({ body: { photoIds: [2, 1], eventId: 10 } });
      const res = mockRes();
      await PhotoController.reorderPhotos(req as any, res as any);

      expect(mocks.PhotoService.reorderPhotos).toHaveBeenCalledWith(1, [2, 1], 10);
      expect(mocks.successFn).toHaveBeenCalledWith(res, photos, 'Photos réordonnées avec succès');
    });
  });

  describe('copyPhotosToEvent', () => {
    it('delegates to PhotoService.copyPhotosToEvent', async () => {
      const copied = [{ id: 100 }, { id: 101 }];
      mocks.PhotoService.copyPhotosToEvent.mockResolvedValueOnce(copied);

      const req = mockReq({ body: { eventId: 10, photoIds: [1, 2] } });
      const res = mockRes();
      await PhotoController.copyPhotosToEvent(req as any, res as any);

      expect(mocks.PhotoService.copyPhotosToEvent).toHaveBeenCalledWith(1, 10, [1, 2]);
      expect(mocks.successFn).toHaveBeenCalledWith(res, copied, "Photos copiées vers l'événement", 201);
    });
  });
});
