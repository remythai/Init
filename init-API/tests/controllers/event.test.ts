import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── hoisted: set env vars BEFORE any module loads ──────────────────────
const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    // Models (only used by simple controller methods)
    EventModel: {
      findById: vi.fn(),
      findByOrgaId: vi.fn(),
      update: vi.fn(),
      countParticipants: vi.fn(),
      findPublicEventsWithUserInfo: vi.fn(),
      findUserRegisteredEvents: vi.fn(),
    },
    RegistrationModel: {
      findByUserAndEvent: vi.fn(),
      findByEventId: vi.fn(),
      delete: vi.fn(),
    },
    BlockedUserModel: {
      getByEventId: vi.fn(),
    },

    // EventService
    EventService: {
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      getOrgaEvent: vi.fn(),
      getOrgaEvents: vi.fn(),
      registerUser: vi.fn(),
      updateRegistration: vi.fn(),
      checkEligibility: vi.fn(),
      computeStatistics: vi.fn(),
      removeParticipant: vi.fn(),
      blockUser: vi.fn(),
      unblockUser: vi.fn(),
    },

    // utils / config
    successFn: vi.fn(),
    createdFn: vi.fn(),
    getEventBannerUrl: vi.fn(),
    deleteEventBanner: vi.fn(),
  };
});

// ── mocks ──────────────────────────────────────────────────────────────
vi.mock('../../models/event.model.js', () => ({ EventModel: mocks.EventModel }));
vi.mock('../../models/registration.model.js', () => ({ RegistrationModel: mocks.RegistrationModel }));
vi.mock('../../models/blockedUser.model.js', () => ({ BlockedUserModel: mocks.BlockedUserModel }));

vi.mock('../../services/event.service.js', () => ({ EventService: mocks.EventService }));

vi.mock('../../utils/responses.js', () => ({
  success: mocks.successFn,
  created: mocks.createdFn,
}));

vi.mock('../../utils/errors.js', async () => {
  const actual = await vi.importActual<typeof import('../../utils/errors.js')>('../../utils/errors.js');
  return {
    ...actual,
    asyncHandler: (fn: Function) => fn,
  };
});

vi.mock('../../config/multer.config.js', () => ({
  getEventBannerUrl: mocks.getEventBannerUrl,
  deleteEventBanner: mocks.deleteEventBanner,
}));

// pg and dotenv (needed to avoid side-effect crashes on import)
vi.mock('pg', () => ({
  Pool: class { query = vi.fn(); connect = vi.fn(); on = vi.fn(); },
}));
vi.mock('dotenv', () => ({ default: { config: vi.fn() } }));

// ── import under test ──────────────────────────────────────────────────
import { EventController } from '../../controllers/event.controller';

// ── helpers ────────────────────────────────────────────────────────────
function makeReq(overrides: Record<string, any> = {}) {
  return {
    body: {},
    params: { id: '1' },
    query: {},
    user: { id: 1 },
    file: undefined as any,
    ...overrides,
  };
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// ── setup ──────────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════════════

describe('EventController', () => {
  // ────────────────────────────────────────────────────────────────────
  // create (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('create', () => {
    it('delegates to EventService.createEvent and calls created()', async () => {
      const body = { name: 'Party', app_start_at: '2025-06-01', app_end_at: '2025-06-02' };
      const createdEvent = { id: 1, name: 'Party' };
      mocks.EventService.createEvent.mockResolvedValue(createdEvent);

      const req = makeReq({ body });
      const res = makeRes();
      await EventController.create(req, res);

      expect(mocks.EventService.createEvent).toHaveBeenCalledWith(1, body);
      expect(mocks.createdFn).toHaveBeenCalledWith(res, createdEvent, expect.stringContaining('cr'));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // getEventByID (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('getEventByID', () => {
    it('delegates to EventService.getOrgaEvent', async () => {
      const eventWithCount = { id: 1, name: 'Party', participant_count: 25 };
      mocks.EventService.getOrgaEvent.mockResolvedValue(eventWithCount);

      const req = makeReq();
      const res = makeRes();
      await EventController.getEventByID(req, res);

      expect(mocks.EventService.getOrgaEvent).toHaveBeenCalledWith(1, 1);
      expect(mocks.successFn).toHaveBeenCalledWith(res, eventWithCount);
    });

    it('propagates NotFoundError from service', async () => {
      mocks.EventService.getOrgaEvent.mockRejectedValue(
        new (await import('../../utils/errors.js')).NotFoundError('Événement non trouvé')
      );

      const req = makeReq();
      const res = makeRes();
      await expect(EventController.getEventByID(req, res)).rejects.toThrow('non trouvé');
    });

    it('propagates ForbiddenError from service', async () => {
      mocks.EventService.getOrgaEvent.mockRejectedValue(
        new (await import('../../utils/errors.js')).ForbiddenError('Vous ne pouvez consulter que vos propres événements')
      );

      const req = makeReq();
      const res = makeRes();
      await expect(EventController.getEventByID(req, res)).rejects.toThrow('vos propres');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // update (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('update', () => {
    it('delegates to EventService.updateEvent', async () => {
      const updatedEvent = { id: 1, name: 'New Name' };
      mocks.EventService.updateEvent.mockResolvedValue(updatedEvent);

      const req = makeReq({ body: { name: 'New Name' } });
      const res = makeRes();
      await EventController.update(req, res);

      expect(mocks.EventService.updateEvent).toHaveBeenCalledWith(1, 1, { name: 'New Name' });
      expect(mocks.successFn).toHaveBeenCalledWith(res, updatedEvent, expect.stringContaining('mis à jour'));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // delete (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('delete', () => {
    it('delegates to EventService.deleteEvent', async () => {
      mocks.EventService.deleteEvent.mockResolvedValue(undefined);

      const req = makeReq();
      const res = makeRes();
      await EventController.delete(req, res);

      expect(mocks.EventService.deleteEvent).toHaveBeenCalledWith(1, 1);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, expect.stringContaining('supprimé'));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // register (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('register', () => {
    it('delegates to EventService.registerUser and calls created()', async () => {
      const registration = { user_id: 1, event_id: 1 };
      mocks.EventService.registerUser.mockResolvedValue(registration);

      const req = makeReq({ body: { profil_info: {} } });
      const res = makeRes();
      await EventController.register(req, res);

      expect(mocks.EventService.registerUser).toHaveBeenCalledWith(1, 1, { profil_info: {} });
      expect(mocks.createdFn).toHaveBeenCalledWith(res, registration, expect.stringContaining('Inscription'));
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // getStatistics (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('getStatistics', () => {
    it('delegates to EventService.computeStatistics', async () => {
      const result = { event: { id: 1 }, statistics: {} };
      mocks.EventService.computeStatistics.mockResolvedValue(result);

      const req = makeReq();
      const res = makeRes();
      await EventController.getStatistics(req, res);

      expect(mocks.EventService.computeStatistics).toHaveBeenCalledWith(1, 1);
      expect(mocks.successFn).toHaveBeenCalledWith(res, result);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // checkEligibility (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('checkEligibility', () => {
    it('delegates to EventService.checkEligibility', async () => {
      const result = { eligible: true, requires_password: false, custom_fields: [] };
      mocks.EventService.checkEligibility.mockResolvedValue(result);

      const req = makeReq();
      const res = makeRes();
      await EventController.checkEligibility(req, res);

      expect(mocks.EventService.checkEligibility).toHaveBeenCalledWith(1, 1);
      expect(mocks.successFn).toHaveBeenCalledWith(res, result);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // removeParticipant (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('removeParticipant', () => {
    it('delegates to EventService.removeParticipant with action from query', async () => {
      mocks.EventService.removeParticipant.mockResolvedValue('Participant supprimé définitivement');

      const req = makeReq({ params: { id: '1', userId: '5' }, query: { action: 'delete' } });
      const res = makeRes();
      await EventController.removeParticipant(req, res);

      expect(mocks.EventService.removeParticipant).toHaveBeenCalledWith(1, 1, 5, 'delete');
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Participant supprimé définitivement');
    });

    it('defaults to block action', async () => {
      mocks.EventService.removeParticipant.mockResolvedValue('Participant bloqué de l\'événement');

      const req = makeReq({ params: { id: '1', userId: '5' }, query: {} });
      const res = makeRes();
      await EventController.removeParticipant(req, res);

      expect(mocks.EventService.removeParticipant).toHaveBeenCalledWith(1, 1, 5, 'block');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // blockUser (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('blockUser', () => {
    it('delegates to EventService.blockUser', async () => {
      mocks.EventService.blockUser.mockResolvedValue(undefined);

      const req = makeReq({ body: { user_id: 5, reason: 'spam' } });
      const res = makeRes();
      await EventController.blockUser(req, res);

      expect(mocks.EventService.blockUser).toHaveBeenCalledWith(1, 1, 5, 'spam');
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Utilisateur bloqué');
    });

    it('throws ValidationError when user_id is missing', async () => {
      const req = makeReq({ body: {} });
      const res = makeRes();
      await expect(EventController.blockUser(req, res)).rejects.toThrow('user_id est requis');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // unblockParticipant (delegates to EventService)
  // ────────────────────────────────────────────────────────────────────
  describe('unblockParticipant', () => {
    it('delegates to EventService.unblockUser', async () => {
      mocks.EventService.unblockUser.mockResolvedValue(undefined);

      const req = makeReq({ params: { id: '1', userId: '5' } });
      const res = makeRes();
      await EventController.unblockParticipant(req, res);

      expect(mocks.EventService.unblockUser).toHaveBeenCalledWith(1, 1, 5);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, 'Utilisateur débloqué');
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Simple controller methods (not delegated)
  // ────────────────────────────────────────────────────────────────────
  describe('getParticipants', () => {
    it('returns participants for owned event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.RegistrationModel.findByEventId.mockResolvedValue([{ user_id: 2 }]);

      const req = makeReq();
      const res = makeRes();
      await EventController.getParticipants(req, res);

      expect(mocks.successFn).toHaveBeenCalledWith(res, [{ user_id: 2 }]);
    });

    it('throws NotFoundError when event does not exist', async () => {
      mocks.EventModel.findById.mockResolvedValue(null);

      const req = makeReq();
      const res = makeRes();
      await expect(EventController.getParticipants(req, res)).rejects.toThrow('non trouvé');
    });

    it('throws ForbiddenError when user does not own event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 999 });

      const req = makeReq();
      const res = makeRes();
      await expect(EventController.getParticipants(req, res)).rejects.toThrow('vos événements');
    });
  });

  describe('getBlockedUsers', () => {
    it('returns blocked users for owned event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.BlockedUserModel.getByEventId.mockResolvedValue([{ user_id: 3 }]);

      const req = makeReq();
      const res = makeRes();
      await EventController.getBlockedUsers(req, res);

      expect(mocks.successFn).toHaveBeenCalledWith(res, [{ user_id: 3 }]);
    });
  });

  describe('unregister', () => {
    it('deletes registration and returns success', async () => {
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue({ user_id: 1, event_id: 1 });
      mocks.RegistrationModel.delete.mockResolvedValue(undefined);

      const req = makeReq();
      const res = makeRes();
      await EventController.unregister(req, res);

      expect(mocks.RegistrationModel.delete).toHaveBeenCalledWith(1, 1);
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, expect.stringContaining('Désinscription'));
    });

    it('throws NotFoundError when not registered', async () => {
      mocks.RegistrationModel.findByUserAndEvent.mockResolvedValue(null);

      const req = makeReq();
      const res = makeRes();
      await expect(EventController.unregister(req, res)).rejects.toThrow('non trouvée');
    });
  });

  describe('uploadBanner', () => {
    it('uploads banner and updates event', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.getEventBannerUrl.mockReturnValue('/uploads/events/1/banner.png');
      mocks.EventModel.update.mockResolvedValue({ banner_path: '/uploads/events/1/banner.png' });

      const req = makeReq({ file: { filename: 'banner.png' } });
      const res = makeRes();
      await EventController.uploadBanner(req, res);

      expect(mocks.successFn).toHaveBeenCalledWith(
        res,
        { banner_path: '/uploads/events/1/banner.png' },
        expect.stringContaining('Bannière')
      );
    });

    it('throws ValidationError if no file', async () => {
      const req = makeReq({ file: undefined });
      const res = makeRes();
      await expect(EventController.uploadBanner(req, res)).rejects.toThrow('Aucun fichier');
    });
  });

  describe('deleteBanner', () => {
    it('deletes banner and sets path to null', async () => {
      mocks.EventModel.findById.mockResolvedValue({ id: 1, orga_id: 1 });
      mocks.EventModel.update.mockResolvedValue({ banner_path: null });

      const req = makeReq();
      const res = makeRes();
      await EventController.deleteBanner(req, res);

      expect(mocks.deleteEventBanner).toHaveBeenCalledWith(1);
      expect(mocks.EventModel.update).toHaveBeenCalledWith(1, { banner_path: null });
      expect(mocks.successFn).toHaveBeenCalledWith(res, null, expect.stringContaining('Bannière'));
    });
  });

  describe('updateRegistration', () => {
    it('delegates to EventService.updateRegistration', async () => {
      const updated = { user_id: 1, event_id: 1, profil_info: { age: 25 } };
      mocks.EventService.updateRegistration.mockResolvedValue(updated);

      const req = makeReq({ body: { profil_info: { age: 25 } } });
      const res = makeRes();
      await EventController.updateRegistration(req, res);

      expect(mocks.EventService.updateRegistration).toHaveBeenCalledWith(1, 1, { profil_info: { age: 25 } });
      expect(mocks.successFn).toHaveBeenCalledWith(res, updated, expect.stringContaining('Profil'));
    });
  });
});
