import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret';

  return {
    EventModel: {
      create: vi.fn(),
      findById: vi.fn(),
      findByOrgaId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      countParticipants: vi.fn(),
      findByIdForUpdate: vi.fn(),
      getAccessPasswordHash: vi.fn(),
      getEventRawStatistics: vi.fn(),
    },
    RegistrationModel: {
      findByUserAndEvent: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    UserModel: {
      findById: vi.fn(),
    },
    WhitelistModel: {
      isWhitelisted: vi.fn(),
      linkUser: vi.fn(),
    },
    MatchModel: {
      getUserBasicInfo: vi.fn(),
      deleteUserMatchesInEvent: vi.fn(),
      deleteUserLikesInEvent: vi.fn(),
      archiveUserMatchesInEvent: vi.fn(),
      unarchiveUserMatchesInEvent: vi.fn(),
    },
    BlockedUserModel: {
      isBlocked: vi.fn(),
      block: vi.fn(),
      unblock: vi.fn(),
    },
    argon2Hash: vi.fn(),
    argon2Verify: vi.fn(),
    validateCustomFields: vi.fn(),
    validateCustomData: vi.fn(),
    getCache: vi.fn(),
    setCache: vi.fn(),
    withTransaction: vi.fn(),
    deleteEventDir: vi.fn(),
    emitUserJoinedEvent: vi.fn(),
  };
});

vi.mock('../../models/event.model.js', () => ({ EventModel: mocks.EventModel }));
vi.mock('../../models/registration.model.js', () => ({ RegistrationModel: mocks.RegistrationModel }));
vi.mock('../../models/user.model.js', () => ({ UserModel: mocks.UserModel }));
vi.mock('../../models/whitelist.model.js', () => ({ WhitelistModel: mocks.WhitelistModel }));
vi.mock('../../models/match.model.js', () => ({ MatchModel: mocks.MatchModel }));
vi.mock('../../models/blockedUser.model.js', () => ({ BlockedUserModel: mocks.BlockedUserModel }));

vi.mock('argon2', () => ({
  default: { hash: mocks.argon2Hash, verify: mocks.argon2Verify },
}));

vi.mock('../../utils/customFieldsSchema.js', () => ({
  validateCustomFields: mocks.validateCustomFields,
  validateCustomData: mocks.validateCustomData,
}));

vi.mock('../../utils/cache.js', () => ({
  getCache: mocks.getCache,
  setCache: mocks.setCache,
}));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return actual;
});

vi.mock('../../config/database.js', () => ({
  withTransaction: mocks.withTransaction,
}));

vi.mock('../../config/multer.config.js', () => ({
  deleteEventDir: mocks.deleteEventDir,
}));

vi.mock('../../socket/emitters.js', () => ({
  emitUserJoinedEvent: mocks.emitUserJoinedEvent,
}));

vi.mock('pg', () => ({
  Pool: class { query = vi.fn(); connect = vi.fn(); on = vi.fn(); },
}));
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

import { EventService } from '../../services/event.service';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.withTransaction.mockImplementation(async (cb: Function) => cb({}));
});

describe('EventService', () => {
  // ────────────────────────────────────────────────────────────────────
  // createEvent
  // ────────────────────────────────────────────────────────────────────
  describe('createEvent', () => {
    const validData = {
      name: 'Party',
      description: 'Fun event',
      app_start_at: '2025-06-01T10:00:00Z',
      app_end_at: '2025-06-02T10:00:00Z',
      start_at: '2025-06-01T12:00:00Z',
      end_at: '2025-06-01T22:00:00Z',
      max_participants: 50,
      is_public: true,
    };

    it('creates an event and hashes password when has_password_access', async () => {
      const data = { ...validData, has_password_access: true, access_password: 'secret123' };
      mocks.argon2Hash.mockResolvedValue('$argon2hash$');
      mocks.EventModel.create.mockResolvedValue({ id: 1, name: 'Party' });

      const result = await EventService.createEvent(1, data);

      expect(mocks.argon2Hash).toHaveBeenCalledWith('secret123');
      expect(mocks.EventModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orga_id: 1,
          name: 'Party',
          access_password_hash: '$argon2hash$',
        }),
      );
      expect(result).toEqual({ id: 1, name: 'Party' });
    });

    it('throws when app dates are missing', async () => {
      await expect(
        EventService.createEvent(1, { ...validData, app_start_at: undefined, app_end_at: undefined })
      ).rejects.toThrow("Les dates de disponibilité de l'app sont requises");
    });

    it('throws when app_end_at is before app_start_at', async () => {
      await expect(
        EventService.createEvent(1, {
          ...validData,
          app_start_at: '2025-06-05T00:00:00Z',
          app_end_at: '2025-06-01T00:00:00Z',
        })
      ).rejects.toThrow("La date de fin de l'app doit");
    });

    it('throws when event end_at is before start_at', async () => {
      await expect(
        EventService.createEvent(1, {
          ...validData,
          start_at: '2025-06-10T10:00:00Z',
          end_at: '2025-06-01T10:00:00Z',
        })
      ).rejects.toThrow("La date de fin de l'événement doit");
    });

    it('throws when has_password_access but no password', async () => {
      await expect(
        EventService.createEvent(1, { ...validData, has_password_access: true })
      ).rejects.toThrow('Un mot de passe est requis');
    });

    it('validates custom_fields when provided', async () => {
      const customFields = [{ label: 'Age', type: 'number', required: true }];
      mocks.EventModel.create.mockResolvedValue({ id: 3 });

      await EventService.createEvent(1, { ...validData, custom_fields: customFields });

      expect(mocks.validateCustomFields).toHaveBeenCalledWith(customFields);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // updateEvent
  // ────────────────────────────────────────────────────────────────────
  describe('updateEvent', () => {
    const existingEvent = {
      id: 1, orga_id: 1, name: 'Old Name',
      start_at: '2025-06-01T10:00:00Z', end_at: '2025-06-01T22:00:00Z',
      app_start_at: '2025-05-25T00:00:00Z', app_end_at: '2025-06-01T23:59:59Z',
    };

    it('builds updates and calls EventModel.update', async () => {
      mocks.EventModel.findById.mockResolvedValue(existingEvent);
      mocks.EventModel.update.mockResolvedValue({ id: 1, name: 'New Name' });

      const result = await EventService.updateEvent(1, 1, { name: 'New Name' });

      expect(mocks.EventModel.update).toHaveBeenCalledWith(1, { name: 'New Name' });
      expect(result).toEqual({ id: 1, name: 'New Name' });
    });

    it('hashes access_password when provided', async () => {
      mocks.EventModel.findById.mockResolvedValue(existingEvent);
      mocks.argon2Hash.mockResolvedValue('$newhash$');
      mocks.EventModel.update.mockResolvedValue({ id: 1 });

      await EventService.updateEvent(1, 1, { access_password: 'newpass' });

      expect(mocks.argon2Hash).toHaveBeenCalledWith('newpass');
      expect(mocks.EventModel.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ access_password_hash: '$newhash$' }),
      );
    });

    it('throws ValidationError when no updates provided', async () => {
      mocks.EventModel.findById.mockResolvedValue(existingEvent);

      await expect(EventService.updateEvent(1, 1, {})).rejects.toThrow('Aucune donnée à mettre à jour');
    });

    it('throws NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValue(null);

      await expect(EventService.updateEvent(1, 1, { name: 'X' })).rejects.toThrow('non trouvé');
    });

    it('throws ForbiddenError when user does not own event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...existingEvent, orga_id: 999 });

      await expect(EventService.updateEvent(1, 1, { name: 'X' })).rejects.toThrow('vos propres');
    });

    it('throws when updated app dates are invalid', async () => {
      mocks.EventModel.findById.mockResolvedValue(existingEvent);

      await expect(
        EventService.updateEvent(1, 1, {
          app_start_at: '2025-07-01T00:00:00Z',
          app_end_at: '2025-06-01T00:00:00Z',
        })
      ).rejects.toThrow("La date de fin de l'app doit");
    });

    it('throws when updated event dates are invalid', async () => {
      mocks.EventModel.findById.mockResolvedValue(existingEvent);

      await expect(
        EventService.updateEvent(1, 1, {
          start_at: '2025-07-10T00:00:00Z',
          end_at: '2025-07-01T00:00:00Z',
        })
      ).rejects.toThrow("La date de fin de l'événement doit");
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // deleteEvent
  // ────────────────────────────────────────────────────────────────────
  describe('deleteEvent', () => {
    it('deletes event directory and event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.EventModel.delete.mockResolvedValue(undefined);

      await EventService.deleteEvent(1, 1);

      expect(mocks.deleteEventDir).toHaveBeenCalledWith(1);
      expect(mocks.EventModel.delete).toHaveBeenCalledWith(1);
    });

    it('throws NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValue(null);

      await expect(EventService.deleteEvent(1, 1)).rejects.toThrow('non trouvé');
    });

    it('throws ForbiddenError when user does not own event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 999 });

      await expect(EventService.deleteEvent(1, 1)).rejects.toThrow('vos propres');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // registerUser
  // ────────────────────────────────────────────────────────────────────
  describe('registerUser', () => {
    const publicEvent = {
      id: 1, name: 'Party', orga_id: 10, is_public: true,
      has_whitelist: false, has_password_access: false,
      max_participants: null, custom_fields: [],
    };

    it('registers user to a public event', async () => {
      mocks.EventModel.findById.mockResolvedValue(publicEvent);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      const registration = { user_id: 1, event_id: 1 };
      mocks.RegistrationModel.create.mockResolvedValue(registration);
      mocks.MatchModel.getUserBasicInfo.mockResolvedValue({
        id: 1, firstname: 'John', lastname: 'Doe', photos: ['photo1.jpg'],
      });

      const result = await EventService.registerUser(1, 1, {});

      expect(mocks.RegistrationModel.create).toHaveBeenCalledWith(1, 1, {}, {});
      expect(mocks.emitUserJoinedEvent).toHaveBeenCalledWith(1, {
        id: 1, firstname: 'John', lastname: 'Doe', photos: ['photo1.jpg'],
      });
      expect(result).toEqual(registration);
    });

    it('throws ForbiddenError for non-public event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, is_public: false });

      await expect(EventService.registerUser(1, 1, {})).rejects.toThrow("n'est pas public");
    });

    it('throws ForbiddenError when user is blocked', async () => {
      mocks.EventModel.findById.mockResolvedValue(publicEvent);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(true);

      await expect(EventService.registerUser(1, 1, {})).rejects.toThrow("plus autorisé");
    });

    it('checks whitelist and throws ForbiddenError when not whitelisted', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, has_whitelist: true });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.UserModel.findById.mockResolvedValue({ id: 1, tel: '+33612345678' });
      mocks.WhitelistModel.isWhitelisted.mockResolvedValue(false);

      await expect(EventService.registerUser(1, 1, {})).rejects.toThrow("pas autorisé à accéder");
    });

    it('links user to whitelist when whitelisted', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, has_whitelist: true });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.UserModel.findById.mockResolvedValue({ id: 1, tel: '+33612345678' });
      mocks.WhitelistModel.isWhitelisted.mockResolvedValue(true);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      mocks.RegistrationModel.create.mockResolvedValue({ user_id: 1, event_id: 1 });
      mocks.MatchModel.getUserBasicInfo.mockResolvedValue({
        id: 1, firstname: 'J', lastname: 'D', photos: [],
      });

      await EventService.registerUser(1, 1, {});

      expect(mocks.WhitelistModel.linkUser).toHaveBeenCalledWith('+33612345678', 1);
    });

    it('verifies password and throws on wrong password', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, has_password_access: true });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.EventModel.getAccessPasswordHash.mockResolvedValue('$hash$');
      mocks.argon2Verify.mockResolvedValue(false);

      await expect(
        EventService.registerUser(1, 1, { access_password: 'wrong' })
      ).rejects.toThrow('Mot de passe incorrect');
    });

    it('throws when password required but not provided', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, has_password_access: true });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);

      await expect(
        EventService.registerUser(1, 1, {})
      ).rejects.toThrow('Un mot de passe est requis');
    });

    it('throws ConflictError when already registered', async () => {
      mocks.EventModel.findById.mockResolvedValue(publicEvent);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue({ user_id: 1, event_id: 1 });

      await expect(EventService.registerUser(1, 1, {})).rejects.toThrow('déjà inscrit');
    });

    it('uses withTransaction and checks max_participants race condition', async () => {
      const limitedEvent = { ...publicEvent, max_participants: 50 };
      mocks.EventModel.findById.mockResolvedValue(limitedEvent);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      mocks.EventModel.findByIdForUpdate.mockResolvedValue({ max_participants: 50 });
      mocks.EventModel.countParticipants.mockResolvedValue(30);
      mocks.RegistrationModel.create.mockResolvedValue({ user_id: 1, event_id: 1 });
      mocks.MatchModel.getUserBasicInfo.mockResolvedValue({
        id: 1, firstname: 'J', lastname: 'D', photos: [],
      });

      await EventService.registerUser(1, 1, {});

      expect(mocks.withTransaction).toHaveBeenCalled();
      expect(mocks.EventModel.findByIdForUpdate).toHaveBeenCalledWith(1, {});
      expect(mocks.EventModel.countParticipants).toHaveBeenCalledWith(1, {});
    });

    it('throws ConflictError when event is full', async () => {
      const limitedEvent = { ...publicEvent, max_participants: 50 };
      mocks.EventModel.findById.mockResolvedValue(limitedEvent);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      mocks.EventModel.findByIdForUpdate.mockResolvedValue({ max_participants: 50 });
      mocks.EventModel.countParticipants.mockResolvedValue(50);

      await expect(EventService.registerUser(1, 1, {})).rejects.toThrow(
        'nombre maximum de participants',
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // checkEligibility
  // ────────────────────────────────────────────────────────────────────
  describe('checkEligibility', () => {
    const publicEvent = {
      id: 1, is_public: true, has_whitelist: false,
      has_password_access: false, max_participants: null,
      custom_fields: [{ label: 'Age', type: 'number' }],
    };

    it('returns eligible:true when all checks pass', async () => {
      mocks.EventModel.findById.mockResolvedValue(publicEvent);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);

      const result = await EventService.checkEligibility(1, 1);

      expect(result).toEqual({
        eligible: true,
        requires_password: false,
        custom_fields: publicEvent.custom_fields,
      });
    });

    it('returns already_registered', async () => {
      mocks.EventModel.findById.mockResolvedValue(publicEvent);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue({ user_id: 1 });

      const result = await EventService.checkEligibility(1, 1);
      expect(result).toEqual(expect.objectContaining({ eligible: false, reason: 'already_registered' }));
    });

    it('returns not_public', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, is_public: false });
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);

      const result = await EventService.checkEligibility(1, 1);
      expect(result).toEqual(expect.objectContaining({ eligible: false, reason: 'not_public' }));
    });

    it('returns blocked', async () => {
      mocks.EventModel.findById.mockResolvedValue(publicEvent);
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(true);

      const result = await EventService.checkEligibility(1, 1);
      expect(result).toEqual(expect.objectContaining({ eligible: false, reason: 'blocked' }));
    });

    it('returns not_whitelisted', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, has_whitelist: true });
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.UserModel.findById.mockResolvedValue({ id: 1, tel: '+33600000000' });
      mocks.WhitelistModel.isWhitelisted.mockResolvedValue(false);

      const result = await EventService.checkEligibility(1, 1);
      expect(result).toEqual(expect.objectContaining({ eligible: false, reason: 'not_whitelisted' }));
    });

    it('returns full', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...publicEvent, max_participants: 50 });
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);
      mocks.EventModel.countParticipants.mockResolvedValue(50);

      const result = await EventService.checkEligibility(1, 1);
      expect(result).toEqual(expect.objectContaining({ eligible: false, reason: 'full' }));
    });

    it('throws NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValue(null);

      await expect(EventService.checkEligibility(1, 1)).rejects.toThrow('non trouvé');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // computeStatistics
  // ────────────────────────────────────────────────────────────────────
  describe('computeStatistics', () => {
    const event = { id: 1, name: 'Party', orga_id: 1, has_whitelist: false };

    const rawStats = {
      participants: 100,
      whitelist: { total_active: '50', registered: '30', pending: '15', removed: '5' },
      matches: { total_matches: '40' },
      likes: { likes: '200', total_swipes: '500', passes: '300', users_who_swiped: '80' },
      messages: { total_messages: '1000', users_who_sent: '60', conversations_with_messages: '35' },
      activeUsers: 75,
    };

    it('returns cached result when available', async () => {
      mocks.EventModel.findById.mockResolvedValue(event);
      const cached = { event: { id: 1 }, statistics: {} };
      mocks.getCache.mockReturnValue(cached);

      const result = await EventService.computeStatistics(1, 1);

      expect(result).toBe(cached);
      expect(mocks.EventModel.getEventRawStatistics).not.toHaveBeenCalled();
    });

    it('computes statistics from raw data and caches them', async () => {
      mocks.EventModel.findById.mockResolvedValue(event);
      mocks.getCache.mockReturnValue(null);
      mocks.EventModel.getEventRawStatistics.mockResolvedValue(rawStats);

      const result = await EventService.computeStatistics(1, 1);

      expect(mocks.setCache).toHaveBeenCalledWith(
        'stats:1',
        expect.objectContaining({
          event: { id: 1, name: 'Party', has_whitelist: false },
          statistics: expect.objectContaining({
            participants: expect.objectContaining({
              total: 100, active: 75, engagement_rate: 75,
            }),
            matching: expect.objectContaining({
              total_matches: 40, reciprocity_rate: 40,
            }),
            swipes: expect.objectContaining({
              total: 500, likes: 200, passes: 300, like_rate: 40,
            }),
            messages: expect.objectContaining({
              total: 1000, conversations_active: 35,
            }),
          }),
        }),
        30000,
      );
      expect(result).toEqual(expect.objectContaining({ event: { id: 1, name: 'Party', has_whitelist: false } }));
    });

    it('throws NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValue(null);

      await expect(EventService.computeStatistics(1, 1)).rejects.toThrow('non trouvé');
    });

    it('throws ForbiddenError when user does not own event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ ...event, orga_id: 999 });

      await expect(EventService.computeStatistics(1, 1)).rejects.toThrow('non autorisé');
    });

    it('handles zero participants without division errors', async () => {
      mocks.EventModel.findById.mockResolvedValue(event);
      mocks.getCache.mockReturnValue(null);
      mocks.EventModel.getEventRawStatistics.mockResolvedValue({
        participants: 0,
        whitelist: { total_active: '0', registered: '0', pending: '0', removed: '0' },
        matches: { total_matches: '0' },
        likes: { likes: '0', total_swipes: '0', passes: '0', users_who_swiped: '0' },
        messages: { total_messages: '0', users_who_sent: '0', conversations_with_messages: '0' },
        activeUsers: 0,
      });

      const result = await EventService.computeStatistics(1, 1) as any;

      expect(result.statistics.participants.engagement_rate).toBe(0);
      expect(result.statistics.matching.reciprocity_rate).toBe(0);
      expect(result.statistics.swipes.like_rate).toBe(0);
      expect(result.statistics.messages.average_per_conversation).toBe(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // removeParticipant
  // ────────────────────────────────────────────────────────────────────
  describe('removeParticipant', () => {
    it('deletes participant with action=delete', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue({ user_id: 5, event_id: 1 });

      const message = await EventService.removeParticipant(1, 1, 5, 'delete');

      expect(mocks.withTransaction).toHaveBeenCalled();
      expect(message).toContain('supprimé');
    });

    it('blocks participant with action=block', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue({ user_id: 5, event_id: 1 });

      const message = await EventService.removeParticipant(1, 1, 5, 'block');

      expect(mocks.withTransaction).toHaveBeenCalled();
      expect(message).toContain('bloqué');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // blockUser / unblockUser
  // ────────────────────────────────────────────────────────────────────
  describe('blockUser', () => {
    it('blocks user when not already blocked', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);

      await EventService.blockUser(1, 1, 5, 'spam');

      expect(mocks.MatchModel.archiveUserMatchesInEvent).toHaveBeenCalledWith(5, 1);
      expect(mocks.BlockedUserModel.block).toHaveBeenCalledWith(1, 5, 'spam');
    });

    it('throws ConflictError when already blocked', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(true);

      await expect(EventService.blockUser(1, 1, 5)).rejects.toThrow('déjà bloqué');
    });
  });

  describe('unblockUser', () => {
    it('unblocks user and unarchives matches', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(true);

      await EventService.unblockUser(1, 1, 5);

      expect(mocks.BlockedUserModel.unblock).toHaveBeenCalledWith(1, 5);
      expect(mocks.MatchModel.unarchiveUserMatchesInEvent).toHaveBeenCalledWith(5, 1);
    });

    it('throws NotFoundError when not blocked', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.BlockedUserModel.isBlocked.mockResolvedValue(false);

      await expect(EventService.unblockUser(1, 1, 5)).rejects.toThrow("n'est pas bloqué");
    });
  });
});
