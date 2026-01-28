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
  // Get allowed origins from environment or use defaults
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000', 'http://127.0.0.1:8080'];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (process.env.NODE_ENV !== 'production') {
          return callback(null, true);
        }

        // Check against allowed origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Also allow if origin matches any pattern
        return callback(null, true);
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

  // Initialize emitters with the io instance
  initEmitters(io);

  // Apply authentication middleware
  io.use(socketAuthMiddleware);

  // Handle connections
  io.on('connection', (socket) => {
    const userId = socket.user.id;
    const userType = socket.user.type;

    console.log(`User connected: ${userId} (${userType})`);

    // Join personal room for direct notifications
    socket.join(`user:${userId}`);

    // Register event handlers
    registerChatHandlers(io, socket);
    registerEventHandlers(io, socket);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${userId} - ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${userId}:`, error.message);
    });
  });

  console.log('Socket.io initialized');

  return io;
};

export default initializeSocket;
