import { Router } from 'express';
import { WhitelistController } from '../controllers/whitelist.controller.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

// All routes require authentication as an organizer

/**
 * GET /api/events/:id/whitelist
 * List whitelist entries for an event
 * Query params: ?include_removed=true
 */
router.get(
  '/:id/whitelist',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.list)
);

/**
 * POST /api/events/:id/whitelist
 * Add a phone to whitelist
 * Body: { phone: "+33601020304" }
 */
router.post(
  '/:id/whitelist',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.addPhone)
);

/**
 * POST /api/events/:id/whitelist/import/preview
 * Preview CSV file headers for column selection
 * Body: { content: "..." }
 */
router.post(
  '/:id/whitelist/import/preview',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.previewImport)
);

/**
 * POST /api/events/:id/whitelist/import
 * Import phones from CSV or XML
 * Body: { content: "...", format: "csv" | "xml", columnIndex?: number }
 */
router.post(
  '/:id/whitelist/import',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.importFile)
);

/**
 * DELETE /api/events/:id/whitelist/bulk
 * Remove multiple phones from whitelist
 * Body: { phones: ["+33..."], permanent?: boolean }
 */
router.delete(
  '/:id/whitelist/bulk',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.bulkRemove)
);

/**
 * PUT /api/events/:id/whitelist/:phone
 * Update a phone in whitelist
 * Body: { phone: "+33601020305" }
 */
router.put(
  '/:id/whitelist/:phone',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.updatePhone)
);

/**
 * DELETE /api/events/:id/whitelist/:phone
 * Remove a phone from whitelist
 * Query params: ?permanent=true for permanent deletion
 */
router.delete(
  '/:id/whitelist/:phone',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.removePhone)
);

/**
 * POST /api/events/:id/whitelist/:phone/reactivate
 * Reactivate a previously removed phone
 */
router.post(
  '/:id/whitelist/:phone/reactivate',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(WhitelistController.reactivate)
);

export default router;
