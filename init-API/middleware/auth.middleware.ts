import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserModel } from '../models/user.model.js';
import { OrgaModel } from '../models/orga.model.js';
import type { AuthUser } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET!;

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  const header = req.headers['authorization'];

  if (!header) {
    throw new UnauthorizedError('Token non fourni');
  }

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new UnauthorizedError('Format du token invalide');
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUser;

    const iat = (decoded as unknown as { iat?: number }).iat;
    if (iat) {
      const model = decoded.role === 'orga' ? OrgaModel : UserModel;
      const logoutAt = await model.getLogoutAt(decoded.id);
      if (logoutAt && iat < Math.floor(logoutAt.getTime() / 1000)) {
        throw new UnauthorizedError('Session invalidée');
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expiré');
    }
    throw new UnauthorizedError('Token invalide');
  }
};

export const optionalAuthMiddleware: RequestHandler = (req, _res, next) => {
  const header = req.headers['authorization'];
  if (!header) return next();

  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return next();

  try {
    const decoded = jwt.verify(parts[1], JWT_SECRET, { algorithms: ['HS256'] }) as AuthUser;
    req.user = decoded;
  } catch {}
  next();
};

export const requireRole = (...roles: string[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentification requise');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Accès refusé pour ce rôle');
    }

    next();
  };
};
