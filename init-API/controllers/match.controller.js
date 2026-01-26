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
  }
};
