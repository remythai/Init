import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import logger from '../utils/logger.js';

const rateLimitHandler = (limiterName: string) => (req: Request, _res: Response) => {
  logger.warn({
    event: 'security.rate_limit',
    limiter: limiterName,
    path: req.path,
    method: req.method,
    ip: req.ip
  }, 'Rate limit exceeded');
};

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
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
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    rateLimitHandler('upload')(req, res);
    res.status(429).json({ error: 'Trop d\'uploads, veuillez réessayer dans 1 minute', code: 'RATE_LIMIT_EXCEEDED' });
  }
});
