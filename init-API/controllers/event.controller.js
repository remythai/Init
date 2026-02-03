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

import bcrypt from 'bcrypt';

export const EventController = {
  async create(req, res) {
    const {
      name, description, start_at, end_at, location,
      max_participants, is_public, has_whitelist, has_link_access,
      has_password_access, access_password, cooldown, custom_fields,
      app_start_at, app_end_at, theme
    } = req.body;

    // Validate app availability dates (required)
    if (!app_start_at || !app_end_at) {
      throw new ValidationError('Les dates de disponibilité de l\'app sont requises');
    }

    const appStart = new Date(app_start_at);
    const appEnd = new Date(app_end_at);

    if (appEnd <= appStart) {
      throw new ValidationError('La date de fin de l\'app doit être après la date de début');
    }

    // Validate physical event dates if provided
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
      // Physical event dates (optional)
      start_at: start_at || null,
      end_at: end_at || null,
      location: location || null,
      // App availability dates (required)
      app_start_at,
      app_end_at,
      // Theme
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
        const { id, name, location, event_date, max_participants, start_at, end_at, app_start_at, app_end_at, theme, description } = event;

        return {
          id,
          name,
          location,
          event_date,
          max_participants,
          description,
          theme,
          // Physical event dates (optional)
          start_at,
          end_at,
          // App availability dates (required)
          app_start_at,
          app_end_at,
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
    // Physical event dates (optional)
    if (start_at !== undefined) updates.start_at = start_at || null;
    if (end_at !== undefined) updates.end_at = end_at || null;
    if (location !== undefined) updates.location = location || null;
    // App availability dates
    if (app_start_at) updates.app_start_at = app_start_at;
    if (app_end_at) updates.app_end_at = app_end_at;
    // Theme
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

    // Validate physical event dates if provided
    if (updates.start_at || updates.end_at) {
      const start = new Date(updates.start_at || event.start_at);
      const end = new Date(updates.end_at || event.end_at);

      if (start && end && end <= start) {
        throw new ValidationError('La date de fin de l\'événement doit être après la date de début');
      }
    }

    // Validate app availability dates if provided
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
    delete updatedEvent.access_password_hash;
    
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

    // Check if user is registered
    const registration = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (!registration) {
      throw new NotFoundError('Ce participant n\'est pas inscrit à cet événement');
    }

    if (action === 'delete') {
      // SUPPRESSION COMPLETE : comme s'il n'avait jamais existé
      // Delete all matches and their messages
      await MatchModel.deleteUserMatchesInEvent(userId, eventId);
      // Delete all likes/swipes
      await MatchModel.deleteUserLikesInEvent(userId, eventId);
      // Remove registration (with profil_info)
      await RegistrationModel.delete(userId, eventId);

      return success(res, null, 'Participant supprimé définitivement');
    } else {
      // BLOCAGE : données persistantes, accès bloqué
      // Archive matches (read-only conversations)
      await MatchModel.archiveUserMatchesInEvent(userId, eventId);
      // Keep registration but block user
      await BlockedUserModel.block(eventId, userId, 'Bloqué par l\'organisateur');

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

    // Check if already blocked
    const isBlocked = await BlockedUserModel.isBlocked(eventId, user_id);
    if (isBlocked) {
      throw new ConflictError('Cet utilisateur est déjà bloqué');
    }

    // Archive matches if they exist
    await MatchModel.archiveUserMatchesInEvent(user_id, eventId);

    // Block the user
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

    // Unblock user
    await BlockedUserModel.unblock(eventId, userId);

    // Unarchive matches so conversations work again
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

    // Check if user is blocked from this event
    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      throw new ForbiddenError('Vous n\'êtes plus autorisé à vous inscrire à cet événement');
    }

    // Check whitelist if enabled
    if (event.has_whitelist) {
      const user = await UserModel.findById(userId);
      const isWhitelisted = await WhitelistModel.isWhitelisted(eventId, user.tel);
      if (!isWhitelisted) {
        throw new ForbiddenError('Vous n\'êtes pas autorisé à accéder à cet événement');
      }
      // Link user to whitelist entry
      await WhitelistModel.linkUser(user.tel, userId);
    }

    if (event.has_password_access) {
      if (!access_password) {
        throw new ValidationError('Un mot de passe est requis pour accéder à cet événement');
      }
      const validPassword = await bcrypt.compare(access_password, event.access_password_hash);
      if (!validPassword) {
        throw new ValidationError('Mot de passe incorrect');
      }
    }

    const existing = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (existing) {
      throw new ConflictError('Vous êtes déjà inscrit à cet événement');
    }
  
    if (event.max_participants) {
      const currentCount = await EventModel.countParticipants(eventId);
      if (currentCount >= event.max_participants) {
        throw new ConflictError('L\'événement a atteint le nombre maximum de participants');
      }
    }
  
    if (event.custom_fields && Array.isArray(event.custom_fields) && event.custom_fields.length > 0) {
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
  
    const registration = await RegistrationModel.create(userId, eventId, profil_info || {});

    // Emit user joined event via Socket.io (use getUserBasicInfo to include photos)
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

    // Check if user is blocked
    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      throw new ForbiddenError('Vous ne pouvez plus modifier votre profil sur cet événement');
    }

    // Validate custom data if event has custom fields
    if (event.custom_fields && Array.isArray(event.custom_fields) && event.custom_fields.length > 0) {
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
      limit: limit ? parseInt(limit) : 20,
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
      limit: limit ? parseInt(limit) : 20,
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

    const statistics = await EventModel.getEventStatistics(eventId);

    return success(res, {
      event: {
        id: event.id,
        name: event.name,
        has_whitelist: event.has_whitelist
      },
      statistics
    });
  }
};