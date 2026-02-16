import { EventModel } from '../models/event.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { UserModel } from '../models/user.model.js';
import { WhitelistModel } from '../models/whitelist.model.js';
import { MatchModel } from '../models/match.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';

import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { success, created } from '../utils/responses.js';
import { validateCustomFields, validateCustomData } from '../utils/customFieldsSchema.js';
import { emitUserJoinedEvent } from '../socket/emitters.js';
import { getEventBannerUrl, deleteEventBanner, deleteEventDir } from '../config/multer.config.js';

import { withTransaction } from '../config/database.js';
import { getCache, setCache } from '../utils/cache.js';
import bcrypt from 'bcrypt';

export const EventController = {
  async create(req, res) {
    const {
      name, description, start_at, end_at, location,
      max_participants, is_public, has_whitelist, has_link_access,
      has_password_access, access_password, cooldown, custom_fields,
      app_start_at, app_end_at, theme
    } = req.body;

    if (!app_start_at || !app_end_at) {
      throw new ValidationError('Les dates de disponibilité de l\'app sont requises');
    }

    const appStart = new Date(app_start_at);
    const appEnd = new Date(app_end_at);

    if (appEnd <= appStart) {
      throw new ValidationError('La date de fin de l\'app doit être après la date de début');
    }

    if (start_at && end_at) {
      const physicalStart = new Date(start_at);
      const physicalEnd = new Date(end_at);
      if (physicalEnd <= physicalStart) {
        throw new ValidationError('La date de fin de l\'événement doit être après la date de début');
      }
    }

    let access_password_hash = null;
    if (has_password_access && access_password) {
      access_password_hash = await bcrypt.hash(access_password, 10);
    } else if (has_password_access && !access_password) {
      throw new ValidationError('Un mot de passe est requis quand has_password_access est activé');
    }

    if (custom_fields) {
      validateCustomFields(custom_fields);
    }

    const event = await EventModel.create({
      orga_id: req.user.id,
      name,
      description: description || ' ',
      start_at: start_at || null,
      end_at: end_at || null,
      location: location || null,
      app_start_at,
      app_end_at,
      theme: theme || 'général',
      max_participants,
      is_public: is_public !== undefined ? is_public : true,
      has_whitelist: has_whitelist || false,
      has_link_access: has_link_access || false,
      has_password_access: has_password_access || false,
      access_password_hash,
      cooldown,
      custom_fields: custom_fields || []
    });

    return created(res, event, 'Événement créé avec succès');
  },

  async getEventByID(req, res) {
    const eventId = req.params.id;
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez consulter que vos propres événements');
    }

    const eventWithCount = {
      ...event,
      participant_count: await EventModel.countParticipants(event.id),
    };

    return success(res, eventWithCount);
  },

  async getMyOrgaEvents(req, res) {
    const events = await EventModel.findByOrgaId(req.user.id);

    const eventsWithCount = await Promise.all(
      events.map(async (event) => {
        const { id, name, location, event_date, max_participants, start_at, end_at, app_start_at, app_end_at, theme, description, banner_path, orga_logo } = event;

        return {
          id,
          name,
          location,
          event_date,
          max_participants,
          description,
          theme,
          start_at,
          end_at,
          app_start_at,
          app_end_at,
          banner_path,
          orga_logo,
          participant_count: await EventModel.countParticipants(event.id)
        };
      })
    );

    return success(res, eventsWithCount);
  },

  async update(req, res) {
    const eventId = req.params.id;
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    const {
      name, description, start_at, end_at, location,
      app_start_at, app_end_at, theme,
      max_participants, is_public, has_whitelist, has_link_access,
      has_password_access, access_password, cooldown, custom_fields
    } = req.body;

    const updates = {};

    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (start_at !== undefined) updates.start_at = start_at || null;
    if (end_at !== undefined) updates.end_at = end_at || null;
    if (location !== undefined) updates.location = location || null;
    if (app_start_at) updates.app_start_at = app_start_at;
    if (app_end_at) updates.app_end_at = app_end_at;
    if (theme) updates.theme = theme;
    if (max_participants !== undefined) updates.max_participants = max_participants;
    if (is_public !== undefined) updates.is_public = is_public;
    if (has_whitelist !== undefined) updates.has_whitelist = has_whitelist;
    if (has_link_access !== undefined) updates.has_link_access = has_link_access;
    if (has_password_access !== undefined) updates.has_password_access = has_password_access;
    if (cooldown !== undefined) updates.cooldown = cooldown;

    if (access_password) {
      updates.access_password_hash = await bcrypt.hash(access_password, 10);
    }
    
    if (custom_fields) {
      validateCustomFields(custom_fields);
      updates.custom_fields = custom_fields;
    }

    if (updates.start_at || updates.end_at) {
      const start = new Date(updates.start_at || event.start_at);
      const end = new Date(updates.end_at || event.end_at);

      if (start && end && end <= start) {
        throw new ValidationError('La date de fin de l\'événement doit être après la date de début');
      }
    }

    if (updates.app_start_at || updates.app_end_at) {
      const appStart = new Date(updates.app_start_at || event.app_start_at);
      const appEnd = new Date(updates.app_end_at || event.app_end_at);

      if (appEnd <= appStart) {
        throw new ValidationError('La date de fin de l\'app doit être après la date de début');
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    const updatedEvent = await EventModel.update(eventId, updates);

    return success(res, updatedEvent, 'Événement mis à jour');
  },

  async delete(req, res) {
    const eventId = req.params.id;
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez supprimer que vos propres événements');
    }

    deleteEventDir(eventId);
    await EventModel.delete(eventId);
    return success(res, null, 'Événement supprimé');
  },

  async getParticipants(req, res) {
    const eventId = req.params.id;
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez voir que les participants de vos événements');
    }

    const participants = await RegistrationModel.findByEventId(eventId);
    return success(res, participants);
  },

  async removeParticipant(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    const action = req.query.action || req.body?.action || 'block'; // 'block' or 'delete'

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez supprimer que les participants de vos événements');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new NotFoundError('Ce participant n\'est pas inscrit à cet événement');
    }

    if (action === 'delete') {
      await withTransaction(async (client) => {
        await MatchModel.deleteUserMatchesInEvent(userId, eventId, client);
        await MatchModel.deleteUserLikesInEvent(userId, eventId, client);
        await RegistrationModel.delete(userId, eventId, client);
      });

      return success(res, null, 'Participant supprimé définitivement');
    } else {
      await withTransaction(async (client) => {
        await MatchModel.archiveUserMatchesInEvent(userId, eventId, client);
        await BlockedUserModel.block(eventId, userId, 'Bloqué par l\'organisateur', client);
      });

      return success(res, null, 'Participant bloqué de l\'événement');
    }
  },

  async getBlockedUsers(req, res) {
    const eventId = parseInt(req.params.id);

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez voir que les utilisateurs bloqués de vos événements');
    }

    const blockedUsers = await BlockedUserModel.getByEventId(eventId);
    return success(res, blockedUsers);
  },

  async blockUser(req, res) {
    const eventId = parseInt(req.params.id);
    const { user_id, reason } = req.body;

    if (!user_id) {
      throw new ValidationError('user_id est requis');
    }

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, user_id);
    if (isBlocked) {
      throw new ConflictError('Cet utilisateur est déjà bloqué');
    }

    await MatchModel.archiveUserMatchesInEvent(user_id, eventId);
    await BlockedUserModel.block(eventId, user_id, reason || 'Bloqué par l\'organisateur');

    return success(res, null, 'Utilisateur bloqué');
  },

  async unblockParticipant(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== req.user.id) {
      throw new ForbiddenError('Vous ne pouvez débloquer que les utilisateurs de vos événements');
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (!isBlocked) {
      throw new NotFoundError('Cet utilisateur n\'est pas bloqué');
    }

    await BlockedUserModel.unblock(eventId, userId);
    await MatchModel.unarchiveUserMatchesInEvent(userId, eventId);

    return success(res, null, 'Utilisateur débloqué');
  },

  async register(req, res) {
    const eventId = req.params.id;
    const userId = req.user.id;
    const { profil_info, access_password } = req.body;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (!event.is_public) {
      throw new ForbiddenError('Cet événement n\'est pas public');
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      throw new ForbiddenError('Vous n\'êtes plus autorisé à vous inscrire à cet événement');
    }

    if (event.has_whitelist) {
      const user = await UserModel.findById(userId);
      const isWhitelisted = await WhitelistModel.isWhitelisted(eventId, user.tel);
      if (!isWhitelisted) {
        throw new ForbiddenError('Vous n\'êtes pas autorisé à accéder à cet événement');
      }
      await WhitelistModel.linkUser(user.tel, userId);
    }

    if (event.has_password_access) {
      if (!access_password) {
        throw new ValidationError('Un mot de passe est requis pour accéder à cet événement');
      }
      const hash = await EventModel.getAccessPasswordHash(eventId);
      const validPassword = await bcrypt.compare(access_password, hash);
      if (!validPassword) {
        throw new ValidationError('Mot de passe incorrect');
      }
    }

    const existing = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (existing) {
      throw new ConflictError('Vous êtes déjà inscrit à cet événement');
    }

    if (event.custom_fields?.length > 0) {
      const requiredFields = event.custom_fields.filter(field => field.required);

      if (requiredFields.length > 0) {
        if (!profil_info || Object.keys(profil_info).length === 0) {
          throw new ValidationError('Les informations de profil sont requises pour cet événement');
        }
        validateCustomData(event.custom_fields, profil_info);
      } else if (profil_info && Object.keys(profil_info).length > 0) {
        validateCustomData(event.custom_fields, profil_info);
      }
    }

    const registration = await withTransaction(async (client) => {
      if (event.max_participants) {
        await EventModel.findByIdForUpdate(eventId, client);
        const currentCount = await EventModel.countParticipants(eventId, client);
        if (currentCount >= event.max_participants) {
          throw new ConflictError('L\'événement a atteint le nombre maximum de participants');
        }
      }
      return await RegistrationModel.create(userId, eventId, profil_info || {}, client);
    });

    const userWithPhotos = await MatchModel.getUserBasicInfo(userId);
    emitUserJoinedEvent(eventId, {
      id: userWithPhotos.id,
      firstname: userWithPhotos.firstname,
      lastname: userWithPhotos.lastname,
      photos: userWithPhotos.photos || []
    });

    return created(res, registration, 'Inscription réussie');
  },

  async updateRegistration(req, res) {
    const eventId = req.params.id;
    const userId = req.user.id;
    const { profil_info } = req.body;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new NotFoundError('Inscription non trouvée');
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      throw new ForbiddenError('Vous ne pouvez plus modifier votre profil sur cet événement');
    }

    if (event.custom_fields?.length > 0) {
      if (profil_info && Object.keys(profil_info).length > 0) {
        validateCustomData(event.custom_fields, profil_info);
      }
    }

    const updated = await RegistrationModel.update(userId, eventId, profil_info || {});
    return success(res, updated, 'Profil mis à jour');
  },

  async unregister(req, res) {
    const eventId = req.params.id;
    const userId = req.user.id;

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new NotFoundError('Inscription non trouvée');
    }

    await RegistrationModel.delete(userId, eventId);
    return success(res, null, 'Désinscription réussie');
  },

  async getPublicEventsForUser(req, res) {
    const userId = req.user.id;
    const { upcoming, location, search, limit, offset } = req.query;

    const filters = {
      upcoming: upcoming !== 'false',
      location,
      search,
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: offset ? parseInt(offset) : 0
    };

    const events = await EventModel.findPublicEventsWithUserInfo(userId, filters);

    return success(res, {
      events,
      total: events.length,
      limit: filters.limit,
      offset: filters.offset
    });
  },

  async getMyRegisteredEvents(req, res) {
    const userId = req.user.id;
    const { upcoming, past, limit, offset } = req.query;

    const filters = {
      upcoming: upcoming === 'true',
      past: past === 'true',
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: offset ? parseInt(offset) : 0
    };

    const events = await EventModel.findUserRegisteredEvents(userId, filters);
    
    return success(res, {
      events,
      total: events.length,
      limit: filters.limit,
      offset: filters.offset
    });
  },

  async getMyEventProfile(req, res) {
    const eventId = req.params.id;
    const userId = req.user.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new NotFoundError('Vous n\'êtes pas inscrit à cet événement');
    }

    return success(res, {
      profil_info: registration.profil_info || {},
      custom_fields: event.custom_fields || []
    });
  },

  /**
   * GET /api/events/:id/statistics
   * Get comprehensive statistics for an event (orga only)
   */
  async getStatistics(req, res) {
    const eventId = parseInt(req.params.id);
    const orgaId = req.user.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const cacheKey = `stats:${eventId}`;
    const cached = getCache(cacheKey);
    if (cached) {
      return success(res, cached);
    }

    const [raw, leaderboardUsers] = await Promise.all([
      EventModel.getEventRawStatistics(eventId),
      EventModel.getLeaderboardData(eventId)
    ]);

    const { participants, whitelist, matches, messages, likes, activeUsers } = raw;

    const totalMatches = parseInt(matches.total_matches || 0);
    const totalLikes = parseInt(likes.likes || 0);
    const totalSwipes = parseInt(likes.total_swipes || 0);
    const totalMessages = parseInt(messages.total_messages || 0);
    const conversationsWithMessages = parseInt(messages.conversations_with_messages || 0);

    const matchUsers = leaderboardUsers
      .filter(u => parseInt(u.match_count) > 0)
      .sort((a, b) => parseInt(b.match_count) - parseInt(a.match_count))
      .slice(0, 10);

    const messageUsers = leaderboardUsers
      .filter(u => parseFloat(u.median_messages) > 0)
      .sort((a, b) => parseFloat(b.median_messages) - parseFloat(a.median_messages))
      .slice(0, 10);

    const maxMatches = matchUsers.length > 0 ? parseInt(matchUsers[0].match_count) : 1;
    const maxMessages = messageUsers.length > 0 ? parseFloat(messageUsers[0].median_messages) : 1;

    const combinedLeaderboard = leaderboardUsers
      .filter(u => parseInt(u.match_count) > 0 && parseFloat(u.median_messages) > 0)
      .map(user => {
        const matchScore = (parseInt(user.match_count) / maxMatches) * 50;
        const messageScore = (parseFloat(user.median_messages) / maxMessages) * 50;
        return {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          match_count: parseInt(user.match_count),
          median_messages: parseFloat(user.median_messages),
          combined_score: Math.round(matchScore + messageScore)
        };
      })
      .sort((a, b) => b.combined_score - a.combined_score)
      .slice(0, 10);

    const statistics = {
      participants: {
        total: participants,
        active: activeUsers,
        engagement_rate: participants > 0 ? Math.round((activeUsers / participants) * 100) : 0
      },
      whitelist: {
        total: parseInt(whitelist.total_active || 0),
        registered: parseInt(whitelist.registered || 0),
        pending: parseInt(whitelist.pending || 0),
        removed: parseInt(whitelist.removed || 0),
        conversion_rate: parseInt(whitelist.total_active || 0) > 0
          ? Math.round((parseInt(whitelist.registered || 0) / parseInt(whitelist.total_active || 0)) * 100)
          : 0
      },
      matching: {
        total_matches: totalMatches,
        average_matches_per_user: participants > 0 ? Math.round((totalMatches * 2 / participants) * 10) / 10 : 0,
        reciprocity_rate: totalLikes > 0 ? Math.round((totalMatches * 2 / totalLikes) * 100) : 0
      },
      swipes: {
        total: totalSwipes,
        likes: totalLikes,
        passes: parseInt(likes.passes || 0),
        users_who_swiped: parseInt(likes.users_who_swiped || 0),
        like_rate: totalSwipes > 0 ? Math.round((totalLikes / totalSwipes) * 100) : 0
      },
      messages: {
        total: totalMessages,
        users_who_sent: parseInt(messages.users_who_sent || 0),
        conversations_active: conversationsWithMessages,
        average_per_conversation: totalMatches > 0 ? Math.round((totalMessages / totalMatches) * 10) / 10 : 0
      },
      leaderboards: {
        matches: matchUsers.map(u => ({
          id: u.id,
          firstname: u.firstname,
          lastname: u.lastname,
          match_count: parseInt(u.match_count)
        })),
        messages: messageUsers.map(u => ({
          id: u.id,
          firstname: u.firstname,
          lastname: u.lastname,
          median_messages: parseFloat(u.median_messages),
          match_count: parseInt(u.match_count)
        })),
        combined: combinedLeaderboard
      }
    };

    const result = {
      event: {
        id: event.id,
        name: event.name,
        has_whitelist: event.has_whitelist
      },
      statistics
    };

    setCache(cacheKey, result, 30000);

    return success(res, result);
  },

  async uploadBanner(req, res) {
    if (!req.file) {
      throw new ValidationError('Aucun fichier uploadé');
    }

    const eventId = parseInt(req.params.id);
    const orgaId = req.user.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    const bannerPath = getEventBannerUrl(eventId, req.file.filename);

    const updatedEvent = await EventModel.update(eventId, { banner_path: bannerPath });

    return success(res, { banner_path: updatedEvent.banner_path }, 'Bannière uploadée avec succès');
  },

  async deleteBanner(req, res) {
    const eventId = parseInt(req.params.id);
    const orgaId = req.user.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    deleteEventBanner(eventId);
    await EventModel.update(eventId, { banner_path: null });

    return success(res, null, 'Bannière supprimée avec succès');
  },

  /**
   * GET /api/events/:id/check-eligibility
   * Check if user can register to event (whitelist, blocked, full, etc.)
   * This should be called BEFORE showing the registration form
   */
  async checkEligibility(req, res) {
    const eventId = parseInt(req.params.id);
    const userId = req.user.id;

    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const existing = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (existing) {
      return success(res, {
        eligible: false,
        reason: 'already_registered',
        message: 'Vous êtes déjà inscrit à cet événement'
      });
    }

    if (!event.is_public) {
      return success(res, {
        eligible: false,
        reason: 'not_public',
        message: 'Cet événement n\'est pas public'
      });
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      return success(res, {
        eligible: false,
        reason: 'blocked',
        message: 'Vous n\'êtes plus autorisé à vous inscrire à cet événement'
      });
    }

    if (event.has_whitelist) {
      const user = await UserModel.findById(userId);
      const isWhitelisted = await WhitelistModel.isWhitelisted(eventId, user.tel);
      if (!isWhitelisted) {
        return success(res, {
          eligible: false,
          reason: 'not_whitelisted',
          message: 'Vous n\'êtes pas sur la liste des participants autorisés pour cet événement'
        });
      }
    }

    if (event.max_participants) {
      const currentCount = await EventModel.countParticipants(eventId);
      if (currentCount >= event.max_participants) {
        return success(res, {
          eligible: false,
          reason: 'full',
          message: 'L\'événement a atteint le nombre maximum de participants'
        });
      }
    }

    return success(res, {
      eligible: true,
      requires_password: event.has_password_access,
      custom_fields: event.custom_fields || []
    });
  }
};