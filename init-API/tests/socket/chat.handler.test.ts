import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockMatchModel = vi.hoisted(() => ({
  isUserInMatch: vi.fn(),
}));

vi.mock('../../models/match.model.js', () => ({ MatchModel: mockMatchModel }));

import { registerChatHandlers } from '../../socket/handlers/chat.handler';

function makeSocket(userId: number) {
  const handlers: Record<string, (...args: any[]) => any> = {};
  const rooms = new Set<string>();
  return {
    user: { id: userId },
    rooms,
    on: vi.fn((event: string, handler: (...args: any[]) => any) => {
      handlers[event] = handler;
    }),
    join: vi.fn((room: string) => rooms.add(room)),
    leave: vi.fn(),
    to: vi.fn().mockReturnValue({ emit: vi.fn() }),
    _handlers: handlers,
    _getEmit() {
      const emitFn = vi.fn();
      this.to.mockReturnValue({ emit: emitFn });
      return emitFn;
    },
  };
}

describe('chat.handler', () => {
  const io = {} as any;
  let socket: ReturnType<typeof makeSocket>;

  beforeEach(() => {
    vi.clearAllMocks();
    socket = makeSocket(42);
    registerChatHandlers(io, socket as any);
  });

  describe('chat:join', () => {
    it('should register all 4 chat event handlers', () => {
      expect(socket.on).toHaveBeenCalledWith('chat:join', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('chat:leave', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('chat:typing', expect.any(Function));
      expect(socket.on).toHaveBeenCalledWith('chat:markRead', expect.any(Function));
    });

    it('should join room when user is in match', async () => {
      mockMatchModel.isUserInMatch.mockResolvedValueOnce(true);

      await socket._handlers['chat:join'](5);

      expect(mockMatchModel.isUserInMatch).toHaveBeenCalledWith(5, 42);
      expect(socket.join).toHaveBeenCalledWith('match:5');
    });

    it('should not join room when user is not in match', async () => {
      mockMatchModel.isUserInMatch.mockResolvedValueOnce(false);

      await socket._handlers['chat:join'](5);

      expect(socket.join).not.toHaveBeenCalled();
    });

    it('should ignore non-positive-integer matchId', async () => {
      await socket._handlers['chat:join']('abc');
      await socket._handlers['chat:join'](0);
      await socket._handlers['chat:join'](-1);
      await socket._handlers['chat:join'](1.5);
      await socket._handlers['chat:join'](null);

      expect(mockMatchModel.isUserInMatch).not.toHaveBeenCalled();
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe('chat:leave', () => {
    it('should leave room for valid matchId', () => {
      socket._handlers['chat:leave'](5);

      expect(socket.leave).toHaveBeenCalledWith('match:5');
    });

    it('should ignore invalid matchId', () => {
      socket._handlers['chat:leave']('abc');
      socket._handlers['chat:leave'](0);

      expect(socket.leave).not.toHaveBeenCalled();
    });
  });

  describe('chat:typing', () => {
    it('should broadcast typing when in room and authorized', async () => {
      socket.rooms.add('match:5');
      mockMatchModel.isUserInMatch.mockResolvedValueOnce(true);
      const emitFn = socket._getEmit();

      await socket._handlers['chat:typing']({ matchId: 5, isTyping: true });

      expect(socket.to).toHaveBeenCalledWith('match:5');
      expect(emitFn).toHaveBeenCalledWith('chat:typing', {
        matchId: 5,
        userId: 42,
        isTyping: true,
      });
    });

    it('should not broadcast when not in room', async () => {
      // socket.rooms does NOT have 'match:5'
      await socket._handlers['chat:typing']({ matchId: 5, isTyping: true });

      expect(socket.to).not.toHaveBeenCalled();
    });

    it('should not broadcast when DB check fails', async () => {
      socket.rooms.add('match:5');
      mockMatchModel.isUserInMatch.mockResolvedValueOnce(false);

      await socket._handlers['chat:typing']({ matchId: 5, isTyping: true });

      expect(socket.to).not.toHaveBeenCalled();
    });

    it('should ignore invalid data', async () => {
      await socket._handlers['chat:typing'](null);
      await socket._handlers['chat:typing']('string');
      await socket._handlers['chat:typing']({ matchId: 'abc', isTyping: true });
      await socket._handlers['chat:typing']({ matchId: 5, isTyping: 'yes' });

      expect(mockMatchModel.isUserInMatch).not.toHaveBeenCalled();
    });
  });

  describe('chat:markRead', () => {
    it('should broadcast messageRead when in room and authorized', async () => {
      socket.rooms.add('match:5');
      mockMatchModel.isUserInMatch.mockResolvedValueOnce(true);
      const emitFn = socket._getEmit();

      await socket._handlers['chat:markRead']({ matchId: 5, messageId: 100 });

      expect(socket.to).toHaveBeenCalledWith('match:5');
      expect(emitFn).toHaveBeenCalledWith('chat:messageRead', {
        matchId: 5,
        messageId: 100,
        readBy: 42,
      });
    });

    it('should not broadcast when not in room', async () => {
      await socket._handlers['chat:markRead']({ matchId: 5, messageId: 100 });

      expect(socket.to).not.toHaveBeenCalled();
    });

    it('should not broadcast when DB check fails', async () => {
      socket.rooms.add('match:5');
      mockMatchModel.isUserInMatch.mockResolvedValueOnce(false);

      await socket._handlers['chat:markRead']({ matchId: 5, messageId: 100 });

      expect(socket.to).not.toHaveBeenCalled();
    });

    it('should ignore invalid data', async () => {
      await socket._handlers['chat:markRead'](null);
      await socket._handlers['chat:markRead']({ matchId: 'abc', messageId: 100 });
      await socket._handlers['chat:markRead']({ matchId: 5, messageId: -1 });

      expect(mockMatchModel.isUserInMatch).not.toHaveBeenCalled();
    });
  });
});
