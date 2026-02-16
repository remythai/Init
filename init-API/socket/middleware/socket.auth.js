import jwt from 'jsonwebtoken';

/**
 * Socket.io authentication middleware
 * Verifies JWT token on WebSocket connection
 */
export const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = {
      id: decoded.id,
      type: decoded.role || 'user'
    };
    return next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
};
