import { MatchModel } from '../models/match.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { EventModel } from '../models/event.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError, EventExpiredError, UserBlockedError } from '../utils/errors.js';
import { success } from '../utils/responses.js';
import { emitNewMessage, emitNewMatch, emitConversationUpdate } from '../socket/emitters.js';
import { withTransaction } from '../config/database.js';

function isEventAppActive(event) {
  if (!event.app_end_at) return true;
  return new Date() < new Date(event.app_end_at);
}

export const MatchController = {
  /**
   * GET /api/events/:id/profiles
   */
  async getProfiles(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

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

    const profiles = await MatchModel.getProfilesToSwipe(userId, eventId, limit);

    return success(res, profiles);
  },

  /**
   * POST /api/events/:id/like
   */
  async likeProfile(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;
    const { user_id: targetUserId } = req.body;

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
      const event = await EventModel.findById(eventId);

      emitNewMatch(userId, targetUserId, {
        match_id: result.id,
        event_id: eventId,
        event_name: event?.name,
        created_at: result.created_at,
        user1: currentUser,
        user2: matchedUser
      });

      return success(res, {
        matched: true,
        match: {
          id: result.id,
          user: matchedUser,
          event_id: eventId,
          created_at: result.created_at
        }
      });
    }

    return success(res, { matched: false });
  },

  /**
   * POST /api/events/:id/pass
   */
  async passProfile(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;
    const { user_id: targetUserId } = req.body;

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

    return success(res, null, 'Profil passé');
  },

  /**
   * GET /api/events/:id/matches
   */
  async getEventMatches(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    const matches = await MatchModel.getMatchesByEvent(userId, eventId);

    return success(res, matches);
  },

  /**
   * GET /api/matches
   */
  async getAllMatches(req, res) {
    const userId = req.user.id;

    const matches = await MatchModel.getAllMatches(userId);

    const grouped = matches.reduce((acc, match) => {
      const eventKey = match.event_id;
      if (!acc[eventKey]) {
        acc[eventKey] = {
          event: {
            id: match.event_id,
            name: match.event_name
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
    }, {});

    return success(res, {
      total: matches.length,
      by_event: Object.values(grouped)
    });
  },

  /**
   * GET /api/matching/conversations
   */
  async getAllConversations(req, res) {
    const userId = req.user.id;

    const conversations = await MatchModel.getAllConversations(userId);

    const blockedEventIds = new Set();
    for (const conv of conversations) {
      if (!blockedEventIds.has(conv.event_id)) {
        const isBlocked = await BlockedUserModel.isBlocked(conv.event_id, userId);
        if (isBlocked) {
          blockedEventIds.add(conv.event_id);
        }
      }
    }

    const grouped = conversations.reduce((acc, conv) => {
      const eventKey = conv.event_id;
      const isEventExpired = !isEventAppActive(conv);
      const isBlocked = blockedEventIds.has(conv.event_id);

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
          content: conv.last_message.content,
          sent_at: conv.last_message.sent_at,
          is_mine: conv.last_message.sender_id === userId
        } : null,
        unread_count: conv.unread_count
      });
      return acc;
    }, {});

    return success(res, Object.values(grouped));
  },

  /**
   * GET /api/matching/events/:eventId/conversations
   */
  async getEventConversations(req, res) {
    const eventId = parseInt(req.params.eventId);
    const userId = req.user.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    const isCurrentUserBlocked = await BlockedUserModel.isBlocked(eventId, userId);

    const conversations = await MatchModel.getConversationsByEvent(userId, eventId);
    const isEventExpired = !isEventAppActive(event);

    const formatted = await Promise.all(conversations.map(async conv => {
      const isOtherUserBlocked = await BlockedUserModel.isBlocked(eventId, conv.user_id);
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
          content: conv.last_message.content,
          sent_at: conv.last_message.sent_at,
          is_mine: conv.last_message.sender_id === userId
        } : null,
        unread_count: conv.unread_count
      };
    }));

    return success(res, {
      event: { id: eventId, name: event.name, is_expired: isEventExpired, is_blocked: isCurrentUserBlocked },
      conversations: formatted
    });
  },

  /**
   * GET /api/matching/matches/:matchId/messages
   * GET /api/matching/events/:eventId/matches/:matchId/messages
   */
  async getMessages(req, res) {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const beforeId = req.query.before ? parseInt(req.query.before) : null;

    const match = await MatchModel.getMatchById(matchId, userId);
    if (!match) {
      throw new NotFoundError('Conversation non trouvée');
    }

    if (req.params.eventId) {
      const eventId = parseInt(req.params.eventId);
      if (match.event_id !== eventId) {
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
      const profile = await MatchModel.getMatchUserProfile(otherUserId, match.event_id);
      otherUser = {
        id: profile.user_id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        photos: profile.photos
      };
    }

    return success(res, {
      match: {
        id: matchId,
        event_id: match.event_id,
        event_name: match.event_name,
        user: otherUser,
        is_blocked: isCurrentUserBlocked,
        is_other_user_blocked: isOtherUserBlocked
      },
      messages
    });
  },

  /**
   * POST /api/matching/matches/:matchId/messages
   * POST /api/matching/events/:eventId/matches/:matchId/messages
   */
  async sendMessage(req, res) {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new ValidationError('Le contenu du message est requis');
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

    if (req.params.eventId) {
      const eventId = parseInt(req.params.eventId);
      if (match.event_id !== eventId) {
        throw new NotFoundError('Conversation non trouvée pour cet événement');
      }
    }

    const message = await MatchModel.createMessage(matchId, userId, content.trim());

    emitNewMessage(matchId, message, userId);

    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    emitConversationUpdate(otherUserId, {
      match_id: matchId,
      last_message: {
        content: message.content,
        sent_at: message.sent_at,
        is_mine: false
      }
    });

    return success(res, message, 'Message envoyé');
  },

  /**
   * PUT /api/matching/messages/:messageId/read
   */
  async markAsRead(req, res) {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    const message = await MatchModel.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError('Message non trouvé');
    }

    if (message.user1_id !== userId && message.user2_id !== userId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    // Only recipient can mark as read
    if (message.sender_id === userId) {
      throw new ValidationError('Vous ne pouvez pas marquer vos propres messages comme lus');
    }

    const updated = await MatchModel.markMessageAsRead(messageId);

    return success(res, { is_read: updated.is_read });
  },

  /**
   * PUT /api/matching/messages/:messageId/like
   */
  async toggleLike(req, res) {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    const message = await MatchModel.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError('Message non trouvé');
    }

    if (message.user1_id !== userId && message.user2_id !== userId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const updated = await MatchModel.toggleMessageLike(messageId);

    return success(res, { is_liked: updated.is_liked });
  },

  /**
   * GET /api/matching/matches/:matchId/profile
   */
  async getMatchProfile(req, res) {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;

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

    return success(res, profile);
  }
};
