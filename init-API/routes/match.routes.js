import { Router } from 'express';
import { MatchController } from '../controllers/match.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// All routes require authentication as a user

/**
 * GET /api/matches
 * Get all matches for the current user (all events)
 */
router.get(
  '/',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.getAllMatches)
);

/**
 * GET /api/events/:id/profiles
 * Get profiles to swipe for a given event
 */
router.get(
  '/events/:id/profiles',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.getProfiles)
);

/**
 * POST /api/events/:id/like
 * Like a profile within an event
 */
router.post(
  '/events/:id/like',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.likeProfile)
);

/**
 * POST /api/events/:id/pass
 * Pass on a profile within an event
 */
router.post(
  '/events/:id/pass',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.passProfile)
);

/**
 * GET /api/events/:id/matches
 * Get all matches for a user on a specific event
 */
router.get(
  '/events/:id/matches',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.getEventMatches)
);

export default router;
