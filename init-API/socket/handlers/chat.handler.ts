import { Server } from 'socket.io';
import { MatchModel } from '../../models/match.model.js';
import type { AuthenticatedSocket } from '../../types/index.js';

function isPositiveInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v > 0;
}

export const registerChatHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const userId: number = socket.user.id;

  socket.on('chat:join', async (matchId: unknown) => {
    if (!isPositiveInt(matchId)) return;
    const isInMatch = await MatchModel.isUserInMatch(matchId, userId);
    if (!isInMatch) return;

    const roomName = `match:${matchId}`;
    socket.join(roomName);
  });

  socket.on('chat:leave', (matchId: unknown) => {
    if (!isPositiveInt(matchId)) return;
    const roomName = `match:${matchId}`;
    socket.leave(roomName);
  });

  socket.on('chat:typing', async (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const { matchId, isTyping } = data as Record<string, unknown>;
    if (!isPositiveInt(matchId) || typeof isTyping !== 'boolean') return;

    const roomName = `match:${matchId}`;
    if (!socket.rooms.has(roomName)) return;
    const isInMatch = await MatchModel.isUserInMatch(matchId, userId);
    if (!isInMatch) return;
    socket.to(roomName).emit('chat:typing', {
      matchId,
      userId,
      isTyping
    });
  });

  socket.on('chat:markRead', async (data: unknown) => {
    if (!data || typeof data !== 'object') return;
    const { matchId, messageId } = data as Record<string, unknown>;
    if (!isPositiveInt(matchId) || !isPositiveInt(messageId)) return;

    const roomName = `match:${matchId}`;
    if (!socket.rooms.has(roomName)) return;
    const isInMatch = await MatchModel.isUserInMatch(matchId, userId);
    if (!isInMatch) return;
    socket.to(roomName).emit('chat:messageRead', {
      matchId,
      messageId,
      readBy: userId
    });
  });
};
