import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import logger from '../utils/logger.js';

const rateLimitHandler = (limiterName: string) => (req: Request, _res: Response) => {
  logger.warn({
    event: 'security.rate_limit',
    limiter: limiterName,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id
  }, 'Rate limit exceeded');
};

// Key by user ID — these limiters are always behind authMiddleware so req.user is set
const userKeyGenerator = (req: Request): string => {
  return `${req.user!.role}:${req.user!.id}`;
};

// --- Unauthenticated routes (keyed by IP, stricter) ---

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    rateLimitHandler('auth')(req, res);
    res.status(429).json({ error: 'Trop de tentatives, veuillez réessayer dans 15 minutes', code: 'RATE_LIMIT_EXCEEDED' });
  }
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    rateLimitHandler('register')(req, res);
    res.status(429).json({ error: 'Trop de créations de compte, veuillez réessayer dans 1 heure', code: 'RATE_LIMIT_EXCEEDED' });
  }
});

// --- Authenticated routes (keyed by user ID, generous) ---

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // Refresh uses cookies, no req.user — key by IP is fine here
  // (each user has their own cookie, and 10 refresh per user/15min is plenty)
  handler: (req, res) => {
    rateLimitHandler('refresh')(req, res);
    res.status(429).json({ error: 'Trop de rafraîchissements, veuillez réessayer dans 15 minutes', code: 'RATE_LIMIT_EXCEEDED' });
  }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  // Global limiter runs before auth middleware, so req.user is not available — key by IP
  // This is a DDoS safety net, not a per-user limiter
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    rateLimitHandler('api')(req, res);
    res.status(429).json({ error: 'Trop de requêtes, veuillez réessayer dans 1 minute', code: 'RATE_LIMIT_EXCEEDED' });
  }
});

export const swipeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    rateLimitHandler('swipe')(req, res);
    res.status(429).json({ error: 'Trop de swipes, veuillez réessayer dans 1 minute', code: 'RATE_LIMIT_EXCEEDED' });
  }
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    rateLimitHandler('upload')(req, res);
    res.status(429).json({ error: 'Trop d\'uploads, veuillez réessayer dans 1 minute', code: 'RATE_LIMIT_EXCEEDED' });
  }
});
