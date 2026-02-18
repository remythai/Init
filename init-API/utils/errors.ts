import type { Request, Response, NextFunction } from 'express';
import type { ErrorKind } from '../types/index.js';
import logger from './logger.js';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string | null;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, code: string | null = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public details?: Record<string, string>;

  constructor(message: string) {
    super(400, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class EventExpiredError extends AppError {
  constructor(message = 'La période de disponibilité de cet événement est terminée') {
    super(403, message, 'EVENT_EXPIRED');
  }
}

export class UserBlockedError extends AppError {
  constructor(message = 'Vous avez été bloqué de cet événement par l\'organisateur') {
    super(403, message, 'USER_BLOCKED');
  }
}

export function classifyError(err: any): ErrorKind {
  if (err.name === 'MulterError') {
    return { kind: 'multer', code: err.code ?? 'UNKNOWN' };
  }

  if (err.message?.includes('Type de fichier non autorisé')) {
    return { kind: 'fileType', message: err.message };
  }

  if (err.code === '23505') {
    return { kind: 'pgDuplicate', constraint: err.constraint };
  }

  if (err.code === '23503') {
    return { kind: 'pgReference' };
  }

  if (err.code === '23502') {
    return { kind: 'pgMissing' };
  }

  if (err.isOperational) {
    return { kind: 'operational', statusCode: err.statusCode, message: err.message, code: err.code };
  }

  return { kind: 'unknown', error: err };
}

function handleErrorKind(classified: ErrorKind, res: Response): Response {
  switch (classified.kind) {
    case 'multer': {
      let message = 'Erreur lors du téléchargement du fichier';
      if (classified.code === 'LIMIT_FILE_SIZE') {
        message = 'Le fichier est trop volumineux (max 5 Mo)';
      } else if (classified.code === 'LIMIT_FILE_COUNT') {
        message = 'Trop de fichiers';
      } else if (classified.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Champ de fichier inattendu';
      }
      return res.status(400).json({ error: message, code: 'FILE_UPLOAD_ERROR' });
    }

    case 'fileType':
      return res.status(400).json({ error: classified.message, code: 'INVALID_FILE_TYPE' });

    case 'pgDuplicate': {
      const field = classified.constraint?.includes('mail') ? 'email'
        : classified.constraint?.includes('tel') ? 'téléphone'
        : 'champ';
      return res.status(409).json({ error: `Ce ${field} est déjà utilisé`, code: 'DUPLICATE_ENTRY' });
    }

    case 'pgReference':
      return res.status(400).json({ error: 'Référence invalide', code: 'INVALID_REFERENCE' });

    case 'pgMissing':
      return res.status(400).json({ error: 'Un champ requis est manquant', code: 'MISSING_FIELD' });

    case 'operational': {
      const response: { error: string; code?: string } = { error: classified.message };
      if (classified.code) {
        response.code = classified.code;
      }
      return res.status(classified.statusCode).json(response);
    }

    case 'unknown':
      logger.error({ err: classified.error }, 'Unexpected error');
      return res.status(500).json({ error: 'Une erreur interne est survenue', code: 'INTERNAL_ERROR' });
  }
}

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction): Response => {
  const classified = classifyError(err);
  return handleErrorKind(classified, res);
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
