import { Server } from 'socket.io';
import { socketAuthMiddleware } from './middleware/socket.auth.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerEventHandlers } from './handlers/event.handler.js';
import { initEmitters } from './emitters.js';

/**
 * Initialize Socket.io server
 * @param {http.Server} httpServer - The HTTP server instance
 * @returns {Server} The Socket.io server instance
 */
export const initializeSocket = (httpServer) => {
  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',').map(o => o.trim()).filter(Boolean);

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);

        if (process.env.NODE_ENV !== 'production') {
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
    const userId = socket.user.id;
    const userType = socket.user.type;

    console.log(`User connected: ${userId} (${userType})`);

    socket.join(`user:${userId}`);

    registerChatHandlers(io, socket);
    registerEventHandlers(io, socket);

    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${userId} - ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error.message);
    });
  });

  console.log('Socket.io initialized');

  return io;
};

export default initializeSocket;
