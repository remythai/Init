import PhotoModel from '../models/photo.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';
import { getPhotoUrl, deletePhotoFile } from '../config/multer.config.js';
import { AppError } from '../utils/errors.js';
import { success } from '../utils/responses.js';

/**
 * Check if user is blocked from an event
 * Throws error if blocked
 */
const checkNotBlocked = async (eventId, userId) => {
  if (!eventId) return;
  const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
  if (isBlocked) {
    throw new AppError(403, 'Vous ne pouvez plus modifier vos photos sur cet événement');
  }
};

const MAX_PHOTOS_PER_CONTEXT = 6;

/**
 * Upload a photo
 * POST /api/users/photos
 */
export const uploadPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { eventId, isPrimary } = req.body;

    if (!req.file) {
      throw new AppError(400, 'Aucun fichier fourni');
    }

    // Check if user is blocked from this event
    await checkNotBlocked(eventId, userId);

    // Check photo limit
    const count = await PhotoModel.countByUserAndEvent(userId, eventId || null);
    if (count >= MAX_PHOTOS_PER_CONTEXT) {
      // Delete uploaded file
      deletePhotoFile(getPhotoUrl(userId, req.file.filename));
      throw new AppError(400, `Vous ne pouvez pas avoir plus de ${MAX_PHOTOS_PER_CONTEXT} photos`);
    }

    // Determine display order
    const displayOrder = count;

    // Set as primary if it's the first photo or explicitly requested
    const shouldBePrimary = count === 0 || isPrimary === 'true' || isPrimary === true;

    // Create photo record
    const filePath = getPhotoUrl(userId, req.file.filename);
    const photo = await PhotoModel.create({
      userId,
      filePath,
      eventId: eventId ? parseInt(eventId) : null,
      displayOrder,
      isPrimary: shouldBePrimary
    });

    success(res, photo, 'Photo uploadée avec succès', 201);
  } catch (error) {
    // Clean up file if there was an error
    if (req.file) {
      try {
        deletePhotoFile(getPhotoUrl(req.user.id, req.file.filename));
      } catch (e) {
        console.error('Error cleaning up file:', e);
      }
    }
    next(error);
  }
};

/**
 * Get user's photos (general or for specific event)
 * GET /api/users/photos
 * GET /api/users/photos?eventId=123
 */
export const getPhotos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { eventId } = req.query;

    let photos;
    if (eventId) {
      photos = await PhotoModel.findByUserAndEvent(userId, parseInt(eventId));
    } else {
      photos = await PhotoModel.findByUserId(userId);
    }

    success(res, photos, 'Photos récupérées');
  } catch (error) {
    next(error);
  }
};

/**
 * Get all user's photos (general + event-specific)
 * GET /api/users/photos/all
 */
export const getAllPhotos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const photos = await PhotoModel.findAllByUserId(userId);

    // Group by event
    const grouped = {
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

    success(res, grouped, 'Toutes les photos récupérées');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a photo
 * DELETE /api/users/photos/:id
 */
export const deletePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const photoId = parseInt(req.params.id);

    // Verify ownership
    const photo = await PhotoModel.findById(photoId);
    if (!photo) {
      throw new AppError(404, 'Photo non trouvée');
    }
    if (photo.user_id !== userId) {
      throw new AppError(403, 'Vous ne pouvez pas supprimer cette photo');
    }

    // Check if user is blocked from this event
    await checkNotBlocked(photo.event_id, userId);

    // Delete from database
    await PhotoModel.delete(photoId);

    // Delete file from disk
    deletePhotoFile(photo.file_path);

    // If it was primary, set another photo as primary
    if (photo.is_primary) {
      const remainingPhotos = photo.event_id
        ? await PhotoModel.findByUserAndEvent(userId, photo.event_id)
        : await PhotoModel.findByUserId(userId);

      if (remainingPhotos.length > 0) {
        await PhotoModel.setPrimary(remainingPhotos[0].id);
      }
    }

    success(res, null, 'Photo supprimée avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * Set a photo as primary
 * PUT /api/users/photos/:id/primary
 */
export const setPrimaryPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const photoId = parseInt(req.params.id);

    // Verify ownership
    const photo = await PhotoModel.findById(photoId);
    if (!photo) {
      throw new AppError(404, 'Photo non trouvée');
    }
    if (photo.user_id !== userId) {
      throw new AppError(403, 'Vous ne pouvez pas modifier cette photo');
    }

    // Check if user is blocked from this event
    await checkNotBlocked(photo.event_id, userId);

    const updatedPhoto = await PhotoModel.setPrimary(photoId);

    success(res, updatedPhoto, 'Photo définie comme principale');
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder photos
 * PUT /api/users/photos/reorder
 * Body: { photoIds: [1, 2, 3], eventId?: number }
 */
export const reorderPhotos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { photoIds, eventId } = req.body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      throw new AppError(400, 'photoIds doit être un tableau non vide');
    }

    // Check if user is blocked from this event
    await checkNotBlocked(eventId, userId);

    // Verify ownership of all photos
    for (const photoId of photoIds) {
      const photo = await PhotoModel.findById(photoId);
      if (!photo || photo.user_id !== userId) {
        throw new AppError(403, 'Une ou plusieurs photos ne vous appartiennent pas');
      }
    }

    await PhotoModel.reorder(userId, eventId || null, photoIds);

    const photos = eventId
      ? await PhotoModel.findByUserAndEvent(userId, eventId)
      : await PhotoModel.findByUserId(userId);

    success(res, photos, 'Photos réordonnées avec succès');
  } catch (error) {
    next(error);
  }
};

/**
 * Copy general photos to an event
 * POST /api/users/photos/copy-to-event
 * Body: { eventId: number, photoIds?: number[] }
 */
export const copyPhotosToEvent = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { eventId, photoIds } = req.body;

    if (!eventId) {
      throw new AppError(400, 'eventId requis');
    }

    // Check if user is blocked from this event
    await checkNotBlocked(eventId, userId);

    // Get photos to copy
    let photosSource;
    if (photoIds && Array.isArray(photoIds)) {
      // Copy specific photos
      photosSource = [];
      for (const id of photoIds) {
        const photo = await PhotoModel.findById(id);
        if (photo && photo.user_id === userId) {
          photosSource.push(photo);
        }
      }
    } else {
      // Copy all general photos
      photosSource = await PhotoModel.findByUserId(userId);
    }

    if (photosSource.length === 0) {
      throw new AppError(400, 'Aucune photo à copier');
    }

    // Check limit
    const existingCount = await PhotoModel.countByUserAndEvent(userId, eventId);
    if (existingCount + photosSource.length > MAX_PHOTOS_PER_CONTEXT) {
      throw new AppError(400, `Vous ne pouvez pas avoir plus de ${MAX_PHOTOS_PER_CONTEXT} photos par événement`);
    }

    // Create new photo records (reusing file paths)
    const copiedPhotos = [];
    for (let i = 0; i < photosSource.length; i++) {
      const source = photosSource[i];
      const photo = await PhotoModel.create({
        userId,
        filePath: source.file_path,
        eventId: parseInt(eventId),
        displayOrder: existingCount + i,
        isPrimary: i === 0 && existingCount === 0
      });
      copiedPhotos.push(photo);
    }

    success(res, copiedPhotos, 'Photos copiées vers l\'événement', 201);
  } catch (error) {
    next(error);
  }
};
