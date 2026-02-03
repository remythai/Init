import { Router } from 'express';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';
import { ReportController } from '../controllers/report.controller.js';
import { asyncHandler } from '../utils/errors.js';

const router = Router();

/**
 * User routes (require user auth)
 */

/**
 * @swagger
 * /api/events/{id}/reports:
 *   post:
 *     summary: Create a report
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reportedUserId
 *               - reportType
 *               - reason
 *             properties:
 *               reportedUserId:
 *                 type: integer
 *                 description: ID of the user being reported
 *               matchId:
 *                 type: integer
 *                 description: Match ID (required for message reports)
 *               reportType:
 *                 type: string
 *                 enum: [photo, profile, message]
 *               reason:
 *                 type: string
 *                 enum: [inappropriate, harassment, spam, fake, other]
 *               description:
 *                 type: string
 *                 description: Additional details from the reporter
 *     responses:
 *       201:
 *         description: Report created
 *       400:
 *         description: Invalid request
 *       409:
 *         description: Duplicate report
 */
router.post(
  '/:id/reports',
  authMiddleware,
  requireRole('user'),
  asyncHandler(ReportController.createReport)
);

/**
 * Organizer routes (require orga auth)
 */

/**
 * @swagger
 * /api/events/{id}/reports:
 *   get:
 *     summary: Get all reports for an event
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, resolved, dismissed]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: List of reports with stats
 */
router.get(
  '/:id/reports',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(ReportController.getReports)
);

/**
 * @swagger
 * /api/events/{id}/reports/{reportId}:
 *   get:
 *     summary: Get report details (including messages if applicable)
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report details with conversation if message report
 */
router.get(
  '/:id/reports/:reportId',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(ReportController.getReportDetails)
);

/**
 * @swagger
 * /api/events/{id}/reports/{reportId}:
 *   put:
 *     summary: Update report status
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Event ID
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Report ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, reviewed, resolved, dismissed]
 *               orga_notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Report updated
 */
router.put(
  '/:id/reports/:reportId',
  authMiddleware,
  requireRole('orga'),
  asyncHandler(ReportController.updateReport)
);

export default router;
