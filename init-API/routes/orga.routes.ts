import { Router } from 'express';
import { OrgaController } from '../controllers/orga.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import { validate } from '../middleware/validation.middleware.js';
import { orgaLogoUpload } from '../config/multer.config.js';
import { authLimiter, registerLimiter } from '../middleware/rateLimit.middleware.js';

const router = Router();

// Public routes
router.post('/register', registerLimiter, validate('orgaRegister'), asyncHandler(OrgaController.register));
router.post('/login', authLimiter, validate('orgaLogin'), asyncHandler(OrgaController.login));
router.post('/refresh', authLimiter, asyncHandler(OrgaController.refreshToken));
router.post('/logout', asyncHandler(OrgaController.logout));

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

router.delete(
  '/me',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(OrgaController.deleteAccount)
);

// Logo routes
router.post(
  '/logo',
  authMiddleware,
  requireRole('orga'),
  orgaLogoUpload.single('logo'),
  asyncHandler(OrgaController.uploadLogo)
);

router.delete(
  '/logo',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(OrgaController.deleteLogo)
);

export default router;
