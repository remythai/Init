import type { Request, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { success } from '../utils/responses.js';
import { PhotoService } from '../services/photo.service.js';

export const PhotoController = {
  async uploadPhoto(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new AppError(400, 'Aucun fichier fourni');
    }
    const photo = await PhotoService.uploadPhoto(req.user!.id, req.file.buffer, req.file.originalname, req.body.eventId, req.body.isPrimary);
    success(res, photo, 'Photo uploadée avec succès', 201);
  },

  async getPhotos(req: Request, res: Response): Promise<void> {
    const photos = await PhotoService.getPhotos(req.user!.id, req.query.eventId as string | undefined);
    success(res, photos, 'Photos récupérées');
  },

  async getAllPhotos(req: Request, res: Response): Promise<void> {
    const grouped = await PhotoService.getAllPhotos(req.user!.id);
    success(res, grouped, 'Toutes les photos récupérées');
  },

  async deletePhoto(req: Request, res: Response): Promise<void> {
    await PhotoService.deletePhoto(req.user!.id, parseInt(req.params.id));
    success(res, null, 'Photo supprimée avec succès');
  },

  async setPrimaryPhoto(req: Request, res: Response): Promise<void> {
    const updatedPhoto = await PhotoService.setPrimaryPhoto(req.user!.id, parseInt(req.params.id));
    success(res, updatedPhoto, 'Photo définie comme principale');
  },

  async reorderPhotos(req: Request, res: Response): Promise<void> {
    const photos = await PhotoService.reorderPhotos(req.user!.id, req.body.photoIds, req.body.eventId);
    success(res, photos, 'Photos réordonnées avec succès');
  },

  async copyPhotosToEvent(req: Request, res: Response): Promise<void> {
    const copiedPhotos = await PhotoService.copyPhotosToEvent(req.user!.id, req.body.eventId, req.body.photoIds);
    success(res, copiedPhotos, 'Photos copiées vers l\'événement', 201);
  }
};
