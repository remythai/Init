import { Server } from 'socket.io';
import logger from '../utils/logger.js';

let io: Server | null = null;

export const initEmitters = (socketIo: Server): void => {
  io = socketIo;
};

export const getIO = (): Server | null => {
  if (!io) {
    logger.warn('Socket.io not initialized');
  }
  return io;
};

export const emitNewMessage = (matchId: number, message: Record<string, unknown>, senderId: number): void => {
  if (!io) return;

  const roomName = `match:${matchId}`;
  io.to(roomName).emit('chat:newMessage', {
    matchId,
    message,
    senderId
  });

  logger.debug({ matchId, room: roomName }, 'Emitted chat:newMessage');
};

export const emitToUser = (userId: number, event: string, data: unknown): void => {
  if (!io) return;

  const roomName = `user:${userId}`;
  io.to(roomName).emit(event, data);

  logger.debug({ userId, event, room: roomName }, 'Emitted to user');
};

export const emitNewMatch = (user1Id: number, user2Id: number, matchData: unknown): void => {
  if (!io) return;

  emitToUser(user1Id, 'match:new', matchData);
  emitToUser(user2Id, 'match:new', matchData);

  logger.debug({ user1Id, user2Id }, 'Emitted match:new');
};

export const emitUserJoinedEvent = (eventId: number, userData: unknown): void => {
  if (!io) return;

  const roomName = `event:${eventId}`;
  io.to(roomName).emit('event:userJoined', {
    eventId,
    user: userData
  });

  logger.debug({ eventId, room: roomName }, 'Emitted event:userJoined');
};

export const emitConversationUpdate = (userId: number, conversationData: unknown): void => {
  if (!io) return;

  emitToUser(userId, 'chat:conversationUpdate', conversationData);
};
