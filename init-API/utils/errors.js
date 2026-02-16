export class AppError extends Error {
  constructor(message, statusCode, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
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

export class EventExpiredError extends AppError {
  constructor(message = 'La période de disponibilité de cet événement est terminée') {
    super(message, 403, 'EVENT_EXPIRED');
  }
}

export class UserBlockedError extends AppError {
  constructor(message = 'Vous avez été bloqué de cet événement par l\'organisateur') {
    super(message, 403, 'USER_BLOCKED');
  }
}

export const errorHandler = (err, req, res, next) => {
  // Handle multer errors
  if (err.name === 'MulterError') {
    let message = 'Erreur lors du téléchargement du fichier';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Le fichier est trop volumineux (max 5 Mo)';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Trop de fichiers';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Champ de fichier inattendu';
    }
    return res.status(400).json({
      error: message,
      code: 'FILE_UPLOAD_ERROR'
    });
  }

  // Handle file filter errors (invalid mime type)
  if (err.message && err.message.includes('Type de fichier non autorisé')) {
    return res.status(400).json({
      error: err.message,
      code: 'INVALID_FILE_TYPE'
    });
  }

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
      error: 'Un champ requis est manquant',
      code: 'MISSING_FIELD'
    });
  }

  if (err.isOperational) {
    const response = { error: err.message };
    if (err.code) {
      response.code = err.code;
    }
    return res.status(err.statusCode).json(response);
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