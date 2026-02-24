import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => {
  process.env.DB_USER = 'test';
  process.env.DB_HOST = 'localhost';
  process.env.DB_NAME = 'testdb';
  process.env.DB_PASSWORD = 'testpass';
  process.env.JWT_SECRET = 'testsecret_long_enough_for_32chars!';

  return {
    // MatchModel
    getProfilesToSwipe: vi.fn(),
    hasAlreadySwiped: vi.fn(),
    createLike: vi.fn(),
    findLike: vi.fn(),
    createMatch: vi.fn(),
    getUserBasicInfo: vi.fn(),
    getMatchById: vi.fn(),
    getAllConversations: vi.fn(),
    getConversationsByEvent: vi.fn(),
    getMessages: vi.fn(),
    createMessage: vi.fn(),
    markAllMessagesAsRead: vi.fn(),
    getMatchUserProfile: vi.fn(),

    // RegistrationModel
    findByUserAndEvent: vi.fn(),

    // EventModel
    eventFindById: vi.fn(),

    // BlockedUserModel
    isBlocked: vi.fn(),

    // emitters
    emitNewMessage: vi.fn(),
    emitNewMatch: vi.fn(),
    emitConversationUpdate: vi.fn(),

    // database
    withTransaction: vi.fn().mockImplementation(async (cb: Function) => cb({})),
  };
});

vi.mock('../../models/match.model.js', () => ({
  MatchModel: {
    getProfilesToSwipe: mocks.getProfilesToSwipe,
    hasAlreadySwiped: mocks.hasAlreadySwiped,
    createLike: mocks.createLike,
    findLike: mocks.findLike,
    createMatch: mocks.createMatch,
    getUserBasicInfo: mocks.getUserBasicInfo,
    getMatchById: mocks.getMatchById,
    getAllConversations: mocks.getAllConversations,
    getConversationsByEvent: mocks.getConversationsByEvent,
    getMessages: mocks.getMessages,
    createMessage: mocks.createMessage,
    markAllMessagesAsRead: mocks.markAllMessagesAsRead,
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

vi.mock('../../socket/emitters.js', () => ({
  emitNewMessage: mocks.emitNewMessage,
  emitNewMatch: mocks.emitNewMatch,
  emitConversationUpdate: mocks.emitConversationUpdate,
}));

vi.mock('../../config/database.js', () => ({
  withTransaction: mocks.withTransaction,
}));

import { MatchService } from '../../services/match.service';
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  EventExpiredError,
  UserBlockedError,
} from '../../utils/errors.js';

const futureDate = new Date(Date.now() + 86400000).toISOString();
const pastDate = new Date(Date.now() - 86400000).toISOString();

const activeEvent = { id: 1, name: 'Test Event', app_end_at: futureDate };
const expiredEvent = { id: 1, name: 'Test Event', app_end_at: pastDate };
const noEndEvent = { id: 1, name: 'Test Event', app_end_at: null };

describe('MatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withTransaction.mockImplementation(async (cb: Function) => cb({}));
  });

  // ─────────────────────────── getProfiles ───────────────────────────

  describe('getProfiles', () => {
    it('should return profiles on success', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce({ id: 1 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.getProfilesToSwipe.mockResolvedValueOnce([{ id: 2 }]);

      const result = await MatchService.getProfiles(1, 1, 10);

      expect(mocks.getProfilesToSwipe).toHaveBeenCalledWith(1, 1, 10);
      expect(result).toEqual([{ id: 2 }]);
    });

    it('should throw NotFoundError if event does not exist', async () => {
      mocks.eventFindById.mockResolvedValueOnce(null);

      await expect(MatchService.getProfiles(1, 1, 10)).rejects.toThrow(NotFoundError);
    });

    it('should throw EventExpiredError if app has ended', async () => {
      mocks.eventFindById.mockResolvedValueOnce(expiredEvent);

      await expect(MatchService.getProfiles(1, 1, 10)).rejects.toThrow(EventExpiredError);
    });

    it('should throw ForbiddenError if user is not registered', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce(null);

      await expect(MatchService.getProfiles(1, 1, 10)).rejects.toThrow(ForbiddenError);
    });

    it('should throw UserBlockedError if user is blocked', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce({ id: 1 });
      mocks.isBlocked.mockResolvedValueOnce(true);

      await expect(MatchService.getProfiles(1, 1, 10)).rejects.toThrow(UserBlockedError);
    });

    it('should treat event with no app_end_at as active', async () => {
      mocks.eventFindById.mockResolvedValueOnce(noEndEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce({ id: 1 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.getProfilesToSwipe.mockResolvedValueOnce([]);

      const result = await MatchService.getProfiles(1, 1, 10);
      expect(result).toEqual([]);
    });
  });

  // ─────────────────────────── likeProfile ───────────────────────────

  describe('likeProfile', () => {
    it('should throw ValidationError if user_id is missing', async () => {
      await expect(MatchService.likeProfile(1, 1, undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if user tries to self-like', async () => {
      await expect(MatchService.likeProfile(1, 1, 1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if event does not exist', async () => {
      mocks.eventFindById.mockResolvedValueOnce(null);

      await expect(MatchService.likeProfile(1, 1, 2)).rejects.toThrow(NotFoundError);
    });

    it('should throw EventExpiredError if app has ended', async () => {
      mocks.eventFindById.mockResolvedValueOnce(expiredEvent);

      await expect(MatchService.likeProfile(1, 1, 2)).rejects.toThrow(EventExpiredError);
    });

    it('should throw ForbiddenError if current user not registered', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce(null);

      await expect(MatchService.likeProfile(1, 1, 2)).rejects.toThrow(ForbiddenError);
    });

    it('should throw UserBlockedError if current user is blocked', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce({ id: 1 });
      mocks.isBlocked.mockResolvedValueOnce(true);

      await expect(MatchService.likeProfile(1, 1, 2)).rejects.toThrow(UserBlockedError);
    });

    it('should throw NotFoundError if target user not registered', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      mocks.isBlocked.mockResolvedValueOnce(false);

      await expect(MatchService.likeProfile(1, 1, 2)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if already swiped', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.hasAlreadySwiped.mockResolvedValueOnce(true);

      await expect(MatchService.likeProfile(1, 1, 2)).rejects.toThrow(ConflictError);
    });

    it('should return matched:false if no mutual like', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.hasAlreadySwiped.mockResolvedValueOnce(false);
      mocks.createLike.mockResolvedValueOnce(undefined);
      mocks.findLike.mockResolvedValueOnce(null);

      const result = await MatchService.likeProfile(1, 1, 2);

      expect(mocks.createLike).toHaveBeenCalledWith(1, 2, 1, true, {});
      expect(result).toEqual({ matched: false });
    });

    it('should return matched:true with match data if mutual like exists', async () => {
      mocks.eventFindById
        .mockResolvedValueOnce(activeEvent)
        .mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.hasAlreadySwiped.mockResolvedValueOnce(false);
      mocks.createLike.mockResolvedValueOnce(undefined);
      mocks.findLike.mockResolvedValueOnce({ id: 10 });

      const matchResult = { id: 99, created_at: '2025-01-01T00:00:00Z' };
      mocks.createMatch.mockResolvedValueOnce(matchResult);

      const matchedUser = { id: 2, firstname: 'Bob' };
      const currentUser = { id: 1, firstname: 'Alice' };
      mocks.getUserBasicInfo
        .mockResolvedValueOnce(matchedUser)
        .mockResolvedValueOnce(currentUser);

      const result = await MatchService.likeProfile(1, 1, 2);

      expect(mocks.emitNewMatch).toHaveBeenCalledWith(1, 2, {
        match_id: 99,
        event_id: 1,
        event_name: 'Test Event',
        created_at: '2025-01-01T00:00:00Z',
        user1: currentUser,
        user2: matchedUser,
      });
      expect(result).toEqual({
        matched: true,
        match: {
          id: 99,
          user: matchedUser,
          event_id: 1,
          created_at: '2025-01-01T00:00:00Z',
        },
      });
    });

    it('should use withTransaction for the like + match flow', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.hasAlreadySwiped.mockResolvedValueOnce(false);
      mocks.createLike.mockResolvedValueOnce(undefined);
      mocks.findLike.mockResolvedValueOnce(null);

      await MatchService.likeProfile(1, 1, 2);

      expect(mocks.withTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────── passProfile ───────────────────────────

  describe('passProfile', () => {
    it('should throw ValidationError if user_id is missing', async () => {
      await expect(MatchService.passProfile(1, 1, undefined as any)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError on self-pass', async () => {
      await expect(MatchService.passProfile(1, 1, 1)).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if event does not exist', async () => {
      mocks.eventFindById.mockResolvedValueOnce(null);

      await expect(MatchService.passProfile(1, 1, 2)).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if not registered', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce(null);

      await expect(MatchService.passProfile(1, 1, 2)).rejects.toThrow(ForbiddenError);
    });

    it('should throw UserBlockedError if user is blocked', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent.mockResolvedValueOnce({ id: 1 });
      mocks.isBlocked.mockResolvedValueOnce(true);

      await expect(MatchService.passProfile(1, 1, 2)).rejects.toThrow(UserBlockedError);
    });

    it('should throw NotFoundError if target user not registered', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce(null);
      mocks.isBlocked.mockResolvedValueOnce(false);

      await expect(MatchService.passProfile(1, 1, 2)).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if already swiped', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.hasAlreadySwiped.mockResolvedValueOnce(true);

      await expect(MatchService.passProfile(1, 1, 2)).rejects.toThrow(ConflictError);
    });

    it('should create like with false and resolve', async () => {
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.findByUserAndEvent
        .mockResolvedValueOnce({ id: 1 })
        .mockResolvedValueOnce({ id: 2 });
      mocks.isBlocked.mockResolvedValueOnce(false);
      mocks.hasAlreadySwiped.mockResolvedValueOnce(false);
      mocks.createLike.mockResolvedValueOnce(undefined);

      await MatchService.passProfile(1, 1, 2);

      expect(mocks.createLike).toHaveBeenCalledWith(1, 2, 1, false);
    });
  });

  // ─────────────────────────── sendMessage ───────────────────────────

  describe('sendMessage', () => {
    const matchData = {
      id: 1, user1_id: 1, user2_id: 2, event_id: 1,
      event_name: 'Test Event', is_archived: false,
    };

    it('should throw ValidationError if content is empty', async () => {
      await expect(MatchService.sendMessage(1, 1, '')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if content is whitespace only', async () => {
      await expect(MatchService.sendMessage(1, 1, '   ')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if content exceeds 5000 characters', async () => {
      await expect(MatchService.sendMessage(1, 1, 'a'.repeat(5001))).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError if match not found', async () => {
      mocks.getMatchById.mockResolvedValueOnce(null);

      await expect(MatchService.sendMessage(1, 1, 'Hello')).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError if conversation is archived', async () => {
      mocks.getMatchById.mockResolvedValueOnce({ ...matchData, is_archived: true });

      await expect(MatchService.sendMessage(1, 1, 'Hello')).rejects.toThrow(ForbiddenError);
    });

    it('should throw EventExpiredError if event app has ended', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.eventFindById.mockResolvedValueOnce(expiredEvent);

      await expect(MatchService.sendMessage(1, 1, 'Hello')).rejects.toThrow(EventExpiredError);
    });

    it('should create message and emit socket events on success', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);

      const messageData = { id: 10, content: 'Hello', sent_at: '2025-01-01T00:00:00Z', sender_id: 1 };
      mocks.createMessage.mockResolvedValueOnce(messageData);

      const result = await MatchService.sendMessage(1, 1, 'Hello');

      expect(mocks.createMessage).toHaveBeenCalledWith(1, 1, 'Hello');
      expect(mocks.emitNewMessage).toHaveBeenCalledWith(1, messageData, 1);
      expect(mocks.emitConversationUpdate).toHaveBeenCalledWith(2, {
        match_id: 1,
        last_message: {
          content: 'Hello',
          sent_at: '2025-01-01T00:00:00Z',
          is_mine: false,
        },
      });
      expect(result).toEqual(messageData);
    });

    it('should trim content before saving', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.createMessage.mockResolvedValueOnce({ id: 10, content: 'Hello' });

      await MatchService.sendMessage(1, 1, '  Hello  ');

      expect(mocks.createMessage).toHaveBeenCalledWith(1, 1, 'Hello');
    });

    it('should allow exactly 5000 character messages', async () => {
      const content5000 = 'a'.repeat(5000);
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.eventFindById.mockResolvedValueOnce(activeEvent);
      mocks.createMessage.mockResolvedValueOnce({ id: 10, content: content5000 });

      await MatchService.sendMessage(1, 1, content5000);

      expect(mocks.createMessage).toHaveBeenCalledWith(1, 1, content5000);
    });
  });

  // ─────────────────────────── getMessages ───────────────────────────

  describe('getMessages', () => {
    const matchData = {
      id: 1, user1_id: 1, user2_id: 2,
      event_id: 1, event_name: 'Test Event',
    };

    it('should return messages with other user profile', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.markAllMessagesAsRead.mockResolvedValueOnce(undefined);
      mocks.getMessages.mockResolvedValueOnce([{ id: 1, content: 'Hi' }]);
      mocks.isBlocked
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false);
      mocks.getMatchUserProfile.mockResolvedValueOnce({
        user_id: 2, firstname: 'Bob', lastname: 'Smith', photos: [],
      });

      const result = await MatchService.getMessages(1, 1);

      expect(result.match).toEqual(expect.objectContaining({
        id: 1, event_id: 1, event_name: 'Test Event',
        is_blocked: false, is_other_user_blocked: false,
      }));
      expect(result.messages).toEqual([{ id: 1, content: 'Hi' }]);
    });

    it('should throw NotFoundError if match not found', async () => {
      mocks.getMatchById.mockResolvedValueOnce(null);

      await expect(MatchService.getMessages(1, 1)).rejects.toThrow(NotFoundError);
    });

    it('should hide profile when user is blocked', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);
      mocks.markAllMessagesAsRead.mockResolvedValueOnce(undefined);
      mocks.getMessages.mockResolvedValueOnce([]);
      mocks.isBlocked
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const result = await MatchService.getMessages(1, 1) as any;

      expect(result.match.user.firstname).toBe('Utilisateur');
      expect(result.match.is_blocked).toBe(true);
    });

    it('should throw NotFoundError when eventId does not match', async () => {
      mocks.getMatchById.mockResolvedValueOnce(matchData);

      await expect(MatchService.getMessages(1, 1, 999)).rejects.toThrow(
        'Conversation non trouvée pour cet événement'
      );
    });
  });
});
