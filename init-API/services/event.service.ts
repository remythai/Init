import argon2 from 'argon2';
import { EventModel } from '../models/event.model.js';
import { RegistrationModel } from '../models/registration.model.js';
import { UserModel } from '../models/user.model.js';
import { WhitelistModel } from '../models/whitelist.model.js';
import { MatchModel } from '../models/match.model.js';
import { BlockedUserModel } from '../models/blockedUser.model.js';
import { ValidationError, NotFoundError, ForbiddenError, ConflictError } from '../utils/errors.js';
import { validateCustomFields, validateCustomData } from '../utils/customFieldsSchema.js';
import { emitUserJoinedEvent } from '../socket/emitters.js';
import { deleteEventDir } from '../config/multer.config.js';
import { withTransaction } from '../config/database.js';
import { getCache, setCache } from '../utils/cache.js';

export const EventService = {
  async createEvent(orgaId: number, data: Record<string, unknown>): Promise<unknown> {
    const {
      name, description, start_at, end_at, location,
      max_participants, is_public, has_whitelist, has_link_access,
      has_password_access, access_password, cooldown, custom_fields,
      app_start_at, app_end_at, theme
    } = data;

    if (!app_start_at || !app_end_at) {
      throw new ValidationError('Les dates de disponibilité de l\'app sont requises');
    }
    if (!app_end_at) {
      throw new ValidationError('Le champ app_end_at est requis');
    }

    const appStart = new Date(app_start_at as string);
    const appEnd = new Date(app_end_at as string);

    if (isNaN(appStart.getTime())) {
      throw new ValidationError('Le champ app_start_at contient une date invalide');
    }
    if (isNaN(appEnd.getTime())) {
      throw new ValidationError('Le champ app_end_at contient une date invalide');
    }

    if (appEnd <= appStart) {
      throw new ValidationError('La date de fin de l\'app doit être après la date de début');
    }

    if (start_at && end_at) {
      const physicalStart = new Date(start_at as string);
      const physicalEnd = new Date(end_at as string);
      if (physicalEnd <= physicalStart) {
        throw new ValidationError('La date de fin de l\'événement doit être après la date de début');
      }
    }

    let access_password_hash = null;
    if (has_password_access && access_password) {
      access_password_hash = await argon2.hash(access_password as string);
    } else if (has_password_access && !access_password) {
      throw new ValidationError('Un mot de passe est requis quand has_password_access est activé');
    }

    if (custom_fields) {
      validateCustomFields(custom_fields as unknown[]);
    }

    return EventModel.create({
      orga_id: orgaId,
      name: name as string,
      description: (description as string) || ' ',
      start_at: (start_at as string) || undefined,
      end_at: (end_at as string) || undefined,
      location: (location as string) || undefined,
      app_start_at: app_start_at as string,
      app_end_at: app_end_at as string,
      theme: (theme as string) || 'général',
      max_participants: max_participants as number | undefined,
      is_public: is_public !== undefined ? is_public as boolean : true,
      has_whitelist: (has_whitelist as boolean) || false,
      has_link_access: (has_link_access as boolean) || false,
      has_password_access: (has_password_access as boolean) || false,
      access_password_hash: access_password_hash as string | undefined,
      cooldown: cooldown as string | undefined,
      custom_fields: (custom_fields as import('../types/index.js').CustomFieldDefinition[]) || []
    });
  },

  async updateEvent(orgaId: number, eventId: number, data: Record<string, unknown>): Promise<unknown> {
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez modifier que vos propres événements');
    }

    const {
      name, description, start_at, end_at, location,
      app_start_at, app_end_at, theme,
      max_participants, is_public, has_whitelist, has_link_access,
      has_password_access, access_password, cooldown, custom_fields
    } = data;

    const updates: Record<string, unknown> = {};

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
      updates.access_password_hash = await argon2.hash(access_password as string);
    }

    if (custom_fields) {
      validateCustomFields(custom_fields as unknown[]);
      updates.custom_fields = custom_fields;
    }

    if (updates.start_at || updates.end_at) {
      const start = new Date((updates.start_at || event.start_at) as string);
      const end = new Date((updates.end_at || event.end_at) as string);

      if (start && end && end <= start) {
        throw new ValidationError('La date de fin de l\'événement doit être après la date de début');
      }
    }

    if (updates.app_start_at || updates.app_end_at) {
      const appStart = new Date((updates.app_start_at || event.app_start_at) as string);
      const appEnd = new Date((updates.app_end_at || event.app_end_at) as string);

      if (appEnd <= appStart) {
        throw new ValidationError('La date de fin de l\'app doit être après la date de début');
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new ValidationError('Aucune donnée à mettre à jour');
    }

    return EventModel.update(eventId, updates);
  },

  async deleteEvent(orgaId: number, eventId: number): Promise<void> {
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez supprimer que vos propres événements');
    }

    deleteEventDir(eventId);
    await EventModel.delete(eventId);
  },

  async getOrgaEvent(orgaId: number, eventId: number): Promise<unknown> {
    const event = await EventModel.findById(eventId);

    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez consulter que vos propres événements');
    }

    return {
      ...event,
      participant_count: await EventModel.countParticipants(event.id),
    };
  },

  async getOrgaEvents(orgaId: number, limit: number = 50, offset: number = 0): Promise<unknown[]> {
    const events = await EventModel.findByOrgaId(orgaId, limit, offset) as Array<Record<string, unknown>>;

    return Promise.all(
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
          participant_count: await EventModel.countParticipants(event.id as number)
        };
      })
    );
  },

  async registerUser(userId: number, eventId: number, data: Record<string, unknown>): Promise<unknown> {
    const { profil_info, access_password } = data;

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
      const isWhitelisted = await WhitelistModel.isWhitelisted(eventId, user!.tel);
      if (!isWhitelisted) {
        throw new ForbiddenError('Vous n\'êtes pas autorisé à accéder à cet événement');
      }
      await WhitelistModel.linkUser(user!.tel, userId);
    }

    if (event.has_password_access) {
      if (!access_password) {
        throw new ValidationError('Un mot de passe est requis pour accéder à cet événement');
      }
      const hash = await EventModel.getAccessPasswordHash(eventId);
      let validPassword = false;
      try {
        if (hash) {
          validPassword = await argon2.verify(hash, access_password as string);
        }
      } catch {}
      if (!validPassword) {
        throw new ValidationError('Mot de passe incorrect');
      }
    }

    const existing = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (existing) {
      throw new ConflictError('Vous êtes déjà inscrit à cet événement');
    }

    if (event.custom_fields?.length > 0) {
      const requiredFields = event.custom_fields.filter((field: Record<string, unknown>) => field.required);

      if (requiredFields.length > 0) {
        if (!profil_info || Object.keys(profil_info as Record<string, unknown>).length === 0) {
          throw new ValidationError('Les informations de profil sont requises pour cet événement');
        }
        validateCustomData(event.custom_fields, profil_info as Record<string, unknown>);
      } else if (profil_info && Object.keys(profil_info as Record<string, unknown>).length > 0) {
        validateCustomData(event.custom_fields, profil_info as Record<string, unknown>);
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
      return await RegistrationModel.create(userId, eventId, (profil_info as Record<string, unknown>) || {}, client);
    });

    const userWithPhotos = await MatchModel.getUserBasicInfo(userId) as { id: number; firstname: string; lastname: string; photos?: unknown[] };
    emitUserJoinedEvent(eventId, {
      id: userWithPhotos.id,
      firstname: userWithPhotos.firstname,
      lastname: userWithPhotos.lastname,
      photos: userWithPhotos.photos || []
    });

    return registration;
  },

  async updateRegistration(userId: number, eventId: number, data: Record<string, unknown>): Promise<unknown> {
    const { profil_info } = data;

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
      if (profil_info && Object.keys(profil_info as Record<string, unknown>).length > 0) {
        validateCustomData(event.custom_fields, profil_info as Record<string, unknown>);
      }
    }

    return RegistrationModel.update(userId, eventId, (profil_info as Record<string, unknown>) || {});
  },

  async checkEligibility(userId: number, eventId: number): Promise<Record<string, unknown>> {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    const existing = await RegistrationModel.findByUserAndEvent(userId, eventId);
    if (existing) {
      return {
        eligible: false,
        reason: 'already_registered',
        message: 'Vous êtes déjà inscrit à cet événement'
      };
    }

    if (!event.is_public) {
      return {
        eligible: false,
        reason: 'not_public',
        message: 'Cet événement n\'est pas public'
      };
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      return {
        eligible: false,
        reason: 'blocked',
        message: 'Vous n\'êtes plus autorisé à vous inscrire à cet événement'
      };
    }

    if (event.has_whitelist) {
      const user = await UserModel.findById(userId);
      const isWhitelisted = await WhitelistModel.isWhitelisted(eventId, user!.tel);
      if (!isWhitelisted) {
        return {
          eligible: false,
          reason: 'not_whitelisted',
          message: 'Vous n\'êtes pas sur la liste des participants autorisés pour cet événement'
        };
      }
    }

    if (event.max_participants) {
      const currentCount = await EventModel.countParticipants(eventId);
      if (currentCount >= event.max_participants) {
        return {
          eligible: false,
          reason: 'full',
          message: 'L\'événement a atteint le nombre maximum de participants'
        };
      }
    }

    return {
      eligible: true,
      requires_password: event.has_password_access,
      custom_fields: event.custom_fields || []
    };
  },

  async computeStatistics(orgaId: number, eventId: number): Promise<Record<string, unknown>> {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const cacheKey = `stats:${eventId}`;
    const cached = getCache<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const raw = await EventModel.getEventRawStatistics(eventId);

    const { participants, whitelist, matches, messages, likes, activeUsers } = raw;

    const totalMatches = parseInt(String(matches.total_matches || 0));
    const totalLikes = parseInt(String(likes.likes || 0));
    const totalSwipes = parseInt(String(likes.total_swipes || 0));
    const totalMessages = parseInt(String(messages.total_messages || 0));
    const conversationsWithMessages = parseInt(String(messages.conversations_with_messages || 0));

    const statistics = {
      participants: {
        total: participants,
        active: activeUsers,
        engagement_rate: participants > 0 ? Math.round((activeUsers / participants) * 100) : 0
      },
      whitelist: {
        total: parseInt(String(whitelist.total_active || 0)),
        registered: parseInt(String(whitelist.registered || 0)),
        pending: parseInt(String(whitelist.pending || 0)),
        removed: parseInt(String(whitelist.removed || 0)),
        conversion_rate: parseInt(String(whitelist.total_active || 0)) > 0
          ? Math.round((parseInt(String(whitelist.registered || 0)) / parseInt(String(whitelist.total_active || 0))) * 100)
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
        passes: parseInt(String(likes.passes || 0)),
        users_who_swiped: parseInt(String(likes.users_who_swiped || 0)),
        like_rate: totalSwipes > 0 ? Math.round((totalLikes / totalSwipes) * 100) : 0
      },
      messages: {
        total: totalMessages,
        users_who_sent: parseInt(String(messages.users_who_sent || 0)),
        conversations_active: conversationsWithMessages,
        average_per_conversation: totalMatches > 0 ? Math.round((totalMessages / totalMatches) * 10) / 10 : 0
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

    return result;
  },

  async removeParticipant(orgaId: number, eventId: number, userId: number, action: string): Promise<string> {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
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

      return 'Participant supprimé définitivement';
    } else {
      await withTransaction(async (client) => {
        await MatchModel.archiveUserMatchesInEvent(userId, eventId, client);
        await BlockedUserModel.block(eventId, userId, 'Bloqué par l\'organisateur', client);
      });

      return 'Participant bloqué de l\'événement';
    }
  },

  async blockUser(orgaId: number, eventId: number, userId: number, reason?: string): Promise<void> {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Accès non autorisé');
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (isBlocked) {
      throw new ConflictError('Cet utilisateur est déjà bloqué');
    }

    await MatchModel.archiveUserMatchesInEvent(userId, eventId);
    await BlockedUserModel.block(eventId, userId, reason || 'Bloqué par l\'organisateur');
  },

  async unblockUser(orgaId: number, eventId: number, userId: number): Promise<void> {
    const event = await EventModel.findById(eventId);
    if (!event) {
      throw new NotFoundError('Événement non trouvé');
    }

    if (event.orga_id !== orgaId) {
      throw new ForbiddenError('Vous ne pouvez débloquer que les utilisateurs de vos événements');
    }

    const isBlocked = await BlockedUserModel.isBlocked(eventId, userId);
    if (!isBlocked) {
      throw new NotFoundError('Cet utilisateur n\'est pas bloqué');
    }

    await BlockedUserModel.unblock(eventId, userId);
    await MatchModel.unarchiveUserMatchesInEvent(userId, eventId);
  }
};
