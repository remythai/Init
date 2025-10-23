import { Router } from 'express';
import { OrgaController } from '../controllers/orga.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// Public routes
router.post('/register', asyncHandler(OrgaController.register));
router.post('/login', asyncHandler(OrgaController.login));

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
  asyncHandler(OrgaController.updateProfile)
);

export default router;