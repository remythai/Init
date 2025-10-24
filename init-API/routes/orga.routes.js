import { Router } from 'express';
import { OrgaController } from '../controllers/orga.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();

// Public routes
router.post('/register', validate('orgaRegister'), asyncHandler(OrgaController.register));
router.post('/login', validate('orgaLogin'), asyncHandler(OrgaController.login));

// Protected routes
router.get(
  '/me',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(OrgaController.getProfile)
);

router.put(
  '/me',
  authMiddleware,
  requireRole('orga'),
  validate('orgaUpdate'),
  asyncHandler(OrgaController.updateProfile)
);

export default router;