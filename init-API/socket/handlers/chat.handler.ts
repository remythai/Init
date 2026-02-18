import { Server } from 'socket.io';
import { MatchModel } from '../../models/match.model.js';
import type { AuthenticatedSocket } from '../../types/index.js';

export const registerChatHandlers = (io: Server, socket: AuthenticatedSocket): void => {
  const userId: number = socket.user.id;

  socket.on('chat:join', async (matchId: number) => {
    const isInMatch = await MatchModel.isUserInMatch(matchId, userId);
    if (!isInMatch) return;

    const roomName = `match:${matchId}`;
    socket.join(roomName);
  });

  socket.on('chat:leave', (matchId: number) => {
    const roomName = `match:${matchId}`;
    socket.leave(roomName);
  });

  socket.on('chat:typing', async ({ matchId, isTyping }: { matchId: number; isTyping: boolean }) => {
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

  socket.on('chat:markRead', async ({ matchId, messageId }: { matchId: number; messageId: number }) => {
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
