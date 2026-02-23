import type { Request, Response } from 'express';
import { MatchModel } from '../models/match.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { EventModel } from '../models/event.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';
import { success } from '../utils/responses.js';
import { MatchService } from '../services/match.service.js';

export const MatchController = {
  async getProfiles(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 10, 1), 100);

    const profiles = await MatchService.getProfiles(userId, eventId, limit);
    success(res, profiles);
  },

  async likeProfile(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { user_id: targetUserId } = req.body;

    const result = await MatchService.likeProfile(userId, eventId, targetUserId);
    success(res, result);
  },

  async passProfile(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;
    const { user_id: targetUserId } = req.body;

    await MatchService.passProfile(userId, eventId, targetUserId);
    success(res, null, 'Profil passé');
  },

  async getEventMatches(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.id);
    const userId = req.user!.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const matches = await MatchModel.getMatchesByEvent(userId, eventId, limit, offset);

    success(res, matches);
  },

  async getAllMatches(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

    const matches = await MatchModel.getAllMatches(userId, limit, offset) as Array<Record<string, unknown>>;

    const grouped = matches.reduce((acc: Record<number, { event: { id: number; name: string }; matches: unknown[] }>, match: Record<string, unknown>) => {
      const eventKey = match.event_id as number;
      if (!acc[eventKey]) {
        acc[eventKey] = {
          event: {
            id: match.event_id as number,
            name: match.event_name as string
          },
          matches: []
        };
      }
      acc[eventKey].matches.push({
        match_id: match.match_id,
        user: {
          id: match.user_id,
          firstname: match.firstname,
          lastname: match.lastname,
          photos: match.photos
        },
        created_at: match.created_at
      });
      return acc;
    }, {} as Record<number, { event: { id: number; name: string }; matches: unknown[] }>);

    success(res, {
      total: matches.length,
      by_event: Object.values(grouped)
    });
  },

  async getAllConversations(req: Request, res: Response): Promise<void> {
    const userId = req.user!.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const result = await MatchService.getAllConversations(userId, limit, offset);
    success(res, result);
  },

  async getEventConversations(req: Request, res: Response): Promise<void> {
    const eventId = parseInt(req.params.eventId);
    const userId = req.user!.id;
    const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
    const result = await MatchService.getEventConversations(userId, eventId, limit, offset);
    success(res, result);
  },

  async getMessages(req: Request, res: Response): Promise<void> {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const beforeId = req.query.before ? parseInt(req.query.before as string) : null;
    const eventIdParam = req.params.eventId ? parseInt(req.params.eventId) : undefined;

    const result = await MatchService.getMessages(userId, matchId, eventIdParam, limit, beforeId);
    success(res, result);
  },

  async sendMessage(req: Request, res: Response): Promise<void> {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user!.id;
    const { content } = req.body;
    const eventIdParam = req.params.eventId ? parseInt(req.params.eventId) : undefined;

    const message = await MatchService.sendMessage(userId, matchId, content, eventIdParam);
    success(res, message, 'Message envoyé');
  },

  async markAsRead(req: Request, res: Response): Promise<void> {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user!.id;

    const message = await MatchModel.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError('Message non trouvé');
    }

    if (message.user1_id !== userId && message.user2_id !== userId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    if (message.sender_id === userId) {
      throw new ValidationError('Vous ne pouvez pas marquer vos propres messages comme lus');
    }

    const updated = await MatchModel.markMessageAsRead(messageId);

    success(res, { is_read: updated!.is_read });
  },

  async toggleLike(req: Request, res: Response): Promise<void> {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user!.id;

    const message = await MatchModel.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError('Message non trouvé');
    }

    if (message.user1_id !== userId && message.user2_id !== userId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const updated = await MatchModel.toggleMessageLike(messageId);

    success(res, { is_liked: updated!.is_liked });
  },

  async getMatchProfile(req: Request, res: Response): Promise<void> {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user!.id;

    const match = await MatchModel.getMatchById(matchId, userId);
    if (!match) {
      throw new NotFoundError('Conversation non trouvée');
    }

    const isCurrentUserBlocked = await BlockedUserModel.isBlocked(match.event_id, userId);
    if (isCurrentUserBlocked) {
      throw new ForbiddenError('Vous ne pouvez pas voir ce profil');
    }

    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    const isOtherUserBlocked = await BlockedUserModel.isBlocked(match.event_id, otherUserId);
    if (isOtherUserBlocked) {
      throw new ForbiddenError('Ce profil n\'est plus disponible');
    }

    const profile = await MatchModel.getMatchUserProfile(otherUserId, match.event_id);
    if (!profile) {
      throw new NotFoundError('Profil non trouvé');
    }

    success(res, profile);
  }
};
