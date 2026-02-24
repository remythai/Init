import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  warn: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({ default: mockLogger }));

import {
  initEmitters,
  getIO,
  emitNewMessage,
  emitToUser,
  emitNewMatch,
  emitUserJoinedEvent,
  emitConversationUpdate,
  disconnectUser,
} from '../../socket/emitters';

function makeFakeIO() {
  const emitFn = vi.fn();
  const disconnectSocketsFn = vi.fn();
  const toFn = vi.fn().mockReturnValue({ emit: emitFn });
  const inFn = vi.fn().mockReturnValue({ disconnectSockets: disconnectSocketsFn });
  return { to: toFn, in: inFn, _emit: emitFn, _disconnectSockets: disconnectSocketsFn };
}

describe('socket/emitters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset io to null by re-initializing with null-like behavior
    // We'll re-init in each test that needs it
  });

  describe('getIO', () => {
    it('should warn and return null when not initialized', () => {
      // Fresh module state — io starts as null
      // But since we may have called initEmitters in prior tests,
      // we need a clean import or accept stateful behavior.
      // For this test, we just verify the warn behavior:
      initEmitters(null as any);
      const result = getIO();
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('Socket.io not initialized');
    });
  });

  describe('emitNewMessage', () => {
    it('should emit chat:newMessage to match room', () => {
      const fakeIO = makeFakeIO();
      initEmitters(fakeIO as any);

      emitNewMessage(5, { text: 'hello' }, 42);

      expect(fakeIO.to).toHaveBeenCalledWith('match:5');
      expect(fakeIO._emit).toHaveBeenCalledWith('chat:newMessage', {
        matchId: 5,
        message: { text: 'hello' },
        senderId: 42,
      });
    });

    it('should return early when io is null', () => {
      initEmitters(null as any);
      expect(() => emitNewMessage(1, {}, 1)).not.toThrow();
    });
  });

  describe('emitToUser', () => {
    it('should emit event to user room', () => {
      const fakeIO = makeFakeIO();
      initEmitters(fakeIO as any);

      emitToUser(7, 'custom:event', { data: true });

      expect(fakeIO.to).toHaveBeenCalledWith('user:7');
      expect(fakeIO._emit).toHaveBeenCalledWith('custom:event', { data: true });
    });
  });

  describe('emitNewMatch', () => {
    it('should emit match:new to both users', () => {
      const fakeIO = makeFakeIO();
      initEmitters(fakeIO as any);

      emitNewMatch(1, 2, { matchId: 10 });

      expect(fakeIO.to).toHaveBeenCalledWith('user:1');
      expect(fakeIO.to).toHaveBeenCalledWith('user:2');
      expect(fakeIO._emit).toHaveBeenCalledWith('match:new', { matchId: 10 });
    });

    it('should return early when io is null', () => {
      initEmitters(null as any);
      expect(() => emitNewMatch(1, 2, {})).not.toThrow();
    });
  });

  describe('emitUserJoinedEvent', () => {
    it('should emit event:userJoined to event room', () => {
      const fakeIO = makeFakeIO();
      initEmitters(fakeIO as any);

      emitUserJoinedEvent(10, { id: 42, name: 'Jean' });

      expect(fakeIO.to).toHaveBeenCalledWith('event:10');
      expect(fakeIO._emit).toHaveBeenCalledWith('event:userJoined', {
        eventId: 10,
        user: { id: 42, name: 'Jean' },
      });
    });
  });

  describe('emitConversationUpdate', () => {
    it('should emit chat:conversationUpdate to user room', () => {
      const fakeIO = makeFakeIO();
      initEmitters(fakeIO as any);

      emitConversationUpdate(42, { matchId: 5 });

      expect(fakeIO.to).toHaveBeenCalledWith('user:42');
      expect(fakeIO._emit).toHaveBeenCalledWith('chat:conversationUpdate', { matchId: 5 });
    });
  });

  describe('disconnectUser', () => {
    it('should force disconnect all sockets in user room', () => {
      const fakeIO = makeFakeIO();
      initEmitters(fakeIO as any);

      disconnectUser(42);

      expect(fakeIO.in).toHaveBeenCalledWith('user:42');
      expect(fakeIO._disconnectSockets).toHaveBeenCalledWith(true);
    });

    it('should return early when io is null', () => {
      initEmitters(null as any);
      expect(() => disconnectUser(42)).not.toThrow();
    });
  });
});
