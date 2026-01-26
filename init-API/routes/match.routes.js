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

// ============================================================================
// MESSAGING ROUTES
// ============================================================================

/**
 * GET /api/matching/conversations
 * Get all conversations grouped by event
 */
router.get(
  '/conversations',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.getAllConversations)
);

/**
 * GET /api/matching/events/:eventId/conversations
 * Get conversations for a specific event
 */
router.get(
  '/events/:eventId/conversations',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.getEventConversations)
);

/**
 * GET /api/matching/matches/:matchId/messages
 * Get messages for a match (general context)
 */
router.get(
  '/matches/:matchId/messages',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.getMessages)
);

/**
 * POST /api/matching/matches/:matchId/messages
 * Send a message (general context)
 */
router.post(
  '/matches/:matchId/messages',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.sendMessage)
);

/**
 * GET /api/matching/events/:eventId/matches/:matchId/messages
 * Get messages for a match (event context)
 */
router.get(
  '/events/:eventId/matches/:matchId/messages',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.getMessages)
);

/**
 * POST /api/matching/events/:eventId/matches/:matchId/messages
 * Send a message (event context)
 */
router.post(
  '/events/:eventId/matches/:matchId/messages',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.sendMessage)
);

/**
 * PUT /api/matching/messages/:messageId/read
 * Mark a message as read
 */
router.put(
  '/messages/:messageId/read',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.markAsRead)
);

/**
 * PUT /api/matching/messages/:messageId/like
 * Toggle like on a message
 */
router.put(
  '/messages/:messageId/like',
  authMiddleware,
  requireRole('user'),
  asyncHandler(MatchController.toggleLike)
);

export default router;
