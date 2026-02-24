import type { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { AuthenticatedSocket, UserType } from '../../types/index.js';

export const socketAuthMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  const token: string | undefined = socket.handshake.auth?.token || socket.handshake.query?.token;

  if (!token) {
    return next(new Error('Authentication error: Token required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, { algorithms: ['HS256'] }) as { id: number; role?: string };
    (socket as AuthenticatedSocket).user = {
      id: decoded.id,
      type: (decoded.role || 'user') as UserType
    };
    return next();
  } catch (err) {
    return next(new Error('Authentication error: Invalid token'));
  }
};
