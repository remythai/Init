import { MatchModel } from '../models/match.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { EventModel } from '../models/event.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError, EventExpiredError, UserBlockedError } from '../utils/errors.js';
import { emitNewMessage, emitNewMatch, emitConversationUpdate } from '../socket/emitters.js';
import { withTransaction } from '../config/database.js';

function isEventAppActive(event: { app_end_at?: Date | string | null }): boolean {
  if (!event.app_end_at) return true;
  return new Date() < new Date(event.app_end_at);
}

export const MatchService = {
  async getProfiles(userId: number, eventId: number, limit: number): Promise<unknown> {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (!isEventAppActive(event)) {
      throw new EventExpiredError();
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement pour voir les profils');
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      throw new UserBlockedError();
    }

    return MatchModel.getProfilesToSwipe(userId, eventId, limit);
  },

  async likeProfile(userId: number, eventId: number, targetUserId: number): Promise<{ matched: boolean; match?: unknown }> {
    if (!targetUserId) {
      throw new ValidationError('user_id est requis');
    }

    if (targetUserId === userId) {
      throw new ValidationError('Vous ne pouvez pas vous liker vous-même');
    }

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (!isEventAppActive(event)) {
      throw new EventExpiredError();
    }

    const userRegistration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!userRegistration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    const isUserBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isUserBlocked) {
      throw new UserBlockedError();
    }

    const targetRegistration = await RegistrationModel.findByUserAndEvent(targetUserId, eventId);
    if (!targetRegistration) {
      throw new NotFoundError('Cet utilisateur ne participe pas à cet événement');
    }

    const alreadySwiped = await MatchModel.hasAlreadySwiped(userId, targetUserId, eventId);
    if (alreadySwiped) {
      throw new ConflictError('Vous avez déjà croisé ce profil');
    }

    const result = await withTransaction(async (client) => {
      await MatchModel.createLike(userId, targetUserId, eventId, true, client);
      const mutualLike = await MatchModel.findLike(targetUserId, userId, eventId, client);

      if (mutualLike) {
        const match = await MatchModel.createMatch(userId, targetUserId, eventId, client);
        return match;
      }
      return null;
    });

    if (result) {
      const matchedUser = await MatchModel.getUserBasicInfo(targetUserId, eventId);
      const currentUser = await MatchModel.getUserBasicInfo(userId, eventId);
      const eventData = await EventModel.findById(eventId);

      emitNewMatch(userId, targetUserId, {
        match_id: result.id,
        event_id: eventId,
        event_name: eventData?.name,
        created_at: result.created_at,
        user1: currentUser,
        user2: matchedUser
      });

      return {
        matched: true,
        match: {
          id: result.id,
          user: matchedUser,
          event_id: eventId,
          created_at: result.created_at
        }
      };
    }

    return { matched: false };
  },

  async passProfile(userId: number, eventId: number, targetUserId: number): Promise<void> {
    if (!targetUserId) {
      throw new ValidationError('user_id est requis');
    }

    if (targetUserId === userId) {
      throw new ValidationError('Action invalide');
    }

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const userRegistration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!userRegistration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    const isUserBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isUserBlocked) {
      throw new UserBlockedError();
    }

    const targetRegistration = await RegistrationModel.findByUserAndEvent(targetUserId, eventId);
    if (!targetRegistration) {
      throw new NotFoundError('Cet utilisateur ne participe pas à cet événement');
    }

    const alreadySwiped = await MatchModel.hasAlreadySwiped(userId, targetUserId, eventId);
    if (alreadySwiped) {
      throw new ConflictError('Vous avez déjà croisé ce profil');
    }

    await MatchModel.createLike(userId, targetUserId, eventId, false);
  },

  async getAllConversations(userId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const conversations = await MatchModel.getAllConversations(userId, limit, offset) as Array<Record<string, unknown>>;

    const blockedEventIds = new Set<number>();
    for (const conv of conversations) {
      if (!blockedEventIds.has(conv.event_id as number)) {
        const isBlocked = await BlockedUserModel.isBlocked(conv.event_id as number, userId);
        if (isBlocked) {
          blockedEventIds.add(conv.event_id as number);
        }
      }
    }

    const grouped = conversations.reduce((acc: Record<number, { event: Record<string, unknown>; conversations: unknown[] }>, conv: Record<string, unknown>) => {
      const eventKey = conv.event_id as number;
      const isEventExpired = !isEventAppActive(conv as { app_end_at?: Date | string | null });
      const isBlocked = blockedEventIds.has(conv.event_id as number);

      if (!acc[eventKey]) {
        acc[eventKey] = {
          event: {
            id: conv.event_id,
            name: conv.event_name,
            is_expired: isEventExpired,
            is_blocked: isBlocked
          },
          conversations: []
        };
      }
      acc[eventKey].conversations.push({
        match_id: conv.match_id,
        is_archived: conv.is_archived || false,
        is_event_expired: isEventExpired,
        is_blocked: isBlocked,
        user: isBlocked ? {
          id: conv.user_id,
          firstname: 'Utilisateur',
          lastname: '',
          photos: []
        } : {
          id: conv.user_id,
          firstname: conv.firstname,
          lastname: conv.lastname,
          photos: conv.photos
        },
        last_message: conv.last_message ? {
          content: (conv.last_message as Record<string, unknown>).content,
          sent_at: (conv.last_message as Record<string, unknown>).sent_at,
          is_mine: (conv.last_message as Record<string, unknown>).sender_id === userId
        } : null,
        unread_count: conv.unread_count
      });
      return acc;
    }, {} as Record<number, { event: Record<string, unknown>; conversations: unknown[] }>);

    return Object.values(grouped);
  },

  async getEventConversations(userId: number, eventId: number, limit: number = 50, offset: number = 0): Promise<{ event: Record<string, unknown>; conversations: unknown[] }> {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    const isCurrentUserBlocked = await BlockedUserModel.isBlocked(eventId, userId);

    const conversations = await MatchModel.getConversationsByEvent(userId, eventId, limit, offset) as Array<Record<string, unknown>>;
    const isEventExpired = !isEventAppActive(event);

    const formatted = await Promise.all(conversations.map(async (conv: Record<string, unknown>) => {
      const isOtherUserBlocked = await BlockedUserModel.isBlocked(eventId, conv.user_id as number);
      const shouldHideProfile = isCurrentUserBlocked || isOtherUserBlocked;

      return {
        match_id: conv.match_id,
        is_archived: conv.is_archived || false,
        is_event_expired: isEventExpired,
        is_blocked: isCurrentUserBlocked,
        is_other_user_blocked: isOtherUserBlocked,
        user: shouldHideProfile ? {
          id: conv.user_id,
          firstname: 'Utilisateur',
          lastname: '',
          photos: []
        } : {
          id: conv.user_id,
          firstname: conv.firstname,
          lastname: conv.lastname,
          photos: conv.photos
        },
        last_message: conv.last_message ? {
          content: (conv.last_message as Record<string, unknown>).content,
          sent_at: (conv.last_message as Record<string, unknown>).sent_at,
          is_mine: (conv.last_message as Record<string, unknown>).sender_id === userId
        } : null,
        unread_count: conv.unread_count
      };
    }));

    return {
      event: { id: eventId, name: event.name, is_expired: isEventExpired, is_blocked: isCurrentUserBlocked },
      conversations: formatted
    };
  },

  async getMessages(userId: number, matchId: number, eventIdParam?: number, limit = 50, beforeId: number | null = null): Promise<{ match: unknown; messages: unknown }> {
    const match = await MatchModel.getMatchById(matchId, userId);
    if (!match) {
      throw new NotFoundError('Conversation non trouvée');
    }

    if (eventIdParam !== undefined) {
      if (match.event_id !== eventIdParam) {
        throw new NotFoundError('Conversation non trouvée pour cet événement');
      }
    }

    await MatchModel.markAllMessagesAsRead(matchId, userId);

    const messages = await MatchModel.getMessages(matchId, limit, beforeId);

    const isCurrentUserBlocked = await BlockedUserModel.isBlocked(match.event_id, userId);
    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const isOtherUserBlocked = await BlockedUserModel.isBlocked(match.event_id, otherUserId);

    let otherUser;
    if (isCurrentUserBlocked || isOtherUserBlocked) {
      otherUser = {
        id: otherUserId,
        firstname: 'Utilisateur',
        lastname: '',
        photos: []
      };
    } else {
      const profile = await MatchModel.getMatchUserProfile(otherUserId, match.event_id) as Record<string, unknown>;
      otherUser = {
        id: profile.user_id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        photos: profile.photos
      };
    }

    return {
      match: {
        id: matchId,
        event_id: match.event_id,
        event_name: match.event_name,
        user: otherUser,
        is_blocked: isCurrentUserBlocked,
        is_other_user_blocked: isOtherUserBlocked
      },
      messages
    };
  },

  async sendMessage(userId: number, matchId: number, content: string, eventIdParam?: number): Promise<unknown> {
    if (!content || !content.trim()) {
      throw new ValidationError('Le contenu du message est requis');
    }
    if (content.trim().length > 5000) {
      throw new ValidationError('Le message est trop long (max 5000 caractères)');
    }

    const match = await MatchModel.getMatchById(matchId, userId);
    if (!match) {
      throw new NotFoundError('Conversation non trouvée');
    }

    if (match.is_archived) {
      throw new ForbiddenError('Cette conversation est archivée et en lecture seule');
    }

    const event = await EventModel.findById(match.event_id);
    if (event && !isEventAppActive(event)) {
      throw new EventExpiredError();
    }

    if (eventIdParam !== undefined) {
      if (match.event_id !== eventIdParam) {
        throw new NotFoundError('Conversation non trouvée pour cet événement');
      }
    }

    const message = await MatchModel.createMessage(matchId, userId, content.trim());

    emitNewMessage(matchId, message as unknown as Record<string, unknown>, userId);

    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    emitConversationUpdate(otherUserId, {
      match_id: matchId,
      last_message: {
        content: message.content,
        sent_at: message.sent_at,
        is_mine: false
      }
    });

    return message;
  }
};
