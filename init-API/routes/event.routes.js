import { Router } from 'express';
import { EventController } from '../controllers/event.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

//Public routes
router.get('/', asyncHandler(EventController.getAll));
router.get('/:id', asyncHandler(EventController.getById));

//Protected routes for orga
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
  asyncHandler(EventController.getMyEvents)
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

router.put(
  '/:eventId/participants/:userId/status',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(EventController.updateRegistrationStatus)
);

export default router;