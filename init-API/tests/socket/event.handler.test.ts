import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRegistrationModel = vi.hoisted(() => ({
  isUserRegistered: vi.fn(),
}));

vi.mock('../../models/registration.model.js', () => ({ RegistrationModel: mockRegistrationModel }));

import { registerEventHandlers } from '../../socket/handlers/event.handler';

function makeSocket(userId: number) {
  const handlers: Record<string, (...args: any[]) => any> = {};
  return {
    user: { id: userId },
    rooms: new Set<string>(),
    on: vi.fn((event: string, handler: (...args: any[]) => any) => {
      handlers[event] = handler;
    }),
    join: vi.fn(),
    leave: vi.fn(),
    _handlers: handlers,
  };
}

describe('event.handler', () => {
  const io = {} as any;
  let socket: ReturnType<typeof makeSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = makeSocket(42);
    registerEventHandlers(io, socket as any);
  });

  describe('event:join', () => {
    it('should register event:join and event:leave handlers', () => {
      expect(socket.on).toHaveBeenCalledWith('event:join', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('event:leave', expect.any(Function));
    });

    it('should join room when user is registered', async () => {
      mockRegistrationModel.isUserRegistered.mockResolvedValueOnce(true);

      await socket._handlers['event:join'](10);

      expect(mockRegistrationModel.isUserRegistered).toHaveBeenCalledWith(42, 10);
      expect(socket.join).toHaveBeenCalledWith('event:10');
    });

    it('should not join room when user is not registered', async () => {
      mockRegistrationModel.isUserRegistered.mockResolvedValueOnce(false);

      await socket._handlers['event:join'](10);

      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should ignore non-positive-integer eventId', async () => {
      await socket._handlers['event:join']('abc');
      await socket._handlers['event:join'](0);
      await socket._handlers['event:join'](-5);
      await socket._handlers['event:join'](2.5);
      await socket._handlers['event:join'](null);

      expect(mockRegistrationModel.isUserRegistered).not.toHaveBeenCalled();
    });
  });

  describe('event:leave', () => {
    it('should leave room for valid eventId', () => {
      socket._handlers['event:leave'](10);

      expect(socket.leave).toHaveBeenCalledWith('event:10');
    });

    it('should ignore invalid eventId', () => {
      socket._handlers['event:leave']('abc');
      socket._handlers['event:leave'](0);

      expect(socket.leave).not.toHaveBeenCalled();
    });
  });
});
