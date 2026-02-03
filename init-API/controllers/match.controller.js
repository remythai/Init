import { MatchModel } from '../models/match.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { EventModel } from '../models/event.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError, EventExpiredError, UserBlockedError } from '../utils/errors.js';
import { success } from '../utils/responses.js';
import { emitNewMessage, emitNewMatch, emitConversationUpdate } from '../socket/emitters.js';

/**
 * Check if event app period is still active
 */
function isEventAppActive(event) {
  if (!event.app_end_at) return true;
  return new Date() < new Date(event.app_end_at);
}

export const MatchController = {
  /**
   * GET /api/events/:id/profiles
   * Get profiles to swipe for a given event
   */
  async getProfiles(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    // Check event exists
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    // Check if event app period is still active
    if (!isEventAppActive(event)) {
      throw new EventExpiredError();
    }

    // Check user is registered to this event
    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement pour voir les profils');
    }

    // Check if user is blocked
    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      throw new UserBlockedError();
    }

    const profiles = await MatchModel.getProfilesToSwipe(userId, eventId, limit);

    return success(res, profiles);
  },

  /**
   * POST /api/events/:id/like
   * Like a profile within an event
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

    // Check event exists
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    // Check if event app period is still active
    if (!isEventAppActive(event)) {
      throw new EventExpiredError();
    }

    // Check user is registered
    const userRegistration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!userRegistration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    // Check if user is blocked
    const isUserBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isUserBlocked) {
      throw new UserBlockedError();
    }

    // Check target is registered
    const targetRegistration = await RegistrationModel.findByUserAndEvent(targetUserId, eventId);
    if (!targetRegistration) {
      throw new NotFoundError('Cet utilisateur ne participe pas à cet événement');
    }

    // Check not already swiped
    const alreadySwiped = await MatchModel.hasAlreadySwiped(userId, targetUserId, eventId);
    if (alreadySwiped) {
      throw new ConflictError('Vous avez déjà croisé ce profil');
    }

    // Record the like
    await MatchModel.createLike(userId, targetUserId, eventId, true);

    // Check for mutual like
    const mutualLike = await MatchModel.findLike(targetUserId, userId, eventId);

    if (mutualLike) {
      // Create match
      const match = await MatchModel.createMatch(userId, targetUserId, eventId);
      const matchedUser = await MatchModel.getUserBasicInfo(targetUserId);
      const currentUser = await MatchModel.getUserBasicInfo(userId);
      const event = await EventModel.findById(eventId);

      // Emit match notification to both users via Socket.io
      emitNewMatch(userId, targetUserId, {
        match_id: match.id,
        event_id: eventId,
        event_name: event?.name,
        created_at: match.created_at,
        user1: currentUser,
        user2: matchedUser
      });

      return success(res, {
        matched: true,
        match: {
          id: match.id,
          user: matchedUser,
          event_id: eventId,
          created_at: match.created_at
        }
      });
    }

    return success(res, { matched: false });
  },

  /**
   * POST /api/events/:id/pass
   * Pass on a profile within an event
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

    // Check event exists
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    // Check user is registered
    const userRegistration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!userRegistration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    // Check if user is blocked
    const isUserBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isUserBlocked) {
      throw new UserBlockedError();
    }

    // Check target is registered
    const targetRegistration = await RegistrationModel.findByUserAndEvent(targetUserId, eventId);
    if (!targetRegistration) {
      throw new NotFoundError('Cet utilisateur ne participe pas à cet événement');
    }

    // Check not already swiped
    const alreadySwiped = await MatchModel.hasAlreadySwiped(userId, targetUserId, eventId);
    if (alreadySwiped) {
      throw new ConflictError('Vous avez déjà croisé ce profil');
    }

    // Record the pass
    await MatchModel.createLike(userId, targetUserId, eventId, false);

    return success(res, null, 'Profil passé');
  },

  /**
   * GET /api/events/:id/matches
   * Get all matches for a user on a specific event
   */
  async getEventMatches(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;

    // Check event exists
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    // Check user is registered
    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    const matches = await MatchModel.getMatchesByEvent(userId, eventId);

    return success(res, matches);
  },

  /**
   * GET /api/matches
   * Get all matches for a user (all events)
   */
  async getAllMatches(req, res) {
    const userId = req.user.id;

    const matches = await MatchModel.getAllMatches(userId);

    // Group by event for better structure
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

  // =========================================================================
  // MESSAGING
  // =========================================================================

  /**
   * GET /api/matching/conversations
   * Get all conversations grouped by event
   */
  async getAllConversations(req, res) {
    const userId = req.user.id;

    const conversations = await MatchModel.getAllConversations(userId);

    // Get blocked status for each event
    const blockedEventIds = new Set();
    for (const conv of conversations) {
      if (!blockedEventIds.has(conv.event_id)) {
        const isBlocked = await BlockedUserModel.isBlocked(conv.event_id, userId);
        if (isBlocked) {
          blockedEventIds.add(conv.event_id);
        }
      }
    }

    // Group by event
    const grouped = conversations.reduce((acc, conv) => {
      const eventKey = conv.event_id;
      const isEventExpired = conv.app_end_at ? new Date() > new Date(conv.app_end_at) : false;
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
   * Get conversations for a specific event
   */
  async getEventConversations(req, res) {
    const eventId = parseInt(req.params.eventId);
    const userId = req.user.id;

    // Check event exists
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    // Check user is registered
    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
    }

    // Check if current user is blocked
    const isCurrentUserBlocked = await BlockedUserModel.isBlocked(eventId, userId);

    const conversations = await MatchModel.getConversationsByEvent(userId, eventId);
    const isEventExpired = !isEventAppActive(event);

    // Build formatted conversations with other user blocked status
    const formatted = await Promise.all(conversations.map(async conv => {
      // Check if the other user is blocked
      const isOtherUserBlocked = await BlockedUserModel.isBlocked(eventId, conv.user_id);

      // Hide profile info if current user is blocked OR other user is blocked
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
   * Get messages for a match
   */
  async getMessages(req, res) {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const beforeId = req.query.before ? parseInt(req.query.before) : null;

    // Check match exists and user is part of it
    const match = await MatchModel.getMatchById(matchId, userId);
    if (!match) {
      throw new NotFoundError('Conversation non trouvée');
    }

    // If eventId is in params, verify it matches
    if (req.params.eventId) {
      const eventId = parseInt(req.params.eventId);
      if (match.event_id !== eventId) {
        throw new NotFoundError('Conversation non trouvée pour cet événement');
      }
    }

    // Mark messages as read
    await MatchModel.markAllMessagesAsRead(matchId, userId);

    // Get messages
    const messages = await MatchModel.getMessages(matchId, limit, beforeId);

    // Check if current user is blocked
    const isCurrentUserBlocked = await BlockedUserModel.isBlocked(match.event_id, userId);

    // Get other user info
    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    // Check if other user is blocked
    const isOtherUserBlocked = await BlockedUserModel.isBlocked(match.event_id, otherUserId);

    let otherUser;
    // Hide profile info if current user is blocked OR if other user is blocked
    if (isCurrentUserBlocked || isOtherUserBlocked) {
      otherUser = {
        id: otherUserId,
        firstname: 'Utilisateur',
        lastname: '',
        photos: []
      };
    } else {
      otherUser = await MatchModel.getUserBasicInfo(otherUserId);
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
   * Send a message
   */
  async sendMessage(req, res) {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      throw new ValidationError('Le contenu du message est requis');
    }

    // Check match exists and user is part of it
    const match = await MatchModel.getMatchById(matchId, userId);
    if (!match) {
      throw new NotFoundError('Conversation non trouvée');
    }

    // Check if match is archived (read-only)
    if (match.is_archived) {
      throw new ForbiddenError('Cette conversation est archivée et en lecture seule');
    }

    // Check if event app period is still active
    const event = await EventModel.findById(match.event_id);
    if (event && !isEventAppActive(event)) {
      throw new EventExpiredError();
    }

    // If eventId is in params, verify it matches
    if (req.params.eventId) {
      const eventId = parseInt(req.params.eventId);
      if (match.event_id !== eventId) {
        throw new NotFoundError('Conversation non trouvée pour cet événement');
      }
    }

    const message = await MatchModel.createMessage(matchId, userId, content.trim());

    // Emit new message via Socket.io
    emitNewMessage(matchId, message, userId);

    // Get other user ID to send conversation update
    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    // Emit conversation update to the other user
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
   * Mark a message as read
   */
  async markAsRead(req, res) {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    // Get message with match info
    const message = await MatchModel.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError('Message non trouvé');
    }

    // Check user is part of the match
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
   * Toggle like on a message
   */
  async toggleLike(req, res) {
    const messageId = parseInt(req.params.messageId);
    const userId = req.user.id;

    // Get message with match info
    const message = await MatchModel.getMessageById(messageId);
    if (!message) {
      throw new NotFoundError('Message non trouvé');
    }

    // Check user is part of the match
    if (message.user1_id !== userId && message.user2_id !== userId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const updated = await MatchModel.toggleMessageLike(messageId);

    return success(res, { is_liked: updated.is_liked });
  },

  /**
   * GET /api/matching/matches/:matchId/profile
   * Get the other user's profile in a match (for viewing in conversation)
   */
  async getMatchProfile(req, res) {
    const matchId = parseInt(req.params.matchId);
    const userId = req.user.id;

    // Check match exists and user is part of it
    const match = await MatchModel.getMatchById(matchId, userId);
    if (!match) {
      throw new NotFoundError('Conversation non trouvée');
    }

    // Check if current user is blocked
    const isCurrentUserBlocked = await BlockedUserModel.isBlocked(match.event_id, userId);
    if (isCurrentUserBlocked) {
      throw new ForbiddenError('Vous ne pouvez pas voir ce profil');
    }

    // Get other user info
    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;

    // Check if other user is blocked - their profile shouldn't be viewable
    const isOtherUserBlocked = await BlockedUserModel.isBlocked(match.event_id, otherUserId);
    if (isOtherUserBlocked) {
      throw new ForbiddenError('Ce profil n\'est plus disponible');
    }

    // Get user profile with event-specific info
    const profile = await MatchModel.getMatchUserProfile(otherUserId, match.event_id);
    if (!profile) {
      throw new NotFoundError('Profil non trouvé');
    }

    return success(res, profile);
  }
};
