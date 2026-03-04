import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../../utils/errors';

const JWT_SECRET = 'testsecret_long_enough_for_32chars!';

const mockUserModel = vi.hoisted(() => ({
  getLogoutAt: vi.fn(),
}));
const mockOrgaModel = vi.hoisted(() => ({
  getLogoutAt: vi.fn(),
}));

vi.mock('../../models/user.model.js', () => ({ UserModel: mockUserModel }));
vi.mock('../../models/orga.model.js', () => ({ OrgaModel: mockOrgaModel }));

const { authMiddleware, optionalAuthMiddleware, requireRole } = await import('../../middleware/auth.middleware');

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ...overrides,
  } as Request;
}

function mockRes(): Response {
  return {} as Response;
}

describe('auth.middleware', () => {
  let next: NextFunction & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
    mockUserModel.getLogoutAt.mockResolvedValue(null);
    mockOrgaModel.getLogoutAt.mockResolvedValue(null);
  });

  describe('authMiddleware', () => {
    it('should call next with error when no authorization header', async () => {
      const req = mockReq();
      await authMiddleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Token non fourni');
    });

    it('should call next with error for invalid format (no Bearer)', async () => {
      const req = mockReq({ headers: { authorization: 'Basic abc123' } });
      await authMiddleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Format du token invalide');
    });

    it('should call next with error for invalid format (no space)', async () => {
      const req = mockReq({ headers: { authorization: 'Bearertoken' } });
      await authMiddleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Format du token invalide');
    });

    it('should call next with error for expired token', async () => {
      const token = jwt.sign({ id: 1, role: 'user' }, JWT_SECRET, { expiresIn: '-1s' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      await authMiddleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Token expiré');
    });

    it('should call next with error for invalid token', async () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
      await authMiddleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Token invalide');
    });

    it('should call next with error for token signed with wrong secret', async () => {
      const token = jwt.sign({ id: 1, role: 'user' }, 'wrong_secret_that_is_long_enough!!', { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      await authMiddleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Token invalide');
    });

    it('should set req.user and call next() for valid token', async () => {
      const payload = { id: 42, role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });

      await authMiddleware(req, mockRes(), next);

      expect(req.user).toBeDefined();
      expect(req.user!.id).toBe(42);
      expect(req.user!.role).toBe('user');
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should work with orga role', async () => {
      const payload = { id: 7, role: 'orga' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });

      await authMiddleware(req, mockRes(), next);

      expect(req.user!.id).toBe(7);
      expect(req.user!.role).toBe('orga');
      expect(next).toHaveBeenCalledWith();
    });

    it('should call OrgaModel.getLogoutAt for orga role', async () => {
      const payload = { id: 7, role: 'orga' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });

      await authMiddleware(req, mockRes(), next);

      expect(mockOrgaModel.getLogoutAt).toHaveBeenCalledWith(7);
      expect(mockUserModel.getLogoutAt).not.toHaveBeenCalled();
    });

    it('should call UserModel.getLogoutAt for user role', async () => {
      const payload = { id: 42, role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });

      await authMiddleware(req, mockRes(), next);

      expect(mockUserModel.getLogoutAt).toHaveBeenCalledWith(42);
      expect(mockOrgaModel.getLogoutAt).not.toHaveBeenCalled();
    });

    it('should call next with error if token was issued before logout_at', async () => {
      const payload = { id: 42, role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      mockUserModel.getLogoutAt.mockResolvedValueOnce(new Date(Date.now() + 10000));

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      await authMiddleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Session invalidée');
    });

    it('should pass if token was issued after logout_at', async () => {
      const payload = { id: 42, role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      mockUserModel.getLogoutAt.mockResolvedValueOnce(new Date(Date.now() - 60000));

      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      await authMiddleware(req, mockRes(), next);

      expect(req.user!.id).toBe(42);
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('optionalAuthMiddleware', () => {
    it('should call next without setting user when no header', () => {
      const req = mockReq();
      optionalAuthMiddleware(req, mockRes(), next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should set user for valid token', () => {
      const token = jwt.sign({ id: 42, role: 'user' }, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      optionalAuthMiddleware(req, mockRes(), next);

      expect(req.user!.id).toBe(42);
      expect(next).toHaveBeenCalled();
    });

    it('should call next without user for invalid token', () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid.token' } });
      optionalAuthMiddleware(req, mockRes(), next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should call next with error if no user on request', () => {
      const middleware = requireRole('user');
      const req = mockReq();

      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
      expect((next.mock.calls[0][0] as UnauthorizedError).message).toBe('Authentification requise');
    });

    it('should call next with error if user role not in allowed roles', () => {
      const middleware = requireRole('orga');
      const req = mockReq();
      req.user = { id: 1, role: 'user' };

      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
      expect((next.mock.calls[0][0] as ForbiddenError).message).toBe('Accès refusé pour ce rôle');
    });

    it('should call next() if user role is allowed', () => {
      const middleware = requireRole('user');
      const req = mockReq();
      req.user = { id: 1, role: 'user' };

      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it('should accept multiple roles', () => {
      const middleware = requireRole('user', 'orga');
      const req = mockReq();
      req.user = { id: 1, role: 'orga' };

      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });
  });
});
