import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = 'testsecret';
process.env.JWT_SECRET = JWT_SECRET;

// Dynamic import so JWT_SECRET env var is set before module loads
const { authMiddleware, requireRole } = await import('../../middleware/auth.middleware');

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
  const next: NextFunction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authMiddleware', () => {
    it('should throw when no authorization header', () => {
      const req = mockReq();
      expect(() => authMiddleware(req, mockRes(), next)).toThrow('Token non fourni');
    });

    it('should throw for invalid format (no Bearer)', () => {
      const req = mockReq({ headers: { authorization: 'Basic abc123' } });
      expect(() => authMiddleware(req, mockRes(), next)).toThrow('Format du token invalide');
    });

    it('should throw for invalid format (no space)', () => {
      const req = mockReq({ headers: { authorization: 'Bearertoken' } });
      expect(() => authMiddleware(req, mockRes(), next)).toThrow('Format du token invalide');
    });

    it('should throw for expired token', () => {
      const token = jwt.sign({ id: 1, role: 'user' }, JWT_SECRET, { expiresIn: '-1s' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      expect(() => authMiddleware(req, mockRes(), next)).toThrow('Token expiré');
    });

    it('should throw for invalid token', () => {
      const req = mockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
      expect(() => authMiddleware(req, mockRes(), next)).toThrow('Token invalide');
    });

    it('should throw for token signed with wrong secret', () => {
      const token = jwt.sign({ id: 1, role: 'user' }, 'wrong-secret', { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
      expect(() => authMiddleware(req, mockRes(), next)).toThrow('Token invalide');
    });

    it('should set req.user and call next() for valid token', () => {
      const payload = { id: 42, role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });

      authMiddleware(req, mockRes(), next);

      expect(req.user).toBeDefined();
      expect(req.user!.id).toBe(42);
      expect(req.user!.role).toBe('user');
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should work with orga role', () => {
      const payload = { id: 7, role: 'orga' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      const req = mockReq({ headers: { authorization: `Bearer ${token}` } });

      authMiddleware(req, mockRes(), next);

      expect(req.user!.id).toBe(7);
      expect(req.user!.role).toBe('orga');
      expect(next).toHaveBeenCalled();
    });
  });

  describe('requireRole', () => {
    it('should throw if no user on request', () => {
      const middleware = requireRole('user');
      const req = mockReq();

      expect(() => middleware(req, mockRes(), next)).toThrow('Authentification requise');
    });

    it('should throw if user role not in allowed roles', () => {
      const middleware = requireRole('orga');
      const req = mockReq();
      req.user = { id: 1, role: 'user' };

      expect(() => middleware(req, mockRes(), next)).toThrow('Accès refusé pour ce rôle');
    });

    it('should call next() if user role is allowed', () => {
      const middleware = requireRole('user');
      const req = mockReq();
      req.user = { id: 1, role: 'user' };

      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should accept multiple roles', () => {
      const middleware = requireRole('user', 'orga');
      const req = mockReq();
      req.user = { id: 1, role: 'orga' };

      middleware(req, mockRes(), next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
