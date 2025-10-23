import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const authMiddleware = (req, res, next) => {
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
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expiré');
    }
    throw new UnauthorizedError('Token invalide');
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentification requise');
    }

    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Accès refusé pour ce rôle');
    }

    next();
  };
};