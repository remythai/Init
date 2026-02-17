import { Server } from 'socket.io';
import http from 'node:http';
import { socketAuthMiddleware } from './middleware/socket.auth.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerEventHandlers } from './handlers/event.handler.js';
import { initEmitters } from './emitters.js';
import type { AuthenticatedSocket } from '../types/index.js';
import logger from '../utils/logger.js';

export const initializeSocket = (httpServer: http.Server): Server => {
  const allowedOrigins: string[] = (process.env.CORS_ORIGINS || '')
    .split(',').map((o: string) => o.trim()).filter(Boolean);

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS must be set in production');
  }

  const io = new Server(httpServer, {
    cors: {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin) return callback(null, true);

        if (allowedOrigins.length === 0) {
          return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        return callback(new Error('Origin not allowed'));
      },
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type']
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true
  });

  initEmitters(io);

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const authSocket = socket as AuthenticatedSocket;
    const userId: number = authSocket.user.id;
    const userType: string = authSocket.user.type;

    logger.info({ userId, userType }, 'User connected');

    authSocket.join(`user:${userId}`);

    registerChatHandlers(io, authSocket);
    registerEventHandlers(io, authSocket);

    authSocket.on('disconnect', (reason: string) => {
      logger.info({ userId, reason }, 'User disconnected');
    });

    authSocket.on('error', (error: Error) => {
      logger.error({ userId, err: error }, 'Socket error');
    });
  });

  logger.info('Socket.io initialized');

  return io;
};

export default initializeSocket;
