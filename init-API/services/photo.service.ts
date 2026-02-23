import { PhotoModel } from '../models/photo.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';
import { getPhotoUrl, deletePhotoFile, validateAndSavePhoto } from '../config/multer.config.js';
import { AppError } from '../utils/errors.js';
import logger from '../utils/logger.js';

const MAX_PHOTOS_PER_CONTEXT = 6;

async function checkNotBlocked(eventId: number | null | undefined, userId: number): Promise<void> {
  if (!eventId) return;
  const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
  if (isBlocked) {
    throw new AppError(403, 'Vous ne pouvez plus modifier vos photos sur cet événement');
  }
}

export const PhotoService = {
  async uploadPhoto(userId: number, fileBuffer: Buffer, originalname: string, eventId?: string, isPrimary?: string | boolean) {
    const parsedEventId = eventId ? parseInt(eventId) : undefined;
    await checkNotBlocked(parsedEventId, userId);

    const count = await PhotoModel.countByUserAndEvent(userId, parsedEventId || null);
    if (count >= MAX_PHOTOS_PER_CONTEXT) {
      throw new AppError(400, `Vous ne pouvez pas avoir plus de ${MAX_PHOTOS_PER_CONTEXT} photos`);
    }

    const displayOrder = count;
    const shouldBePrimary = count === 0 || isPrimary === 'true' || isPrimary === true;

    let filename: string;
    try {
      filename = await validateAndSavePhoto(fileBuffer, userId, originalname);
    } catch {
      throw new AppError(400, 'Le fichier n\'est pas une image valide');
    }

    const filePath = getPhotoUrl(userId, filename);

    try {
      return await PhotoModel.create({
        userId,
        filePath,
        eventId: parsedEventId,
        displayOrder,
        isPrimary: shouldBePrimary
      });
    } catch (error) {
      try {
        deletePhotoFile(filePath);
      } catch (e) {
        logger.error({ err: e }, 'Error cleaning up file');
      }
      throw error;
    }
  },

  async getPhotos(userId: number, eventId?: string) {
    if (eventId) {
      return PhotoModel.findByUserAndEvent(userId, parseInt(eventId));
    }
    return PhotoModel.findByUserId(userId);
  },

  async getAllPhotos(userId: number) {
    const photos = await PhotoModel.findAllByUserId(userId);

    const grouped: { general: typeof photos; events: Record<number, { event_name: string | undefined; photos: typeof photos }> } = {
      general: [],
      events: {}
    };

    photos.forEach(photo => {
      if (!photo.event_id) {
        grouped.general.push(photo);
      } else {
        if (!grouped.events[photo.event_id]) {
          grouped.events[photo.event_id] = {
            event_name: photo.event_name,
            photos: []
          };
        }
        grouped.events[photo.event_id].photos.push(photo);
      }
    });

    return grouped;
  },

  async deletePhoto(userId: number, photoId: number) {
    const photo = await PhotoModel.findById(photoId);
    if (!photo) {
      throw new AppError(404, 'Photo non trouvée');
    }
    if (photo.user_id !== userId) {
      throw new AppError(403, 'Vous ne pouvez pas supprimer cette photo');
    }

    await checkNotBlocked(photo.event_id, userId);

    await PhotoModel.delete(photoId);
    deletePhotoFile(photo.file_path);

    if (photo.is_primary) {
      const remainingPhotos = photo.event_id
        ? await PhotoModel.findByUserAndEvent(userId, photo.event_id)
        : await PhotoModel.findByUserId(userId);

      if (remainingPhotos.length > 0) {
        await PhotoModel.setPrimary(remainingPhotos[0].id);
      }
    }
  },

  async setPrimaryPhoto(userId: number, photoId: number) {
    const photo = await PhotoModel.findById(photoId);
    if (!photo) {
      throw new AppError(404, 'Photo non trouvée');
    }
    if (photo.user_id !== userId) {
      throw new AppError(403, 'Vous ne pouvez pas modifier cette photo');
    }

    await checkNotBlocked(photo.event_id, userId);

    return PhotoModel.setPrimary(photoId);
  },

  async reorderPhotos(userId: number, photoIds: number[], eventId?: number) {
    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      throw new AppError(400, 'photoIds doit être un tableau non vide');
    }

    await checkNotBlocked(eventId, userId);

    for (const photoId of photoIds) {
      const photo = await PhotoModel.findById(photoId);
      if (!photo || photo.user_id !== userId) {
        throw new AppError(403, 'Une ou plusieurs photos ne vous appartiennent pas');
      }
    }

    await PhotoModel.reorder(userId, eventId || null, photoIds);

    return eventId
      ? PhotoModel.findByUserAndEvent(userId, eventId)
      : PhotoModel.findByUserId(userId);
  },

  async copyPhotosToEvent(userId: number, eventId: number, photoIds?: number[]) {
    if (!eventId) {
      throw new AppError(400, 'eventId requis');
    }

    await checkNotBlocked(eventId, userId);

    let photosSource;
    if (photoIds && Array.isArray(photoIds)) {
      photosSource = [];
      for (const id of photoIds) {
        const photo = await PhotoModel.findById(id);
        if (photo && photo.user_id === userId) {
          photosSource.push(photo);
        }
      }
    } else {
      photosSource = await PhotoModel.findByUserId(userId);
    }

    if (photosSource.length === 0) {
      throw new AppError(400, 'Aucune photo à copier');
    }

    const existingCount = await PhotoModel.countByUserAndEvent(userId, eventId);
    if (existingCount + photosSource.length > MAX_PHOTOS_PER_CONTEXT) {
      throw new AppError(400, `Vous ne pouvez pas avoir plus de ${MAX_PHOTOS_PER_CONTEXT} photos par événement`);
    }

    const copiedPhotos = [];
    for (let i = 0; i < photosSource.length; i++) {
      const source = photosSource[i];
      const photo = await PhotoModel.create({
        userId,
        filePath: source.file_path,
        eventId: parseInt(String(eventId)),
        displayOrder: existingCount + i,
        isPrimary: i === 0 && existingCount === 0
      });
      copiedPhotos.push(photo);
    }

    return copiedPhotos;
  }
};
