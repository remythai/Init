import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validate, validationSchemas } from '../../middleware/validation.middleware';
import type { Request, Response, NextFunction } from 'express';

function mockReq(body: Record<string, unknown> = {}): Request {
  return { body } as Request;
}

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe('validation.middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
  });

  describe('validationSchemas', () => {
    it('should export all expected schemas', () => {
      expect(validationSchemas.userRegister).toBeDefined();
      expect(validationSchemas.userLogin).toBeDefined();
      expect(validationSchemas.userUpdate).toBeDefined();
      expect(validationSchemas.orgaRegister).toBeDefined();
      expect(validationSchemas.orgaLogin).toBeDefined();
      expect(validationSchemas.orgaUpdate).toBeDefined();
    });
  });

  describe('validate - userRegister', () => {
    const middleware = validate('userRegister');

    it('should pass valid registration data', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail when required fields are missing', () => {
      const req = mockReq({});
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Erreurs de validation',
        details: expect.objectContaining({
          firstname: expect.any(String),
          lastname: expect.any(String),
          tel: expect.any(String),
          birthday: expect.any(String),
          password: expect.any(String),
        })
      }));
      expect(next).not.toHaveBeenCalled();
    });

    it('should fail for firstname too short', () => {
      const req = mockReq({
        firstname: 'J',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          firstname: expect.stringContaining('au moins 2')
        })
      }));
    });

    it('should fail for invalid email format', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'Password1!',
        mail: 'not-an-email'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          mail: expect.stringContaining('email')
        })
      }));
    });

    it('should accept optional mail when not provided', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validate - password policy', () => {
    const middleware = validate('userRegister');

    it('should fail for password without uppercase', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'password1!'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          password: expect.stringContaining('majuscule')
        })
      }));
    });

    it('should fail for password without digit', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'Password!'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          password: expect.stringContaining('chiffre')
        })
      }));
    });

    it('should fail for password without special char', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'Password1'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          password: expect.stringContaining('spécial')
        })
      }));
    });

    it('should fail for password too short', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: '1990-01-01',
        password: 'Pa1!'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          password: expect.stringContaining('au moins 8')
        })
      }));
    });
  });

  describe('validate - age18', () => {
    const middleware = validate('userRegister');

    it('should fail for user under 18', () => {
      const today = new Date();
      const underAge = new Date(today.getFullYear() - 17, today.getMonth(), today.getDate());

      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: underAge.toISOString().split('T')[0],
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          birthday: expect.stringContaining('18 ans')
        })
      }));
    });

    it('should pass for user exactly 18', () => {
      const today = new Date();
      const exactly18 = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: exactly18.toISOString().split('T')[0],
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail for invalid date', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '+33612345678',
        birthday: 'not-a-date',
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          birthday: 'Date invalide'
        })
      }));
    });
  });

  describe('validate - userLogin', () => {
    const middleware = validate('userLogin');

    it('should pass valid login data', () => {
      const req = mockReq({ tel: '+33612345678', password: 'anything' });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail when tel is missing', () => {
      const req = mockReq({ password: 'anything' });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          tel: expect.any(String)
        })
      }));
    });
  });

  describe('validate - userUpdate', () => {
    const middleware = validate('userUpdate');

    it('should pass valid update data', () => {
      const req = mockReq({ firstname: 'Pierre' });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail for empty update body', () => {
      const req = mockReq({});
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Aucun champ')
      }));
    });

    it('should validate optional fields when provided', () => {
      const req = mockReq({ mail: 'bad-email' });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          mail: expect.stringContaining('email')
        })
      }));
    });
  });

  describe('validate - orgaRegister', () => {
    const middleware = validate('orgaRegister');

    it('should pass valid orga registration', () => {
      const req = mockReq({
        name: 'My Organization',
        mail: 'orga@example.com',
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should fail when required orga fields are missing', () => {
      const req = mockReq({});
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          name: expect.any(String),
          mail: expect.any(String),
          password: expect.any(String),
        })
      }));
    });
  });

  describe('validate - orgaLogin', () => {
    const middleware = validate('orgaLogin');

    it('should pass valid orga login', () => {
      const req = mockReq({ mail: 'orga@example.com', password: 'anything' });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validate - orgaUpdate', () => {
    const middleware = validate('orgaUpdate');

    it('should fail for empty update body', () => {
      const req = mockReq({});
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: expect.stringContaining('Aucun champ')
      }));
    });

    it('should pass valid orga update', () => {
      const req = mockReq({ description: 'Updated desc' });
      const res = mockRes();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('validate - phone format', () => {
    const middleware = validate('userRegister');

    it('should fail for invalid phone format', () => {
      const req = mockReq({
        firstname: 'Jean',
        lastname: 'Dupont',
        tel: '123',
        birthday: '1990-01-01',
        password: 'Password1!'
      });
      const res = mockRes();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        details: expect.objectContaining({
          tel: expect.stringContaining('téléphone')
        })
      }));
    });
  });
});
