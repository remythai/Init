import type { Request, Response } from 'express';
import { EventModel } from '../models/event.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';

import { ValidationError, NotFoundError, ForbiddenError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';
import { getEventBannerUrl, deleteEventBanner } from '../config/multer.config.js';
import { EventService } from '../services/event.service.js';

export const EventController = {
  async create(req: Request, res: Response): Promise<void> {
    const event = await EventService.createEvent(req.user!.id, req.body);
    created(res, event, 'Événement créé avec succès');
  },

  async getEventByID(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const eventWithCount = await EventService.getOrgaEvent(req.user!.id, eventId);
    success(res, eventWithCount);
  },

  async getMyOrgaEvents(req: Request, res: Response): Promise<void> {
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const eventsWithCount = await EventService.getOrgaEvents(req.user!.id, limit, offset);
    success(res, eventsWithCount);
  },

  async update(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const updatedEvent = await EventService.updateEvent(req.user!.id, eventId, req.body);
    success(res, updatedEvent, 'Événement mis à jour');
  },

  async delete(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    await EventService.deleteEvent(req.user!.id, eventId);
    success(res, null, 'Événement supprimé');
  },

  async getParticipants(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user!.id) {
      throw new ForbiddenError('Vous ne pouvez voir que les participants de vos événements');
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const participants = await RegistrationModel.findByEventId(eventId, limit, offset);
    success(res, participants);
  },

  async removeParticipant(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const action = (req.query.action || req.body?.action || 'block') as string;

    const message = await EventService.removeParticipant(req.user!.id, eventId, userId, action);
    success(res, null, message);
  },

  async getBlockedUsers(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user!.id) {
      throw new ForbiddenError('Vous ne pouvez voir que les utilisateurs bloqués de vos événements');
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const blockedUsers = await BlockedUserModel.getByEventId(eventId, limit, offset);
    success(res, blockedUsers);
  },

  async blockUser(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const { user_id, reason } = req.body;

    if (!user_id) {
      throw new ValidationError('user_id est requis');
    }

    await EventService.blockUser(req.user!.id, eventId, user_id, reason);
    success(res, null, 'Utilisateur bloqué');
  },

  async unblockParticipant(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    await EventService.unblockUser(req.user!.id, eventId, userId);
    success(res, null, 'Utilisateur débloqué');
  },

  async register(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;
    const registration = await EventService.registerUser(userId, eventId, req.body);
    created(res, registration, 'Inscription réussie');
  },

  async updateRegistration(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;
    const updated = await EventService.updateRegistration(userId, eventId, req.body);
    success(res, updated, 'Profil mis à jour');
  },

  async unregister(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new NotFoundError('Inscription non trouvée');
    }

    await RegistrationModel.delete(userId, eventId);
    success(res, null, 'Désinscription réussie');
  },

  async getPublicEventsForUser(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { upcoming, location, search, limit, offset } = req.query;

    const filters = {
      upcoming: upcoming !== 'false',
      location: location as string | undefined,
      search: search as string | undefined,
      limit: Math.min(Math.max(parseInt(limit as string) || 20, 1), 100),
      offset: Math.max(offset ? parseInt(offset as string) : 0, 0)
    };

    const events = await EventModel.findPublicEventsWithUserInfo(userId, filters);

    success(res, {
      events,
      total: events.length,
      limit: filters.limit,
      offset: filters.offset
    });
  },

  async getMyRegisteredEvents(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const { upcoming, past, limit, offset } = req.query;

    const filters = {
      upcoming: upcoming === 'true',
      past: past === 'true',
      limit: Math.min(Math.max(parseInt(limit as string) || 20, 1), 100),
      offset: Math.max(offset ? parseInt(offset as string) : 0, 0)
    };

    const events = await EventModel.findUserRegisteredEvents(userId, filters);

    success(res, {
      events,
      total: events.length,
      limit: filters.limit,
      offset: filters.offset
    });
  },

  async getMyEventProfile(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new NotFoundError('Vous n\'êtes pas inscrit à cet événement');
    }

    success(res, {
      profil_info: registration.profil_info || {},
      custom_fields: event.custom_fields || []
    });
  },

  async getStatistics(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const result = await EventService.computeStatistics(req.user!.id, eventId);
    success(res, result);
  },

  async uploadBanner(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      throw new ValidationError('Aucun fichier uploadé');
    }

    const eventId = parseInt(req.params.id);
    const orgaId = req.user!.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    deleteEventBanner(eventId);
    const bannerPath = getEventBannerUrl(eventId, req.file.filename);

    const updatedEvent = await EventModel.update(eventId, { banner_path: bannerPath });

    success(res, { banner_path: updatedEvent!.banner_path }, 'Bannière uploadée avec succès');
  },

  async deleteBanner(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const orgaId = req.user!.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    deleteEventBanner(eventId);
    await EventModel.update(eventId, { banner_path: null });

    success(res, null, 'Bannière supprimée avec succès');
  },

  async checkEligibility(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;
    const result = await EventService.checkEligibility(userId, eventId);
    success(res, result);
  }
};
