import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de tentatives, veuillez réessayer dans 15 minutes',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de créations de compte, veuillez réessayer dans 1 heure',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop de requêtes, veuillez réessayer dans 1 minute',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Trop d\'uploads, veuillez réessayer dans 1 minute',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});
