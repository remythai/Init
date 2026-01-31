import { Router } from 'express';
import { EventController } from '../controllers/event.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// Routes for Orga only
router.post(
  '/',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(EventController.create)
);

router.get(
  '/orga/my-events',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(EventController.getMyOrgaEvents)
);

router.get(
  '/:id',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(EventController.getEventByID)
);

router.put(
  '/:id',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(EventController.update)
);

router.delete(
  '/:id',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(EventController.delete)
);

router.get(
  '/:id/participants',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(EventController.getParticipants)
);

// Routes for Users only

router.post(
  '/:id/register',
  authMiddleware,
  requireRole('user'),
  asyncHandler(EventController.register)
);

router.put(
  '/:id/register',
  authMiddleware,
  requireRole('user'),
  asyncHandler(EventController.updateRegistration)
);

router.delete(
  '/:id/register',
  authMiddleware,
  requireRole('user'),
  asyncHandler(EventController.unregister)
);

router.get(
  '/:id/my-profile',
  authMiddleware,
  requireRole('user'),
  asyncHandler(EventController.getMyEventProfile)
);

router.get(
  '/users/my-events',
  authMiddleware,
  requireRole('user'),
  asyncHandler(EventController.getMyRegisteredEvents)
);

router.get(
  '/users/list',
  authMiddleware,
  requireRole('user'),
  asyncHandler(EventController.getPublicEventsForUser)
);

export default router;