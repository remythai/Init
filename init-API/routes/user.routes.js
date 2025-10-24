import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';
import { validate } from '../middleware/validation.middleware.js';

const router = Router();

// Public routes
router.post('/register', validate('userRegister'), asyncHandler(UserController.register));
router.post('/login', validate('userLogin'), asyncHandler(UserController.login));
router.post('/refresh', asyncHandler(UserController.refreshToken));
router.post('/logout', asyncHandler(UserController.logout));

// Protected routes
router.get(
  '/me',
  authMiddleware,
  requireRole('user'),
  asyncHandler(UserController.getProfile)
);

router.put(
  '/me',
  authMiddleware,
  requireRole('user'),
  validate('userUpdate'),
  asyncHandler(UserController.updateProfile)
);

router.delete(
  '/me',
  authMiddleware,
  requireRole('user'),
  asyncHandler(UserController.deleteAccount)
);

export default router;