import { Server } from 'socket.io';
import logger from '../utils/logger.js';
import { PushService } from '../services/push.service.js';

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

export const emitNewMessage = (matchId: number, message: Record<string, unknown>, senderId: number, recipientId?: number, senderName?: string): void => {
  if (!io) return;

  const roomName = `match:${matchId}`;
  io.to(roomName).emit('chat:newMessage', {
    matchId,
    message,
    senderId
  });

  if (recipientId) {
    const title = 'Init';
    const body = senderName ? `${senderName} a envoyé un message` : 'Nouveau message';
    PushService.sendToUser(recipientId, title, body, {
      type: 'message',
      matchId,
      senderId,
      collapseKey: `chat-${matchId}`,
    }, 'user', 'messages').catch(err => logger.error({ err }, 'Failed to send push for new message'));
  }

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

  const md = matchData as Record<string, any>;
  const user1Name = md.user1?.firstname || md.user1?.name;
  const user2Name = md.user2?.firstname || md.user2?.name;

  PushService.sendToUser(user1Id, 'Init', user2Name ? `Tu as matché avec ${user2Name}. Dis-lui bonjour !` : 'Tu as un nouveau match !', {
    type: 'match',
    matchId: md.match_id,
  }, 'user', 'matches').catch(err => logger.error({ err }, 'Failed to send push for new match'));

  PushService.sendToUser(user2Id, 'Init', user1Name ? `Tu as matché avec ${user1Name}. Dis-lui bonjour !` : 'Tu as un nouveau match !', {
    type: 'match',
    matchId: md.match_id,
  }, 'user', 'matches').catch(err => logger.error({ err }, 'Failed to send push for new match'));

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

export const emitMessageLiked = (matchId: number, messageId: number, isLiked: boolean, userId: number): void => {
  if (!io) return;

  const roomName = `match:${matchId}`;
  io.to(roomName).emit('chat:messageLiked', {
    matchId,
    messageId,
    isLiked,
    userId
  });

  logger.debug({ matchId, messageId, room: roomName }, 'Emitted chat:messageLiked');
};

export const disconnectUser = (userId: number): void => {
  if (!io) return;

  const roomName = `user:${userId}`;
  io.in(roomName).disconnectSockets(true);

  logger.debug({ userId, room: roomName }, 'Disconnected user sockets');
};
