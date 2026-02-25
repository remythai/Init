import jwt from 'jsonwebtoken';
import type { RequestHandler } from 'express';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { UserModel } from '../models/user.model.js';
import { OrgaModel } from '../models/orga.model.js';
import type { AuthUser } from '../types/index.js';

const JWT_SECRET = process.env.JWT_SECRET!;

export const authMiddleware: RequestHandler = async (req, _res, next) => {
  try {
    const header = req.headers['authorization'];

    if (!header) {
      return next(new UnauthorizedError('Token non fourni'));
    }

    const parts = header.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next(new UnauthorizedError('Format du token invalide'));
    }

    const token = parts[1];

    let decoded: AuthUser;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as AuthUser;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return next(new UnauthorizedError('Token expiré'));
      }
      return next(new UnauthorizedError('Token invalide'));
    }

    const iat = (decoded as unknown as { iat?: number }).iat;
    if (iat) {
      const model = decoded.role === 'orga' ? OrgaModel : UserModel;
      const logoutAt = await model.getLogoutAt(decoded.id);
      if (logoutAt && iat < Math.floor(logoutAt.getTime() / 1000)) {
        return next(new UnauthorizedError('Session invalidée'));
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedError('Erreur d\'authentification'));
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
      return next(new UnauthorizedError('Authentification requise'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Accès refusé pour ce rôle'));
    }

    next();
  };
};
