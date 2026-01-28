import jwt from 'jsonwebtoken';

/**
 * Socket.io authentication middleware
 * Verifies JWT token on WebSocket connection
 */
export const socketAuthMiddleware = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    // Try to verify as user token first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.id,
        type: decoded.type || 'user'
      };
      return next();
    } catch (userErr) {
      // Try orga token
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = {
          id: decoded.id,
          type: 'orga'
        };
        return next();
      } catch (orgaErr) {
        return next(new Error('Authentication error: Invalid token'));
      }
    }
  } catch (error) {
    console.error('Socket auth error:', error.message);
    return next(new Error('Authentication error'));
  }
};
