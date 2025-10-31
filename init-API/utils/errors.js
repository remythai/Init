export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
  }
}

export const errorHandler = (err, req, res, next) => {
  if (err.code === '23505') {
    const field = err.constraint?.includes('mail') ? 'email' : 
                  err.constraint?.includes('tel') ? 'téléphone' : 'champ';
    return res.status(409).json({
      error: `Ce ${field} est déjà utilisé`,
      code: 'DUPLICATE_ENTRY'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Référence invalide',
      code: 'INVALID_REFERENCE'
    });
  }

  if (err.code === '23502') {
    return res.status(400).json({
      error: `Le champ ${err.column} est requis`,
      code: 'MISSING_FIELD'
    });
  }

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: err.message
    });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    error: 'Une erreur interne est survenue',
    code: 'INTERNAL_ERROR'
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};