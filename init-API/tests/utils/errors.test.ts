import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockLogger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({ default: mockLogger }));

import {
  AppError, ValidationError, UnauthorizedError, ForbiddenError,
  NotFoundError, ConflictError, EventExpiredError, UserBlockedError,
  classifyError, errorHandler, asyncHandler
} from '../../utils/errors';

// ─── Error classes ───────────────────────────────────────────────────────────

describe('AppError', () => {
  it('should set statusCode, code, and isOperational', () => {
    const err = new AppError(500, 'test', 'TEST_CODE');
    expect(err.message).toBe('test');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('TEST_CODE');
    expect(err.isOperational).toBe(true);
    expect(err).toBeInstanceOf(Error);
  });

  it('should default code to null', () => {
    const err = new AppError(400, 'test');
    expect(err.code).toBeNull();
  });
});

describe('Error subclasses', () => {
  it('ValidationError → 400', () => {
    const err = new ValidationError('bad input');
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('bad input');
    expect(err).toBeInstanceOf(AppError);
  });

  it('UnauthorizedError → 401 with default message', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Unauthorized');
  });

  it('ForbiddenError → 403 with default message', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('Forbidden');
  });

  it('NotFoundError → 404', () => {
    const err = new NotFoundError('not found');
    expect(err.statusCode).toBe(404);
  });

  it('ConflictError → 409', () => {
    const err = new ConflictError('conflict');
    expect(err.statusCode).toBe(409);
  });

  it('EventExpiredError → 403 with EVENT_EXPIRED code', () => {
    const err = new EventExpiredError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('EVENT_EXPIRED');
  });

  it('UserBlockedError → 403 with USER_BLOCKED code', () => {
    const err = new UserBlockedError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('USER_BLOCKED');
  });
});

// ─── classifyError (pattern matching) ────────────────────────────────────────

describe('classifyError', () => {
  it('should classify MulterError', () => {
    const err = { name: 'MulterError', code: 'LIMIT_FILE_SIZE' };
    const result = classifyError(err);
    expect(result).toEqual({ kind: 'multer', code: 'LIMIT_FILE_SIZE' });
  });

  it('should classify file type error', () => {
    const err = new Error('Type de fichier non autorisé: text/plain');
    const result = classifyError(err);
    expect(result.kind).toBe('fileType');
    if (result.kind === 'fileType') {
      expect(result.message).toContain('Type de fichier non autorisé');
    }
  });

  it('should classify PG duplicate (23505)', () => {
    const err = { code: '23505', constraint: 'unique_mail' };
    const result = classifyError(err);
    expect(result).toEqual({ kind: 'pgDuplicate', constraint: 'unique_mail' });
  });

  it('should classify PG foreign key (23503)', () => {
    const err = { code: '23503' };
    const result = classifyError(err);
    expect(result).toEqual({ kind: 'pgReference' });
  });

  it('should classify PG not null (23502)', () => {
    const err = { code: '23502' };
    const result = classifyError(err);
    expect(result).toEqual({ kind: 'pgMissing' });
  });

  it('should classify operational AppError', () => {
    const err = new NotFoundError('User not found');
    const result = classifyError(err);
    expect(result).toEqual({
      kind: 'operational',
      statusCode: 404,
      message: 'User not found',
      code: null
    });
  });

  it('should classify unknown errors', () => {
    const err = new Error('random');
    const result = classifyError(err);
    expect(result.kind).toBe('unknown');
  });
});

// ─── errorHandler ────────────────────────────────────────────────────────────

function mockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler', () => {
  const next = vi.fn();
  let req: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { path: '/api/test', method: 'GET', ip: '127.0.0.1', user: { id: 42 } };
  });

  it('should handle multer LIMIT_FILE_SIZE', () => {
    const res = mockRes();
    errorHandler({ name: 'MulterError', code: 'LIMIT_FILE_SIZE' }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Le fichier est trop volumineux (max 5 Mo)',
      code: 'FILE_UPLOAD_ERROR'
    });
  });

  it('should handle multer LIMIT_FILE_COUNT', () => {
    const res = mockRes();
    errorHandler({ name: 'MulterError', code: 'LIMIT_FILE_COUNT' }, req, res, next);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Trop de fichiers',
      code: 'FILE_UPLOAD_ERROR'
    });
  });

  it('should handle multer LIMIT_UNEXPECTED_FILE', () => {
    const res = mockRes();
    errorHandler({ name: 'MulterError', code: 'LIMIT_UNEXPECTED_FILE' }, req, res, next);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Champ de fichier inattendu',
      code: 'FILE_UPLOAD_ERROR'
    });
  });

  it('should handle file type error', () => {
    const res = mockRes();
    errorHandler(new Error('Type de fichier non autorisé: text/plain'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Type de fichier non autorisé: text/plain',
      code: 'INVALID_FILE_TYPE'
    });
  });

  it('should handle PG duplicate with mail constraint', () => {
    const res = mockRes();
    errorHandler({ code: '23505', constraint: 'unique_mail' }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ce email est déjà utilisé',
      code: 'DUPLICATE_ENTRY'
    });
  });

  it('should handle PG duplicate with tel constraint', () => {
    const res = mockRes();
    errorHandler({ code: '23505', constraint: 'unique_tel' }, req, res, next);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ce téléphone est déjà utilisé',
      code: 'DUPLICATE_ENTRY'
    });
  });

  it('should handle PG duplicate with unknown constraint', () => {
    const res = mockRes();
    errorHandler({ code: '23505', constraint: 'other_constraint' }, req, res, next);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Ce champ est déjà utilisé',
      code: 'DUPLICATE_ENTRY'
    });
  });

  it('should handle PG foreign key violation', () => {
    const res = mockRes();
    errorHandler({ code: '23503' }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Référence invalide',
      code: 'INVALID_REFERENCE'
    });
  });

  it('should handle PG not null violation', () => {
    const res = mockRes();
    errorHandler({ code: '23502' }, req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Un champ requis est manquant',
      code: 'MISSING_FIELD'
    });
  });

  it('should handle operational error with code', () => {
    const res = mockRes();
    errorHandler(new EventExpiredError(), req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      code: 'EVENT_EXPIRED'
    }));
  });

  it('should handle operational error without code', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('User not found'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('should handle unknown errors as 500', () => {
    const res = mockRes();
    errorHandler(new Error('crash'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Une erreur interne est survenue',
      code: 'INTERNAL_ERROR'
    });
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should log security.access_denied for 401 errors', () => {
    const res = mockRes();
    errorHandler(new UnauthorizedError('Token invalide'), req, res, next);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'security.access_denied',
        status: 401,
        path: '/api/test',
        method: 'GET',
        ip: '127.0.0.1',
        userId: 42,
      }),
      'Access denied'
    );
  });

  it('should log security.access_denied for 403 errors', () => {
    const res = mockRes();
    errorHandler(new ForbiddenError('Accès refusé'), req, res, next);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'security.access_denied',
        status: 403,
        path: '/api/test',
      }),
      'Access denied'
    );
  });

  it('should not log security.access_denied for 404 errors', () => {
    const res = mockRes();
    errorHandler(new NotFoundError('Not found'), req, res, next);

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });
});

// ─── asyncHandler ────────────────────────────────────────────────────────────

describe('asyncHandler', () => {
  it('should call the wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const req = {} as any;
    const res = {} as any;
    const next = vi.fn();

    await asyncHandler(fn)(req, res, next);
    expect(fn).toHaveBeenCalledWith(req, res, next);
  });

  it('should call next with error if function throws', async () => {
    const error = new Error('boom');
    const fn = vi.fn().mockRejectedValue(error);
    const req = {} as any;
    const res = {} as any;
    const next = vi.fn();

    await asyncHandler(fn)(req, res, next);
    // Wait for promise microtask
    await new Promise(r => setTimeout(r, 0));
    expect(next).toHaveBeenCalledWith(error);
  });
});
