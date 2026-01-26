import { MatchModel } from '../models/match.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { EventModel } from '../models/event.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { success } from '../utils/responses.js';

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

    // Check user is registered to this event
    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement pour voir les profils');
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

    // Check user is registered
    const userRegistration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!userRegistration) {
      throw new ForbiddenError('Vous devez être inscrit à cet événement');
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

    // Group by event
    const grouped = conversations.reduce((acc, conv) => {
      const eventKey = conv.event_id;
      if (!acc[eventKey]) {
        acc[eventKey] = {
          event: {
            id: conv.event_id,
            name: conv.event_name
          },
          conversations: []
        };
      }
      acc[eventKey].conversations.push({
        match_id: conv.match_id,
        user: {
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

    const conversations = await MatchModel.getConversationsByEvent(userId, eventId);

    const formatted = conversations.map(conv => ({
      match_id: conv.match_id,
      user: {
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
    }));

    return success(res, {
      event: { id: eventId, name: event.name },
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

    // Get other user info
    const otherUserId = match.user1_id === userId ? match.user2_id : match.user1_id;
    const otherUser = await MatchModel.getUserBasicInfo(otherUserId);

    return success(res, {
      match: {
        id: matchId,
        event_id: match.event_id,
        event_name: match.event_name,
        user: otherUser
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

    // If eventId is in params, verify it matches
    if (req.params.eventId) {
      const eventId = parseInt(req.params.eventId);
      if (match.event_id !== eventId) {
        throw new NotFoundError('Conversation non trouvée pour cet événement');
      }
    }

    const message = await MatchModel.createMessage(matchId, userId, content.trim());

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
  }
};
