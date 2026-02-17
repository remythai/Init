import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret';

  return {
    // MatchModel (only for simple controller methods)
    getMatchById: vi.fn(),
    getMatchesByEvent: vi.fn(),
    getAllMatches: vi.fn(),
    getMessageById: vi.fn(),
    markMessageAsRead: vi.fn(),
    toggleMessageLike: vi.fn(),
    getMatchUserProfile: vi.fn(),

    // RegistrationModel
    findByUserAndEvent: vi.fn(),

    // EventModel
    eventFindById: vi.fn(),

    // BlockedUserModel
    isBlocked: vi.fn(),

    // MatchService
    MatchService: {
      getProfiles: vi.fn(),
      likeProfile: vi.fn(),
      passProfile: vi.fn(),
      getAllConversations: vi.fn(),
      getEventConversations: vi.fn(),
      getMessages: vi.fn(),
      sendMessage: vi.fn(),
    },

    // responses
    success: vi.fn(),
  };
});

vi.mock('../../models/match.model.js', () => ({
  MatchModel: {
    getMatchById: mocks.getMatchById,
    getMatchesByEvent: mocks.getMatchesByEvent,
    getAllMatches: mocks.getAllMatches,
    getMessageById: mocks.getMessageById,
    markMessageAsRead: mocks.markMessageAsRead,
    toggleMessageLike: mocks.toggleMessageLike,
    getMatchUserProfile: mocks.getMatchUserProfile,
  },
}));

vi.mock('../../models/registration.model.js', () => ({
  RegistrationModel: {
    findByUserAndEvent: mocks.findByUserAndEvent,
  },
}));

vi.mock('../../models/event.model.js', () => ({
  EventModel: {
    findById: mocks.eventFindById,
  },
}));

vi.mock('../../models/blockedUser.model.js', () => ({
  BlockedUserModel: {
    isBlocked: mocks.isBlocked,
  },
}));

vi.mock('../../services/match.service.js', () => ({
  MatchService: mocks.MatchService,
}));

vi.mock('../../utils/responses.js', () => ({
  success: mocks.success,
}));

import { MatchController } from '../../controllers/match.controller';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../../utils/errors.js';

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    user: { id: 1 },
    params: { id: '1', matchId: '1', eventId: '1', messageId: '1' },
    query: {},
    body: {},
    ...overrides,
  } as any;
}

const res = {} as any;

describe('MatchController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────── getProfiles (delegates) ───────────────

  describe('getProfiles', () => {
    it('should delegate to MatchService.getProfiles', async () => {
      mocks.MatchService.getProfiles.mockResolvedValueOnce([{ id: 2 }]);

      await MatchController.getProfiles(makeReq(), res);

      expect(mocks.MatchService.getProfiles).toHaveBeenCalledWith(1, 1, 10);
      expect(mocks.success).toHaveBeenCalledWith(res, [{ id: 2 }]);
    });

    it('should use query limit when provided', async () => {
      mocks.MatchService.getProfiles.mockResolvedValueOnce([]);

      await MatchController.getProfiles(makeReq({ query: { limit: '25' } }), res);

      expect(mocks.MatchService.getProfiles).toHaveBeenCalledWith(1, 1, 25);
    });

    it('should propagate errors from service', async () => {
      mocks.MatchService.getProfiles.mockRejectedValueOnce(new NotFoundError('Événement non trouvé'));

      await expect(MatchController.getProfiles(makeReq(), res)).rejects.toThrow(NotFoundError);
    });
  });

  // ─────────────────────────── likeProfile (delegates) ───────────────

  describe('likeProfile', () => {
    it('should delegate to MatchService.likeProfile', async () => {
      mocks.MatchService.likeProfile.mockResolvedValueOnce({ matched: false });

      await MatchController.likeProfile(makeReq({ body: { user_id: 2 } }), res);

      expect(mocks.MatchService.likeProfile).toHaveBeenCalledWith(1, 1, 2);
      expect(mocks.success).toHaveBeenCalledWith(res, { matched: false });
    });

    it('should return match data on mutual like', async () => {
      const matchResult = {
        matched: true,
        match: { id: 99, user: { id: 2, firstname: 'Bob' }, event_id: 1, created_at: '2025-01-01' }
      };
      mocks.MatchService.likeProfile.mockResolvedValueOnce(matchResult);

      await MatchController.likeProfile(makeReq({ body: { user_id: 2 } }), res);

      expect(mocks.success).toHaveBeenCalledWith(res, matchResult);
    });

    it('should propagate ValidationError from service', async () => {
      mocks.MatchService.likeProfile.mockRejectedValueOnce(new ValidationError('user_id est requis'));

      await expect(
        MatchController.likeProfile(makeReq({ body: {} }), res)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ─────────────────────────── passProfile (delegates) ───────────────

  describe('passProfile', () => {
    it('should delegate to MatchService.passProfile', async () => {
      mocks.MatchService.passProfile.mockResolvedValueOnce(undefined);

      await MatchController.passProfile(makeReq({ body: { user_id: 2 } }), res);

      expect(mocks.MatchService.passProfile).toHaveBeenCalledWith(1, 1, 2);
      expect(mocks.success).toHaveBeenCalledWith(res, null, 'Profil pass\u00e9');
    });
  });

  // ─────────────────────────── getAllConversations (delegates) ────────

  describe('getAllConversations', () => {
    it('should delegate to MatchService.getAllConversations', async () => {
      const grouped = [{ event: { id: 1 }, conversations: [] }];
      mocks.MatchService.getAllConversations.mockResolvedValueOnce(grouped);

      await MatchController.getAllConversations(makeReq(), res);

      expect(mocks.MatchService.getAllConversations).toHaveBeenCalledWith(1, 50, 0);
      expect(mocks.success).toHaveBeenCalledWith(res, grouped);
    });
  });

  // ─────────────────────────── getEventConversations (delegates) ─────

  describe('getEventConversations', () => {
    it('should delegate to MatchService.getEventConversations', async () => {
      const result = { event: { id: 1, name: 'Test' }, conversations: [] };
      mocks.MatchService.getEventConversations.mockResolvedValueOnce(result);

      await MatchController.getEventConversations(makeReq(), res);

      expect(mocks.MatchService.getEventConversations).toHaveBeenCalledWith(1, 1, 50, 0);
      expect(mocks.success).toHaveBeenCalledWith(res, result);
    });
  });

  // ─────────────────────────── getMessages (delegates) ───────────────

  describe('getMessages', () => {
    it('should delegate to MatchService.getMessages', async () => {
      const result = { match: { id: 1 }, messages: [] };
      mocks.MatchService.getMessages.mockResolvedValueOnce(result);

      await MatchController.getMessages(makeReq(), res);

      expect(mocks.MatchService.getMessages).toHaveBeenCalledWith(1, 1, 1, 50, null);
      expect(mocks.success).toHaveBeenCalledWith(res, result);
    });

    it('should pass limit and beforeId from query', async () => {
      mocks.MatchService.getMessages.mockResolvedValueOnce({ match: {}, messages: [] });

      await MatchController.getMessages(makeReq({ query: { limit: '20', before: '100' } }), res);

      expect(mocks.MatchService.getMessages).toHaveBeenCalledWith(1, 1, 1, 20, 100);
    });
  });

  // ─────────────────────────── sendMessage (delegates) ───────────────

  describe('sendMessage', () => {
    it('should delegate to MatchService.sendMessage', async () => {
      const messageData = { id: 10, content: 'Hello', sent_at: '2025-01-01T00:00:00Z', sender_id: 1 };
      mocks.MatchService.sendMessage.mockResolvedValueOnce(messageData);

      await MatchController.sendMessage(makeReq({ body: { content: 'Hello' } }), res);

      expect(mocks.MatchService.sendMessage).toHaveBeenCalledWith(1, 1, 'Hello', 1);
      expect(mocks.success).toHaveBeenCalledWith(res, messageData, 'Message envoy\u00e9');
    });

    it('should propagate ValidationError from service', async () => {
      mocks.MatchService.sendMessage.mockRejectedValueOnce(
        new ValidationError('Le contenu du message est requis')
      );

      await expect(
        MatchController.sendMessage(makeReq({ body: { content: '' } }), res)
      ).rejects.toThrow(ValidationError);
    });
  });

  // ─────────────────────────── markAsRead (simple) ───────────────────

  describe('markAsRead', () => {
    it('should throw NotFoundError if message not found', async () => {
      mocks.getMessageById.mockResolvedValueOnce(null);

      await expect(
        MatchController.markAsRead(makeReq(), res)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user not in match', async () => {
      mocks.getMessageById.mockResolvedValueOnce({
        id: 1, user1_id: 5, user2_id: 6, sender_id: 5,
      });

      await expect(
        MatchController.markAsRead(makeReq(), res)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ValidationError if user tries to mark own message as read', async () => {
      mocks.getMessageById.mockResolvedValueOnce({
        id: 1, user1_id: 1, user2_id: 2, sender_id: 1,
      });

      await expect(
        MatchController.markAsRead(makeReq(), res)
      ).rejects.toThrow(ValidationError);
    });

    it('should mark message as read on success', async () => {
      mocks.getMessageById.mockResolvedValueOnce({
        id: 1, user1_id: 1, user2_id: 2, sender_id: 2,
      });
      mocks.markMessageAsRead.mockResolvedValueOnce({ is_read: true });

      await MatchController.markAsRead(makeReq(), res);

      expect(mocks.markMessageAsRead).toHaveBeenCalledWith(1);
      expect(mocks.success).toHaveBeenCalledWith(res, { is_read: true });
    });
  });

  // ─────────────────────────── toggleLike (simple) ───────────────────

  describe('toggleLike', () => {
    it('should throw NotFoundError if message not found', async () => {
      mocks.getMessageById.mockResolvedValueOnce(null);

      await expect(
        MatchController.toggleLike(makeReq(), res)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if user not in match', async () => {
      mocks.getMessageById.mockResolvedValueOnce({
        id: 1, user1_id: 5, user2_id: 6, sender_id: 5,
      });

      await expect(
        MatchController.toggleLike(makeReq(), res)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should toggle like and return result on success', async () => {
      mocks.getMessageById.mockResolvedValueOnce({
        id: 1, user1_id: 1, user2_id: 2, sender_id: 2,
      });
      mocks.toggleMessageLike.mockResolvedValueOnce({ is_liked: true });

      await MatchController.toggleLike(makeReq(), res);

      expect(mocks.toggleMessageLike).toHaveBeenCalledWith(1);
      expect(mocks.success).toHaveBeenCalledWith(res, { is_liked: true });
    });
  });

  // ─────────────────────────── getMatchProfile (simple) ──────────────

  describe('getMatchProfile', () => {
    const matchData = { id: 1, user1_id: 1, user2_id: 2, event_id: 1 };

    it('should throw NotFoundError if match not found', async () => {
      mocks.getMatchById.mockResolvedValueOnce(null);

      await expect(
        MatchController.getMatchProfile(makeReq(), res)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if current user is blocked', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.isBlocked.mockResolvedValueOnce(true);

      await expect(
        MatchController.getMatchProfile(makeReq(), res)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw ForbiddenError if other user is blocked', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.isBlocked
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      await expect(
        MatchController.getMatchProfile(makeReq(), res)
      ).rejects.toThrow(ForbiddenError);
    });

    it('should throw NotFoundError if profile not found', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.isBlocked
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      mocks.getMatchUserProfile.mockResolvedValueOnce(null);

      await expect(
        MatchController.getMatchProfile(makeReq(), res)
      ).rejects.toThrow(NotFoundError);
    });

    it('should return profile on success', async () => {
      const profileData = { user_id: 2, firstname: 'Bob', lastname: 'Smith' };
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.isBlocked
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      mocks.getMatchUserProfile.mockResolvedValueOnce(profileData);

      await MatchController.getMatchProfile(makeReq(), res);

      expect(mocks.getMatchUserProfile).toHaveBeenCalledWith(2, 1);
      expect(mocks.success).toHaveBeenCalledWith(res, profileData);
    });

    it('should resolve other user as user2 when current user is user1', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.isBlocked
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      mocks.getMatchUserProfile.mockResolvedValueOnce({ user_id: 2 });

      await MatchController.getMatchProfile(makeReq(), res);

      expect(mocks.isBlocked).toHaveBeenNthCalledWith(2, 1, 2);
      expect(mocks.getMatchUserProfile).toHaveBeenCalledWith(2, 1);
    });

    it('should resolve other user as user1 when current user is user2', async () => {
      const matchAsUser2 = { ...matchData, user1_id: 3, user2_id: 1 };
      mocks.getMatchById.mockResolvedValueOnce(matchAsUser2);
      mocks.isBlocked
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      mocks.getMatchUserProfile.mockResolvedValueOnce({ user_id: 3 });

      await MatchController.getMatchProfile(makeReq(), res);

      expect(mocks.isBlocked).toHaveBeenNthCalledWith(2, 1, 3);
      expect(mocks.getMatchUserProfile).toHaveBeenCalledWith(3, 1);
    });
  });

  // ─────────────────────────── getEventMatches (simple) ──────────────

  describe('getEventMatches', () => {
    it('should return matches for event', async () => {
      mocks.eventFindById.mockResolvedValueOnce({ id: 1, name: 'Test Event' });
      mocks.findByUserAndEvent.mockResolvedValueOnce({ id: 1 });
      mocks.getMatchesByEvent.mockResolvedValueOnce([{ id: 1 }]);

      await MatchController.getEventMatches(makeReq(), res);

      expect(mocks.getMatchesByEvent).toHaveBeenCalledWith(1, 1, 50, 0);
      expect(mocks.success).toHaveBeenCalledWith(res, [{ id: 1 }]);
    });

    it('should throw NotFoundError when event does not exist', async () => {
      mocks.eventFindById.mockResolvedValueOnce(null);

      await expect(
        MatchController.getEventMatches(makeReq(), res)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when not registered', async () => {
      mocks.eventFindById.mockResolvedValueOnce({ id: 1 });
      mocks.findByUserAndEvent.mockResolvedValueOnce(null);

      await expect(
        MatchController.getEventMatches(makeReq(), res)
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
